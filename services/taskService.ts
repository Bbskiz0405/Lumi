import { getDb } from './db';
import { Task, CreateTaskInput } from '../types/task';
import * as Crypto from 'expo-crypto';

function nowISO(): string {
  return new Date().toISOString();
}

async function generateId(): Promise<string> {
  return Crypto.randomUUID();
}

export async function getAllTasks(): Promise<Task[]> {
  const db = await getDb();
  return db.getAllAsync<Task>('SELECT * FROM tasks ORDER BY due_date ASC, created_at DESC');
}

export async function getTasksForDate(dateStr: string): Promise<Task[]> {
  const db = await getDb();
  return db.getAllAsync<Task>(
    'SELECT * FROM tasks WHERE due_date = ? ORDER BY priority DESC, created_at DESC',
    [dateStr]
  );
}

export async function getTodayTasks(): Promise<Task[]> {
  const db = await getDb();
  const today = new Date().toISOString().split('T')[0];
  // 今天到期 + 逾期 + 沒設日期，依優先度和建立時間排序
  return db.getAllAsync<Task>(
    `SELECT * FROM tasks
     WHERE completed = 0 AND (due_date IS NULL OR due_date <= ?)
     ORDER BY
       CASE WHEN due_date IS NULL THEN 1 ELSE 0 END ASC,
       due_date ASC,
       CASE priority WHEN 'high' THEN 0 WHEN 'medium' THEN 1 ELSE 2 END ASC,
       created_at DESC`,
    [today]
  );
}

export async function getTaskById(id: string): Promise<Task | null> {
  const db = await getDb();
  return db.getFirstAsync<Task>('SELECT * FROM tasks WHERE id = ?', [id]);
}

export async function createTask(input: CreateTaskInput): Promise<Task> {
  const db = await getDb();
  const id = await generateId();
  const now = nowISO();
  const task: Task = {
    id,
    entry_id: input.entry_id,
    title: input.title,
    due_date: input.due_date,
    priority: input.priority,
    tag: input.tag,
    source: input.source,
    completed: input.completed ?? 0,
    created_at: now,
  };
  await db.runAsync(
    `INSERT INTO tasks (id, entry_id, title, due_date, priority, tag, source, completed, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [task.id, task.entry_id, task.title, task.due_date, task.priority, task.tag, task.source, task.completed, task.created_at]
  );
  return task;
}

export async function updateTask(id: string, updates: Partial<Omit<Task, 'id' | 'created_at'>>): Promise<void> {
  const db = await getDb();
  const fields = Object.keys(updates) as (keyof typeof updates)[];
  if (fields.length === 0) return;
  const setClause = fields.map((f) => `${f} = ?`).join(', ');
  const values = fields.map((f) => updates[f] as string | number | null);
  await db.runAsync(`UPDATE tasks SET ${setClause} WHERE id = ?`, [...values, id]);
}

export async function toggleTaskComplete(id: string, completed: boolean): Promise<void> {
  await updateTask(id, { completed: completed ? 1 : 0 });
}

export async function deleteTask(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM tasks WHERE id = ?', [id]);
}

export async function getDatesWithTasks(): Promise<string[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ due_date: string }>(
    'SELECT DISTINCT due_date FROM tasks WHERE due_date IS NOT NULL AND completed = 0'
  );
  return rows.map((r) => r.due_date);
}
