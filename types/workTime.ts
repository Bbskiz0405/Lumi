export interface WorkRecord {
  id: string;
  work_date: string;
  clock_in: string;
  clock_out: string | null;
  break_minutes: number;
  target_minutes: number;
  note: string | null;
  created_at: string;
  updated_at: string;
}

export interface SaveWorkRecordInput {
  work_date: string;
  clock_in: string;
  clock_out: string | null;
  break_minutes: number;
  target_minutes: number;
  note: string | null;
}

export interface WorkRecordMetrics {
  workedMinutes: number;
  balanceMinutes: number;
  active: boolean;
}

export type WorkDateStatus = 'active' | 'positive' | 'negative' | 'balanced';
