import { getDb } from './db';
import { Transaction, SavingsGoal } from '../types/finance';
import * as Crypto from 'expo-crypto';

/**
 * 財務分析頁的查詢層。記帳頁只關心「這個月有哪些筆」，這裡關心的是彙總、
 * 期間比較與推估，所以查詢都往 SQL 推，不把整包交易撈回 JS 再算。
 *
 * created_at 存的是不帶時區的本地時間字串，strftime 直接照字面切，
 * 與 financeService 的月份查詢維持同一套規則。
 */

export type PeriodMode = 'month' | 'year' | 'all';

export interface Period {
  mode: PeriodMode;
  /** 'YYYY-MM'，mode 為 month 時使用 */
  month: string;
  /** 'YYYY'，mode 為 year 時使用 */
  year: string;
}

interface PeriodFilter {
  where: string;
  params: string[];
}

function periodFilter(period: Period): PeriodFilter {
  if (period.mode === 'month') {
    return { where: `strftime('%Y-%m', created_at) = ?`, params: [period.month] };
  }
  if (period.mode === 'year') {
    return { where: `strftime('%Y', created_at) = ?`, params: [period.year] };
  }
  return { where: '1 = 1', params: [] };
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

export function monthKey(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}`;
}

/** 把 'YYYY-MM' 位移 n 個月，跨年自動進位。 */
export function shiftMonth(month: string, offset: number): string {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(y, (m - 1) + offset, 1);
  return monthKey(d);
}

/** 「全部」沒有可比較的前期，回 null 讓畫面隱藏增減欄位。 */
function previousPeriod(period: Period): Period | null {
  if (period.mode === 'month') {
    return { ...period, month: shiftMonth(period.month, -1) };
  }
  if (period.mode === 'year') {
    return { ...period, year: String(Number(period.year) - 1) };
  }
  return null;
}

async function sumByType(filter: PeriodFilter): Promise<{ income: number; expense: number }> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ type: string; total: number }>(
    `SELECT type, SUM(amount) AS total FROM transactions WHERE ${filter.where} GROUP BY type`,
    filter.params
  );
  let income = 0;
  let expense = 0;
  for (const row of rows) {
    if (row.type === 'income') income = row.total;
    else if (row.type === 'expense') expense = row.total;
  }
  return { income, expense };
}

/**
 * 平均每日支出的分母。當期還沒過完就只算到今天，否則剛開始的月份
 * 會被整月天數稀釋成看起來很省。
 */
async function daysElapsed(period: Period): Promise<number> {
  const now = new Date();
  if (period.mode === 'month') {
    const [y, m] = period.month.split('-').map(Number);
    if (y === now.getFullYear() && m === now.getMonth() + 1) return now.getDate();
    return new Date(y, m, 0).getDate();
  }
  if (period.mode === 'year') {
    const y = Number(period.year);
    if (y === now.getFullYear()) {
      const start = new Date(y, 0, 1);
      return Math.floor((now.getTime() - start.getTime()) / 86400000) + 1;
    }
    return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0 ? 366 : 365;
  }

  const db = await getDb();
  const row = await db.getFirstAsync<{ first: string | null }>(
    'SELECT MIN(created_at) AS first FROM transactions'
  );
  if (!row?.first) return 1;
  const start = new Date(row.first);
  if (!Number.isFinite(start.getTime())) return 1;
  return Math.max(1, Math.floor((now.getTime() - start.getTime()) / 86400000) + 1);
}

function changePct(current: number, previous: number): number | null {
  if (previous <= 0) return null;
  return (current - previous) / previous;
}

export interface FinanceOverview {
  income: number;
  expense: number;
  balance: number;
  /** 結餘 ÷ 收入。沒有收入時為 null，不要顯示 0%。 */
  savingsRate: number | null;
  dailyAvgExpense: number;
  incomeChangePct: number | null;
  expenseChangePct: number | null;
}

export async function getFinanceOverview(period: Period): Promise<FinanceOverview> {
  const current = await sumByType(periodFilter(period));
  const prevPeriod = previousPeriod(period);
  const previous = prevPeriod ? await sumByType(periodFilter(prevPeriod)) : null;
  const days = await daysElapsed(period);

  return {
    income: current.income,
    expense: current.expense,
    balance: current.income - current.expense,
    savingsRate: current.income > 0 ? (current.income - current.expense) / current.income : null,
    dailyAvgExpense: current.expense / days,
    incomeChangePct: previous ? changePct(current.income, previous.income) : null,
    expenseChangePct: previous ? changePct(current.expense, previous.expense) : null,
  };
}

export interface MonthlyTrendPoint {
  month: string;
  income: number;
  expense: number;
}

/** 回傳連續月份，沒有資料的月份補 0，圖表才不會塌成不等距。 */
export async function getMonthlyTrend(anchorMonth: string, count = 6): Promise<MonthlyTrendPoint[]> {
  const months: string[] = [];
  for (let i = count - 1; i >= 0; i--) months.push(shiftMonth(anchorMonth, -i));

  const db = await getDb();
  const rows = await db.getAllAsync<{ month: string; type: string; total: number }>(
    `SELECT strftime('%Y-%m', created_at) AS month, type, SUM(amount) AS total
     FROM transactions
     WHERE strftime('%Y-%m', created_at) BETWEEN ? AND ?
     GROUP BY month, type`,
    [months[0], months[months.length - 1]]
  );

  const byMonth = new Map<string, MonthlyTrendPoint>();
  for (const month of months) byMonth.set(month, { month, income: 0, expense: 0 });
  for (const row of rows) {
    const point = byMonth.get(row.month);
    if (!point) continue;
    if (row.type === 'income') point.income = row.total;
    else if (row.type === 'expense') point.expense = row.total;
  }
  return months.map(month => byMonth.get(month)!);
}

async function expenseByCategory(filter: PeriodFilter): Promise<Map<string, number>> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ category: string | null; total: number }>(
    `SELECT category, SUM(amount) AS total FROM transactions
     WHERE type = 'expense' AND ${filter.where}
     GROUP BY category`,
    filter.params
  );
  const result = new Map<string, number>();
  for (const row of rows) result.set(row.category ?? 'other', row.total);
  return result;
}

export interface CategoryRankItem {
  category: string;
  amount: number;
  /** 佔當期總支出比例，0–1 */
  share: number;
  previousAmount: number | null;
  changePct: number | null;
}

export async function getCategoryRanking(period: Period): Promise<CategoryRankItem[]> {
  const current = await expenseByCategory(periodFilter(period));
  const prevPeriod = previousPeriod(period);
  const previous = prevPeriod ? await expenseByCategory(periodFilter(prevPeriod)) : null;

  let total = 0;
  for (const amount of current.values()) total += amount;

  return [...current.entries()]
    .map(([category, amount]) => {
      const previousAmount = previous ? previous.get(category) ?? 0 : null;
      return {
        category,
        amount,
        share: total > 0 ? amount / total : 0,
        previousAmount,
        changePct: previousAmount === null ? null : changePct(amount, previousAmount),
      };
    })
    .sort((a, b) => b.amount - a.amount);
}

export async function getTopExpenses(period: Period, limit = 5): Promise<Transaction[]> {
  const filter = periodFilter(period);
  const db = await getDb();
  return db.getAllAsync<Transaction>(
    `SELECT * FROM transactions
     WHERE type = 'expense' AND ${filter.where}
     ORDER BY amount DESC, created_at DESC
     LIMIT ?`,
    [...filter.params, limit]
  );
}

export interface IncomeBreakdown {
  fixed: number;
  extra: number;
  /** 舊資料沒標記固定或額外，單獨列出而不是硬歸到某一邊。 */
  unclassified: number;
  total: number;
}

export async function getIncomeBreakdown(period: Period): Promise<IncomeBreakdown> {
  const filter = periodFilter(period);
  const db = await getDb();
  const rows = await db.getAllAsync<{ income_kind: string | null; total: number }>(
    `SELECT income_kind, SUM(amount) AS total FROM transactions
     WHERE type = 'income' AND ${filter.where}
     GROUP BY income_kind`,
    filter.params
  );

  const breakdown: IncomeBreakdown = { fixed: 0, extra: 0, unclassified: 0, total: 0 };
  for (const row of rows) {
    if (row.income_kind === 'fixed') breakdown.fixed = row.total;
    else if (row.income_kind === 'extra') breakdown.extra = row.total;
    else breakdown.unclassified += row.total;
    breakdown.total += row.total;
  }
  return breakdown;
}

export interface BufferEstimate {
  /** 歷來收入減支出。App 沒有帳戶餘額，這是能拿到最接近存款的數字。 */
  cumulativeBalance: number;
  avgMonthlyExpense: number;
  /** 累計結餘可支撐幾個月。沒有支出紀錄時為 null。 */
  months: number | null;
}

export async function getBufferEstimate(anchorMonth: string, window = 3): Promise<BufferEstimate> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ type: string; total: number }>(
    `SELECT type, SUM(amount) AS total FROM transactions GROUP BY type`
  );
  let income = 0;
  let expense = 0;
  for (const row of rows) {
    if (row.type === 'income') income = row.total;
    else if (row.type === 'expense') expense = row.total;
  }

  const trend = await getMonthlyTrend(anchorMonth, window);
  const monthsWithSpending = trend.filter(point => point.expense > 0);
  const avgMonthlyExpense = monthsWithSpending.length > 0
    ? monthsWithSpending.reduce((sum, point) => sum + point.expense, 0) / monthsWithSpending.length
    : 0;

  const cumulativeBalance = income - expense;
  return {
    cumulativeBalance,
    avgMonthlyExpense,
    months: avgMonthlyExpense > 0 ? cumulativeBalance / avgMonthlyExpense : null,
  };
}

export interface BudgetUsageItem {
  category: string;
  spent: number;
  /** 0 代表沒設上限。 */
  limit: number;
}

/** 有預算或有支出的分類都會出現，這樣沒設上限的大宗開銷不會被藏起來。 */
export async function getBudgetUsage(month: string): Promise<BudgetUsageItem[]> {
  const db = await getDb();
  const spent = await expenseByCategory({
    where: `strftime('%Y-%m', created_at) = ?`,
    params: [month],
  });
  const budgets = await db.getAllAsync<{ category: string; limit_amount: number }>(
    'SELECT category, limit_amount FROM budgets WHERE month = ?',
    [month]
  );

  const items = new Map<string, BudgetUsageItem>();
  for (const [category, amount] of spent) {
    items.set(category, { category, spent: amount, limit: 0 });
  }
  for (const budget of budgets) {
    const existing = items.get(budget.category);
    if (existing) existing.limit = budget.limit_amount;
    else items.set(budget.category, { category: budget.category, spent: 0, limit: budget.limit_amount });
  }

  return [...items.values()].sort((a, b) => {
    const aOver = a.limit > 0 ? a.spent / a.limit : -1;
    const bOver = b.limit > 0 ? b.spent / b.limit : -1;
    if (aOver !== bOver) return bOver - aOver;
    return b.spent - a.spent;
  });
}

function nowISO(): string {
  const d = new Date();
  const pad3 = (n: number) => String(n).padStart(3, '0');
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}.${pad3(d.getMilliseconds())}`;
}

