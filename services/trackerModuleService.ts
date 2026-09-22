import * as Crypto from 'expo-crypto';
import { getDb } from './db';
import { TrackerField, TrackerFieldType, TrackerModule, TrackerModuleDefinition, TrackerRecord } from '../types/trackerModule';

const FIELD_TYPES = new Set<TrackerFieldType>(['text', 'number', 'date', 'select']);
const RESERVED_KEYS = new Set(['__proto__', 'prototype', 'constructor']);
export const FIELD_TYPE_LABELS = { text: '文字', number: '數字', date: '日期', select: '單選' };

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function boundedText(value: unknown, label: string, max: number, required = true): string {
  if (typeof value !== 'string') throw new Error(label + '格式無效');
  const text = value.trim();
  if ((required && !text) || text.length > max || /[\u0000-\u001f\u007f]/.test(text)) {
    throw new Error(label + '需為' + (required ? ' 1–' : ' 0–') + max + ' 字，且不可換行');
  }
  return text;
}

export function isValidTrackerDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const parsed = new Date(value + 'T12:00:00');
  return year >= 1 && parsed.getFullYear() === year && parsed.getMonth() + 1 === month && parsed.getDate() === day;
}

export function validateTrackerModuleDefinition(value: unknown): TrackerModuleDefinition {
  if (!isObject(value)) throw new Error('模組格式無效');
  const name = boundedText(value.name, '模組名稱', 20);
  const description = boundedText(value.description ?? '', '模組說明', 80, false);
  if (!Array.isArray(value.fields) || value.fields.length < 1 || value.fields.length > 8) {
    throw new Error('模組需包含 1–8 個欄位');
  }
  const keys = new Set<string>();
  const fields: TrackerField[] = value.fields.map((raw, index) => {
    if (!isObject(raw)) throw new Error('第 ' + (index + 1) + ' 個欄位格式無效');
    const key = typeof raw.key === 'string' ? raw.key.trim() : '';
    if (!/^[a-z][a-z0-9_]{0,29}$/.test(key) || RESERVED_KEYS.has(key) || keys.has(key)) {
      throw new Error('欄位代號無效或重複');
    }
    keys.add(key);
    const label = boundedText(raw.label, '欄位名稱', 20);
    const type = raw.type as TrackerFieldType;
    if (!FIELD_TYPES.has(type)) throw new Error(label + '使用不支援的欄位類型');
    if (raw.required !== undefined && typeof raw.required !== 'boolean') throw new Error(label + '必填設定無效');
    const field: TrackerField = { key, label, type, required: raw.required !== false };
    if (raw.unit !== undefined && raw.unit !== '') {
      if (type !== 'number') throw new Error('只有數字欄位可以設定單位');
      field.unit = boundedText(raw.unit, '單位', 10);
    }
    if (type === 'select') {
      if (!Array.isArray(raw.options) || raw.options.length < 2 || raw.options.length > 10) {
        throw new Error(label + '需有 2–10 個選項');
      }
      const options = raw.options.map(option => boundedText(option, '選項', 30));
      if (new Set(options).size !== options.length) throw new Error(label + '選項不可重複');
      field.options = options;
    }
    return field;
  });
  return { name, description, fields };
}

export function validateTrackerValues(
  definition: TrackerModuleDefinition,
  values: unknown,
  partial = false
): Record<string, string | number> {
  if (!isObject(values)) throw new Error('紀錄內容格式無效');
  const data: Record<string, string | number> = {};
  const allowed = new Set(definition.fields.map(field => field.key));
  if (Object.keys(values).some(key => !allowed.has(key))) throw new Error('紀錄含有未知欄位');
  for (const field of definition.fields) {
    const raw = values[field.key];
    if (raw === undefined || raw === '') {
      if (field.required && !partial) throw new Error('請填寫' + field.label);
      continue;
    }
    if (typeof raw !== 'string' && typeof raw !== 'number') throw new Error(field.label + '格式無效');
    const text = String(raw).trim();
    if (!text) {
      if (field.required && !partial) throw new Error('請填寫' + field.label);
      continue;
    }
    if (field.type === 'number') {
      if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(text) || !Number.isFinite(Number(text))) {
        throw new Error(field.label + '必須是有效數字');
      }
      data[field.key] = Number(text);
    } else {
      if (typeof raw !== 'string' || text.length > 2000 || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(text)) {
        throw new Error(field.label + '內容無效或超過 2000 字');
      }
      if (field.type === 'date' && !isValidTrackerDate(text)) throw new Error(field.label + '請填有效日期（YYYY-MM-DD）');
      if (field.type === 'select' && !field.options?.includes(text)) throw new Error(field.label + '選項無效');
      data[field.key] = text;
    }
  }
  return data;
}

