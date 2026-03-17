export type Priority = 'high' | 'medium' | 'low';
export type TaskTag = 'research' | 'school' | 'application' | 'life';
export type TaskSource = 'manual' | 'goal';

export interface Task {
  id: string;
  entry_id: string | null;
  title: string;
  due_date: string | null;
  priority: Priority;
  tag: TaskTag | null;
  source: TaskSource;
  completed: number; // 0 | 1
  created_at: string;
}

export type CreateTaskInput = Omit<Task, 'id' | 'created_at' | 'completed'> & {
  completed?: number;
};
