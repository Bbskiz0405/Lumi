import { getDb } from './db';
import { Note, NoteCategory } from '../types/note';
import * as Crypto from 'expo-crypto';

function nowISO(): string {
  return new Date().toISOString();
}

export async function getAllNotes(): Promise<Note[]> {
  const db = await getDb();
  return db.getAllAsync<Note>('SELECT * FROM notes ORDER BY created_at DESC');
}

export async function getRecentNotes(limit: number = 10): Promise<Note[]> {
  const db = await getDb();
  return db.getAllAsync<Note>('SELECT * FROM notes ORDER BY created_at DESC LIMIT ?', [limit]);
}

export async function getNotesByCategory(category: NoteCategory): Promise<Note[]> {
  const db = await getDb();
  return db.getAllAsync<Note>(
    'SELECT * FROM notes WHERE category = ? ORDER BY created_at DESC',
    [category]
  );
}

export async function getNoteById(id: string): Promise<Note | null> {
  const db = await getDb();
  return db.getFirstAsync<Note>('SELECT * FROM notes WHERE id = ?', [id]);
}

export async function createNote(input: {
  content: string;
  category?: NoteCategory | null;
  tag?: string | null;
  entry_id?: string | null;
}): Promise<Note> {
  const db = await getDb();
  const id = Crypto.randomUUID();
  const now = nowISO();
  const note: Note = {
    id,
    entry_id: input.entry_id ?? null,
    content: input.content,
    category: input.category ?? null,
    tag: input.tag ?? null,
    created_at: now,
  };
  await db.runAsync(
    'INSERT INTO notes (id, entry_id, content, category, tag, created_at) VALUES (?, ?, ?, ?, ?, ?)',
    [note.id, note.entry_id, note.content, note.category, note.tag, note.created_at]
  );
  return note;
}

export async function updateNote(id: string, updates: Partial<Pick<Note, 'content' | 'category' | 'tag'>>): Promise<void> {
  const db = await getDb();
  const fields = Object.keys(updates) as (keyof typeof updates)[];
  if (fields.length === 0) return;
  const setClause = fields.map(f => `${f} = ?`).join(', ');
  const values = fields.map(f => updates[f] as string | null);
  await db.runAsync(`UPDATE notes SET ${setClause} WHERE id = ?`, [...values, id]);
}

export async function deleteNote(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM notes WHERE id = ?', [id]);
}

export async function getNotesCount(): Promise<number> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM notes');
  return row?.count ?? 0;
}
