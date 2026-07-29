import * as Calendar from 'expo-calendar';
import { getDb } from './db';
import { Task } from '../types/task';
import { toLocalDateString } from '../utils/date';

const CONFIG_KEY = 'calendar_sync_config';

export interface CalendarSyncConfig {
  enabled: boolean;
  autoSyncTasks: boolean;
  calendarId: string;
  calendarTitle: string;
  accountName: string;
  calendarColor: string;
}

export interface DeviceCalendarOption {
  id: string;
  title: string;
  accountName: string;
  color: string;
  isPrimary: boolean;
  isGoogle: boolean;
}

export interface CalendarAgendaEvent {
  id: string;
  calendarId: string;
  calendarTitle: string;
  calendarColor: string;
  title: string;
  startDate: string;
  endDate: string;
  allDay: boolean;
  location: string | null;
  isLinkedToLumi: boolean;
}

export interface TaskCalendarLink {
  taskId: string;
  calendarId: string;
  eventId: string;
}

export interface BulkSyncResult {
  synced: number;
  skipped: number;
  failed: number;
}

function isCalendarSyncConfig(value: unknown): value is CalendarSyncConfig {
  if (!value || typeof value !== 'object') return false;
  const config = value as Record<string, unknown>;
  return (
    typeof config.enabled === 'boolean' &&
    typeof config.autoSyncTasks === 'boolean' &&
    typeof config.calendarId === 'string' &&
    typeof config.calendarTitle === 'string' &&
    typeof config.accountName === 'string' &&
    (config.calendarColor === undefined || typeof config.calendarColor === 'string')
  );
}

export async function getCalendarSyncConfig(): Promise<CalendarSyncConfig | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ value: string }>(
    'SELECT value FROM settings WHERE key = ?',
    [CONFIG_KEY]
  );
  if (!row) return null;

  try {
    const parsed: unknown = JSON.parse(row.value);
    return isCalendarSyncConfig(parsed)
      ? { ...parsed, calendarColor: parsed.calendarColor || '#88AAFF' }
      : null;
  } catch {
    return null;
  }
}

export async function saveCalendarSyncConfig(config: CalendarSyncConfig): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
    [CONFIG_KEY, JSON.stringify(config)]
  );
}

export async function setCalendarIntegrationEnabled(enabled: boolean): Promise<void> {
  const config = await getCalendarSyncConfig();
  if (!config) return;
  await saveCalendarSyncConfig({ ...config, enabled });
}

export async function setCalendarAutoSync(enabled: boolean): Promise<void> {
  const config = await getCalendarSyncConfig();
  if (!config) return;
  await saveCalendarSyncConfig({ ...config, autoSyncTasks: enabled });
}

export async function getCalendarPermission() {
  return Calendar.getCalendarPermissionsAsync();
}

export async function requestCalendarPermission() {
  return Calendar.requestCalendarPermissionsAsync();
}

function isGoogleCalendar(calendar: Calendar.Calendar): boolean {
  const source = `${calendar.source?.type ?? ''} ${calendar.source?.name ?? ''} ${calendar.ownerAccount ?? ''}`;
  return /google|gmail/i.test(source);
}

export async function getWritableDeviceCalendars(): Promise<DeviceCalendarOption[]> {
  const permission = await getCalendarPermission();
  if (!permission.granted) return [];

  const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
  return calendars
    .filter(calendar =>
      calendar.allowsModifications &&
      calendar.isVisible !== false &&
      calendar.isSynced !== false
    )
    .map(calendar => ({
      id: calendar.id,
      title: calendar.title,
      accountName: calendar.ownerAccount || calendar.source?.name || '裝置日曆',
      color: calendar.color || '#88AAFF',
      isPrimary: calendar.isPrimary === true,
      isGoogle: isGoogleCalendar(calendar),
    }))
    .sort((a, b) => {
      if (a.isGoogle !== b.isGoogle) return a.isGoogle ? -1 : 1;
      if (a.isPrimary !== b.isPrimary) return a.isPrimary ? -1 : 1;
      return a.title.localeCompare(b.title, 'zh-TW');
    });
}

async function getTaskCalendarLink(taskId: string): Promise<TaskCalendarLink | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<{
    task_id: string;
    calendar_id: string;
    event_id: string;
  }>(
    'SELECT task_id, calendar_id, event_id FROM calendar_event_links WHERE task_id = ?',
    [taskId]
  );
  return row
    ? { taskId: row.task_id, calendarId: row.calendar_id, eventId: row.event_id }
    : null;
}

export async function hasCalendarLink(taskId: string): Promise<boolean> {
  return (await getTaskCalendarLink(taskId)) !== null;
}

async function saveTaskCalendarLink(
  taskId: string,
  calendarId: string,
  eventId: string
): Promise<void> {
  const db = await getDb();
  const now = new Date().toISOString();
  await db.runAsync(
    `INSERT INTO calendar_event_links
      (task_id, calendar_id, event_id, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(task_id) DO UPDATE SET
       calendar_id = excluded.calendar_id,
       event_id = excluded.event_id,
       updated_at = excluded.updated_at`,
    [taskId, calendarId, eventId, now, now]
  );
}

async function removeTaskCalendarLink(taskId: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM calendar_event_links WHERE task_id = ?', [taskId]);
}

