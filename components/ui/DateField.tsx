import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import TechIcon from './TechIcon';

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];
const pad = (value: number) => String(value).padStart(2, '0');
const toDate = (year: number, month: number, day: number) => `${year}-${pad(month + 1)}-${pad(day)}`;

function localDate(offsetDays = 0): string {
  const now = new Date();
  now.setDate(now.getDate() + offsetDays);
  return toDate(now.getFullYear(), now.getMonth(), now.getDate());
}

function parse(value: string): { year: number; month: number; day: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const [year, month, day] = [Number(match[1]), Number(match[2]) - 1, Number(match[3])];
  const date = new Date(year, month, day);
  return date.getFullYear() === year && date.getMonth() === month && date.getDate() === day ? { year, month, day } : null;
}

export function formatDateLabel(value: string): string {
  const parsed = parse(value);
  if (!parsed) return '';
  const relative = value === localDate() ? '今天' : value === localDate(-1) ? '昨天' : value === localDate(1) ? '明天'
    : '週' + WEEKDAYS[new Date(parsed.year, parsed.month, parsed.day).getDay()];
  return `${parsed.year}年${parsed.month + 1}月${parsed.day}日（${relative}）`;
}

interface Props {
  label: string;
  value: string;
  onChange: (value: string) => void;
  optional?: boolean;
  disabled?: boolean;
  /** Shortcut chips as [label, days from today]; past-looking fields keep 今天／昨天, plans use 今天／明天. */
  quick?: [string, number][];
  placeholder?: string;
}

/** Tap-to-pick date with an inline month grid; no typing, no nested modal. */
export default function DateField({ label, value, onChange, optional = false, disabled = false, quick = [['今天', 0], ['昨天', -1]], placeholder = '點選日期' }: Props) {
  const parsed = parse(value);
  const [open, setOpen] = useState(false);
  const [view, setView] = useState(() => {
    const base = parsed ?? parse(localDate())!;
    return { year: base.year, month: base.month };
  });

  function shiftMonth(delta: number) {
    const next = new Date(view.year, view.month + delta, 1);
    setView({ year: next.getFullYear(), month: next.getMonth() });
  }
  function pick(next: string) {
    onChange(next);
    setOpen(false);
  }
  function toggle() {
    if (!open && parsed) setView({ year: parsed.year, month: parsed.month });
    setOpen(!open);
  }

  const firstDay = new Date(view.year, view.month, 1).getDay();
  const days = new Date(view.year, view.month + 1, 0).getDate();
  const cells: (number | null)[] = [...Array(firstDay).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];
  while (cells.length % 7) cells.push(null);
  const today = localDate();

  return <View>
    <TouchableOpacity disabled={disabled} style={styles.field} onPress={toggle}
      accessibilityRole="button" accessibilityLabel={`${label}：${parsed ? formatDateLabel(value) : '未選擇'}，點選以${open ? '收起' : '選擇'}日期`}>
      <Text style={[styles.value, !parsed && styles.placeholder]}>{parsed ? formatDateLabel(value) : placeholder}</Text>
      <TechIcon name="calendar" size={17} color="#777" />
    </TouchableOpacity>
    <View style={styles.row}>
      {quick.map(([text, offset]) => [text, localDate(offset)]).map(([text, date]) =>
        <TouchableOpacity key={text} disabled={disabled} style={[styles.chip, value === date && styles.chipActive]} onPress={() => pick(date)}>
          <Text style={[styles.chipText, value === date && styles.chipTextActive]}>{text}</Text>
        </TouchableOpacity>)}
      {optional && !!value && <TouchableOpacity disabled={disabled} style={styles.chip} onPress={() => pick('')}>
        <Text style={styles.chipText}>清除</Text>
      </TouchableOpacity>}
    </View>
    {open && <View style={styles.calendar}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.nav} onPress={() => shiftMonth(-1)} accessibilityLabel="上一個月"><TechIcon name="chevron-left" size={18} color="#55DDAA" /></TouchableOpacity>
        <Text style={styles.month}>{view.year}年 {view.month + 1}月</Text>
        <TouchableOpacity style={styles.nav} onPress={() => shiftMonth(1)} accessibilityLabel="下一個月"><TechIcon name="chevron-right" size={18} color="#55DDAA" /></TouchableOpacity>
      </View>
      <View style={styles.grid}>
        {WEEKDAYS.map(day => <Text key={day} style={styles.weekday}>{day}</Text>)}
        {cells.map((day, index) => {
          if (!day) return <View key={index} style={styles.cell} />;
          const date = toDate(view.year, view.month, day);
          const selected = date === value;
          return <TouchableOpacity key={index} style={styles.cell} onPress={() => pick(date)}
            accessibilityRole="button" accessibilityLabel={`${view.year}年${view.month + 1}月${day}日`} accessibilityState={{ selected }}>
            <View style={[styles.day, selected && styles.daySelected, !selected && date === today && styles.dayToday]}>
              <Text style={[styles.dayText, selected && styles.dayTextSelected]}>{day}</Text>
            </View>
          </TouchableOpacity>;
        })}
      </View>
    </View>}
  </View>;
}

const styles = StyleSheet.create({
  field: { minHeight: 46, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#101010', borderWidth: 1, borderColor: '#292929', borderRadius: 8, paddingHorizontal: 13 },
  value: { color: '#EEE', fontSize: 14 }, placeholder: { color: '#5A5A5A' },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  chip: { minHeight: 36, minWidth: 52, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#303030', borderRadius: 7, paddingHorizontal: 12 },
  chipActive: { borderColor: '#55DDAA', backgroundColor: '#14221E' },
  chipText: { color: '#888', fontSize: 12 }, chipTextActive: { color: '#55DDAA' },
  calendar: { marginTop: 10, borderWidth: 1, borderColor: '#222', borderRadius: 10, padding: 8, backgroundColor: '#0F0F0F' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  nav: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  month: { color: '#EEE', fontSize: 14, fontWeight: '300' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  weekday: { width: '14.28%', textAlign: 'center', color: '#555', fontSize: 11, paddingVertical: 4 },
  cell: { width: '14.28%', height: 44, alignItems: 'center', justifyContent: 'center' },
  day: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  daySelected: { backgroundColor: '#55DDAA' }, dayToday: { borderWidth: 1, borderColor: '#555' },
  dayText: { color: '#BBB', fontSize: 13 }, dayTextSelected: { color: '#0F0F0F', fontWeight: '600' },
});
