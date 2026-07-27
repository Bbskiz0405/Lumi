import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useCalendar } from '../../contexts/CalendarContext';
import { toLocalDateString } from '../../utils/date';

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];
const MONTHS = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];

interface Props {
  taskDates?: Set<string>;
  financeDates?: Set<string>;
  taskPriorityMap?: Map<string, 'high' | 'medium' | 'low'>;
  onDayPress?: (date: string) => void;
}

const PRIORITY_COLORS: Record<string, string> = {
  high: '#FF6655',
  medium: '#FF9944',
  low: '#88AAFF',
};

function toDateStr(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export default function CalendarGrid({ taskDates, financeDates, taskPriorityMap, onDayPress }: Props) {
  const { year, month, selectedDate, setSelectedDate, prevMonth, nextMonth } = useCalendar();
  const todayStr = toLocalDateString();

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  function handleDayPress(day: number) {
    const date = toDateStr(year, month, day);
    setSelectedDate(date);
    onDayPress?.(date);
  }

  return (
    <View>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={prevMonth} style={styles.navBtn} hitSlop={{top:20, bottom:20, left:20, right:20}}>
          <Text style={{ color: '#55DDAA', fontSize: 24, fontWeight: 'bold' }}>{' < '}</Text>
        </TouchableOpacity>
        <Text style={styles.monthTitle}>{year}年 {MONTHS[month]}</Text>
        <TouchableOpacity onPress={nextMonth} style={styles.navBtn} hitSlop={{top:20, bottom:20, left:20, right:20}}>
          <Text style={{ color: '#55DDAA', fontSize: 24, fontWeight: 'bold' }}>{' > '}</Text>
        </TouchableOpacity>
      </View>

      {/* Weekday labels */}
      <View style={styles.weekRow}>
        {WEEKDAYS.map(w => (
          <Text key={w} style={styles.weekLabel}>{w}</Text>
        ))}
      </View>

      {/* Grid */}
      <View style={styles.grid}>
        {cells.map((day, idx) => {
          if (!day) return <View key={idx} style={styles.cell} />;
          const dateStr = toDateStr(year, month, day);
          const isToday = dateStr === todayStr;
          const isSelected = dateStr === selectedDate;
          const hasTask = taskDates?.has(dateStr);
          const hasFinance = financeDates?.has(dateStr);
          return (
            <TouchableOpacity key={idx} style={styles.cell} onPress={() => handleDayPress(day)}>
              <View style={[
                styles.dayCircle,
                isSelected && styles.selectedCircle,
                isToday && !isSelected && styles.todayCircle,
              ]}>
                <Text style={[
                  styles.dayText,
                  isSelected && styles.selectedText,
                  isToday && !isSelected && styles.todayText,
                ]}>
                  {day}
                </Text>
              </View>
              <View style={styles.dotRow}>
                {hasTask && (
                  <View style={[
                    styles.dot,
                    { backgroundColor: PRIORITY_COLORS[taskPriorityMap?.get(dateStr) ?? 'medium'] },
                  ]} />
                )}
                {hasFinance && <View style={[styles.dot, { backgroundColor: '#55DDAA' }]} />}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 12,
  },
  navBtn: { padding: 8 },
  monthTitle: { color: '#FFFFFF', fontSize: 16, fontWeight: '300', letterSpacing: 1 },
  weekRow: { flexDirection: 'row', paddingHorizontal: 8, marginBottom: 4 },
  weekLabel: { flex: 1, textAlign: 'center', color: '#666666', fontSize: 11, fontWeight: '400' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 8 },
  cell: { width: '14.28%', alignItems: 'center', paddingVertical: 3 },
  dayCircle: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  todayCircle: { borderWidth: 1, borderColor: '#666666' },
  selectedCircle: { backgroundColor: '#FFFFFF' },
  dayText: { color: '#AAAAAA', fontSize: 13 },
  todayText: { color: '#FFFFFF' },
  selectedText: { color: '#0F0F0F', fontWeight: '500' },
  dotRow: { flexDirection: 'row', gap: 2, height: 6, marginTop: 1 },
  dot: { width: 4, height: 4, borderRadius: 2 },
});
