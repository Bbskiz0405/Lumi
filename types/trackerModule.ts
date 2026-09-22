export type TrackerFieldType = 'text' | 'number' | 'date' | 'select';

export interface TrackerField {
  key: string;
  label: string;
  type: TrackerFieldType;
  required: boolean;
  unit?: string;
  options?: string[];
}

export interface TrackerModuleDefinition {
  name: string;
  description: string;
  fields: TrackerField[];
}

export interface TrackerModule extends TrackerModuleDefinition {
  id: string;
  created_at: string;
  updated_at: string;
}

export interface TrackerRecord {
  id: string;
  module_id: string;
  data: Record<string, string | number>;
  recorded_at: string;
  created_at: string;
}
