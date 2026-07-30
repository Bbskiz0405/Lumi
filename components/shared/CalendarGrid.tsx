import React from 'react';
import { Animated, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useCalendar } from '../../contexts/CalendarContext';
import { toLocalDateString } from '../../utils/date';
import TechIcon from '../ui/TechIcon';
import { getTaskTagMeta } from '../../utils/taskTags';
import { WorkDateStatus } from '../../types/workTime';

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];
const MONTHS = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];

interface Props {
  mode?: 'calendar' | 'work' | 'finance';
  previousMode?: 'calendar' | 'work' | 'finance';
  taskDates?: Set<string>;
  financeDates?: Set<string>;
  externalDates?: Set<string>;
  eventDates?: Set<string>;
  workDateStatusMap?: Map<string, WorkDateStatus>;
  taskPriorityMap?: Map<string, 'high' | 'medium' | 'low'>;
  taskTagMap?: Map<string, string>;
  markerTransition?: Animated.Value;
  onDayPress?: (date: string) => void;
}

const PRIORITY_COLORS: Record<string, string> = {
  high: '#FF6655',
  medium: '#FF9944',
  low: '#88AAFF',
};

const WORK_STATUS_COLORS: Record<WorkDateStatus, string> = {
  active: '#88AAFF',
  positive: '#55DDAA',
  balanced: '#AAB2BA',
  negative: '#D58A60',
};

