import * as Crypto from 'expo-crypto';
import { getDb } from './db';
import {
  SaveWorkRecordInput,
  WorkDateStatus,
  WorkPreferences,
  WorkRecord,
  WorkRecordMetrics,
} from '../types/workTime';
import { toLocalDateString } from '../utils/date';
import {
  cancelWorkClockOutReminder,
  scheduleWorkClockOutReminder,
} from './notificationService';

const DEFAULT_TARGET_MINUTES = 8 * 60;
const WORK_PREFERENCES_KEY = 'work_time_preferences';

export const DEFAULT_WORK_PREFERENCES: WorkPreferences = {
  targetMinutes: DEFAULT_TARGET_MINUTES,
  breakMinutes: 60,
};

function nowISO(): string {
  return new Date().toISOString();
}

export function calculateWorkMetrics(
  record: WorkRecord,
  now: Date = new Date()
): WorkRecordMetrics {
  const startMs = new Date(record.clock_in).getTime();
  const endMs = record.clock_out ? new Date(record.clock_out).getTime() : now.getTime();
  const grossMinutes = Math.max(0, Math.floor((endMs - startMs) / 60000));
  const workedMinutes = Math.max(0, grossMinutes - Math.max(0, record.break_minutes));
  return {
    workedMinutes,
    balanceMinutes: workedMinutes - record.target_minutes,
    active: record.clock_out === null,
  };
}

export async function getWorkPreferences(): Promise<WorkPreferences> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ value: string }>(
    'SELECT value FROM settings WHERE key = ?',
    [WORK_PREFERENCES_KEY]
  );
  if (!row) return DEFAULT_WORK_PREFERENCES;

  try {
    const parsed = JSON.parse(row.value) as Partial<WorkPreferences>;
    const targetMinutes = Number(parsed.targetMinutes);
    const breakMinutes = parsed.breakMinutes === undefined
      ? DEFAULT_WORK_PREFERENCES.breakMinutes
      : Number(parsed.breakMinutes);
    if (
      !Number.isFinite(targetMinutes) ||
      targetMinutes <= 0 ||
      !Number.isFinite(breakMinutes) ||
      breakMinutes < 0
    ) {
      return DEFAULT_WORK_PREFERENCES;
    }
    return {
      targetMinutes: Math.round(targetMinutes),
      breakMinutes: Math.round(breakMinutes),
    };
  } catch {
    return DEFAULT_WORK_PREFERENCES;
  }
}

export async function saveWorkPreferences(
  preferences: WorkPreferences
): Promise<WorkPreferences> {
  if (
    !Number.isFinite(preferences.targetMinutes) ||
    preferences.targetMinutes <= 0 ||
    !Number.isFinite(preferences.breakMinutes) ||
    preferences.breakMinutes < 0
  ) {
    throw new Error('標準工時或休息時間無效');
  }
  const normalized: WorkPreferences = {
    targetMinutes: Math.round(preferences.targetMinutes),
    breakMinutes: Math.round(preferences.breakMinutes),
  };
  const db = await getDb();
  await db.runAsync(
    'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
    [WORK_PREFERENCES_KEY, JSON.stringify(normalized)]
  );
  return normalized;
}

export async function getWorkRecordForDate(date: string): Promise<WorkRecord | null> {
  const db = await getDb();
  return db.getFirstAsync<WorkRecord>(
    'SELECT * FROM work_records WHERE work_date = ?',
    [date]
  );
}

export async function getActiveWorkRecord(): Promise<WorkRecord | null> {
  const db = await getDb();
  return db.getFirstAsync<WorkRecord>(
    `SELECT * FROM work_records
     WHERE clock_out IS NULL
     ORDER BY clock_in DESC
     LIMIT 1`
  );
}

export async function getWorkRecordsForMonth(month: string): Promise<WorkRecord[]> {
  const db = await getDb();
  return db.getAllAsync<WorkRecord>(
    `SELECT * FROM work_records
     WHERE work_date LIKE ?
     ORDER BY work_date ASC`,
    [`${month}-%`]
  );
}

export async function getWorkDateStatusMap(month: string): Promise<Map<string, WorkDateStatus>> {
  const records = await getWorkRecordsForMonth(month);
  const statusMap = new Map<string, WorkDateStatus>();
  for (const record of records) {
    const metrics = calculateWorkMetrics(record);
    const status: WorkDateStatus = metrics.active
      ? 'active'
      : metrics.balanceMinutes > 0
        ? 'positive'
        : metrics.balanceMinutes < 0
          ? 'negative'
          : 'balanced';
    statusMap.set(record.work_date, status);
  }
  return statusMap;
}

