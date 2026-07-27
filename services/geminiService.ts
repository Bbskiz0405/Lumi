import { getDb } from './db';
import * as SecureStore from 'expo-secure-store';
import {
  getTransactionsForMonth,
  getMonthSummary,
  getBudgetsForMonth,
  getExpenseByCategory,
} from './financeService';
import { getEventStream, UnifiedEvent } from './eventStreamService';

export type ApiProvider = 'gemini' | 'openrouter' | 'openai';

interface ApiConfig {
  provider: ApiProvider;
  apiKey: string;
  model?: string;
}

const DEFAULT_MODELS: Record<ApiProvider, string> = {
  gemini: 'gemini-2.5-flash-lite',
  openrouter: 'openrouter/free',
  openai: 'gpt-4o-mini',
};

let configCache: ApiConfig | null = null;
const AI_CONFIG_KEY = 'ai_config';

function parseApiConfig(value: string): ApiConfig | null {
  try {
    const parsed = JSON.parse(value) as Partial<ApiConfig>;
    if (
      (parsed.provider === 'gemini' ||
        parsed.provider === 'openrouter' ||
        parsed.provider === 'openai') &&
      typeof parsed.apiKey === 'string' &&
      parsed.apiKey.trim()
    ) {
      return {
        provider: parsed.provider,
        apiKey: parsed.apiKey.trim(),
        model: typeof parsed.model === 'string' ? parsed.model : undefined,
      };
    }
  } catch {
    // Corrupted config is treated as unset.
  }
  return null;
}

async function canUseSecureStore(): Promise<boolean> {
  try {
    return await SecureStore.isAvailableAsync();
  } catch {
    return false;
  }
}

export async function setApiConfig(config: ApiConfig): Promise<void> {
  const normalized: ApiConfig = { ...config, apiKey: config.apiKey.trim() };
  if (!normalized.apiKey) throw new Error('API Key 不可空白');

  const serialized = JSON.stringify(normalized);
  const db = await getDb();
  if (await canUseSecureStore()) {
    await SecureStore.setItemAsync(AI_CONFIG_KEY, serialized);
    await db.runAsync('DELETE FROM settings WHERE key = ?', [AI_CONFIG_KEY]);
  } else {
    await db.runAsync(
      'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
      [AI_CONFIG_KEY, serialized]
    );
  }
  configCache = normalized;
}

export async function getApiConfig(): Promise<ApiConfig | null> {
  if (configCache) return configCache;

  if (await canUseSecureStore()) {
    const secureValue = await SecureStore.getItemAsync(AI_CONFIG_KEY);
    if (secureValue) {
      configCache = parseApiConfig(secureValue);
      if (configCache) return configCache;
      await SecureStore.deleteItemAsync(AI_CONFIG_KEY);
    }
  }

  const db = await getDb();
  const row = await db.getFirstAsync<{ value: string }>(
    'SELECT value FROM settings WHERE key = ?',
    [AI_CONFIG_KEY]
  );
  if (row) {
    configCache = parseApiConfig(row.value);
    if (configCache) {
      if (await canUseSecureStore()) {
        await SecureStore.setItemAsync(AI_CONFIG_KEY, JSON.stringify(configCache));
        await db.runAsync('DELETE FROM settings WHERE key = ?', [AI_CONFIG_KEY]);
      }
      return configCache;
    }
  }
  return null;
}

export async function removeApiConfig(): Promise<void> {
  configCache = null;
  if (await canUseSecureStore()) {
    await SecureStore.deleteItemAsync(AI_CONFIG_KEY);
  }
  const db = await getDb();
  await db.runAsync('DELETE FROM settings WHERE key = ?', [AI_CONFIG_KEY]);
}

// Keep old functions for backward compatibility
export async function setGeminiApiKey(key: string): Promise<void> {
  await setApiConfig({ provider: 'gemini', apiKey: key });
}
export async function getGeminiApiKey(): Promise<string | null> {
  const config = await getApiConfig();
  return config?.apiKey ?? null;
}
export async function removeGeminiApiKey(): Promise<void> {
  await removeApiConfig();
}

