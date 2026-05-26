import React, { useState, useCallback, useRef } from 'react';
import {
  View, FlatList, StyleSheet, Text, TouchableOpacity,
  ActivityIndicator, Animated, PanResponder, Dimensions,
  ScrollView,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import TaskCard from '../../components/tasks/TaskCard';
import TransactionCard from '../../components/finance/TransactionCard';
import {
  getTasksForDate,
  getDatesWithTasks,
  toggleTaskComplete,
} from '../../services/taskService';
import {
  getTransactionsForMonth,
  getMonthSummary,
  deleteTransaction,
} from '../../services/financeService';
import { Task } from '../../types/task';
import { Transaction } from '../../types/finance';

const SCREEN_WIDTH = Dimensions.get('window').width;
const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];
const MONTHS = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];

type CalendarMode = 'tasks' | 'finance';

function toDateStr(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function toMonthStr(year: number, month: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}`;
}

export default function CalendarScreen() {
  const router = useRouter();
  const today = new Date();
  const todayStr = toDateStr(today.getFullYear(), today.getMonth(), today.getDate());

  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [mode, setMode] = useState<CalendarMode>('tasks');

  // Task state
  const [tasks, setTasks] = useState<Task[]>([]);
  const [taskDates, setTaskDates] = useState<Set<string>>(new Set());

  // Finance state
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [financeDates, setFinanceDates] = useState<Set<string>>(new Set());
  const [summary, setSummary] = useState({ income: 0, expense: 0 });

  const [loading, setLoading] = useState(false);

  // Swipe animation
  const slideAnim = useRef(new Animated.Value(0)).current;
  const modeRef = useRef<CalendarMode>('tasks');
  modeRef.current = mode;

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gs) => Math.abs(gs.dx) > 15 && Math.abs(gs.dx) > Math.abs(gs.dy),
      onPanResponderMove: (_, gs) => {
        const currentOffset = modeRef.current === 'tasks' ? 0 : -SCREEN_WIDTH;
        const newVal = currentOffset + gs.dx;
        const clamped = Math.max(-SCREEN_WIDTH, Math.min(0, newVal));
        slideAnim.setValue(clamped);
      },
      onPanResponderRelease: (_, gs) => {
        const threshold = SCREEN_WIDTH * 0.25;
        if (modeRef.current === 'tasks' && gs.dx < -threshold) {
          switchMode('finance');
        } else if (modeRef.current === 'finance' && gs.dx > threshold) {
          switchMode('tasks');
        } else {
          Animated.spring(slideAnim, {
            toValue: modeRef.current === 'tasks' ? 0 : -SCREEN_WIDTH,
            useNativeDriver: true,
            friction: 8,
          }).start();
        }
      },
    })
  ).current;

  function switchMode(newMode: CalendarMode) {
    setMode(newMode);
    Animated.spring(slideAnim, {
      toValue: newMode === 'tasks' ? 0 : -SCREEN_WIDTH,
      useNativeDriver: true,
      friction: 8,
    }).start();
  }

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  async function loadData() {
    const currentMonth = toMonthStr(year, month);
    getDatesWithTasks().then(dates => setTaskDates(new Set(dates)));
    getTransactionsForMonth(currentMonth).then(txs => {
      setTransactions(txs);
      const dates = new Set(txs.map(t => t.created_at.split('T')[0]));
      setFinanceDates(dates);
    });
    getMonthSummary(currentMonth).then(setSummary);
    loadDayData(selectedDate);
  }

  async function loadDayData(date: string) {
    setLoading(true);
    const data = await getTasksForDate(date);
    setTasks(data);
    setLoading(false);
  }

  function prevMonth() {
    if (month === 0) { setYear(y => y - 1); setMonth(11); }
    else setMonth(m => m - 1);
    const newMonth = month === 0 ? 11 : month - 1;
    const newYear = month === 0 ? year - 1 : year;
    const m = toMonthStr(newYear, newMonth);
    getTransactionsForMonth(m).then(txs => {
      setTransactions(txs);
      setFinanceDates(new Set(txs.map(t => t.created_at.split('T')[0])));
    });
    getMonthSummary(m).then(setSummary);
  }

  function nextMonth() {
    if (month === 11) { setYear(y => y + 1); setMonth(0); }
    else setMonth(m => m + 1);
    const newMonth = month === 11 ? 0 : month + 1;
    const newYear = month === 11 ? year + 1 : year;
    const m = toMonthStr(newYear, newMonth);
    getTransactionsForMonth(m).then(txs => {
      setTransactions(txs);
      setFinanceDates(new Set(txs.map(t => t.created_at.split('T')[0])));
    });
    getMonthSummary(m).then(setSummary);
  }

  function handleDayPress(day: number) {
    const date = toDateStr(year, month, day);
    setSelectedDate(date);
    loadDayData(date);
  }

  async function handleToggle(id: string, completed: boolean) {
    await toggleTaskComplete(id, completed);
    setTasks(prev => prev.map(t => (t.id === id ? { ...t, completed: completed ? 1 : 0 } : t)));
  }

  async function handleDeleteTx(id: string) {
    await deleteTransaction(id);
    const currentMonth = toMonthStr(year, month);
    getTransactionsForMonth(currentMonth).then(txs => {
      setTransactions(txs);
      setFinanceDates(new Set(txs.map(t => t.created_at.split('T')[0])));
    });
    getMonthSummary(currentMonth).then(setSummary);
  }

  // Calendar grid
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  // Day transactions
  const dayTransactions = transactions.filter(t => t.created_at.split('T')[0] === selectedDate);
  const balance = summary.income - summary.expense;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={prevMonth} style={styles.navBtn}>
          <MaterialCommunityIcons name="chevron-left" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.monthTitle}>{year}年 {MONTHS[month]}</Text>
        <TouchableOpacity onPress={nextMonth} style={styles.navBtn}>
          <MaterialCommunityIcons name="chevron-right" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Weekday labels */}
      <View style={styles.weekRow}>
        {WEEKDAYS.map(w => (
          <Text key={w} style={styles.weekLabel}>{w}</Text>
        ))}
      </View>

      {/* Calendar grid — dots change based on mode */}
      <View style={styles.grid}>
        {cells.map((day, idx) => {
          if (!day) return <View key={idx} style={styles.cell} />;
          const dateStr = toDateStr(year, month, day);
          const isToday = dateStr === todayStr;
          const isSelected = dateStr === selectedDate;
          const hasTask = taskDates.has(dateStr);
          const hasFinance = financeDates.has(dateStr);
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
                {hasTask && <View style={[styles.dot, { backgroundColor: '#88AAFF' }]} />}
                {hasFinance && <View style={[styles.dot, { backgroundColor: '#55DDAA' }]} />}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Mode toggle */}
      <View style={styles.modeBar}>
        <TouchableOpacity
          style={[styles.modeTab, mode === 'tasks' && styles.modeTabActive]}
          onPress={() => switchMode('tasks')}
        >
          <MaterialCommunityIcons name="checkbox-marked-outline" size={14} color={mode === 'tasks' ? '#88AAFF' : '#555'} />
          <Text style={[styles.modeText, mode === 'tasks' && { color: '#88AAFF' }]}>任務</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.modeTab, mode === 'finance' && styles.modeTabActive]}
          onPress={() => switchMode('finance')}
        >
          <MaterialCommunityIcons name="wallet-outline" size={14} color={mode === 'finance' ? '#55DDAA' : '#555'} />
          <Text style={[styles.modeText, mode === 'finance' && { color: '#55DDAA' }]}>財務</Text>
        </TouchableOpacity>
      </View>

      {/* Swipeable content */}
      <View style={styles.contentWrapper} {...panResponder.panHandlers}>
        <Animated.View style={[styles.contentSlider, { transform: [{ translateX: slideAnim }] }]}>
          {/* Tasks panel */}
          <View style={styles.panel}>
            <View style={styles.daySection}>
              <Text style={styles.dayLabel}>
                {parseInt(selectedDate.split('-')[1])}月{parseInt(selectedDate.split('-')[2])}日
                {selectedDate === todayStr ? '  今天' : ''}
              </Text>
            </View>
            {loading ? (
              <View style={styles.center}>
                <ActivityIndicator color="#FFFFFF" />
              </View>
            ) : (
              <FlatList
                data={tasks}
                keyExtractor={item => item.id}
                contentContainerStyle={styles.list}
                ItemSeparatorComponent={() => <View style={{ height: 2 }} />}
                renderItem={({ item }) => (
                  <TaskCard
                    task={item}
                    onToggleComplete={handleToggle}
                    onPress={id => router.push(`/task/${id}`)}
                  />
                )}
                ListEmptyComponent={
                  <View style={styles.empty}>
                    <Text style={styles.emptyText}>這天沒有任務</Text>
                  </View>
                }
              />
            )}
          </View>

          {/* Finance panel */}
          <View style={styles.panel}>
            {/* Monthly summary */}
            <View style={styles.summaryRow}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>收入</Text>
                <Text style={[styles.summaryAmount, { color: '#55DDAA' }]}>{summary.income.toLocaleString()}</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>支出</Text>
                <Text style={[styles.summaryAmount, { color: '#FF6655' }]}>{summary.expense.toLocaleString()}</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>結餘</Text>
                <Text style={[styles.summaryAmount, { color: balance >= 0 ? '#FFFFFF' : '#FF4444' }]}>{balance.toLocaleString()}</Text>
              </View>
            </View>

            {/* Day transactions */}
            <View style={styles.daySection}>
              <Text style={styles.dayLabel}>
                {parseInt(selectedDate.split('-')[1])}月{parseInt(selectedDate.split('-')[2])}日
              </Text>
            </View>
            <ScrollView contentContainerStyle={styles.list}>
              {dayTransactions.length === 0 ? (
                <View style={styles.empty}>
                  <Text style={styles.emptyText}>這天沒有記錄</Text>
                </View>
              ) : (
                dayTransactions.map(tx => (
                  <TransactionCard key={tx.id} transaction={tx} onDelete={handleDeleteTx} />
                ))
              )}
            </ScrollView>
          </View>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0F0F0F' },
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

  modeBar: {
    flexDirection: 'row', marginHorizontal: 16, marginTop: 6, marginBottom: 2,
    borderRadius: 8, backgroundColor: '#111111', borderWidth: 1, borderColor: '#252525',
  },
  modeTab: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 8, gap: 5, borderRadius: 8,
  },
  modeTabActive: { backgroundColor: '#1A1A1A' },
  modeText: { color: '#555', fontSize: 12, fontWeight: '300' },

  contentWrapper: { flex: 1, overflow: 'hidden' },
  contentSlider: { flexDirection: 'row', width: SCREEN_WIDTH * 2, flex: 1 },
  panel: { width: SCREEN_WIDTH, flex: 1 },

  daySection: { paddingHorizontal: 20, paddingVertical: 10 },
  dayLabel: { color: '#FFFFFF', fontSize: 14, fontWeight: '300', letterSpacing: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { paddingBottom: 24 },
  empty: { alignItems: 'center', paddingTop: 30 },
  emptyText: { color: '#555555', fontSize: 13, letterSpacing: 1 },

  summaryRow: {
    flexDirection: 'row', marginHorizontal: 16, marginTop: 8,
    backgroundColor: '#111111', borderRadius: 12, borderWidth: 1,
    borderColor: '#252525', paddingVertical: 12,
  },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryDivider: { width: 1, backgroundColor: '#252525' },
  summaryLabel: { color: '#666', fontSize: 10, marginBottom: 3, letterSpacing: 1 },
  summaryAmount: { fontSize: 15, fontWeight: '300' },
});
