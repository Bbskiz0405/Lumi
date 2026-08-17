import { getDb } from './db';
import {
  Transaction,
  Budget,
  ExpenseCategory,
  ExpenseCategoryMeta,
  CreateTransactionInput,
} from '../types/finance';
import * as Crypto from 'expo-crypto';

function nowISO(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const pad3 = (n: number) => String(n).padStart(3, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${pad3(d.getMilliseconds())}`;
}

export async function getTransactionsForMonth(month: string): Promise<Transaction[]> {
  const db = await getDb();
  return db.getAllAsync<Transaction>(
    `SELECT * FROM transactions WHERE strftime('%Y-%m', created_at) = ? ORDER BY created_at DESC`,
    [month]
  );
}

export async function createTransaction(input: CreateTransactionInput): Promise<Transaction> {
  const item = input.item.trim();
  if (!item) throw new Error('記帳項目不可空白');
  if (!Number.isFinite(input.amount) || input.amount <= 0) {
    throw new Error('記帳金額必須大於 0');
  }

  const db = await getDb();
  const id = Crypto.randomUUID();
  const now = nowISO();
  const tx: Transaction = {
    id,
    entry_id: input.entry_id ?? null,
    type: input.type,
    item,
    amount: input.amount,
    category: input.type === 'expense' ? (input.category ?? 'other') : null,
    created_at: input.created_at ?? now,
  };
  await db.runAsync(
    `INSERT INTO transactions (id, entry_id, type, item, amount, category, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [tx.id, tx.entry_id, tx.type, tx.item, tx.amount, tx.category, tx.created_at]
  );
  return tx;
}

export async function updateTransaction(
  id: string,
  updates: Partial<Pick<Transaction, 'type' | 'item' | 'amount' | 'category' | 'created_at'>>
): Promise<void> {
  const sanitized = { ...updates };
  if (sanitized.item !== undefined) {
    sanitized.item = sanitized.item.trim();
    if (!sanitized.item) throw new Error('記帳項目不可空白');
  }
  if (
    sanitized.amount !== undefined &&
    (!Number.isFinite(sanitized.amount) || sanitized.amount <= 0)
  ) {
    throw new Error('記帳金額必須大於 0');
  }

  const db = await getDb();
  const fields = Object.keys(sanitized) as (keyof typeof sanitized)[];
  if (fields.length === 0) return;
  const setClause = fields.map(f => `${f} = ?`).join(', ');
  const values = fields.map(f => sanitized[f] as string | number | null);
  await db.runAsync(`UPDATE transactions SET ${setClause} WHERE id = ?`, [...values, id]);
}

export async function deleteTransaction(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM transactions WHERE id = ?', [id]);
}

export async function getMonthSummary(month: string): Promise<{ income: number; expense: number }> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ type: string; total: number }>(
    `SELECT type, SUM(amount) as total FROM transactions WHERE strftime('%Y-%m', created_at) = ? GROUP BY type`,
    [month]
  );
  let income = 0, expense = 0;
  for (const r of rows) {
    if (r.type === 'income') income = r.total;
    else expense = r.total;
  }
  return { income, expense };
}

export async function getBudgetsForMonth(month: string): Promise<Budget[]> {
  const db = await getDb();
  return db.getAllAsync<Budget>('SELECT * FROM budgets WHERE month = ?', [month]);
}

export async function upsertBudget(
  category: ExpenseCategory,
  limitAmount: number,
  month: string
): Promise<void> {
  const db = await getDb();
  const existing = await db.getFirstAsync<Budget>(
    'SELECT * FROM budgets WHERE category = ? AND month = ?',
    [category, month]
  );
  if (existing) {
    await db.runAsync(
      'UPDATE budgets SET limit_amount = ?, is_ai_generated = 0 WHERE id = ?',
      [limitAmount, existing.id]
    );
  } else {
    const id = Crypto.randomUUID();
    await db.runAsync(
      'INSERT INTO budgets (id, category, limit_amount, month, is_ai_generated) VALUES (?, ?, ?, ?, 0)',
      [id, category, limitAmount, month]
    );
  }
}

export const DEFAULT_EXPENSE_CATEGORIES: ExpenseCategoryMeta[] = [
  { value: 'food', label: '餐飲', color: '#FF6655' },
  { value: 'transport', label: '交通', color: '#FF9944' },
  { value: 'interest', label: '興趣', color: '#88AAFF' },
  { value: 'daily', label: '日用品', color: '#55DDAA' },
  { value: 'medical', label: '醫療', color: '#E86A9A' },
  { value: 'education', label: '教育', color: '#B084F0' },
  { value: 'entertainment', label: '娛樂', color: '#F5C242' },
  { value: 'communication', label: '通訊', color: '#4FC3D9' },
  { value: 'housing', label: '居住', color: '#7E97B8' },
  { value: 'other', label: '其他', color: '#6D737A' },
];

/** 自訂分類沒有色票時，依 value 穩定挑一個，避免每次重開變色。 */
const CUSTOM_CATEGORY_PALETTE = [
  '#C98A5B', '#5BC9A0', '#9A8CF0', '#D96A6A', '#5B9AC9', '#C9B45B', '#8FBF5B', '#BF5BA8',
];

export const UNKNOWN_CATEGORY_COLOR = '#4A4F55';

function paletteColorFor(value: string): string {
  let hash = 0;
  for (let i = 0; i < value.length; i++) hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  return CUSTOM_CATEGORY_PALETTE[hash % CUSTOM_CATEGORY_PALETTE.length];
}