async function ensureConfig(): Promise<ApiConfig> {
  const config = await getApiConfig();
  if (!config) throw new Error('未設定 API');
  return config;
}

const SYSTEM_PROMPT = `你是 Lumi 的財務分析助手。你的角色嚴格限定於財務相關話題。

你的能力：
1. 分析使用者的消費行為模式
2. 提供預算規劃建議
3. 回答關於消費習慣的問題
4. 指出異常消費或節省機會

你的限制：
- 你只能基於使用者的實際消費數據回答
- 不回答非財務相關的問題
- 如果使用者問非財務問題，回覆：「我只能協助財務相關的分析和建議哦 💰」
- 不編造數據，只引用提供給你的真實數據
- 回答簡潔、直接、有數據支撐

語氣：友善但專業，像一個懂你的記帳夥伴。使用繁體中文。`;

async function buildFinanceContext(month: string): Promise<string> {
  const [transactions, summary, budgets, categoryExpense] = await Promise.all([
    getTransactionsForMonth(month),
    getMonthSummary(month),
    getBudgetsForMonth(month),
    getExpenseByCategory(month),
  ]);

  const budgetMap: Record<string, number> = {};
  for (const b of budgets) budgetMap[b.category] = b.limit_amount;

  const lines: string[] = [
    `=== ${month} 財務數據 ===`,
    `收入：${summary.income}`,
    `支出：${summary.expense}`,
    `結餘：${summary.income - summary.expense}`,
    '',
    '各類支出：',
  ];

  for (const [cat, amount] of Object.entries(categoryExpense)) {
    const limit = budgetMap[cat];
    lines.push(`  ${cat}: ${amount}${limit ? ` (預算上限 ${limit})` : ''}`);
  }

  if (transactions.length > 0) {
    lines.push('', `最近交易（共 ${transactions.length} 筆）：`);
    for (const tx of transactions.slice(0, 20)) {
      const date = new Date(tx.created_at);
      const dateStr = `${date.getMonth() + 1}/${date.getDate()}`;
      lines.push(`  ${dateStr} ${tx.type === 'income' ? '收入' : '支出'} ${tx.item} ${tx.amount}`);
    }
    if (transactions.length > 20) {
      lines.push(`  ... 還有 ${transactions.length - 20} 筆`);
    }
  } else {
    lines.push('', '這個月還沒有交易記錄。');
  }

  return lines.join('\n');
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

async function fetchWithTimeout(
  input: string,
  init: RequestInit,
  timeoutMs = 20000
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('AI 回應逾時，請檢查網路後再試一次');
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

async function callGemini(config: ApiConfig, messages: any[], temperature: number, maxTokens: number): Promise<string> {
  const model = config.model || DEFAULT_MODELS.gemini;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${config.apiKey}`;

  const response = await fetchWithTimeout(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: messages,
      generationConfig: { temperature, maxOutputTokens: maxTokens },
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Gemini ${response.status}: ${body.slice(0, 150)}`);
  }

  const data = await response.json();
  return data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '無回應';
}

