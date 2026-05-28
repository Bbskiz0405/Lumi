export type TransactionType = 'income' | 'expense';
export type ExpenseCategory = string;

export interface Transaction {
  id: string;
  entry_id: string | null;
  type: TransactionType;
  item: string;
  amount: number;
  category: ExpenseCategory | null;
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
  entry_id?: string | null;
  created_at?: string;
}