export async function clockIn(date: Date = new Date()): Promise<WorkRecord> {
  const workDate = toLocalDateString(date);
  const active = await getActiveWorkRecord();
  if (active) return active;
  const existing = await getWorkRecordForDate(workDate);
  if (existing?.clock_out === null) return existing;
  if (existing) throw new Error('今天已有完成的工時紀錄，請使用編輯調整');

  const [db, preferences] = await Promise.all([getDb(), getWorkPreferences()]);
  const now = nowISO();
  const record: WorkRecord = {
    id: Crypto.randomUUID(),
    work_date: workDate,
    clock_in: date.toISOString(),
    clock_out: null,
    break_minutes: preferences.breakMinutes,
    target_minutes: preferences.targetMinutes,
    note: null,
    created_at: now,
    updated_at: now,
  };
  await db.runAsync(
    `INSERT INTO work_records (
      id, work_date, clock_in, clock_out, break_minutes,
      target_minutes, note, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      record.id,
      record.work_date,
      record.clock_in,
      record.clock_out,
      record.break_minutes,
      record.target_minutes,
      record.note,
      record.created_at,
      record.updated_at,
    ]
  );
  await scheduleWorkClockOutReminder(record).catch(error => {
    console.error('[workTimeService] clock-out reminder failed:', error);
  });
  return record;
}

export async function clockOut(id: string, date: Date = new Date()): Promise<WorkRecord> {
  const db = await getDb();
  const record = await db.getFirstAsync<WorkRecord>(
    'SELECT * FROM work_records WHERE id = ?',
    [id]
  );
  if (!record) throw new Error('找不到工時紀錄');
  if (record.clock_out) return record;
  if (date.getTime() <= new Date(record.clock_in).getTime()) {
    throw new Error('下班時間必須晚於上班時間');
  }

  await db.runAsync(
    'UPDATE work_records SET clock_out = ?, updated_at = ? WHERE id = ?',
    [date.toISOString(), nowISO(), id]
  );
  await cancelWorkClockOutReminder(id).catch(error => {
    console.error('[workTimeService] clock-out reminder cancellation failed:', error);
  });
  return (await getWorkRecordForDate(record.work_date)) ?? record;
}

export async function saveWorkRecord(
  input: SaveWorkRecordInput,
  existingId?: string
): Promise<WorkRecord> {
  const startMs = new Date(input.clock_in).getTime();
  const endMs = input.clock_out ? new Date(input.clock_out).getTime() : null;
  if (!Number.isFinite(startMs) || (endMs !== null && !Number.isFinite(endMs))) {
    throw new Error('工時日期或時間無效');
  }
  if (endMs !== null && endMs <= startMs) {
    throw new Error('下班時間必須晚於上班時間');
  }
  if (input.target_minutes <= 0 || input.break_minutes < 0) {
    throw new Error('標準工時或休息時間無效');
  }
  if (
    endMs !== null &&
    input.break_minutes > Math.floor((endMs - startMs) / 60000)
  ) {
    throw new Error('休息時間不可超過整段上班時間');
  }

  const db = await getDb();
  const now = nowISO();
  const id = existingId ?? Crypto.randomUUID();
  await db.runAsync(
    `INSERT INTO work_records (
      id, work_date, clock_in, clock_out, break_minutes,
      target_minutes, note, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(work_date) DO UPDATE SET
      clock_in = excluded.clock_in,
      clock_out = excluded.clock_out,
      break_minutes = excluded.break_minutes,
      target_minutes = excluded.target_minutes,
      note = excluded.note,
      updated_at = excluded.updated_at`,
    [
      id,
      input.work_date,
      input.clock_in,
      input.clock_out,
      Math.round(input.break_minutes),
      Math.round(input.target_minutes),
      input.note?.trim() || null,
      now,
      now,
    ]
  );
  const saved = await getWorkRecordForDate(input.work_date);
  if (!saved) throw new Error('工時紀錄儲存失敗');
  if (saved.clock_out) {
    await cancelWorkClockOutReminder(saved.id).catch(() => {});
  } else {
    await scheduleWorkClockOutReminder(saved).catch(error => {
      console.error('[workTimeService] clock-out reminder failed:', error);
    });
  }
  return saved;
}

export async function deleteWorkRecord(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM work_records WHERE id = ?', [id]);
  await cancelWorkClockOutReminder(id).catch(() => {});
}
