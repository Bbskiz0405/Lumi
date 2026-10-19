import { getDb } from './db';
import { EXCLUDE_ADJUSTMENTS, getBudgetsForMonth } from './financeService';
import { Transaction } from '../types/finance';

/**
 * 財務分析頁最上方的「結論」：把數字跟使用者自己的平常比，回答
 * 這個月還好嗎、哪裡不一樣、小錢漏在哪、每月固定要付多少。
 * 全部在手機上計算；歷史不夠時明說，不硬給數字。
 */

const HISTORY_MONTHS = 3;
const SMALL_SPEND_MAX_AVG = 300;
const SMALL_SPEND_MIN_COUNT = 4;
const CHANGE_MIN_DIFF = 300;
const CHANGE_MIN_RATIO = 0.3;
const FIXED_MAX_SPREAD = 1.3;

export interface MonthPulse {
  month: string;
  isCurrent: boolean;
  /** Day of month the comparison runs to (today, or the last day for a past month). */
  day: number;
  daysInMonth: number;
  /** Days left including today; 0 for a past month. */
  daysLeft: number;
  spent: number;
  /** Complete earlier months used as "usual"; 0 means no comparison is possible yet. */
  historyMonths: number;
  typicalSoFar: number | null;
  typicalTotal: number | null;
  vsTypical: number | null;
  projected: number | null;
  projectedBasis: 'history' | 'pace' | null;
  dailyAllowance: number | null;
  allowanceBasis: 'budget' | 'typical' | null;
}

export interface ChangeDriver { item: string; total: number; count: number }
export interface CategoryChange { category: string; current: number; typical: number; diff: number; ratio: number | null; drivers: ChangeDriver[] }
export interface SmallSpend { item: string; category: string | null; count: number; total: number; yearly: number }
export interface FixedCost { item: string; category: string | null; monthly: number; months: number; paidThisMonth: boolean }

export interface FinanceInsights {
  pulse: MonthPulse;
  changes: CategoryChange[];
  smallSpends: SmallSpend[];
  smallSpendWindowDays: number;
  fixedCosts: FixedCost[];
  fixedTotal: number;
}

const monthOf = (createdAt: string) => createdAt.slice(0, 7);
const dayOf = (createdAt: string) => Number(createdAt.slice(8, 10));
const daysIn = (month: string) => { const [y, m] = month.split('-').map(Number); return new Date(y, m, 0).getDate(); };
const pad = (n: number) => String(n).padStart(2, '0');
export function shiftMonthKey(month: string, offset: number): string {
  const [y, m] = month.split('-').map(Number);
  const date = new Date(y, m - 1 + offset, 1);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;
}
const itemKey = (item: string) => item.trim().toLowerCase();
const sum = (values: number[]) => values.reduce((a, b) => a + b, 0);
const mean = (values: number[]) => sum(values) / values.length;
const median = (values: number[]) => {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};

/**
 * A history month only counts as "usual" when records already existed when it began;
 * a half-tracked first month would make every later month look expensive.
 */
function usableHistory(anchor: string, firstRecord: string | null): string[] {
  if (!firstRecord) return [];
  return Array.from({ length: HISTORY_MONTHS }, (_, i) => shiftMonthKey(anchor, -(i + 1)))
    .filter(month => firstRecord.slice(0, 10) <= `${month}-03`);
}

