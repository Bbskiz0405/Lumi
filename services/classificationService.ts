import { getDb } from './db';
import { ClassifiedType } from '../types/entry';
import * as Crypto from 'expo-crypto';

export interface ClassificationResult {
  type: ClassifiedType;
  confidence: 'high' | 'medium' | 'low';
  parsed?: {
    amount?: number;
    category?: string;
    transactionType?: 'income' | 'expense';
    dueDate?: string;
  };
}

const FINANCE_KEYWORDS = [
  '買', '花', '付', '繳', '刷', '消費', '支出', '收入', '薪水', '薪資',
  '早餐', '午餐', '晚餐', '宵夜', '飲料', '咖啡', '便當', '外送',
  '加油', '停車', '車費', '票', '搭車', '計程車', '捷運', '公車', '高鐵',
  '房租', '水電', '電話費', '網路費', '保險',
  '元', '塊', 'NT', '$',
  '欠', '還錢', '還款', '借', '貸',
];

const INCOME_KEYWORDS = ['收入', '薪水', '薪資', '獎金', '入帳', '進帳', '賺', '還我', '收到'];
const DEBT_EXPENSE_KEYWORDS = ['欠', '還錢', '還款', '借', '貸'];

const TASK_KEYWORDS = [
  '要', '記得', '別忘', '提醒', '做', '完成', '處理', '準備', '交',
  'deadline', '截止', '到期', '明天', '後天', '下週', '下禮拜',
  '報告', '作業', '考試', '開會', '會議',
];

const AMOUNT_PATTERN = /(\d+(?:\.\d+)?)\s*(?:元|塊|NT\$?|\$)/;
const BARE_AMOUNT = /(?:^|[^年月日時點:：])\s*[＄$]?\s*(\d+(?:\.\d+)?)\s*$/;
const TIME_CONTEXT = /(?:早上|上午|中午|下午|傍晚|晚上|凌晨|今天|明天|後天)\s*\d|^\d{1,2}\s*[點時:：.]|[\d]\s*[點時]/;

function extractAmount(text: string): number | null {
  if (TIME_CONTEXT.test(text)) return null;

  const match = text.match(AMOUNT_PATTERN);
  if (match) {
    const n = parseFloat(match[1]);
    if (n > 0 && n < 10_000_000) return n;
  }
  const bareMatch = text.match(BARE_AMOUNT);
  if (bareMatch) {
    const n = parseFloat(bareMatch[1]);
    if (n > 0 && n < 10_000_000) return n;
  }
  return null;
}

export interface ParsedTransaction {
  item: string;
  amount: number;
  category: string;
  transactionType: 'income' | 'expense';
}

const MULTI_ITEM_PATTERN = /([^\d\s\$＄元塊]+)\s*[＄$]?\s*(\d+(?:\.\d+)?)\s*(?:元|塊)?/g;

export function parseMultipleTransactions(text: string): ParsedTransaction[] {
  if (TIME_CONTEXT.test(text)) return [];
  const lower = text.toLowerCase();
  const isIncome = INCOME_KEYWORDS.some(kw => lower.includes(kw));

  const results: ParsedTransaction[] = [];
  let match;
  MULTI_ITEM_PATTERN.lastIndex = 0;

  while ((match = MULTI_ITEM_PATTERN.exec(text)) !== null) {
    const item = match[1].trim();
    const amount = parseFloat(match[2]);
    if (item && amount > 0 && amount < 10_000_000) {
      results.push({
        item,
        amount,
        category: isIncome ? '' : guessExpenseCategory(item.toLowerCase()),
        transactionType: isIncome ? 'income' : 'expense',
      });
    }
  }

  return results;
}

function guessExpenseCategory(text: string): string {
  const foodWords = ['餐', '吃', '飯', '麵', '早餐', '午餐', '晚餐', '宵夜', '飲料', '咖啡', '便當', '外送', '火鍋', '壽司', '拉麵', '牛排', '茶'];
  const transportWords = ['車', '油', '停車', '捷運', '公車', '高鐵', '計程', 'uber', '加油', '票'];
  const interestWords = ['遊戲', 'game', '漫畫', '動漫', '模型', '卡', '抽', '課金', '訂閱', '會員'];

  for (const w of foodWords) if (text.includes(w)) return 'food';
  for (const w of transportWords) if (text.includes(w)) return 'transport';
  for (const w of interestWords) if (text.includes(w)) return 'interest';
  return 'other';
}

function extractBigrams(text: string): string[] {
  const clean = text.replace(/\s+/g, '').toLowerCase();
  const bigrams: string[] = [];
  for (let i = 0; i < clean.length - 1; i++) {
    bigrams.push(clean.slice(i, i + 2));
  }
  return bigrams;
}

function similarity(a: string, b: string): number {
  const bigramsA = new Set(extractBigrams(a));
  const bigramsB = new Set(extractBigrams(b));
  if (bigramsA.size === 0 || bigramsB.size === 0) {
    return a.replace(/\s/g, '').toLowerCase() === b.replace(/\s/g, '').toLowerCase() ? 1 : 0;
  }
  let overlap = 0;
  for (const bg of bigramsA) {
    if (bigramsB.has(bg)) overlap++;
  }
  return (2 * overlap) / (bigramsA.size + bigramsB.size);
}

