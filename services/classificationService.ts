import { getDb } from './db';
import { ClassifiedType } from '../types/entry';
import * as Crypto from 'expo-crypto';

export interface ClassificationResult {
  type: ClassifiedType;
  confidence: 'high' | 'medium' | 'low';
  parsed?: {
    amount?: number;
    category?: string;
    newCategoryLabel?: string;
    transactionType?: 'income' | 'expense';
    /** Income only: salary-like fixed income vs. one-off extra income. */
    incomeKind?: 'fixed' | 'extra';
    dueDate?: string;
    /** Finance only: YYYY-MM-DD when the text names a past day (昨天, 10/15…); absent means today. */
    date?: string;
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

const INCOME_KEYWORDS = [
  '收入', '薪水', '薪資', '月薪', '獎金', '年終', '分紅', '入帳', '進帳', '賺', '還我', '收到',
  '中獎', '利息', '股利', '股息', '退款', '退費', '退稅', '接案', '稿費', '零用錢', '回饋金', '現金回饋',
  '存款', '存進', '儲蓄',
];
const FIXED_INCOME_KEYWORDS = ['薪水', '薪資', '月薪', '固定收入', '房租收入', '租金收入'];

const TASK_KEYWORDS = [
  '要', '記得', '別忘', '提醒', '做', '完成', '處理', '準備', '交',
  'deadline', '截止', '到期', '明天', '後天', '下週', '下禮拜',
  '報告', '作業', '考試', '開會', '會議',
];
// Reminders and future days mean "something to do", even when money is mentioned.
const STRONG_TASK = /^(?:記得|別忘|提醒)|提醒我|明天|後天|下週|下禮拜|下星期|deadline|截止/i;
// Records of what happened are notes unless they carry an amount.
const STRONG_NOTE = /紀錄|記錄|筆記|心得|摘要|想法|感想|整理/;

// Longest matching keyword wins, so "uber eats" beats "uber" and "醬油" never reads as "油".
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  food: [
    '餐', '吃', '飯', '麵', '早餐', '午餐', '晚餐', '宵夜', '早午餐', '下午茶', '點心', '零食', '飲料', '咖啡', '拿鐵',
    '奶茶', '珍奶', '手搖', '手搖飲', '茶', '便當', '外送', 'uber eats', 'ubereats', 'foodpanda', '熊貓', '火鍋',
    '壽司', '拉麵', '牛排', '鹹酥雞', '雞排', '滷味', '麥當勞', '肯德基', '摩斯', '漢堡', '星巴克', '路易莎', 'cama',
    '水果', '麵包', '蛋糕', '甜點', '蛋餅', '吐司', '飯糰', '聚餐', '買菜', '食材', '小吃', '水餃', '鍋貼',
    '自助餐', '啤酒', '酒',
  ],
  daily: [
    '日用品', '生活用品', '衛生紙', '洗衣精', '洗衣', '清潔', '牙膏', '牙刷', '洗髮', '沐浴', '洗碗', '垃圾袋',
    '醬油', '調味料', '廚房紙巾', '全聯', '家樂福', '好市多', 'costco', '大潤發', '超市', '屈臣氏', '康是美',
    '寶雅', '大創', '無印', 'ikea', '宜家', '電池', '燈泡', '保養品', '化妝品',
  ],
  transport: [
    '車', '加油', '汽油', '油錢', '機油', '停車', '停車費', '捷運', '公車', '客運', '高鐵', '台鐵', '火車', '計程',
    '計程車', '小黃', 'uber', 'youbike', 'ubike', '悠遊卡', '一卡通', '車票', '機票', 'etc', '過路費', '機車',
    '汽車', '保養', '洗車', '輪胎', '租車', 'gogoro', '換電', '船票',
  ],
  interest: [
    '遊戲', 'game', 'steam', 'switch', 'ps5', '漫畫', '動漫', '模型', '公仔', '扭蛋', '轉蛋', '抽卡', '課金',
    '卡牌', '樂高', 'lego', '健身', '健身房', '運動', '樂器', '吉他', '攝影', '訂閱', '會員',
  ],
  entertainment: [
    '娛樂', '電影', '電影票', 'ktv', '唱歌', '展覽', '演唱會', '門票', 'netflix', 'disney+', 'disney', 'spotify',
    'youtube premium', 'kkbox', '旅遊', '旅行', '住宿', '飯店', '民宿', '出去玩', '遊樂園', '酒吧', '桌遊',
  ],
  communication: [
    '通訊', '電話費', '手機費', '網路費', '電信', '門號', '寬頻', '中華電信', '台灣大哥大', '台哥大', '遠傳',
    '月租費', '話費',
  ],
  housing: [
    '居住', '房租', '租金', '水電', '電費', '水費', '瓦斯', '瓦斯費', '管理費', '房貸', '修繕', '家具', '家電',
    '裝潢', '第四台',
  ],
  medical: [
    '醫療', '醫院', '診所', '看醫生', '看病', '掛號', '掛號費', '藥局', '藥品', '藥', '感冒藥', '牙醫', '復健',
    '健檢', '眼科', '眼鏡', '隱形眼鏡', '維他命', '保健食品', '中醫', '口罩',
  ],
  education: [
    '教育', '學費', '書籍', '買書', '書', '課程', '線上課程', '補習', '補習費', '講義', '文具', '學習', '報名費',
    '證照', 'udemy', 'hahow',
  ],
};
const CATEGORY_ENTRIES = Object.entries(CATEGORY_KEYWORDS).flatMap(([category, words]) =>
  words.map(word => ({ category, word: word.toLowerCase() })));

export function guessExpenseCategory(text: string): string {
  const lower = text.toLowerCase();
  let best: { category: string; length: number } | null = null;
  for (const { category, word } of CATEGORY_ENTRIES) {
    if (lower.includes(word) && (!best || word.length > best.length)) best = { category, length: word.length };
  }
  return best?.category ?? 'other';
}

const pad = (value: number) => String(value).padStart(2, '0');
const isoDay = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

const RELATIVE_DAYS: [RegExp, number][] = [[/大前天/, -3], [/前天/, -2], [/昨天|昨晚|昨日/, -1], [/今天|今晚|今日/, 0]];
const EXPLICIT_DATE = /(?:(\d{4})[-/年])?(\d{1,2})[/月](\d{1,2})日?/;

/** Removes date phrases so their digits are never read as an amount. */
function stripDates(text: string): string {
  return text.replace(new RegExp(EXPLICIT_DATE.source, 'g'), ' ').replace(/大前天|前天|昨天|昨晚|昨日|今天|今晚|今日/g, ' ');
}

/** Past day named in a finance entry, or undefined for today. Future dates are read as last year. */
export function parseFinanceDate(text: string, now = new Date()): string | undefined {
  const today = isoDay(now);
  const explicit = text.match(EXPLICIT_DATE);
  if (explicit) {
    const month = Number(explicit[2]);
    const day = Number(explicit[3]);
    let year = explicit[1] ? Number(explicit[1]) : now.getFullYear();
    let date = new Date(year, month - 1, day);
    if (date.getMonth() !== month - 1 || date.getDate() !== day) return undefined;
    if (!explicit[1] && isoDay(date) > today) date = new Date(--year, month - 1, day);
    const value = isoDay(date);
    return value === today || value > today ? undefined : value;
  }
  for (const [pattern, offset] of RELATIVE_DAYS) {
    if (pattern.test(text)) {
      if (offset === 0) return undefined;
      const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset);
      return isoDay(date);
    }
  }
  return undefined;
}

