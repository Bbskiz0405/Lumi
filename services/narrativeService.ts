import { getDb } from './db';
import { generateMonthNarrative } from './geminiService';

/**
 * A 路線 — 月底敘事回顧的快取層。
 * 生成要打 AI，存進 settings 表（key = `narrative_YYYY-MM`），避免每次開時間軸都重打。
 * 使用者可手動「重新生成」覆蓋。
 */

export interface MonthNarrative {
  month: string;       // 'YYYY-MM'
  text: string;
  generatedAt: string; // ISO
}

function cacheKey(month: string): string {
  return `narrative_${month}`;
}

export function currentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export async function getCachedNarrative(month: string): Promise<MonthNarrative | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ value: string }>(
    'SELECT value FROM settings WHERE key = ?',
    [cacheKey(month)]
  );
  if (!row) return null;
  try {
    return JSON.parse(row.value) as MonthNarrative;
  } catch {
    return null;
  }
}

export async function regenerateNarrative(month: string): Promise<MonthNarrative> {
  const text = await generateMonthNarrative(month);
  const data: MonthNarrative = { month, text, generatedAt: new Date().toISOString() };
  const db = await getDb();
  await db.runAsync(
    'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
    [cacheKey(month), JSON.stringify(data)]
  );
  return data;
}
