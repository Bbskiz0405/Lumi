export type Priority = 'high' | 'medium' | 'low';
export type TaskTag = string;
export type TaskSource = 'manual' | 'goal';

export interface Task {
  id: string;
  entry_id: string | null;
  title: string;
  due_date: string | null;
  due_time: string | null;
  reminder_minutes: number | null;
  priority: Priority;
  tag: TaskTag | null;
  source: TaskSource;
  completed: number; // 0 | 1
  created_at: string;
}

export type CreateTaskInput = Omit<
  Task,
  'id' | 'created_at' | 'completed' | 'due_time' | 'reminder_minutes'
> & {
  completed?: number;
  due_time?: string | null;
  reminder_minutes?: number | null;
};
