import { getDb, LATEST_DATABASE_VERSION } from './db';

export const BACKUP_FORMAT = 'lumi-backup';
export const BACKUP_SCHEMA_VERSION = 6;
export const BACKUP_APP_VERSION = '0.4.81';

type SqlValue = string | number | null;
type BackupRow = Record<string, SqlValue>;

interface BackupData {
  entries: BackupRow[];
  tasks: BackupRow[];
  lumi_events: BackupRow[];
  work_records: BackupRow[];
  notes: BackupRow[];
  transactions: BackupRow[];
  budgets: BackupRow[];
  goals: BackupRow[];
  goal_milestones: BackupRow[];
  goal_tasks: BackupRow[];
  savings_goals: BackupRow[];
  settings: BackupRow[];
}

export interface LumiBackup {
  format: typeof BACKUP_FORMAT;
  schemaVersion: number;
  databaseVersion: number;
  appVersion: string;
  exportedAt: string;
  data: BackupData;
}

export interface BackupCounts {
  entries: number;
  tasks: number;
  events: number;
  workRecords: number;
  notes: number;
  transactions: number;
  budgets: number;
  goals: number;
  savingsGoals: number;
  settings: number;
  total: number;
}

export interface BackupPreview {
  backup: LumiBackup;
  counts: BackupCounts;
}

export type ImportMode = 'merge' | 'replace';

export interface ImportResult {
  mode: ImportMode;
  imported: number;
  skipped: number;
  counts: BackupCounts;
}

interface TableSpec {
  name: keyof BackupData;
  columns: string[];
}

const TABLES: TableSpec[] = [
  { name: 'entries', columns: ['id', 'raw_input', 'classified_type', 'created_at'] },
  {
    name: 'tasks',
    columns: [
      'id',
      'entry_id',
      'title',
      'due_date',
      'due_time',
      'reminder_minutes',
      'priority',
      'tag',
      'source',
      'completed',
      'created_at',
    ],
  },
  {
    name: 'lumi_events',
    columns: [
      'id',
      'title',
      'start_date',
      'end_date',
      'all_day',
      'start_time',
      'end_time',
      'location',
      'category',
      'notes',
      'reminder_minutes',
      'created_at',
      'updated_at',
    ],
  },
  {
    name: 'work_records',
    columns: [
      'id',
      'work_date',
      'clock_in',
      'clock_out',
      'break_minutes',
      'target_minutes',
      'note',
      'created_at',
      'updated_at',
    ],
  },
  { name: 'notes', columns: ['id', 'entry_id', 'content', 'category', 'tag', 'created_at'] },
  {
    name: 'transactions',
    columns: [
      'id',
      'entry_id',
      'type',
      'item',
      'amount',
      'category',
      'income_kind',
      'is_adjustment',
      'created_at',
    ],
  },
  {
    name: 'budgets',
    columns: ['id', 'category', 'limit_amount', 'month', 'is_ai_generated'],
  },
  { name: 'goals', columns: ['id', 'title', 'description', 'status', 'created_at'] },
  {
    name: 'goal_milestones',
    columns: ['id', 'goal_id', 'title', 'order_index', 'completed'],
  },
  { name: 'goal_tasks', columns: ['id', 'goal_id', 'task_id', 'is_recurring'] },
  {
    name: 'savings_goals',
    columns: [
      'id',
      'title',
      'target_amount',
      'saved_amount',
      'target_date',
      'status',
      'created_at',
      'updated_at',
    ],
  },
  { name: 'settings', columns: ['key', 'value'] },
];

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isSqlValue(value: unknown): value is SqlValue {
  return value === null || typeof value === 'string' || (typeof value === 'number' && Number.isFinite(value));
}

function assertBackupRow(
  value: unknown,
  table: string,
  rowIndex: number,
  columns: string[]
): asserts value is BackupRow {
  if (!isObject(value)) {
    throw new Error(`${table} 第 ${rowIndex + 1} 筆不是有效物件`);
  }

  for (const column of columns) {
    if (!(column in value) || !isSqlValue(value[column])) {
      throw new Error(`${table} 第 ${rowIndex + 1} 筆的 ${column} 無效`);
    }
  }
}