function allDayBounds(dateString: string): { startDate: Date; endDate: Date } {
  const [year, month, day] = dateString.split('-').map(Number);
  const startDate = new Date(Date.UTC(year, month - 1, day));
  const endDate = new Date(Date.UTC(year, month - 1, day + 1));
  return { startDate, endDate };
}

function taskEventDetails(task: Task) {
  const bounds = allDayBounds(task.due_date!);
  return {
    title: task.title,
    startDate: bounds.startDate,
    endDate: bounds.endDate,
    allDay: true,
    timeZone: 'UTC',
    notes: '由 Lumi 任務同步',
  };
}

export async function syncTaskToDeviceCalendar(
  task: Task,
  options: { force?: boolean } = {}
): Promise<'synced' | 'skipped'> {
  const config = await getCalendarSyncConfig();
  const link = await getTaskCalendarLink(task.id);

  if (!task.due_date) {
    if (link) {
      const permission = await getCalendarPermission();
      if (!permission.granted) return 'skipped';
      await Calendar.deleteEventAsync(link.eventId);
      await removeTaskCalendarLink(task.id);
      return 'synced';
    }
    return 'skipped';
  }

  if (!config?.enabled || (!config.autoSyncTasks && !options.force)) {
    return 'skipped';
  }

  const permission = await getCalendarPermission();
  if (!permission.granted) return 'skipped';

  const details = taskEventDetails(task);
  if (link) {
    if (link.calendarId !== config.calendarId) {
      await Calendar.deleteEventAsync(link.eventId);
      await removeTaskCalendarLink(task.id);
      const movedEventId = await Calendar.createEventAsync(config.calendarId, details);
      await saveTaskCalendarLink(task.id, config.calendarId, movedEventId);
      return 'synced';
    }
    await Calendar.updateEventAsync(link.eventId, details);
    return 'synced';
  }

  const eventId = await Calendar.createEventAsync(config.calendarId, details);
  await saveTaskCalendarLink(task.id, config.calendarId, eventId);
  return 'synced';
}

export async function removeTaskFromDeviceCalendar(taskId: string): Promise<boolean> {
  const link = await getTaskCalendarLink(taskId);
  if (!link) return true;

  const permission = await getCalendarPermission();
  if (!permission.granted) return false;

  try {
    await Calendar.deleteEventAsync(link.eventId);
  } catch {
    return false;
  }
  await removeTaskCalendarLink(taskId);
  return true;
}

export async function syncUpcomingTasks(): Promise<BulkSyncResult> {
  const db = await getDb();
  const today = toLocalDateString();
  const tasks = await db.getAllAsync<Task>(
    `SELECT * FROM tasks
     WHERE completed = 0 AND due_date IS NOT NULL AND due_date >= ?
     ORDER BY due_date ASC`,
    [today]
  );

  const result: BulkSyncResult = { synced: 0, skipped: 0, failed: 0 };
  for (const task of tasks) {
    try {
      const status = await syncTaskToDeviceCalendar(task, { force: true });
      result[status] += 1;
    } catch {
      result.failed += 1;
    }
  }
  return result;
}

async function getLinkedEventIds(): Promise<Set<string>> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ event_id: string }>(
    'SELECT event_id FROM calendar_event_links'
  );
  return new Set(rows.map(row => row.event_id));
}

export async function getCalendarEventsForRange(
  startDate: Date,
  endDate: Date
): Promise<CalendarAgendaEvent[]> {
  const config = await getCalendarSyncConfig();
  if (!config?.enabled) return [];

  const permission = await getCalendarPermission();
  if (!permission.granted) return [];

  const [events, linkedIds] = await Promise.all([
    Calendar.getEventsAsync([config.calendarId], startDate, endDate),
    getLinkedEventIds(),
  ]);

  return events.map(event => ({
    id: event.id,
    calendarId: event.calendarId,
    calendarTitle: config.calendarTitle,
    calendarColor: config.calendarColor,
    title: event.title || '未命名行程',
    startDate: new Date(event.startDate).toISOString(),
    endDate: new Date(event.endDate).toISOString(),
    allDay: event.allDay,
    location: event.location,
    isLinkedToLumi: linkedIds.has(event.id),
  }));
}

export async function getCalendarEventsForDate(
  dateString: string
): Promise<CalendarAgendaEvent[]> {
  const [year, month, day] = dateString.split('-').map(Number);
  const dayStart = new Date(year, month - 1, day);
  const dayEnd = new Date(year, month - 1, day + 1);

  // Android 對全天、跨日與重複事件使用窄的一天查詢時可能漏回資料。
  // 先取得同月實例再用時間重疊篩選，讓月曆標點與單日議程使用相同語意。
  const queryStart = new Date(year, month - 1, 1);
  const queryEnd = new Date(year, month, 1);
  const events = await getCalendarEventsForRange(queryStart, queryEnd);

  const startMs = dayStart.getTime();
  const endMs = dayEnd.getTime();
  return events.filter(event => {
    const eventStartMs = new Date(event.startDate).getTime();
    const rawEventEndMs = new Date(event.endDate).getTime();
    const eventEndMs = Math.max(rawEventEndMs, eventStartMs + 1);
    return eventStartMs < endMs && eventEndMs > startMs;
  });
}

export async function openDeviceCalendarEvent(eventId: string): Promise<void> {
  await Calendar.openEventInCalendarAsync({ id: eventId });
}
