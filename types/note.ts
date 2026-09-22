export type NoteCategory = 'vtuber' | 'cardgame' | 'tech' | 'life' | 'goal' | '紀念日';

export interface Note {
  id: string;
  entry_id: string | null;
  content: string;
  category: NoteCategory | null;
  tag: string | null;
  created_at: string;
}
