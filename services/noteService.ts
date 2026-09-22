import { getDb } from './db';
import { Note, NoteCategory } from '../types/note';
import * as Crypto from 'expo-crypto';
import { ANNIVERSARY_CATEGORY, readAnniversary } from './anniversaryService';

function nowISO(): string {
  return new Date().toISOString();
}

export async function getAllNotes(): Promise<Note[]> {
  const db = await getDb();
  return db.getAllAsync<Note>('SELECT * FROM notes WHERE category IS NULL OR category != ? ORDER BY created_at DESC', [ANNIVERSARY_CATEGORY]);
}

export async function getRecentNotes(limit: number = 10): Promise<Note[]> {
  const db = await getDb();
  return db.getAllAsync<Note>('SELECT * FROM notes WHERE category IS NULL OR category != ? ORDER BY created_at DESC LIMIT ?', [ANNIVERSARY_CATEGORY, limit]);
}

export async function getNotesByCategory(category: NoteCategory): Promise<Note[]> {
  if (category === ANNIVERSARY_CATEGORY) return [];
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
  const content = input.content.trim();
  if (!content) throw new Error('筆記內容不可空白');
  if (input.category === ANNIVERSARY_CATEGORY && !readAnniversary(content)) {
    throw new Error('紀念日格式：名稱、日期：YYYY-MM-DD、每年紀念（各一行）');
  }

  const db = await getDb();
  const id = Crypto.randomUUID();
  const now = nowISO();
  const note: Note = {
    id,
    entry_id: input.entry_id ?? null,
    content,
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
  const sanitized = { ...updates };
  if (sanitized.content !== undefined) {
    sanitized.content = sanitized.content.trim();
    if (!sanitized.content) throw new Error('筆記內容不可空白');
  }

  const db = await getDb();
  const fields = Object.keys(sanitized) as (keyof typeof sanitized)[];
  if (fields.length === 0) return;
  const current = await getNoteById(id);
  if (!current) throw new Error('筆記不存在');
  const category = sanitized.category === undefined ? current.category : sanitized.category;
  if (category === ANNIVERSARY_CATEGORY && !readAnniversary(sanitized.content ?? current.content)) {
    throw new Error('請保留三行格式：名稱、日期：YYYY-MM-DD、每年紀念；日期必須有效');
  }
  const setClause = fields.map(f => `${f} = ?`).join(', ');
  const values = fields.map(f => sanitized[f] as string | null);
  await db.runAsync(`UPDATE notes SET ${setClause} WHERE id = ?`, [...values, id]);
}

export async function deleteNote(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM notes WHERE id = ?', [id]);
}

export async function getCustomTags(): Promise<string[]> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ value: string }>('SELECT value FROM settings WHERE key = ?', ['note_tags']);
  if (row) {
    try {
      const tags: unknown = JSON.parse(row.value);
      if (Array.isArray(tags) && tags.every(tag => typeof tag === 'string')) return [...new Set(tags.filter(tag => tag !== ANNIVERSARY_CATEGORY))];
    } catch { /* Use built-in tags for invalid settings. */ }
  }
  return ['目標'];
}

export async function saveCustomTags(tags: string[]): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
    ['note_tags', JSON.stringify(tags)]
  );
}

export async function getNotesCount(): Promise<number> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM notes WHERE category IS NULL OR category != ?', [ANNIVERSARY_CATEGORY]);
  return row?.count ?? 0;
}
