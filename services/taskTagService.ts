import { getDb } from './db';

const TASK_TAGS_KEY = 'task_custom_tags';

export async function getCustomTaskTags(): Promise<string[]> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ value: string }>(
    'SELECT value FROM settings WHERE key = ?',
    [TASK_TAGS_KEY]
  );
  if (!row) return [];

  try {
    const parsed: unknown = JSON.parse(row.value);
    return Array.isArray(parsed)
      ? parsed.filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
      : [];
  } catch {
    return [];
  }
}

export async function saveCustomTaskTags(tags: string[]): Promise<void> {
  const uniqueTags = [...new Set(tags.map(tag => tag.trim()).filter(Boolean))];
  const db = await getDb();
  await db.runAsync(
    'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
    [TASK_TAGS_KEY, JSON.stringify(uniqueTags)]
  );
}