async function callOpenAICompatible(config: ApiConfig, systemPrompt: string, chatMessages: { role: string; content: string }[], temperature: number, maxTokens: number): Promise<string> {
  const isOpenRouter = config.provider === 'openrouter';
  const baseUrl = isOpenRouter
    ? 'https://openrouter.ai/api/v1'
    : 'https://api.openai.com/v1';
  const model = config.model || DEFAULT_MODELS[config.provider];

  const messages = [
    { role: 'system', content: systemPrompt },
    ...chatMessages,
  ];

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${config.apiKey}`,
  };
  if (isOpenRouter) {
    headers['HTTP-Referer'] = 'https://lumi-app.local';
    headers['X-Title'] = 'Lumi';
  }

  const response = await fetchWithTimeout(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model,
      messages,
      temperature,
      max_tokens: maxTokens,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    if (response.status === 429) throw new Error('請求過於頻繁，請稍後再試');
    if (response.status === 401) throw new Error('API Key 無效，請檢查設定');
    throw new Error(`API ${response.status}: ${body.slice(0, 150)}`);
  }

  const data = await response.json();
  return data?.choices?.[0]?.message?.content ?? '無回應';
}

async function callAI(config: ApiConfig, systemPrompt: string, history: ChatMessage[], userMessage: string, financeContext: string, temperature: number = 0.7, maxTokens: number = 1024): Promise<string> {
  const fullSystem = `${systemPrompt}\n\n${financeContext}`;

  if (config.provider === 'gemini') {
    const contents = [
      { role: 'user', parts: [{ text: fullSystem }] },
      { role: 'model', parts: [{ text: '好的，我已經看到你的財務數據了。有什麼想了解的嗎？' }] },
      ...history.map(msg => ({
        role: msg.role === 'model' ? 'model' : 'user',
        parts: [{ text: msg.text }],
      })),
      { role: 'user', parts: [{ text: userMessage }] },
    ];
    return callGemini(config, contents, temperature, maxTokens);
  }

  const chatMessages = [
    ...history.map(msg => ({
      role: msg.role === 'model' ? 'assistant' : 'user',
      content: msg.text,
    })),
    { role: 'user', content: userMessage },
  ];
  return callOpenAICompatible(config, fullSystem, chatMessages, temperature, maxTokens);
}

export async function chatWithFinanceAdvisor(
  userMessage: string,
  history: ChatMessage[],
  month: string
): Promise<string> {
  const config = await ensureConfig();
  const financeContext = await buildFinanceContext(month);
  return callAI(config, SYSTEM_PROMPT, history, userMessage, financeContext);
}

// ───────────────────────── D：問 Lumi 任何事（記憶檢索）─────────────────────────

const ASK_LUMI_SYSTEM = `你是 Lumi 的個人記憶助手。使用者把生活中的任務、消費、筆記、隨手記都交給 Lumi，現在他要回頭問這些紀錄。

你的職責：
- 只根據下方「記憶資料」回答，逐筆都是使用者的真實紀錄。
- 回答時引用具體日期與數字（例：「5/12 你花了 350 在交通」）。
- 若多筆相關，整理重點後簡潔作答；若是金額問題，主動加總。
- 找不到相關紀錄時，直接說「找不到相關紀錄」，不要編造。
- 用繁體中文，語氣像懂你的夥伴，簡潔直接。`;

function formatEventForContext(e: UnifiedEvent): string {
  const d = new Date(e.timestamp);
  const date = `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
  switch (e.type) {
    case 'task':
      return `[${date}] 任務：${e.title}${e.completed ? '（已完成）' : '（未完成）'}${e.dueDate ? ` 到期 ${e.dueDate}` : ''}`;
    case 'finance':
      return `[${date}] ${e.financeType === 'income' ? '收入' : '支出'}：${e.title} ${e.amount ?? 0}${e.category ? ` (${e.category})` : ''}`;
    case 'note':
      return `[${date}] 筆記：${e.raw}`;
    case 'entry':
      return `[${date}] 紀錄：${e.raw}`;
  }
}

export async function askLumi(question: string, history: ChatMessage[] = []): Promise<string> {
  const config = await ensureConfig();
  const events = await getEventStream({ types: ['task', 'finance', 'note'], limit: 250 });

  const context =
    events.length === 0
      ? '=== 記憶資料 ===\n（目前沒有任何紀錄）'
      : `=== 記憶資料（共 ${events.length} 筆，由新到舊）===\n` +
        events.map(formatEventForContext).join('\n');

  return callAI(config, ASK_LUMI_SYSTEM, history, question, context, 0.3, 1024);
}

export async function getQuickAnalysis(month: string): Promise<string> {
  const config = await ensureConfig();
  const financeContext = await buildFinanceContext(month);

  const prompt = `請用 3-5 個重點快速分析這個月的消費狀況，包括：
1. 花費最多的類別
2. 是否有異常消費
3. 一個具體的節省建議
格式簡潔，每點一行。`;

  return callAI(config, SYSTEM_PROMPT, [], prompt, financeContext, 0.5, 512);
}

// ───────────────────────── A：個人時間軸敘事（月底回顧）─────────────────────────

