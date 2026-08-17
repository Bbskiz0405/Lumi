import { getDb } from './db';

export interface RecentItem {
  id: string;
  type: 'task' | 'finance' | 'note';
  title: string;
  subtitle?: string;
  created_at: string;
}

export async function getRecentActivity(limit: number = 8): Promise<RecentItem[]> {
  const db = await getDb();

  const tasks = await db.getAllAsync<{ id: string; title: string; created_at: string }>(
    'SELECT id, title, created_at FROM tasks WHERE completed = 0 ORDER BY created_at DESC LIMIT ?',
    [limit]
  );

  const transactions = await db.getAllAsync<{
    id: string; item: string; type: string; amount: number; created_at: string;
  }>(
    // 對帳調整不是使用者「做了什麼」，不該佔用首頁最近動態的位置。
    'SELECT id, item, type, amount, created_at FROM transactions WHERE is_adjustment = 0 ORDER BY created_at DESC LIMIT ?',
    [limit]
  );

  const notes = await db.getAllAsync<{ id: string; content: string; created_at: string }>(
    'SELECT id, content, created_at FROM notes ORDER BY created_at DESC LIMIT ?',
    [limit]
  );

  const items: RecentItem[] = [
    ...tasks.map(t => ({
      id: t.id,
      type: 'task' as const,
      title: t.title,
      created_at: t.created_at,
    })),
    ...transactions.map(t => ({
      id: t.id,
      type: 'finance' as const,
      title: t.item,
      subtitle: `${t.type === 'income' ? '+' : '-'}$${t.amount}`,
      created_at: t.created_at,
    })),
    ...notes.map(n => ({
      id: n.id,
      type: 'note' as const,
      title: n.content.length > 30 ? n.content.slice(0, 30) + '...' : n.content,
      created_at: n.created_at,
    })),
  ];

  items.sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
  return items.slice(0, limit);
}

export interface UsagePattern {
  type: string;
  count: number;
}

export async function getUsagePatterns(): Promise<UsagePattern[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ classified_type: string; cnt: number }>(
    `SELECT classified_type, COUNT(*) as cnt FROM entries
     GROUP BY classified_type ORDER BY cnt DESC LIMIT 5`
  );
  return rows.map(r => ({ type: r.classified_type, count: r.cnt }));
}
