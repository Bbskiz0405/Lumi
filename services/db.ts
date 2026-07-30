import * as SQLite from 'expo-sqlite';

const DATABASE_NAME = 'lumi.db';
export const LATEST_DATABASE_VERSION = 5;

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

export function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = SQLite.openDatabaseAsync(DATABASE_NAME)
      .then(async database => {
        await initDb(database);
        return database;
      })
      .catch(error => {
        dbPromise = null;
        throw error;
      });
  }
  return dbPromise;
}

async function getDatabaseVersion(database: SQLite.SQLiteDatabase): Promise<number> {
  const row = await database.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  return row?.user_version ?? 0;
}

async function migrateToVersion1(database: SQLite.SQLiteDatabase): Promise<void> {
  await database.withExclusiveTransactionAsync(async tx => {
    await tx.execAsync(`
      CREATE TABLE IF NOT EXISTS entries (
        id TEXT PRIMARY KEY,
        raw_input TEXT NOT NULL,
        classified_type TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY,
        entry_id TEXT,
        title TEXT NOT NULL,
        due_date TEXT,
        priority TEXT NOT NULL DEFAULT 'medium',
        tag TEXT,
        source TEXT NOT NULL DEFAULT 'manual',
        completed INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS notes (
        id TEXT PRIMARY KEY,
        entry_id TEXT,
        content TEXT NOT NULL,
        category TEXT,
        tag TEXT,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS transactions (
        id TEXT PRIMARY KEY,
        entry_id TEXT,
        type TEXT NOT NULL,
        item TEXT NOT NULL,
        amount REAL NOT NULL,
        category TEXT,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS budgets (
        id TEXT PRIMARY KEY,
        category TEXT NOT NULL,
        limit_amount REAL NOT NULL,
        month TEXT NOT NULL,
        is_ai_generated INTEGER NOT NULL DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS goals (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        status TEXT NOT NULL DEFAULT 'active',
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS goal_milestones (
        id TEXT PRIMARY KEY,
        goal_id TEXT NOT NULL,
        title TEXT NOT NULL,
        order_index INTEGER NOT NULL,
        completed INTEGER NOT NULL DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS goal_tasks (
        id TEXT PRIMARY KEY,
        goal_id TEXT NOT NULL,
        task_id TEXT NOT NULL,
        is_recurring INTEGER NOT NULL DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );

      PRAGMA user_version = 1;
    `);
  });
}

async function migrateToVersion2(database: SQLite.SQLiteDatabase): Promise<void> {
  await database.withExclusiveTransactionAsync(async tx => {
    await tx.execAsync(`
      CREATE INDEX IF NOT EXISTS idx_entries_created_at ON entries(created_at);
      CREATE INDEX IF NOT EXISTS idx_entries_raw_input ON entries(raw_input);
      CREATE INDEX IF NOT EXISTS idx_tasks_due_completed ON tasks(due_date, completed);
      CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks(created_at);
      CREATE INDEX IF NOT EXISTS idx_tasks_entry_id ON tasks(entry_id);
      CREATE INDEX IF NOT EXISTS idx_notes_created_at ON notes(created_at);
      CREATE INDEX IF NOT EXISTS idx_notes_entry_id ON notes(entry_id);
      CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at);
      CREATE INDEX IF NOT EXISTS idx_transactions_entry_id ON transactions(entry_id);

      PRAGMA user_version = 2;
    `);
  });
}

async function migrateToVersion3(database: SQLite.SQLiteDatabase): Promise<void> {
  await database.withExclusiveTransactionAsync(async tx => {
    await tx.execAsync(`
      CREATE TABLE IF NOT EXISTS calendar_event_links (
        task_id TEXT PRIMARY KEY,
        calendar_id TEXT NOT NULL,
        event_id TEXT NOT NULL UNIQUE,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_calendar_links_event
      ON calendar_event_links(event_id);

      PRAGMA user_version = 3;
    `);
  });
}

async function migrateToVersion4(database: SQLite.SQLiteDatabase): Promise<void> {
  await database.withExclusiveTransactionAsync(async tx => {
    await tx.execAsync(`
      CREATE TABLE IF NOT EXISTS lumi_events (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        start_date TEXT NOT NULL,
        end_date TEXT NOT NULL,
        all_day INTEGER NOT NULL DEFAULT 0,
        start_time TEXT,
        end_time TEXT,
        location TEXT,
        category TEXT,
        notes TEXT,
        reminder_minutes INTEGER,
        calendar_id TEXT,
        external_event_id TEXT UNIQUE,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_lumi_events_date
      ON lumi_events(start_date, end_date);

      CREATE INDEX IF NOT EXISTS idx_lumi_events_external
      ON lumi_events(external_event_id);

      PRAGMA user_version = 4;
    `);
  });
}

async function migrateToVersion5(database: SQLite.SQLiteDatabase): Promise<void> {
  await database.withExclusiveTransactionAsync(async tx => {
    await tx.execAsync(`
      CREATE TABLE IF NOT EXISTS work_records (
        id TEXT PRIMARY KEY,
        work_date TEXT NOT NULL UNIQUE,
        clock_in TEXT NOT NULL,
        clock_out TEXT,
        break_minutes INTEGER NOT NULL DEFAULT 0,
        target_minutes INTEGER NOT NULL DEFAULT 480,
        note TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_work_records_date
      ON work_records(work_date);

      PRAGMA user_version = 5;
    `);
  });
}

async function initDb(database: SQLite.SQLiteDatabase): Promise<void> {
  await database.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
  `);

  let version = await getDatabaseVersion(database);
  if (version > LATEST_DATABASE_VERSION) {
    throw new Error(`資料庫版本 ${version} 高於 App 支援版本 ${LATEST_DATABASE_VERSION}`);
  }

  if (version < 1) {
    await migrateToVersion1(database);
    version = 1;
  }

  if (version < 2) {
    await migrateToVersion2(database);
    version = 2;
  }

  if (version < 3) {
    await migrateToVersion3(database);
    version = 3;
  }

  if (version < 4) {
    await migrateToVersion4(database);
    version = 4;
  }

  if (version < 5) {
    await migrateToVersion5(database);
  }
}
