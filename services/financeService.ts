import { getDb } from './db';
import { Transaction, Budget, ExpenseCategory, CreateTransactionInput } from '../types/finance';
import * as Crypto from 'expo-crypto';

function nowISO(): string {
  return new Date().toISOString();
}

export async function getTransactionsForMonth(month: string): Promise<Transaction[]> {
  const db = await getDb();
  return db.getAllAsync<Transaction>(
    `SELECT * FROM transactions WHERE strftime('%Y-%m', created_at) = ? ORDER BY created_at DESC`,
    [month]
  );
}

export async function createTransaction(input: CreateTransactionInput): Promise<Transaction> {
  const db = await getDb();
  const id = Crypto.randomUUID();
  const now = nowISO();
  const tx: Transaction = {
    id,
    entry_id: input.entry_id ?? null,
    type: input.type,
    item: input.item,
    amount: input.amount,
    category: input.type === 'expense' ? (input.category ?? 'other') : null,
    created_at: now,
  };
  await db.runAsync(
    `INSERT INTO transactions (id, entry_id, type, item, amount, category, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [tx.id, tx.entry_id, tx.type, tx.item, tx.amount, tx.category, tx.created_at]
  );
  return tx;
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

export async function resetAllFinance(): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM transactions');
  await db.runAsync('DELETE FROM budgets');
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