/**
 * Canonical money text: full-width digits, thousands separators, 萬/千/k and NT$ are rewritten
 * so "1,050" is one number (not 1 and 50) and "1.2萬" reads as 12000.
 */
export function normalizeMoneyText(text: string): string {
  return text
    .replace(/[０-９]/g, char => String.fromCharCode(char.charCodeAt(0) - 0xFEE0))
    .replace(/[＄]/g, '$')
    .replace(/(\d),(?=\d{3}(?!\d))/g, '$1')
    .replace(/(\d+(?:\.\d+)?)\s*(萬|千|[kK])(?![a-zA-Z])/g, (_, number: string, unit: string) =>
      String(Math.round(Number(number) * (unit === '萬' ? 10000 : 1000))))
    .replace(/NT\$?/gi, '$');
}

const TIME_CONTEXT = /(?:早上|上午|中午|下午|傍晚|晚上|凌晨|今天|明天|後天)\s*\d|^\d{1,2}\s*[點時:：.]|[\d]\s*[點時]/;

function validAmount(value: string | undefined): number | null {
  const n = value === undefined ? NaN : parseFloat(value);
  return n > 0 && n < 10_000_000 ? n : null;
}

export function extractAmount(text: string): number | null {
  if (TIME_CONTEXT.test(text)) return null;
  const clean = stripDates(normalizeMoneyText(text));
  return validAmount(clean.match(/(\d+(?:\.\d+)?)\s*(?:元|塊)/)?.[1])
    ?? validAmount(clean.match(/\$\s*(\d+(?:\.\d+)?)/)?.[1])
    ?? validAmount(clean.match(/(?:^|[^年月日時點:：\d.])\s*(\d+(?:\.\d+)?)\s*$/)?.[1])
    ?? (() => {
      const numbers = clean.match(/\d+(?:\.\d+)?/g) ?? [];
      return numbers.length === 1 ? validAmount(numbers[0]) : null;
    })();
}