export interface TrackerModuleRow {
  id: string; name: string; description: string; schema_json: string; created_at: string; updated_at: string;
}
export interface TrackerRecordRow {
  id: string; module_id: string; data_json: string; recorded_at: string; created_at: string;
}

export function parseTrackerModule(row: TrackerModuleRow): TrackerModule {
  try {
    const definition = validateTrackerModuleDefinition({ name: row.name, description: row.description, fields: JSON.parse(row.schema_json) });
    return { id: row.id, ...definition, created_at: row.created_at, updated_at: row.updated_at };
  } catch {
    throw new Error('「' + row.name + '」模組格式有誤，請檢查備份來源');
  }
}

export function parseTrackerRecord(row: TrackerRecordRow, definition: TrackerModuleDefinition): TrackerRecord {
  if (typeof row.data_json !== 'string') throw new Error('紀錄內容格式無效');
  const data = validateTrackerValues(definition, JSON.parse(row.data_json));
  if (typeof row.recorded_at !== 'string' || !isValidTrackerDate(row.recorded_at.slice(0, 10)) ||
    !Number.isFinite(new Date(row.recorded_at).getTime())) throw new Error('紀錄日期無效');
  return { id: row.id, module_id: row.module_id, data, recorded_at: row.recorded_at, created_at: row.created_at };
}

export async function getTrackerModules(): Promise<TrackerModule[]> {
  const db = await getDb();
  return (await db.getAllAsync<TrackerModuleRow>('SELECT * FROM tracker_modules ORDER BY created_at DESC')).map(parseTrackerModule);
}

export function matchTrackerModule(input: string, modules: TrackerModule[]): TrackerModule | null {
  const candidates = matchingTrackerModules(input, modules);
  return candidates.length === 1 ? candidates[0] : null;
}

export function matchingTrackerModules(input: string, modules: TrackerModule[]): TrackerModule[] {
  const text = input.trim().toLowerCase();
  const matches = modules.map(module => {
    const name = module.name.toLowerCase();
    const short = name.replace(/(?:追蹤|紀錄|記錄|管理)(?:器|工具)?$/, '');
    const aliases = [name, ...(short.length >= 2 ? [short] : [])];
    const length = Math.max(0, ...aliases.filter(alias => text.startsWith(alias) &&
      (text.length === alias.length || /^[\s:：,，\d+.-]/.test(text.slice(alias.length)))).map(alias => alias.length));
    return { module, length };
  }).filter(match => match.length > 0).sort((a, b) => b.length - a.length);
  return matches.filter(match => match.length === matches[0]?.length).map(match => match.module);
}

export async function getTrackerModule(id: string): Promise<TrackerModule | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<TrackerModuleRow>('SELECT * FROM tracker_modules WHERE id = ?', [id]);
  return row ? parseTrackerModule(row) : null;
}

export async function createTrackerModule(definition: TrackerModuleDefinition): Promise<TrackerModule> {
  const valid = validateTrackerModuleDefinition(definition);
  const db = await getDb();
  const id = Crypto.randomUUID();
  const now = new Date().toISOString();
  await db.runAsync('INSERT INTO tracker_modules (id, name, description, schema_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
    [id, valid.name, valid.description, JSON.stringify(valid.fields), now, now]);
  return { id, ...valid, created_at: now, updated_at: now };
}

