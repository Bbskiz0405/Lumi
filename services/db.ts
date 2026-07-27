import * as SQLite from 'expo-sqlite';

const DATABASE_NAME = 'lumi.db';
export const LATEST_DATABASE_VERSION = 2;

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
  }
}