/** The purchase name stored on a transaction: no amount, currency or date words. */
export function extractItemName(text: string): string {
  const item = stripDates(normalizeMoneyText(text))
    .replace(/\$?\s*\d+(?:\.\d+)?\s*(?:元|塊)?/g, ' ')
    .replace(/[\s,，、:：]+/g, ' ')
    .trim();
  return item || text.trim();
}

function incomeKindOf(text: string): 'fixed' | 'extra' {
  return FIXED_INCOME_KEYWORDS.some(word => text.includes(word)) ? 'fixed' : 'extra';
}

function isIncomeText(lower: string): boolean {
  return INCOME_KEYWORDS.some(kw => lower.includes(kw));
}

function financeParsed(text: string, amount: number | null, now: Date): NonNullable<ClassificationResult['parsed']> {
  const lower = text.toLowerCase();
  const income = isIncomeText(lower);
  const date = parseFinanceDate(text, now);
  return {
    amount: amount ?? undefined,
    category: income ? undefined : guessExpenseCategory(lower),
    transactionType: income ? 'income' : 'expense',
    ...(income ? { incomeKind: incomeKindOf(text) } : {}),
    ...(date ? { date } : {}),
  };
}

export interface ParsedTransaction {
  item: string;
  amount: number;
  category: string;
  transactionType: 'income' | 'expense';
  incomeKind?: 'fixed' | 'extra';
}

const MULTI_ITEM_PATTERN = /([^\d\s$元塊]+)\s*\$?\s*(\d+(?:\.\d+)?)\s*(?:元|塊)?/g;