export async function getSavingsGoals(): Promise<SavingsGoal[]> {
  const db = await getDb();
  return db.getAllAsync<SavingsGoal>(
    `SELECT * FROM savings_goals ORDER BY status = 'done', created_at DESC`
  );
}

export async function createSavingsGoal(input: {
  title: string;
  targetAmount: number;
  savedAmount?: number;
  targetDate?: string | null;
}): Promise<SavingsGoal> {
  const title = input.title.trim();
  if (!title) throw new Error('目標名稱不可空白');
  if (!Number.isFinite(input.targetAmount) || input.targetAmount <= 0) {
    throw new Error('目標金額必須大於 0');
  }

  const db = await getDb();
  const now = nowISO();
  const goal: SavingsGoal = {
    id: Crypto.randomUUID(),
    title,
    target_amount: input.targetAmount,
    saved_amount: Math.max(0, input.savedAmount ?? 0),
    target_date: input.targetDate ?? null,
    status: 'active',
    created_at: now,
    updated_at: now,
  };
  await db.runAsync(
    `INSERT INTO savings_goals (id, title, target_amount, saved_amount, target_date, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      goal.id,
      goal.title,
      goal.target_amount,
      goal.saved_amount,
      goal.target_date,
      goal.status,
      goal.created_at,
      goal.updated_at,
    ]
  );
  return goal;
}

export async function updateSavingsGoal(
  id: string,
  updates: Partial<Pick<SavingsGoal, 'title' | 'target_amount' | 'saved_amount' | 'target_date' | 'status'>>
): Promise<void> {
  const sanitized = { ...updates };
  if (sanitized.title !== undefined) {
    sanitized.title = sanitized.title.trim();
    if (!sanitized.title) throw new Error('目標名稱不可空白');
  }
  if (sanitized.target_amount !== undefined && (!Number.isFinite(sanitized.target_amount) || sanitized.target_amount <= 0)) {
    throw new Error('目標金額必須大於 0');
  }
  if (sanitized.saved_amount !== undefined && (!Number.isFinite(sanitized.saved_amount) || sanitized.saved_amount < 0)) {
    throw new Error('已存金額不可為負');
  }

  const fields = Object.keys(sanitized) as (keyof typeof sanitized)[];
  if (fields.length === 0) return;

  const db = await getDb();
  const setClause = [...fields.map(f => `${f} = ?`), 'updated_at = ?'].join(', ');
  const values = fields.map(f => sanitized[f] as string | number | null);
  await db.runAsync(`UPDATE savings_goals SET ${setClause} WHERE id = ?`, [...values, nowISO(), id]);
}

export async function deleteSavingsGoal(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM savings_goals WHERE id = ?', [id]);
}

export interface SavingsGoalProgress {
  goal: SavingsGoal;
  remaining: number;
  /** 0–1，已達標時為 1 */
  progress: number;
  /** 依近期月均結餘推估還要幾個月。結餘不為正時為 null。 */
  monthsNeeded: number | null;
  /** 有設定目標日期時，反推每月至少要存多少。 */
  requiredMonthly: number | null;
}

/** 月均結餘：只算有紀錄的月份，剛裝 App 的空月份不該把平均拉低。 */
export async function getAvgMonthlySurplus(anchorMonth: string, window = 6): Promise<number> {
  const trend = await getMonthlyTrend(anchorMonth, window);
  const active = trend.filter(point => point.income > 0 || point.expense > 0);
  if (active.length === 0) return 0;
  return active.reduce((sum, point) => sum + (point.income - point.expense), 0) / active.length;
}

function monthsUntil(targetDate: string): number | null {
  const target = new Date(targetDate);
  if (!Number.isFinite(target.getTime())) return null;
  const now = new Date();
  const months =
    (target.getFullYear() - now.getFullYear()) * 12 +
    (target.getMonth() - now.getMonth());
  return months > 0 ? months : null;
}

export function buildGoalProgress(goal: SavingsGoal, avgMonthlySurplus: number): SavingsGoalProgress {
  const remaining = Math.max(0, goal.target_amount - goal.saved_amount);
  const monthsToTarget = goal.target_date ? monthsUntil(goal.target_date) : null;

  return {
    goal,
    remaining,
    progress: goal.target_amount > 0 ? Math.min(1, goal.saved_amount / goal.target_amount) : 0,
    monthsNeeded:
      remaining > 0 && avgMonthlySurplus > 0 ? Math.ceil(remaining / avgMonthlySurplus) : null,
    requiredMonthly:
      remaining > 0 && monthsToTarget !== null ? remaining / monthsToTarget : null,
  };
}
