import { getDb } from './db';
import {
  getTransactionsForMonth,
  getMonthSummary,
  getBudgetsForMonth,
  getExpenseByCategory,
} from './financeService';

export type ApiProvider = 'gemini' | 'openrouter' | 'openai';

interface ApiConfig {
  provider: ApiProvider;
  apiKey: string;
  model?: string;
}

const DEFAULT_MODELS: Record<ApiProvider, string> = {
  gemini: 'gemini-2.5-flash-lite',
  openrouter: 'google/gemma-7b-it:free',
  openai: 'gpt-4o-mini',
};

let configCache: ApiConfig | null = null;

export async function setApiConfig(config: ApiConfig): Promise<void> {
  configCache = config;
  const db = await getDb();
  await db.runAsync(
    'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
    ['ai_config', JSON.stringify(config)]
  );
}

export async function getApiConfig(): Promise<ApiConfig | null> {
  if (configCache) return configCache;
  const db = await getDb();
  const row = await db.getFirstAsync<{ value: string }>('SELECT value FROM settings WHERE key = ?', ['ai_config']);
  if (row) {
    try {
      configCache = JSON.parse(row.value);
      return configCache;
    } catch { return null; }
  }
  return null;
}

export async function removeApiConfig(): Promise<void> {
  configCache = null;
  const db = await getDb();
  await db.runAsync('DELETE FROM settings WHERE key = ?', ['ai_config']);
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

async function callGemini(config: ApiConfig, messages: any[], temperature: number, maxTokens: number): Promise<string> {
  const model = config.model || DEFAULT_MODELS.gemini;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${config.apiKey}`;

  const response = await fetch(url, {
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

  const response = await fetch(`${baseUrl}/chat/completions`, {
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

export interface AIClassification {
  type: 'TASK' | 'FINANCE' | 'IDEA';
  amount?: number;
  category?: 'food' | 'transport' | 'interest' | 'other';
  transactionType?: 'income' | 'expense';
}

const CLASSIFY_PROMPT = `你是一個輸入分類器。把使用者輸入的一句話分類成 TASK、FINANCE、IDEA 其中之一。
- TASK：待辦、提醒、要做的事、deadline、會議、報告、作業等
- FINANCE：花錢、收錢、買東西、薪水、繳費、消費紀錄（含金額或明顯消費動詞）
- IDEA：靈感、想法、心情、隨手筆記、其他

若分類為 FINANCE，請額外抽取：
- amount：金額數字（若無則省略）
- category：food / transport / interest / other（收入時省略）
- transactionType：income 或 expense

只回傳 JSON，不要任何額外文字或 markdown 標記。

範例：
輸入「買午餐 100」→ {"type":"FINANCE","amount":100,"category":"food","transactionType":"expense"}
輸入「明天要交報告」→ {"type":"TASK"}
輸入「今天看到一隻可愛的貓」→ {"type":"IDEA"}
輸入「薪水 30000 入帳」→ {"type":"FINANCE","amount":30000,"transactionType":"income"}`;

export async function classifyTextWithAI(text: string, timeoutMs = 6000): Promise<AIClassification | null> {
  const config = await getApiConfig();
  if (!config || !config.apiKey) return null;

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
            { role: 'user', parts: [{ text: `${CLASSIFY_PROMPT}\n\n輸入：「${text}」` }] },
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
            { role: 'system', content: CLASSIFY_PROMPT },
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
    return parsed;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
