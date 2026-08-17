import { getDb } from './db';

/**
 * 統一事件流 — ABD 三條差異化路線（時間軸敘事 / 行為迴路偵測 / 問 Lumi）共用基建。
 * tasks / transactions / notes / entries 攤平成單一 UnifiedEvent[]，避免每條路線重複寫 SQL。
 *
 * timestamp 一律用 created_at（記錄當下的時間軸），B 行為迴路靠這個時序找連鎖規律。
 * tasks 另外保留 dueDate，A 時間軸敘事可選用到期日定位。
 */

export type EventType = 'task' | 'finance' | 'note' | 'entry';

export interface UnifiedEvent {
  id: string;            // `${type}:${refId}` 全域唯一
  type: EventType;
  timestamp: string;     // ISO，= 來源 created_at
  title: string;         // 給人看的單行標題
  raw: string;           // 全文（檢索 D 用）
  refId: string;         // 原表主鍵
  amount?: number;       // finance
  financeType?: 'income' | 'expense';
  category?: string;     // finance category / note category / entry classified_type
  tag?: string;          // task / note tag
  completed?: boolean;   // task
  dueDate?: string;      // task 到期日
}

export interface EventStreamOptions {
  start?: string;        // ISO，含
  end?: string;          // ISO，含
  types?: EventType[];   // 預設全部
  query?: string;        // 全文模糊比對（title + raw）
  limit?: number;
}

function firstLine(s: string, max = 80): string {
  const line = s.split('\n')[0].trim();
  return line.length > max ? line.slice(0, max) + '…' : line;
}

interface RawRow {
  refId: string;
  created_at: string;
  // 各表欄位（依 type 取用）
  title?: string;
  due_date?: string | null;
  tag?: string | null;
  priority?: string | null;
  completed?: number;
  type_col?: string | null;
  item?: string;
  amount?: number;
  category?: string | null;
  content?: string;
  raw_input?: string;
  classified_type?: string;
}

export async function getEventStream(opts: EventStreamOptions = {}): Promise<UnifiedEvent[]> {
  const db = await getDb();
  const types: EventType[] = opts.types ?? ['task', 'finance', 'note', 'entry'];
  const events: UnifiedEvent[] = [];
  const perTypeLimit =
    opts.limit && opts.limit > 0 ? ` ORDER BY created_at DESC LIMIT ${Math.floor(opts.limit)}` : '';

  if (types.includes('task')) {
    const rows = await db.getAllAsync<RawRow>(
      `SELECT id AS refId, title, due_date, tag, completed, created_at FROM tasks${perTypeLimit}`
    );
    for (const r of rows) {
      events.push({
        id: `task:${r.refId}`,
        type: 'task',
        timestamp: r.created_at,
        title: r.title ?? '',
        raw: r.title ?? '',
        refId: r.refId,
        tag: r.tag ?? undefined,
        completed: r.completed === 1,
        dueDate: r.due_date ?? undefined,
      });
    }
  }

  if (types.includes('finance')) {
    const rows = await db.getAllAsync<RawRow>(
      // 對帳調整是記帳機制，不是生活事件，別餵給時間軸敘事與問 Lumi。
      `SELECT id AS refId, type AS type_col, item, amount, category, created_at
       FROM transactions WHERE is_adjustment = 0${perTypeLimit}`
    );
    for (const r of rows) {
      events.push({
        id: `finance:${r.refId}`,
        type: 'finance',
        timestamp: r.created_at,
        title: r.item ?? '',
        raw: `${r.type_col === 'income' ? '收入' : '支出'} ${r.item ?? ''} ${r.amount ?? 0}`,
        refId: r.refId,
        amount: r.amount,
        financeType: (r.type_col as 'income' | 'expense') ?? undefined,
        category: r.category ?? undefined,
      });
    }
  }

  if (types.includes('note')) {
    const rows = await db.getAllAsync<RawRow>(
      `SELECT id AS refId, content, category, tag, created_at FROM notes${perTypeLimit}`
    );
    for (const r of rows) {
      events.push({
        id: `note:${r.refId}`,
        type: 'note',
        timestamp: r.created_at,
        title: firstLine(r.content ?? ''),
        raw: r.content ?? '',
        refId: r.refId,
        category: r.category ?? undefined,
        tag: r.tag ?? undefined,
      });
    }
  }

  if (types.includes('entry')) {
    const rows = await db.getAllAsync<RawRow>(
      `SELECT id AS refId, raw_input, classified_type, created_at FROM entries${perTypeLimit}`
    );
    for (const r of rows) {
      events.push({
        id: `entry:${r.refId}`,
        type: 'entry',
        timestamp: r.created_at,
        title: firstLine(r.raw_input ?? ''),
        raw: r.raw_input ?? '',
        refId: r.refId,
        category: r.classified_type ?? undefined,
      });
    }
  }

  let result = events;

  if (opts.start || opts.end) {
    const startTime = opts.start ? new Date(opts.start).getTime() : Number.NEGATIVE_INFINITY;
    const endTime = opts.end ? new Date(opts.end).getTime() : Number.POSITIVE_INFINITY;
    result = result.filter((event) => {
      const time = new Date(event.timestamp).getTime();
      return Number.isFinite(time) && time >= startTime && time <= endTime;
    });
  }

  if (opts.query && opts.query.trim()) {
    const q = opts.query.trim().toLowerCase();
    result = result.filter(
      (e) => e.title.toLowerCase().includes(q) || e.raw.toLowerCase().includes(q)
    );
  }

  // 時序由新到舊
  result.sort((a, b) => {
    const aTime = new Date(a.timestamp).getTime();
    const bTime = new Date(b.timestamp).getTime();
    return bTime - aTime;
  });

  if (opts.limit && opts.limit > 0) {
    result = result.slice(0, opts.limit);
  }

  return result;
}
