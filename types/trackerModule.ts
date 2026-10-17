export type TrackerFieldType = 'text' | 'number' | 'date' | 'select';

export interface TrackerField {
  key: string;
  label: string;
  type: TrackerFieldType;
  required: boolean;
  unit?: string;
  options?: string[];
}

/** A window relative to the projected next date, in days (e.g. ovulation = -14..-14). */
export interface TrackerOffset {
  label: string;
  from: number;
  to: number;
}

/** Fixed, locally computed building blocks. AI may pick these but never supplies formulas. */
export type TrackerInsight =
  | { type: 'cycle'; label: string; field: string; offsets: TrackerOffset[]; remindDaysBefore?: number }
  | { type: 'duration'; label: string; start: string; end: string }
  | { type: 'trend'; label: string; field: string; window: number };

export type TrackerInsightType = TrackerInsight['type'];

export interface TrackerModuleDefinition {
  name: string;
  description: string;
  fields: TrackerField[];
  insights: TrackerInsight[];
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
