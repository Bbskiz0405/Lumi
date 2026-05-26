import { getDb } from './db';
import {
  getTransactionsForMonth,
  getMonthSummary,
  getBudgetsForMonth,
  getExpenseByCategory,
} from './financeService';

const GEMINI_MODEL = 'gemini-2.0-flash';

let apiKeyCache: string | null = null;

export async function setGeminiApiKey(key: string): Promise<void> {
  apiKeyCache = key;
  const db = await getDb();
  await db.runAsync(
    'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
    ['gemini_api_key', key]
  );
}

export async function getGeminiApiKey(): Promise<string | null> {
  if (apiKeyCache) return apiKeyCache;
  const db = await getDb();
  const row = await db.getFirstAsync<{ value: string }>('SELECT value FROM settings WHERE key = ?', ['gemini_api_key']);
  if (row) apiKeyCache = row.value;
  return apiKeyCache;
}

async function ensureApiKey(): Promise<string> {
  const key = await getGeminiApiKey();
  if (!key) throw new Error('未設定 Gemini API Key');
  return key;
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

export async function chatWithFinanceAdvisor(
  userMessage: string,
  history: ChatMessage[],
  month: string
): Promise<string> {
  const key = await ensureApiKey();
  const financeContext = await buildFinanceContext(month);

  const contents = [
    {
      role: 'user',
      parts: [{ text: `${SYSTEM_PROMPT}\n\n${financeContext}` }],
    },
    {
      role: 'model',
      parts: [{ text: '好的，我已經看到你的財務數據了。有什麼想了解的嗎？' }],
    },
    ...history.map(msg => ({
      role: msg.role,
      parts: [{ text: msg.text }],
    })),
    {
      role: 'user',
      parts: [{ text: userMessage }],
    },
  ];

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${key}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents,
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 1024,
      },
    }),
  });

  if (!response.ok) {
    if (response.status === 429) {
      throw new Error('Gemini 請求過於頻繁，請稍後再試（免費額度每分鐘 15 次）');
    }
    const error = await response.text();
    throw new Error(`Gemini API 錯誤: ${response.status}`);
  }

  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Gemini 回傳空內容');
  return text;
}

export async function getQuickAnalysis(month: string): Promise<string> {
  const key = await ensureApiKey();
  const financeContext = await buildFinanceContext(month);

  const prompt = `${SYSTEM_PROMPT}

${financeContext}

請用 3-5 個重點快速分析這個月的消費狀況，包括：
1. 花費最多的類別
2. 是否有異常消費
3. 一個具體的節省建議
格式簡潔，每點一行。`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${key}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.5, maxOutputTokens: 512 },
    }),
  });

  if (!response.ok) {
    if (response.status === 429) {
      throw new Error('請求過於頻繁，請稍後再試');
    }
    throw new Error(`Gemini API 錯誤: ${response.status}`);
  }

  const data = await response.json();
  return data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '無法取得分析結果';
}