const MONTH_NARRATIVE_SYSTEM = `你是 Lumi，使用者的生活敘事者。根據使用者這個月的任務、消費、筆記紀錄，寫一段溫暖、具體的月度回顧。

要求：
- 用第二人稱「你」，像懂他的朋友在回顧這個月。
- 點出具體事件、數字、模式（例：完成了幾件任務、最常花錢的地方、反覆出現的主題）。
- 串連不同類別找關聯（例：忙碌期的消費變化、某個主題反覆出現）。
- 3-4 段，每段 2-3 句，繁體中文，溫暖但不浮誇。
- 只根據提供的紀錄，不要編造沒出現的事。`;

function monthRange(month: string): { start: string; end: string } {
  const [y, m] = month.split('-').map(Number);
  const lastDay = new Date(y, m, 0).getDate();
  return {
    start: `${month}-01T00:00:00.000`,
    end: `${month}-${String(lastDay).padStart(2, '0')}T23:59:59.999`,
  };
}

export async function generateMonthNarrative(month: string): Promise<string> {
  const config = await ensureConfig();
  const { start, end } = monthRange(month);
  const events = await getEventStream({ types: ['task', 'finance', 'note'], start, end });
  if (events.length === 0) return '這個月還沒有任何紀錄，記下任務、消費、筆記後再回來看看吧。';

  const taskTotal = events.filter(e => e.type === 'task').length;
  const taskDone = events.filter(e => e.type === 'task' && e.completed).length;
  let income = 0, expense = 0;
  const catTotals: Record<string, number> = {};
  for (const e of events) {
    if (e.type !== 'finance') continue;
    if (e.financeType === 'income') income += e.amount ?? 0;
    else {
      expense += e.amount ?? 0;
      const c = e.category ?? 'other';
      catTotals[c] = (catTotals[c] ?? 0) + (e.amount ?? 0);
    }
  }
  const topCats = Object.entries(catTotals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([c, v]) => `${c} ${v}`)
    .join('、');

  const stats = [
    `本月統計：任務 ${taskDone}/${taskTotal} 完成`,
    `收入 ${income}、支出 ${expense}、結餘 ${income - expense}`,
    topCats ? `支出最多：${topCats}` : '',
  ].filter(Boolean).join('；');

  const context =
    `=== 本月紀錄（共 ${events.length} 筆，由新到舊）===\n${stats}\n\n` +
    events.map(formatEventForContext).join('\n');

  return callAI(config, MONTH_NARRATIVE_SYSTEM, [], '請根據以下紀錄，寫這個月的回顧敘事。', context, 0.7, 1024);
}

export interface AIClassification {
  type: 'TASK' | 'FINANCE' | 'IDEA';
  amount?: number;
  category?: 'food' | 'transport' | 'interest' | 'other';
  transactionType?: 'income' | 'expense';
  dueDate?: string;
}

