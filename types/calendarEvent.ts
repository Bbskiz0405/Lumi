export interface LumiCalendarEvent {
  id: string;
  title: string;
  start_date: string;
  end_date: string;
  all_day: number;
  start_time: string | null;
  end_time: string | null;
  location: string | null;
  category: string | null;
  notes: string | null;
  reminder_minutes: number | null;
  calendar_id: string | null;
  external_event_id: string | null;
  created_at: string;
  updated_at: string;
}

export type CreateLumiCalendarEventInput = Omit<
  LumiCalendarEvent,
  'id' | 'calendar_id' | 'external_event_id' | 'created_at' | 'updated_at'
>;