// Keep stored keys/types/options stable; presentation edits cannot reinterpret existing records.
export async function updateTrackerModule(id: string, definition: TrackerModuleDefinition): Promise<void> {
  const valid = validateTrackerModuleDefinition(definition);
  const db = await getDb();
  await db.withExclusiveTransactionAsync(async tx => {
    const row = await tx.getFirstAsync<TrackerModuleRow>('SELECT * FROM tracker_modules WHERE id = ?', [id]);
    if (!row) throw new Error('模組已不存在');
    const current = parseTrackerModule(row);
    if (current.fields.length !== valid.fields.length || current.fields.some((field, index) => {
      const next = valid.fields[index];
      return field.key !== next.key || field.type !== next.type || field.required !== next.required ||
        field.unit !== next.unit || JSON.stringify(field.options) !== JSON.stringify(next.options);
    })) throw new Error('既有模組可修改名稱、說明與欄位名稱；改變欄位結構請建立新模組');
    await tx.runAsync('UPDATE tracker_modules SET name = ?, description = ?, schema_json = ?, updated_at = ? WHERE id = ?',
      [valid.name, valid.description, JSON.stringify(valid.fields), new Date().toISOString(), id]);
  });
}

export async function deleteTrackerModule(id: string): Promise<void> {
  const db = await getDb();
  await db.withExclusiveTransactionAsync(async tx => {
    await tx.runAsync('DELETE FROM tracker_records WHERE module_id = ?', [id]);
    await tx.runAsync('DELETE FROM tracker_modules WHERE id = ?', [id]);
  });
}

export async function getTrackerRecords(moduleId: string): Promise<TrackerRecord[]> {
  const module = await getTrackerModule(moduleId);
  if (!module) throw new Error('模組已不存在');
  const db = await getDb();
  const rows = await db.getAllAsync<TrackerRecordRow>('SELECT * FROM tracker_records WHERE module_id = ? ORDER BY recorded_at DESC, created_at DESC', [moduleId]);
  return rows.map(row => parseTrackerRecord(row, module));
}

function recordedAtFor(module: TrackerModuleDefinition, data: Record<string, string | number>, fallback: string): string {
  const field = module.fields.find(field => field.type === 'date');
  const date = field ? data[field.key] : undefined;
  return typeof date === 'string' ? new Date(date + 'T12:00:00').toISOString() : fallback;
}

export async function createTrackerRecord(module: TrackerModule, values: Record<string, string>): Promise<TrackerRecord> {
  const db = await getDb();
  const id = Crypto.randomUUID();
  const now = new Date().toISOString();
  let record: TrackerRecord | undefined;
  await db.withExclusiveTransactionAsync(async tx => {
    const row = await tx.getFirstAsync<TrackerModuleRow>('SELECT * FROM tracker_modules WHERE id = ?', [module.id]);
    if (!row) throw new Error('模組已不存在');
    const current = parseTrackerModule(row);
    const data = validateTrackerValues(current, values);
    const recorded_at = recordedAtFor(current, data, now);
    await tx.runAsync('INSERT INTO tracker_records (id, module_id, data_json, recorded_at, created_at) VALUES (?, ?, ?, ?, ?)',
      [id, module.id, JSON.stringify(data), recorded_at, now]);
    record = { id, module_id: module.id, data, recorded_at, created_at: now };
  });
  return record!;
}

export async function updateTrackerRecord(moduleId: string, id: string, values: Record<string, string>): Promise<void> {
  const db = await getDb();
  await db.withExclusiveTransactionAsync(async tx => {
    const moduleRow = await tx.getFirstAsync<TrackerModuleRow>('SELECT * FROM tracker_modules WHERE id = ?', [moduleId]);
    const recordRow = await tx.getFirstAsync<TrackerRecordRow>('SELECT * FROM tracker_records WHERE id = ? AND module_id = ?', [id, moduleId]);
    if (!moduleRow || !recordRow) throw new Error('模組或紀錄已不存在，請重新載入');
    const current = parseTrackerModule(moduleRow);
    const data = validateTrackerValues(current, values);
    await tx.runAsync('UPDATE tracker_records SET data_json = ?, recorded_at = ? WHERE id = ? AND module_id = ?',
      [JSON.stringify(data), recordedAtFor(current, data, recordRow.recorded_at), id, moduleId]);
  });
}

export async function deleteTrackerRecord(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM tracker_records WHERE id = ?', [id]);
}