function buildClassifyPrompt(): string {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  const todayStr = `${yyyy}-${mm}-${dd}`;
  const weekday = ['日', '一', '二', '三', '四', '五', '六'][today.getDay()];

  return `你是一個輸入分類器。把使用者輸入的一句話分類成 TASK、FINANCE、IDEA 其中之一。

關鍵判斷：**TASK 是「未來要做的動作」，IDEA 是「紀錄 / 想法 / 已經發生的內容」。**

- **TASK**：未來要採取的行動（含時間 + 動詞）。例：「明天要開會」「下週要交報告」「記得買牛奶」「5/30 出去」。
- **FINANCE**：花錢、收錢、買東西、薪水、繳費、消費紀錄（含金額或明顯消費動詞且非未來計畫）。
- **IDEA**：
  - 已發生事件的紀錄（會議紀錄、上課筆記、讀書心得、訪談摘要）
  - 想法 / 靈感 / 心情 / 隨手寫下的東西
  - 知識整理 / 觀察 / 計畫草稿（非具體待辦動作）
  - **包含「紀錄」「筆記」「心得」「摘要」「想法」「感想」「整理」等字眼通常是 IDEA，不是 TASK**

判斷原則：
- 句子是「我要去做 X」→ TASK
- 句子是「我記下 X / 我想 X / X 是這樣」→ IDEA
- 含明確金額且非未來計畫 → FINANCE
- 含「會議」但描述內容（如「會議紀錄：今天討論了 A、B」）→ IDEA
- 含「會議」但指未來行動（如「明天開會」）→ TASK

今天日期：${todayStr}（星期${weekday}）。請以此為基準解析相對日期。

若分類為 TASK 且輸入有提到任何日期（如「明天」「下週三」「5/30」「6 月 1 號」「週五」），抽取：
- dueDate：YYYY-MM-DD 格式（必須使用上方的今天日期推算）

若分類為 FINANCE，抽取：
- amount：金額數字（若無則省略）
- category：food / transport / interest / other（收入時省略）
- transactionType：income 或 expense
  - 「存款」「存進」「儲蓄」「入帳」「薪水」「獎金」「收到錢」→ income
  - 「買」「付」「繳」「花」等錢流出 → expense

只回傳 JSON，不要任何額外文字或 markdown 標記。

範例（假設今天是 ${todayStr}）：
輸入「買午餐 100」→ {"type":"FINANCE","amount":100,"category":"food","transactionType":"expense"}
輸入「明天要交報告」→ {"type":"TASK","dueDate":"<明天的日期>"}
輸入「5/30 要出去」→ {"type":"TASK","dueDate":"${yyyy}-05-30"}
輸入「下週三開會」→ {"type":"TASK","dueDate":"<該週三的日期>"}
輸入「會議紀錄：今天討論新 feature 的優先序」→ {"type":"IDEA"}
輸入「上課筆記：微積分連續性的定義」→ {"type":"IDEA"}
輸入「讀書心得：原子習慣很受用」→ {"type":"IDEA"}
輸入「今天看到一隻可愛的貓」→ {"type":"IDEA"}
輸入「想做一個個人管理 app」→ {"type":"IDEA"}
輸入「薪水 30000 入帳」→ {"type":"FINANCE","amount":30000,"transactionType":"income"}
輸入「存款 5000」→ {"type":"FINANCE","amount":5000,"transactionType":"income"}`;
}

export async function classifyTextWithAI(text: string, timeoutMs = 6000): Promise<AIClassification | null> {
  const config = await getApiConfig();
  if (!config || !config.apiKey) return null;

  const prompt = buildClassifyPrompt();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    let raw: string;
    if (config.provider === 'gemini') {
      const model = config.model || DEFAULT_MODELS.gemini;
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${config.apiKey}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            { role: 'user', parts: [{ text: `${prompt}\n\n輸入：「${text}」` }] },
          ],
          generationConfig: {
            temperature: 0,
            maxOutputTokens: 128,
            responseMimeType: 'application/json',
          },
        }),
        signal: controller.signal,
      });
      if (!response.ok) return null;
      const data = await response.json();
      raw = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    } else {
      const isOpenRouter = config.provider === 'openrouter';
      const baseUrl = isOpenRouter ? 'https://openrouter.ai/api/v1' : 'https://api.openai.com/v1';
      const model = config.model || DEFAULT_MODELS[config.provider];
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`,
      };
      if (isOpenRouter) {
        headers['HTTP-Referer'] = 'https://lumi-app.local';
        headers['X-Title'] = 'Lumi';
      }
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: prompt },
            { role: 'user', content: text },
          ],
          temperature: 0,
          max_tokens: 128,
          response_format: { type: 'json_object' },
        }),
        signal: controller.signal,
      });
      if (!response.ok) return null;
      const data = await response.json();
      raw = data?.choices?.[0]?.message?.content ?? '';
    }

    const jsonStart = raw.indexOf('{');
    const jsonEnd = raw.lastIndexOf('}');
    if (jsonStart === -1 || jsonEnd === -1) return null;
    const parsed = JSON.parse(raw.slice(jsonStart, jsonEnd + 1)) as AIClassification;

    if (parsed.type !== 'TASK' && parsed.type !== 'FINANCE' && parsed.type !== 'IDEA') return null;
    if (parsed.dueDate && !/^\d{4}-\d{2}-\d{2}$/.test(parsed.dueDate)) {
      delete parsed.dueDate;
    }
    return parsed;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
