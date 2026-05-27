import React, { useState, useCallback } from 'react';
import {
  View, FlatList, StyleSheet, Text, ActivityIndicator,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import CalendarGrid from '../../components/shared/CalendarGrid';
import TaskCard from '../../components/tasks/TaskCard';
import { useCalendar } from '../../contexts/CalendarContext';
import {
  getTasksForDate,
  getDatesWithTasks,
  toggleTaskComplete,
} from '../../services/taskService';
import { getTransactionsForMonth } from '../../services/financeService';
import { Task } from '../../types/task';

function toMonthStr(year: number, month: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}`;
}

export default function CalendarScreen() {
  const router = useRouter();
  const { year, month, selectedDate } = useCalendar();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [taskDates, setTaskDates] = useState<Set<string>>(new Set());
  const [financeDates, setFinanceDates] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  useFocusEffect(
    useCallback(() => {
      getDatesWithTasks().then(dates => setTaskDates(new Set(dates)));
      getTransactionsForMonth(toMonthStr(year, month)).then(txs => {
        setFinanceDates(new Set(txs.map(t => t.created_at.split('T')[0])));
      });
      loadDayTasks(selectedDate);
    }, [year, month])
  );

  async function loadDayTasks(date: string) {
    setLoading(true);
    const data = await getTasksForDate(date);
    setTasks(data);
    setLoading(false);
  }

  function handleDayPress(date: string) {
    loadDayTasks(date);
  }

  async function handleToggle(id: string, completed: boolean) {
    await toggleTaskComplete(id, completed);
    setTasks(prev => prev.map(t => (t.id === id ? { ...t, completed: completed ? 1 : 0 } : t)));
  }

  const dateMonth = parseInt(selectedDate.split('-')[1]);
  const dateDay = parseInt(selectedDate.split('-')[2]);
  const todayStr = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}`;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <CalendarGrid
        taskDates={taskDates}
        financeDates={financeDates}
        onDayPress={handleDayPress}
      />

      <View style={styles.divider} />

      <View style={styles.daySection}>
        <Text style={styles.dayLabel}>
          {dateMonth}月{dateDay}日
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0F0F0F' },
  divider: { height: 1, backgroundColor: '#252525', marginTop: 4 },
  daySection: { paddingHorizontal: 20, paddingVertical: 10 },
  dayLabel: { color: '#FFFFFF', fontSize: 14, fontWeight: '300', letterSpacing: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { paddingBottom: 24 },
  empty: { alignItems: 'center', paddingTop: 30 },
  emptyText: { color: '#555555', fontSize: 13, letterSpacing: 1 },
});