/** 舊版設定只存 value/label，補上色票後再交給畫面。 */
function normalizeCategories(raw: unknown): ExpenseCategoryMeta[] | null {
  if (!Array.isArray(raw)) return null;
  const normalized: ExpenseCategoryMeta[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const { value, label, color } = item as Partial<ExpenseCategoryMeta>;
    if (typeof value !== 'string' || !value) continue;
    normalized.push({
      value,
      label: typeof label === 'string' && label ? label : value,
      color: typeof color === 'string' && color
        ? color
        : DEFAULT_EXPENSE_CATEGORIES.find(c => c.value === value)?.color ?? paletteColorFor(value),
    });
  }
  return normalized.length > 0 ? normalized : null;
}

export async function getExpenseCategories(): Promise<ExpenseCategoryMeta[]> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ value: string }>('SELECT value FROM settings WHERE key = ?', ['expense_categories']);
  if (row) {
    try {
      return normalizeCategories(JSON.parse(row.value)) ?? DEFAULT_EXPENSE_CATEGORIES;
    } catch {
      return DEFAULT_EXPENSE_CATEGORIES;
    }
  }
  return DEFAULT_EXPENSE_CATEGORIES;
}

export async function saveExpenseCategories(categories: ExpenseCategoryMeta[]): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
    ['expense_categories', JSON.stringify(categories)]
  );
}

/**
 * 由標籤造一個新分類。value 用 slug，中文標籤 slug 後可能撞號或變空字串，
 * 所以再補上流水號確保唯一。
 */
export function createCategoryMeta(
  label: string,
  existing: ExpenseCategoryMeta[]
): ExpenseCategoryMeta | null {
  const trimmed = label.trim();
  if (!trimmed) return null;

  const slug = trimmed.toLowerCase().replace(/\s+/g, '_');
  const base = /^[a-z0-9_]+$/.test(slug) ? slug : `cat_${Date.now().toString(36)}`;
  let value = base;
  let suffix = 2;
  while (existing.some(c => c.value === value)) {
    value = `${base}_${suffix++}`;
  }

  const usedColors = new Set(existing.map(c => c.color));
  const freeColor = CUSTOM_CATEGORY_PALETTE.find(c => !usedColors.has(c));
  return { value, label: trimmed, color: freeColor ?? paletteColorFor(value) };
}

/**
 * 交易上的分類可能已被使用者刪掉或改名，查不到就退回顯示原始代號，
 * 不要讓畫面出現空白標籤。
 */
export function findCategoryMeta(
  categories: ExpenseCategoryMeta[],
  value: string | null | undefined
): ExpenseCategoryMeta {
  if (!value) return { value: '', label: '未分類', color: UNKNOWN_CATEGORY_COLOR };
  return (
    categories.find(c => c.value === value) ??
    DEFAULT_EXPENSE_CATEGORIES.find(c => c.value === value) ??
    { value, label: value, color: paletteColorFor(value) }
  );
}

export async function resetAllFinance(): Promise<void> {
  const db = await getDb();
  await db.withExclusiveTransactionAsync(async tx => {
    await tx.execAsync(`
      DELETE FROM transactions;
      DELETE FROM budgets;
    `);
  });
}

export async function getTransactionsForYear(year: string): Promise<Transaction[]> {
  const db = await getDb();
  return db.getAllAsync<Transaction>(
    `SELECT * FROM transactions WHERE strftime('%Y', created_at) = ? ORDER BY created_at DESC`,
    [year]
  );
}

export async function getAllTransactions(): Promise<Transaction[]> {
  const db = await getDb();
  return db.getAllAsync<Transaction>('SELECT * FROM transactions ORDER BY created_at DESC');
}

export async function getYearSummary(year: string): Promise<{ income: number; expense: number }> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ type: string; total: number }>(
    `SELECT type, SUM(amount) as total FROM transactions WHERE strftime('%Y', created_at) = ? GROUP BY type`,
    [year]
  );
  let income = 0, expense = 0;
  for (const r of rows) {
    if (r.type === 'income') income = r.total;
    else expense = r.total;
  }
  return { income, expense };
}

export async function getAllTimeSummary(): Promise<{ income: number; expense: number }> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ type: string; total: number }>(
    'SELECT type, SUM(amount) as total FROM transactions GROUP BY type'
  );
  let income = 0, expense = 0;
  for (const r of rows) {
    if (r.type === 'income') income = r.total;
    else expense = r.total;
  }
  return { income, expense };
}

export async function getExpenseByCategoryForYear(year: string): Promise<Record<string, number>> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ category: string; total: number }>(
    `SELECT category, SUM(amount) as total FROM transactions
     WHERE type = 'expense' AND strftime('%Y', created_at) = ?
     GROUP BY category`,
    [year]
  );
  const result: Record<string, number> = {};
  for (const r of rows) result[r.category] = r.total;
  return result;
}

export async function getExpenseByCategoryAllTime(): Promise<Record<string, number>> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ category: string; total: number }>(
    `SELECT category, SUM(amount) as total FROM transactions
     WHERE type = 'expense' GROUP BY category`
  );
  const result: Record<string, number> = {};
  for (const r of rows) result[r.category] = r.total;
  return result;
}

export async function getExpenseByCategory(month: string): Promise<Record<string, number>> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ category: string; total: number }>(
    `SELECT category, SUM(amount) as total FROM transactions
     WHERE type = 'expense' AND strftime('%Y-%m', created_at) = ?
     GROUP BY category`,
    [month]
  );
  const result: Record<string, number> = {};
  for (const r of rows) result[r.category] = r.total;
  return result;
}
