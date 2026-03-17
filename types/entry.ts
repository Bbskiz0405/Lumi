export type ClassifiedType =
  | 'TASK'
  | 'IDEA'
  | 'FINANCE'
  | 'GOAL'
  | 'PROGRESS'
  | 'UNCERTAIN';

export interface Entry {
  id: string;
  raw_input: string;
  classified_type: ClassifiedType;
  created_at: string;
}