function toDateStr(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export default function CalendarGrid({
  mode = 'calendar',
  previousMode,
  taskDates,
  financeDates,
  externalDates,
  eventDates,
  workDateStatusMap,
  taskPriorityMap,
  taskTagMap,
  markerTransition,
  onDayPress,
}: Props) {
  const { year, month, selectedDate, setSelectedDate, prevMonth, nextMonth, goToday } = useCalendar();
  const todayStr = toLocalDateString();

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length < 42) cells.push(null);

  function handleDayPress(day: number) {
    const date = toDateStr(year, month, day);
    setSelectedDate(date);
    onDayPress?.(date);
  }

  const incomingOpacity = previousMode && markerTransition ? markerTransition : 1;
  const outgoingOpacity = previousMode && markerTransition
    ? markerTransition.interpolate({
        inputRange: [0, 1],
        outputRange: [1, 0],
      })
    : 0;

  function renderMarkers(
    markerMode: 'calendar' | 'work' | 'finance',
    dateStr: string,
    hasTask: boolean | undefined,
    hasFinance: boolean | undefined,
    hasExternal: boolean | undefined,
    hasEvent: boolean | undefined,
    workStatus: WorkDateStatus | undefined
  ) {
    return (
      <>
        {markerMode === 'calendar' && hasTask && (
          <View style={[
            styles.dot,
            {
              backgroundColor: taskTagMap?.has(dateStr)
                ? getTaskTagMeta(taskTagMap.get(dateStr)!).color
                : PRIORITY_COLORS[taskPriorityMap?.get(dateStr) ?? 'medium'],
            },
          ]} />
        )}
        {markerMode === 'calendar' && hasEvent && <View style={styles.eventDot} />}
        {markerMode === 'calendar' && hasExternal && <View style={styles.externalDot} />}
        {markerMode === 'work' && workStatus && (
          <View style={[styles.workDot, { backgroundColor: WORK_STATUS_COLORS[workStatus] }]} />
        )}
        {markerMode === 'finance' && hasFinance && (
          <View style={[styles.dot, { backgroundColor: '#55DDAA' }]} />
        )}
      </>
    );
  }

  function renderLegend(legendMode: 'calendar' | 'work' | 'finance') {
    if (legendMode === 'calendar') {
      return (
        <>
          <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: '#FF9944' }]} /><Text style={styles.legendText}>任務</Text></View>
          <View style={styles.legendItem}><View style={styles.legendEventDot} /><Text style={styles.legendText}>Lumi 行程</Text></View>
          <View style={styles.legendItem}><View style={styles.legendExternalDot} /><Text style={styles.legendText}>外部行程</Text></View>
        </>
      );
    }
    if (legendMode === 'work') {
      return (
        <>
          <View style={styles.legendItem}><View style={[styles.legendWorkDot, { backgroundColor: '#88AAFF' }]} /><Text style={styles.legendText}>上班中</Text></View>
          <View style={styles.legendItem}><View style={[styles.legendWorkDot, { backgroundColor: '#55DDAA' }]} /><Text style={styles.legendText}>超時</Text></View>
          <View style={styles.legendItem}><View style={[styles.legendWorkDot, { backgroundColor: '#AAB2BA' }]} /><Text style={styles.legendText}>剛好</Text></View>
          <View style={styles.legendItem}><View style={[styles.legendWorkDot, { backgroundColor: '#D58A60' }]} /><Text style={styles.legendText}>不足</Text></View>
        </>
      );
    }
    return (
      <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: '#55DDAA' }]} /><Text style={styles.legendText}>有記帳</Text></View>
    );
  }

  return (
    <View>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={prevMonth}
          style={styles.navBtn}
          hitSlop={{top:20, bottom:20, left:20, right:20}}
          accessibilityRole="button"
          accessibilityLabel="上一個月"
        >
          <TechIcon name="chevron-left" size={20} color="#55DDAA" />
        </TouchableOpacity>
        <View style={styles.monthHeading}>
          <Text style={styles.monthTitle}>{year}年 {MONTHS[month]}</Text>
          <TouchableOpacity
            onPress={goToday}
            style={styles.todayButton}
            accessibilityRole="button"
            accessibilityLabel="回到今天"
          >
            <Text style={styles.todayButtonText}>今天</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity
          onPress={nextMonth}
          style={styles.navBtn}
          hitSlop={{top:20, bottom:20, left:20, right:20}}
          accessibilityRole="button"
          accessibilityLabel="下一個月"
        >
          <TechIcon name="chevron-right" size={20} color="#55DDAA" />
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
          const hasExternal = externalDates?.has(dateStr);
          const hasEvent = eventDates?.has(dateStr);
          const workStatus = workDateStatusMap?.get(dateStr);
          const markerLabel = mode === 'calendar'
            ? `${hasTask ? '，有任務' : ''}${hasEvent ? '，有 Lumi 行程' : ''}${hasExternal ? '，有外部行程' : ''}`
            : mode === 'work'
              ? workStatus ? `，有工時紀錄，${workStatus === 'active' ? '上班中' : workStatus === 'negative' ? '工時不足' : '已完成'}` : ''
              : hasFinance ? '，有記帳' : '';
          return (
            <TouchableOpacity
              key={idx}
              style={styles.cell}
              onPress={() => handleDayPress(day)}
              accessibilityRole="button"
              accessibilityLabel={`${year}年${month + 1}月${day}日${markerLabel}`}
              accessibilityState={{ selected: isSelected }}
            >
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
              <View style={styles.markerStack}>
                {previousMode && (
                  <Animated.View style={[styles.markerLayer, { opacity: outgoingOpacity }]}>
                    {renderMarkers(previousMode, dateStr, hasTask, hasFinance, hasExternal, hasEvent, workStatus)}
                  </Animated.View>
                )}
                <Animated.View style={[styles.markerLayer, { opacity: incomingOpacity }]}>
                  {renderMarkers(mode, dateStr, hasTask, hasFinance, hasExternal, hasEvent, workStatus)}
                </Animated.View>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
      <View style={styles.legendStack}>
        {previousMode && (
          <Animated.View style={[styles.legendLayer, { opacity: outgoingOpacity }]}>
            {renderLegend(previousMode)}
          </Animated.View>
        )}
        <Animated.View style={[styles.legendLayer, { opacity: incomingOpacity }]}>
          {renderLegend(mode)}
        </Animated.View>
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
  monthHeading: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  monthTitle: { color: '#FFFFFF', fontSize: 16, fontWeight: '300', letterSpacing: 1 },
  todayButton: {
    borderWidth: 1,
    borderColor: '#33383D',
    borderRadius: 5,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  todayButtonText: { color: '#8C949C', fontSize: 10, letterSpacing: 0.5 },
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
  markerStack: { width: 22, height: 7, marginTop: 1, position: 'relative' },
  markerLayer: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  dot: { width: 4, height: 4, borderRadius: 2 },
  externalDot: { width: 5, height: 5, borderRadius: 3, borderWidth: 1, borderColor: '#88AAFF' },
  eventDot: { width: 5, height: 5, borderRadius: 1, backgroundColor: '#55DDAA' },
  workDot: { width: 6, height: 3, borderRadius: 1 },
  legendStack: {
    height: 18,
    marginTop: 4,
    marginBottom: 4,
    position: 'relative',
  },
  legendLayer: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 18,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 4, height: 4, borderRadius: 2 },
  legendExternalDot: { width: 5, height: 5, borderRadius: 3, borderWidth: 1, borderColor: '#88AAFF' },
  legendEventDot: { width: 5, height: 5, borderRadius: 1, backgroundColor: '#55DDAA' },
  legendWorkDot: { width: 6, height: 3, borderRadius: 1 },
  legendText: { color: '#555D64', fontSize: 9, letterSpacing: 0.3 },
});