function parseBackup(value: unknown): LumiBackup {
  if (!isObject(value) || value.format !== BACKUP_FORMAT) {
    throw new Error('這不是 Lumi 備份檔');
  }
  if (
    typeof value.schemaVersion !== 'number' ||
    value.schemaVersion < 1 ||
    value.schemaVersion > BACKUP_SCHEMA_VERSION
  ) {
    throw new Error(`不支援的備份格式版本：${String(value.schemaVersion)}`);
  }
  if (
    typeof value.databaseVersion !== 'number' ||
    value.databaseVersion < 1 ||
    value.databaseVersion > LATEST_DATABASE_VERSION
  ) {
    throw new Error(`不支援的資料庫版本：${String(value.databaseVersion)}`);
  }
  if (typeof value.appVersion !== 'string' || typeof value.exportedAt !== 'string') {
    throw new Error('備份檔缺少版本或匯出時間');
  }
  if (!Number.isFinite(new Date(value.exportedAt).getTime()) || !isObject(value.data)) {
    throw new Error('備份檔的匯出時間或資料內容無效');
  }

  if (value.schemaVersion === 1 && !Array.isArray(value.data.lumi_events)) {
    value.data.lumi_events = [];
  }
  if (value.schemaVersion <= 2 && !Array.isArray(value.data.work_records)) {
    value.data.work_records = [];
  }
  if (value.schemaVersion <= 3 && Array.isArray(value.data.tasks)) {
    value.data.tasks.forEach(task => {
      if (isObject(task)) {
        task.due_time = null;
        task.reminder_minutes = null;
      }
    });
  }
  if (value.schemaVersion <= 4) {
    if (!Array.isArray(value.data.savings_goals)) {
      value.data.savings_goals = [];
    }
    if (Array.isArray(value.data.transactions)) {
      value.data.transactions.forEach(transaction => {
        if (isObject(transaction)) transaction.income_kind = null;
      });
    }
  }
  if (value.schemaVersion <= 5 && Array.isArray(value.data.transactions)) {
    value.data.transactions.forEach(transaction => {
      if (isObject(transaction)) transaction.is_adjustment = 0;
    });
  }

  for (const table of TABLES) {
    const rows = value.data[table.name];
    if (!Array.isArray(rows)) {
      throw new Error(`備份檔缺少 ${table.name} 資料`);
    }
    rows.forEach((row, index) => assertBackupRow(row, table.name, index, table.columns));
  }

  const backup = value as unknown as LumiBackup;
  if (backup.data.settings.some(row => row.key === 'ai_config')) {
    throw new Error('備份檔含有不應匯入的 API Key 設定');
  }
  return backup;
}

function buildCounts(lengths: Record<keyof BackupData, number>): BackupCounts {
  const counts = {
    entries: lengths.entries,
    tasks: lengths.tasks,
    events: lengths.lumi_events,
    workRecords: lengths.work_records,
    notes: lengths.notes,
    transactions: lengths.transactions,
    budgets: lengths.budgets,
    goals: lengths.goals,
    savingsGoals: lengths.savings_goals,
    settings: lengths.settings,
  };
  return {
    ...counts,
    total:
      counts.entries +
      counts.tasks +
      counts.events +
      counts.workRecords +
      counts.notes +
      counts.transactions +
      counts.budgets +
      counts.goals +
      lengths.goal_milestones +
      lengths.goal_tasks +
      counts.savingsGoals +
      counts.settings,
  };
}

function countBackupData(data: BackupData): BackupCounts {
  const lengths = {} as Record<keyof BackupData, number>;
  for (const table of TABLES) {
    lengths[table.name] = data[table.name].length;
  }
  return buildCounts(lengths);
}

export async function getLocalDataCounts(): Promise<BackupCounts> {
  const db = await getDb();
  const lengths = {} as Record<keyof BackupData, number>;

  for (const table of TABLES) {
    const condition =
      table.name === 'settings'
        ? " WHERE key <> 'ai_config' AND key NOT LIKE 'calendar_%'"
        : '';
    const row = await db.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) AS count FROM ${table.name}${condition}`
    );
    lengths[table.name] = row?.count ?? 0;
  }

  return buildCounts(lengths);
}

export async function createBackup(): Promise<LumiBackup> {
  const db = await getDb();
  const data = {} as BackupData;

  for (const table of TABLES) {
    const columns = table.columns.join(', ');
    const condition =
      table.name === 'settings'
        ? " WHERE key <> 'ai_config' AND key NOT LIKE 'calendar_%'"
        : '';
    data[table.name] = await db.getAllAsync<BackupRow>(
      `SELECT ${columns} FROM ${table.name}${condition}`
    );
  }

  return {
    format: BACKUP_FORMAT,
    schemaVersion: BACKUP_SCHEMA_VERSION,
    databaseVersion: LATEST_DATABASE_VERSION,
    appVersion: BACKUP_APP_VERSION,
    exportedAt: new Date().toISOString(),
    data,
  };
}

export function previewBackupJson(json: string): BackupPreview {
  if (!json.trim()) throw new Error('備份檔是空的');

  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new Error('備份檔不是有效的 JSON');
  }

  const backup = parseBackup(parsed);
  return { backup, counts: countBackupData(backup.data) };
}

export async function importBackup(
  preview: BackupPreview,
  mode: ImportMode
): Promise<ImportResult> {
  const backup = parseBackup(preview.backup);
  const db = await getDb();
  let imported = 0;
  let skipped = 0;

  await db.withExclusiveTransactionAsync(async tx => {
    if (mode === 'replace') {
      await tx.execAsync(`
        DELETE FROM goal_tasks;
        DELETE FROM goal_milestones;
        DELETE FROM goals;
        DELETE FROM savings_goals;
        DELETE FROM budgets;
        DELETE FROM transactions;
        DELETE FROM notes;
        DELETE FROM work_records;
        DELETE FROM lumi_events;
        DELETE FROM tasks;
        DELETE FROM entries;
        DELETE FROM settings
        WHERE key <> 'ai_config' AND key NOT LIKE 'calendar_%';
      `);
    }

    for (const table of TABLES) {
      const rows = backup.data[table.name];
      const placeholders = table.columns.map(() => '?').join(', ');
      const conflict = mode === 'merge' ? 'OR IGNORE' : 'OR REPLACE';
      const sql = `INSERT ${conflict} INTO ${table.name} (${table.columns.join(
        ', '
      )}) VALUES (${placeholders})`;

      for (const row of rows) {
        const values = table.columns.map(column => row[column]);
        const result = await tx.runAsync(sql, values);
        imported += result.changes;
        if (result.changes === 0) skipped += 1;
      }
    }
  });

  return { mode, imported, skipped, counts: preview.counts };
}
