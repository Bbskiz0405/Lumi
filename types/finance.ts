export type TransactionType = 'income' | 'expense';
export type ExpenseCategory = string;

/** 分類的顯示資料。色票只存在這裡，畫面一律查表，不各自硬編。 */
export interface ExpenseCategoryMeta {
  value: ExpenseCategory;
  label: string;
  color: string;
}

/** 收入是每月固定的還是一次性的。支出一律為 null。 */
export type IncomeKind = 'fixed' | 'extra';

export interface Transaction {
  id: string;
  entry_id: string | null;
  type: TransactionType;
  item: string;
  amount: number;
  category: ExpenseCategory | null;
  income_kind: IncomeKind | null;
  created_at: string;
}

export interface Budget {
  id: string;
  category: ExpenseCategory;
  limit_amount: number;
  month: string; // 'YYYY-MM'
  is_ai_generated: number; // 0 | 1
}

export interface CreateTransactionInput {
  type: TransactionType;
  item: string;
  amount: number;
  category: ExpenseCategory | null;
  income_kind?: IncomeKind | null;
  entry_id?: string | null;
  created_at?: string;
}

export interface SavingsGoal {
  id: string;
  title: string;
  target_amount: number;
  saved_amount: number;
  target_date: string | null;
  status: 'active' | 'done';
  created_at: string;
  updated_at: string;
}