export function parseMultipleTransactions(text: string): ParsedTransaction[] {
  if (TIME_CONTEXT.test(text)) return [];
  const clean = stripDates(normalizeMoneyText(text));
  const lower = clean.toLowerCase();
  const isIncome = isIncomeText(lower);

  const results: ParsedTransaction[] = [];
  let match;
  MULTI_ITEM_PATTERN.lastIndex = 0;

  while ((match = MULTI_ITEM_PATTERN.exec(clean)) !== null) {
    const item = match[1].replace(/[,，、:：]/g, ' ').trim();
    const amount = parseFloat(match[2]);
    if (item && amount > 0 && amount < 10_000_000) {
      results.push({
        item,
        amount,
        category: isIncome ? '' : guessExpenseCategory(item.toLowerCase()),
        transactionType: isIncome ? 'income' : 'expense',
        ...(isIncome ? { incomeKind: incomeKindOf(item) } : {}),
      });
    }
  }

  return results;
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

export function classifyByKeywords(text: string, now = new Date()): ClassificationResult {
  const lower = text.toLowerCase();
  const amount = extractAmount(text);

  if (STRONG_TASK.test(text)) return { type: 'TASK', confidence: 'medium' };
  if (amount === null && STRONG_NOTE.test(text)) return { type: 'IDEA', confidence: 'medium' };

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
    return { type: 'FINANCE', confidence: financeScore >= 4 ? 'high' : 'medium', parsed: financeParsed(text, amount, now) };
  }

  if (taskScore > financeScore && taskScore >= 1) {
    return { type: 'TASK', confidence: taskScore >= 3 ? 'high' : 'medium' };
  }

  if (amount !== null) {
    return { type: 'FINANCE', confidence: 'medium', parsed: financeParsed(text, amount, now) };
  }

  return { type: 'IDEA', confidence: 'low' };
}

/**
 * The category the user has most often kept for this exact item. Edits in the bookkeeping
 * screen update transactions, so a corrected category is learned automatically.
 */
export async function getLearnedCategory(text: string): Promise<string | null> {
  const item = extractItemName(text).toLowerCase();
  if (!item) return null;
  const db = await getDb();
  const row = await db.getFirstAsync<{ category: string }>(
    `SELECT category FROM transactions
     WHERE type = 'expense' AND is_adjustment = 0 AND category IS NOT NULL AND category != 'other'
       AND LOWER(TRIM(item)) = ?
     GROUP BY category ORDER BY COUNT(*) DESC, MAX(created_at) DESC LIMIT 1`,
    [item]
  );
  return row?.category ?? null;
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
    return { type: 'FINANCE', confidence: 'medium', parsed: financeParsed(text, extractAmount(text), new Date()) };
  }
  return { type, confidence: 'medium' };
}

export async function saveEntry(rawInput: string, classifiedType: ClassifiedType): Promise<string> {
  const normalizedInput = rawInput.trim();
  if (!normalizedInput) throw new Error('輸入內容不可空白');

  const db = await getDb();
  const id = Crypto.randomUUID();
  const now = new Date().toISOString();
  await db.runAsync(
    'INSERT INTO entries (id, raw_input, classified_type, created_at) VALUES (?, ?, ?, ?)',
    [id, normalizedInput, classifiedType, now]
  );
  return id;
}

export async function rollbackEntry(id: string): Promise<void> {
  const db = await getDb();
  await db.withExclusiveTransactionAsync(async tx => {
    await tx.runAsync('DELETE FROM tasks WHERE entry_id = ?', [id]);
    await tx.runAsync('DELETE FROM transactions WHERE entry_id = ?', [id]);
    await tx.runAsync('DELETE FROM notes WHERE entry_id = ?', [id]);
    await tx.runAsync('DELETE FROM entries WHERE id = ?', [id]);
  });
}

/**
 * Whether a local parse is reliable enough to save without waiting for AI (faster, no quota,
 * works offline). Users with custom categories still ask AI for first-time items, since the
 * keyword table only knows the built-in categories.
 */
export function canSkipAI(
  result: ClassificationResult,
  text: string,
  options: { learnedCategory: string | null; hasCustomCategories: boolean },
): boolean {
  if (result.type !== 'FINANCE') return false;
  const parsed = result.parsed;
  if (!parsed?.amount || parsed.amount <= 0) return false;
  if (parseMultipleTransactions(text).length >= 2) return true;
  if (parsed.transactionType === 'income') return true;
  if (options.learnedCategory) return true;
  return !!parsed.category && parsed.category !== 'other' && !options.hasCustomCategories;
}
