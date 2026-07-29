import * as Crypto from 'expo-crypto';
import { getDb } from './db';
import {
  CreateLumiCalendarEventInput,
  LumiCalendarEvent,
} from '../types/calendarEvent';
import {
  BulkSyncResult,
  removeLumiEventFromDeviceCalendar,
  syncLumiEventToDeviceCalendar,
} from './calendarIntegrationService';
import { toLocalDateString } from '../utils/date';

function nowISO(): string {
  return new Date().toISOString();
}

async function syncBestEffort(event: LumiCalendarEvent): Promise<void> {
  try {
    await syncLumiEventToDeviceCalendar(event);
  } catch (error) {
    console.error('[calendarEventService] calendar sync failed:', error);
  }
}

export async function getLumiEventsForDate(dateString: string): Promise<LumiCalendarEvent[]> {
  const db = await getDb();
  return db.getAllAsync<LumiCalendarEvent>(
    `SELECT * FROM lumi_events
     WHERE start_date <= ? AND end_date >= ?
     ORDER BY all_day DESC, start_time ASC, created_at ASC`,
    [dateString, dateString]
  );
}

export async function getLumiEventsForMonth(
  year: number,
  month: number
): Promise<LumiCalendarEvent[]> {
  const db = await getDb();
  const monthStart = toLocalDateString(new Date(year, month, 1));
  const monthEnd = toLocalDateString(new Date(year, month + 1, 1));
  return db.getAllAsync<LumiCalendarEvent>(
    `SELECT * FROM lumi_events
     WHERE start_date < ? AND end_date >= ?
     ORDER BY start_date ASC, all_day DESC, start_time ASC`,
    [monthEnd, monthStart]
  );
}

export async function createLumiEvent(
  input: CreateLumiCalendarEventInput
): Promise<LumiCalendarEvent> {
  const title = input.title.trim();
  if (!title) throw new Error('行程名稱不可空白');

  const db = await getDb();
  const now = nowISO();
  const event: LumiCalendarEvent = {
    ...input,
    id: Crypto.randomUUID(),
    title,
    location: input.location?.trim() || null,
    notes: input.notes?.trim() || null,
    calendar_id: null,
    external_event_id: null,
    created_at: now,
    updated_at: now,
  };

  await db.runAsync(
    `INSERT INTO lumi_events (
      id, title, start_date, end_date, all_day, start_time, end_time,
      location, category, notes, reminder_minutes, calendar_id,
      external_event_id, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      event.id,
      event.title,
      event.start_date,
      event.end_date,
      event.all_day,
      event.start_time,
      event.end_time,
      event.location,
      event.category,
      event.notes,
      event.reminder_minutes,
      event.calendar_id,
      event.external_event_id,
      event.created_at,
      event.updated_at,
    ]
  );
  await syncBestEffort(event);
  return (await getLumiEventById(event.id)) ?? event;
}

export async function getLumiEventById(id: string): Promise<LumiCalendarEvent | null> {
  const db = await getDb();
  return db.getFirstAsync<LumiCalendarEvent>(
    'SELECT * FROM lumi_events WHERE id = ?',
    [id]
  );
}

export async function updateLumiEvent(
  id: string,
  input: CreateLumiCalendarEventInput
): Promise<LumiCalendarEvent> {
  const title = input.title.trim();
  if (!title) throw new Error('行程名稱不可空白');

  const db = await getDb();
  await db.runAsync(
    `UPDATE lumi_events SET
      title = ?, start_date = ?, end_date = ?, all_day = ?,
      start_time = ?, end_time = ?, location = ?, category = ?,
      notes = ?, reminder_minutes = ?, updated_at = ?
     WHERE id = ?`,
    [
      title,
      input.start_date,
      input.end_date,
      input.all_day,
      input.start_time,
      input.end_time,
      input.location?.trim() || null,
      input.category,
      input.notes?.trim() || null,
      input.reminder_minutes,
      nowISO(),
      id,
    ]
  );
  const event = await getLumiEventById(id);
  if (!event) throw new Error('找不到行程');
  await syncBestEffort(event);
  return (await getLumiEventById(id)) ?? event;
}

export async function deleteLumiEvent(id: string): Promise<{ calendarRemoved: boolean }> {
  const event = await getLumiEventById(id);
  if (!event) return { calendarRemoved: true };

  let calendarRemoved = false;
  try {
    calendarRemoved = await removeLumiEventFromDeviceCalendar(event);
  } catch (error) {
    console.error('[calendarEventService] calendar removal failed:', error);
  }

  const db = await getDb();
  await db.runAsync('DELETE FROM lumi_events WHERE id = ?', [id]);
  return { calendarRemoved };
}

export async function syncUpcomingLumiEvents(): Promise<BulkSyncResult> {
  const db = await getDb();
  const today = toLocalDateString();
  const events = await db.getAllAsync<LumiCalendarEvent>(
    `SELECT * FROM lumi_events
     WHERE end_date >= ?
     ORDER BY start_date ASC, all_day DESC, start_time ASC`,
    [today]
  );

  const result: BulkSyncResult = { synced: 0, skipped: 0, failed: 0 };
  for (const event of events) {
    try {
      const status = await syncLumiEventToDeviceCalendar(event);
      result[status] += 1;
    } catch {
      result.failed += 1;
    }
  }
  return result;
}
