export type GoalStatus = 'active' | 'paused' | 'completed';

export interface Goal {
  id: string;
  title: string;
  description: string | null;
  status: GoalStatus;
  created_at: string;
}

export interface GoalMilestone {
  id: string;
  goal_id: string;
  title: string;
  order_index: number;
  completed: number; // 0 | 1
}

export interface GoalTask {
  id: string;
  goal_id: string;
  task_id: string;
  is_recurring: number; // 0 | 1
}