export function classifyByKeywords(text: string): ClassificationResult {
  const lower = text.toLowerCase();
  const amount = extractAmount(text);

  let financeScore = 0;
  let taskScore = 0;

  for (const kw of FINANCE_KEYWORDS) {
    if (lower.includes(kw.toLowerCase())) financeScore++;
  }
  for (const kw of TASK_KEYWORDS) {
    if (lower.includes(kw.toLowerCase())) taskScore++;
  }

  if (amount !== null) financeScore += 3;

  if (financeScore > taskScore && financeScore >= 2) {
    const isIncome = INCOME_KEYWORDS.some(kw => lower.includes(kw));
    return {
      type: 'FINANCE',
      confidence: financeScore >= 4 ? 'high' : 'medium',
      parsed: {
        amount: amount ?? undefined,
        category: isIncome ? undefined : guessExpenseCategory(lower),
        transactionType: isIncome ? 'income' : 'expense',
      },
    };
  }

  if (taskScore > financeScore && taskScore >= 1) {
    return { type: 'TASK', confidence: taskScore >= 3 ? 'high' : 'medium' };
  }

  if (amount !== null) {
    const isIncome = INCOME_KEYWORDS.some(kw => lower.includes(kw));
    return {
      type: 'FINANCE',
      confidence: 'medium',
      parsed: {
        amount,
        category: isIncome ? undefined : guessExpenseCategory(lower),
        transactionType: isIncome ? 'income' : 'expense',
      },
    };
  }

  return { type: 'IDEA', confidence: 'low' };
}

export async function classifyWithHabits(text: string): Promise<ClassificationResult> {
  const keywordResult = classifyByKeywords(text);
  const db = await getDb();

  // 1. 精確匹配：完全相同的輸入（最強信號）
  const exactMatch = await db.getFirstAsync<{ classified_type: string; cnt: number }>(
    `SELECT classified_type, COUNT(*) as cnt FROM entries
     WHERE LOWER(TRIM(raw_input)) = LOWER(TRIM(?))
     GROUP BY classified_type ORDER BY cnt DESC LIMIT 1`,
    [text]
  );
  if (exactMatch && exactMatch.cnt >= 1) {
    const learned = exactMatch.classified_type as ClassifiedType;
    const result = buildResult(learned, text);
    return { ...result, confidence: exactMatch.cnt >= 2 ? 'high' : 'medium' };
  }

  // 2. 相似度匹配：拿最近 100 筆 entries 比對 bigram 相似度
  const recent = await db.getAllAsync<{ raw_input: string; classified_type: string }>(
    'SELECT raw_input, classified_type FROM entries ORDER BY created_at DESC LIMIT 100'
  );

  const typeScores: Record<string, { score: number; count: number }> = {};
  for (const entry of recent) {
    const sim = similarity(text, entry.raw_input);
    if (sim >= 0.4) {
      const t = entry.classified_type;
      if (!typeScores[t]) typeScores[t] = { score: 0, count: 0 };
      typeScores[t].score += sim;
      typeScores[t].count++;
    }
  }

  let bestType: string | null = null;
  let bestScore = 0;
  let bestCount = 0;
  for (const [type, { score, count }] of Object.entries(typeScores)) {
    if (score > bestScore) {
      bestType = type;
      bestScore = score;
      bestCount = count;
    }
  }

  if (bestType && bestCount >= 2 && bestScore >= 1.0) {
    const learned = bestType as ClassifiedType;
    const result = buildResult(learned, text);
    return { ...result, confidence: bestScore >= 2.0 ? 'high' : 'medium' };
  }

  if (bestType && bestCount >= 1 && bestScore >= 0.7) {
    const learned = bestType as ClassifiedType;
    if (keywordResult.confidence === 'low') {
      const result = buildResult(learned, text);
      return { ...result, confidence: 'medium' };
    }
  }

  // 3. 單字匹配 fallback（短輸入用）
  const clean = text.replace(/\s+/g, '').toLowerCase();
  if (clean.length >= 1 && clean.length <= 4) {
    const charMatch = await db.getAllAsync<{ classified_type: string; cnt: number }>(
      `SELECT classified_type, COUNT(*) as cnt FROM entries
       WHERE LOWER(REPLACE(raw_input, ' ', '')) LIKE ?
       GROUP BY classified_type ORDER BY cnt DESC LIMIT 3`,
      [`%${clean}%`]
    );
    if (charMatch.length > 0 && charMatch[0].cnt >= 2) {
      const learned = charMatch[0].classified_type as ClassifiedType;
      const result = buildResult(learned, text);
      return { ...result, confidence: charMatch[0].cnt >= 3 ? 'high' : 'medium' };
    }
  }

  return keywordResult;
}

function buildResult(type: ClassifiedType, text: string): ClassificationResult {
  if (type === 'FINANCE') {
    const amount = extractAmount(text);
    const lower = text.toLowerCase();
    const isIncome = INCOME_KEYWORDS.some(kw => lower.includes(kw));
    return {
      type: 'FINANCE',
      confidence: 'medium',
      parsed: {
        amount: amount ?? undefined,
        category: isIncome ? undefined : guessExpenseCategory(lower),
        transactionType: isIncome ? 'income' : 'expense',
      },
    };
  }
  return { type, confidence: 'medium' };
}

export async function saveEntry(rawInput: string, classifiedType: ClassifiedType): Promise<string> {
  const db = await getDb();
  const id = Crypto.randomUUID();
  const now = new Date().toISOString();
  await db.runAsync(
    'INSERT INTO entries (id, raw_input, classified_type, created_at) VALUES (?, ?, ?, ?)',
    [id, rawInput, classifiedType, now]
  );
  return id;
}

export async function updateEntryType(id: string, newType: ClassifiedType): Promise<void> {
  const db = await getDb();
  await db.runAsync('UPDATE entries SET classified_type = ? WHERE id = ?', [newType, id]);
}