export function computeFinanceInsights(
  transactions: Transaction[], anchor: string, now: Date, firstRecord: string | null, budgetTotal: number | null,
): FinanceInsights {
  const expenses = transactions.filter(tx => tx.type === 'expense' && !tx.is_adjustment);
  const today = `${now.getFullYear()}-${pad(now.getMonth() + 1)}`;
  const isCurrent = anchor === today;
  const dim = daysIn(anchor);
  const day = isCurrent ? now.getDate() : anchor < today ? dim : 0;
  const history = usableHistory(anchor, firstRecord);

  const inMonthSoFar = (month: string, limitDay: number) =>
    expenses.filter(tx => monthOf(tx.created_at) === month && dayOf(tx.created_at) <= limitDay);
  const current = inMonthSoFar(anchor, day);
  const spent = sum(current.map(tx => tx.amount));

  // --- 這個月還好嗎 ---
  const soFarByMonth = history.map(month => sum(inMonthSoFar(month, Math.min(day, daysIn(month))).map(tx => tx.amount)));
  const totalByMonth = history.map(month => sum(inMonthSoFar(month, 31).map(tx => tx.amount)));
  const typicalSoFar = history.length ? mean(soFarByMonth) : null;
  const typicalTotal = history.length ? mean(totalByMonth) : null;
  let projected: number | null = null;
  let projectedBasis: MonthPulse['projectedBasis'] = null;
  if (!isCurrent) {
    projected = spent;
  } else if (history.length) {
    projected = spent + mean(totalByMonth.map((total, i) => total - soFarByMonth[i]));
    projectedBasis = 'history';
  } else if (day >= 7) {
    projected = spent / day * dim;
    projectedBasis = 'pace';
  }
  const daysLeft = isCurrent ? dim - day + 1 : 0;
  const target = budgetTotal && budgetTotal > 0 ? budgetTotal : typicalTotal;
  const allowanceBasis: MonthPulse['allowanceBasis'] = budgetTotal && budgetTotal > 0 ? 'budget' : typicalTotal ? 'typical' : null;
  const dailyAllowance = isCurrent && daysLeft > 0 && target ? Math.max(0, (target - spent) / daysLeft) : null;
  const pulse: MonthPulse = {
    month: anchor, isCurrent, day, daysInMonth: dim, daysLeft, spent, historyMonths: history.length,
    typicalSoFar, typicalTotal,
    vsTypical: typicalSoFar && typicalSoFar > 0 ? (spent - typicalSoFar) / typicalSoFar : null,
    projected: projected === null ? null : Math.round(projected), projectedBasis,
    dailyAllowance: dailyAllowance === null ? null : Math.floor(dailyAllowance),
    allowanceBasis: dailyAllowance === null ? null : allowanceBasis,
  };

  // --- 這個月哪裡不一樣 ---
  const changes: CategoryChange[] = [];
  if (history.length && day > 0) {
    const categories = new Set([...current, ...history.flatMap(month => inMonthSoFar(month, day))].map(tx => tx.category ?? 'other'));
    for (const category of categories) {
      const amount = sum(current.filter(tx => (tx.category ?? 'other') === category).map(tx => tx.amount));
      const usual = mean(history.map(month => sum(inMonthSoFar(month, Math.min(day, daysIn(month)))
        .filter(tx => (tx.category ?? 'other') === category).map(tx => tx.amount))));
      const diff = amount - usual;
      if (Math.abs(diff) < CHANGE_MIN_DIFF || (usual > 0 && Math.abs(diff) / usual < CHANGE_MIN_RATIO)) continue;
      const byItem = new Map<string, ChangeDriver>();
      for (const tx of current.filter(tx => (tx.category ?? 'other') === category)) {
        const entry = byItem.get(itemKey(tx.item)) ?? { item: tx.item.trim(), total: 0, count: 0 };
        entry.total += tx.amount; entry.count += 1;
        byItem.set(itemKey(tx.item), entry);
      }
      changes.push({
        category, current: amount, typical: Math.round(usual), diff: Math.round(diff),
        ratio: usual > 0 ? diff / usual : null,
        drivers: diff > 0 ? [...byItem.values()].sort((a, b) => b.total - a.total).slice(0, 2) : [],
      });
    }
  }
  // Up to three increases, then the single biggest saving so good news shows too.
  const ups = changes.filter(change => change.diff > 0).sort((a, b) => b.diff - a.diff).slice(0, 3);
  const down = changes.filter(change => change.diff < 0).sort((a, b) => a.diff - b.diff).slice(0, 1);

  // --- 小錢累積：參考日往回 30 天 ---
  const windowDays = 30;
  const refDate = day > 0 ? new Date(Number(anchor.slice(0, 4)), Number(anchor.slice(5, 7)) - 1, day) : null;
  const smallSpends: SmallSpend[] = [];
  if (refDate) {
    const from = new Date(refDate); from.setDate(from.getDate() - windowDays + 1);
    const fromKey = `${from.getFullYear()}-${pad(from.getMonth() + 1)}-${pad(from.getDate())}`;
    const toKey = `${refDate.getFullYear()}-${pad(refDate.getMonth() + 1)}-${pad(refDate.getDate())}`;
    const groups = new Map<string, { item: string; category: string | null; amounts: number[] }>();
    for (const tx of expenses) {
      const key = tx.created_at.slice(0, 10);
      if (key < fromKey || key > toKey) continue;
      const group = groups.get(itemKey(tx.item)) ?? { item: tx.item.trim(), category: tx.category, amounts: [] };
      group.amounts.push(tx.amount);
      groups.set(itemKey(tx.item), group);
    }
    for (const group of groups.values()) {
      if (group.amounts.length < SMALL_SPEND_MIN_COUNT || mean(group.amounts) > SMALL_SPEND_MAX_AVG) continue;
      const total = sum(group.amounts);
      smallSpends.push({ item: group.item, category: group.category, count: group.amounts.length, total, yearly: Math.round(total * 365 / windowDays) });
    }
    smallSpends.sort((a, b) => b.total - a.total).splice(3);
  }

  // --- 每月固定支出：歷史月份大多都出現、一個月約一次、金額穩定 ---
  const fixedCosts: FixedCost[] = [];
  if (history.length >= 2) {
    const needed = Math.min(3, history.length);
    const groups = new Map<string, { item: string; category: string | null; byMonth: Map<string, number[]> }>();
    for (const tx of expenses) {
      const month = monthOf(tx.created_at);
      if (!history.includes(month) && month !== anchor) continue;
      const group = groups.get(itemKey(tx.item)) ?? { item: tx.item.trim(), category: tx.category, byMonth: new Map() };
      group.byMonth.set(month, [...(group.byMonth.get(month) ?? []), tx.amount]);
      groups.set(itemKey(tx.item), group);
    }
    for (const group of groups.values()) {
      const historyHits = history.filter(month => group.byMonth.has(month));
      if (historyHits.length < needed) continue;
      const perMonth = historyHits.map(month => group.byMonth.get(month)!);
      if (mean(perMonth.map(list => list.length)) > 1.5) continue;
      const amounts = perMonth.flat();
      if (Math.max(...amounts) / Math.min(...amounts) > FIXED_MAX_SPREAD) continue;
      fixedCosts.push({
        item: group.item, category: group.category, monthly: Math.round(median(perMonth.map(sum))),
        months: historyHits.length, paidThisMonth: group.byMonth.has(anchor),
      });
    }
    fixedCosts.sort((a, b) => b.monthly - a.monthly);
  }

  return {
    pulse, changes: [...ups, ...down], smallSpends, smallSpendWindowDays: windowDays,
    fixedCosts, fixedTotal: sum(fixedCosts.map(cost => cost.monthly)),
  };
}

export async function getFinanceInsights(anchor: string, now = new Date()): Promise<FinanceInsights> {
  const db = await getDb();
  const start = `${shiftMonthKey(anchor, -HISTORY_MONTHS)}-01`;
  const end = `${shiftMonthKey(anchor, 1)}-01`;
  const [transactions, first, budgets] = await Promise.all([
    db.getAllAsync<Transaction>(
      `SELECT * FROM transactions WHERE ${EXCLUDE_ADJUSTMENTS} AND created_at >= ? AND created_at < ? ORDER BY created_at`,
      [start, end]),
    db.getFirstAsync<{ first: string | null }>(`SELECT MIN(created_at) AS first FROM transactions WHERE ${EXCLUDE_ADJUSTMENTS}`),
    getBudgetsForMonth(anchor),
  ]);
  const budgetTotal = budgets.reduce((total, budget) => total + budget.limit_amount, 0);
  return computeFinanceInsights(transactions, anchor, now, first?.first ?? null, budgetTotal > 0 ? budgetTotal : null);
}
