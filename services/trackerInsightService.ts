import { TrackerField, TrackerInsight, TrackerModule, TrackerModuleDefinition, TrackerRecord } from '../types/trackerModule';

// Deterministic, on-device projections. Nothing here calls AI or the network.

const DAY = 86_400_000;
const MAX_INTERVALS = 6;
const MAX_DURATIONS = 6;

export interface InsightRange { label: string; start: string; end: string }

export type InsightResult =
  | { type: 'cycle'; label: string; ready: false; needed: number }
  | {
    type: 'cycle'; label: string; ready: true;
    average: number; shortest: number; longest: number; samples: number;
    last: string; next: string; spread: number | null; daysUntil: number; ranges: InsightRange[];
  }
  | { type: 'duration'; label: string; ready: false; needed: number }
  | { type: 'duration'; label: string; ready: true; latest: number; average: number; samples: number }
  | { type: 'trend'; label: string; ready: false; needed: number }
  | { type: 'trend'; label: string; ready: true; perWeek: number; change: number; samples: number; unit?: string };

function toDay(date: string): number {
  const [year, month, day] = date.split('-').map(Number);
  return Date.UTC(year, month - 1, day) / DAY;
}

function fromDay(day: number): string {
  const date = new Date(day * DAY);
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

function localToday(now: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

const mean = (values: number[]) => values.reduce((a, b) => a + b, 0) / values.length;
const round1 = (value: number) => Math.round(value * 10) / 10;

function cycle(insight: Extract<TrackerInsight, { type: 'cycle' }>, records: TrackerRecord[], today: number): InsightResult {
  const days = [...new Set(records.map(record => record.data[insight.field]).filter((value): value is string => typeof value === 'string'))]
    .map(toDay).sort((a, b) => a - b);
  if (days.length < 2) return { type: 'cycle', label: insight.label, ready: false, needed: 2 - days.length };
  const intervals = days.slice(1).map((day, index) => day - days[index]).slice(-MAX_INTERVALS);
  const average = mean(intervals);
  // Spread needs at least three intervals; fewer would pretend to know the variability.
  const spread = intervals.length >= 3
    ? Math.max(1, Math.round(Math.sqrt(mean(intervals.map(value => (value - average) ** 2)))))
    : null;
  const last = days[days.length - 1];
  const next = last + Math.round(average);
  return {
    type: 'cycle', label: insight.label, ready: true,
    average: round1(average), shortest: Math.min(...intervals), longest: Math.max(...intervals), samples: intervals.length,
    last: fromDay(last), next: fromDay(next), spread, daysUntil: next - today,
    ranges: insight.offsets.map(offset => ({ label: offset.label, start: fromDay(next + offset.from), end: fromDay(next + offset.to) })),
  };
}

function duration(insight: Extract<TrackerInsight, { type: 'duration' }>, records: TrackerRecord[]): InsightResult {
  const spans = records.flatMap(record => {
    const start = record.data[insight.start];
    const end = record.data[insight.end];
    if (typeof start !== 'string' || typeof end !== 'string') return [];
    const days = toDay(end) - toDay(start) + 1;
    return days >= 1 ? [{ start: toDay(start), days }] : [];
  }).sort((a, b) => a.start - b.start).slice(-MAX_DURATIONS);
  if (!spans.length) return { type: 'duration', label: insight.label, ready: false, needed: 1 };
  return {
    type: 'duration', label: insight.label, ready: true,
    latest: spans[spans.length - 1].days, average: round1(mean(spans.map(span => span.days))), samples: spans.length,
  };
}

function trend(insight: Extract<TrackerInsight, { type: 'trend' }>, records: TrackerRecord[], field?: TrackerField): InsightResult {
  const points = records.flatMap(record => {
    const value = record.data[insight.field];
    return typeof value === 'number' ? [{ x: new Date(record.recorded_at).getTime() / DAY, y: value }] : [];
  }).sort((a, b) => a.x - b.x).slice(-insight.window);
  const needed = 3 - points.length;
  if (needed > 0 || points[points.length - 1].x - points[0].x < 1) {
    return { type: 'trend', label: insight.label, ready: false, needed: Math.max(needed, 1) };
  }
  const mx = mean(points.map(point => point.x));
  const my = mean(points.map(point => point.y));
  const slope = points.reduce((sum, p) => sum + (p.x - mx) * (p.y - my), 0) / points.reduce((sum, p) => sum + (p.x - mx) ** 2, 0);
  return {
    type: 'trend', label: insight.label, ready: true,
    perWeek: round1(slope * 7), change: round1(points[points.length - 1].y - points[0].y), samples: points.length, unit: field?.unit,
  };
}

export function computeTrackerInsights(module: TrackerModuleDefinition, records: TrackerRecord[], now = new Date()): InsightResult[] {
  const today = toDay(localToday(now));
  return module.insights.map(insight => {
    if (insight.type === 'cycle') return cycle(insight, records, today);
    if (insight.type === 'duration') return duration(insight, records);
    return trend(insight, records, module.fields.find(field => field.key === insight.field));
  });
}

export interface TrackerProjection {
  date: string;
  moduleId: string;
  moduleName: string;
  label: string;
  kind: 'next' | 'range';
}

/**
 * Calendar days in [from, to) predicted by cycle insights, repeating the average cycle
 * for a few periods ahead. Days on or before the latest record are never marked.
 */
export function projectTrackerDates(
  module: TrackerModule, records: TrackerRecord[], from: string, to: string, now = new Date(), cycles = 3
): TrackerProjection[] {
  const start = toDay(from);
  const end = toDay(to);
  const out = new Map<string, TrackerProjection>();
  const add = (day: number, label: string, kind: TrackerProjection['kind'], last: number) => {
    if (day < start || day >= end || day <= last) return;
    const key = `${day}|${label}`;
    if (!out.has(key)) out.set(key, { date: fromDay(day), moduleId: module.id, moduleName: module.name, label, kind });
  };
  computeTrackerInsights(module, records, now).forEach((result, index) => {
    const insight = module.insights[index];
    if (result.type !== 'cycle' || !result.ready || insight.type !== 'cycle') return;
    const last = toDay(result.last);
    const step = Math.round(result.average);
    for (let k = 0; k < cycles; k++) {
      const next = toDay(result.next) + k * step;
      for (let day = next - (result.spread ?? 0); day <= next + (result.spread ?? 0); day++) add(day, `${insight.label}（預測）`, 'next', last);
      for (const offset of insight.offsets) {
        for (let day = next + offset.from; day <= next + offset.to; day++) add(day, offset.label, 'range', last);
      }
    }
  });
  return [...out.values()].sort((a, b) => a.date.localeCompare(b.date));
}

export const TRACKER_REMINDER_PREFIX = 'lumi-tracker-';
export const TRACKER_REMINDER_HOUR = 9;

export interface TrackerReminderPlan { id: string; moduleId: string; date: Date; title: string; body: string }

/** One local reminder per cycle insight that opted in, for the next predicted date only. */
export function planTrackerReminders(module: TrackerModule, records: TrackerRecord[], now = new Date()): TrackerReminderPlan[] {
  return computeTrackerInsights(module, records, now).flatMap((result, index) => {
    const insight = module.insights[index];
    if (result.type !== 'cycle' || !result.ready || insight.type !== 'cycle' || insight.remindDaysBefore === undefined) return [];
    const [year, month, day] = fromDay(toDay(result.next) - insight.remindDaysBefore).split('-').map(Number);
    const date = new Date(year, month - 1, day, TRACKER_REMINDER_HOUR, 0, 0, 0);
    if (date.getTime() <= now.getTime()) return [];
    const [, nextMonth, nextDay] = result.next.split('-').map(Number);
    const body = insight.remindDaysBefore === 0
      ? `${insight.label}預計今天（${nextMonth}/${nextDay}）`
      : `${insight.label}預計 ${nextMonth}/${nextDay}，還有 ${insight.remindDaysBefore} 天`;
    return [{ id: `${TRACKER_REMINDER_PREFIX}${module.id}-${index}`, moduleId: module.id, date, title: 'Lumi 推算提醒', body }];
  });
}

export interface TrackerHighlight { moduleId: string; moduleName: string; text: string }

/** Home-screen lines for cycles due within `withinDays` or overdue, or with a range covering today. */
export function trackerHighlights(module: TrackerModule, records: TrackerRecord[], now = new Date(), withinDays = 14): TrackerHighlight[] {
  const today = localToday(now);
  return computeTrackerInsights(module, records, now).flatMap(result => {
    // Long-overdue cycles usually mean tracking stopped; stop nagging after 45 days.
    if (result.type !== 'cycle' || !result.ready || result.daysUntil < -45) return [];
    const active = result.ranges.filter(range => range.start <= today && today <= range.end).map(range => `今天在${range.label}`);
    if (result.daysUntil > withinDays && !active.length) return [];
    const [, month, day] = result.next.split('-').map(Number);
    const when = result.daysUntil > 0 ? `還有 ${result.daysUntil} 天（${month}/${day}）`
      : result.daysUntil === 0 ? '預測是今天' : `已過預測日 ${-result.daysUntil} 天`;
    return [{ moduleId: module.id, moduleName: module.name, text: [`${result.label}${when}`, ...active].join('，') }];
  });
}

/** Plain-text summary of computed insights for Ask Lumi; results are data, not instructions. */
export function describeInsightResults(module: TrackerModule, records: TrackerRecord[], now = new Date()): string[] {
  return computeTrackerInsights(module, records, now).map(result => {
    const head = `${module.name}／${result.label}：`;
    if (!result.ready) return head + `資料不足，還需 ${result.needed} 筆紀錄`;
    if (result.type === 'cycle') {
      const ranges = result.ranges.map(range => `${range.label} ${range.start}${range.start === range.end ? '' : `～${range.end}`}`);
      return head + [`預測下次 ${result.next}${result.spread ? `（±${result.spread} 天）` : ''}`, `距今天 ${result.daysUntil} 天`,
        `平均週期 ${result.average} 天（${result.shortest}–${result.longest}，${result.samples} 次間隔）`, `最近一次 ${result.last}`, ...ranges].join('；');
    }
    if (result.type === 'duration') return head + `最近 ${result.latest} 天，平均 ${result.average} 天（${result.samples} 次）`;
    return head + `每週 ${result.perWeek}${result.unit ?? ''}，最近 ${result.samples} 筆共變化 ${result.change}${result.unit ?? ''}`;
  });
}

export function describeTrackerInsight(insight: TrackerInsight, fields: TrackerField[]): string {
  const label = (key: string) => fields.find(field => field.key === key)?.label ?? key;
  if (insight.type === 'cycle') {
    const relative = (days: number) => days < 0 ? `前 ${-days} 天` : days > 0 ? `後 ${days} 天` : '當天';
    const offsets = insight.offsets.map(offset => `${offset.label}＝預測日${relative(offset.from)}` +
      (offset.from === offset.to ? '' : `～${relative(offset.to)}`));
    return [`依「${label(insight.field)}」相鄰間隔推算下次日期`, ...offsets].join('；');
  }
  if (insight.type === 'duration') return `「${label(insight.start)}」到「${label(insight.end)}」的天數（含首尾）`;
  return `「${label(insight.field)}」最近 ${insight.window} 筆的每週變化`;
}
