export type TransactionType = 'income' | 'expense';
export type ExpenseCategory = 'food' | 'interest' | 'transport' | 'other';

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
