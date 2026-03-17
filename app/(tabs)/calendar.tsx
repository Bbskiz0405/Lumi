import React, { useState, useCallback } from 'react';
import { View, FlatList, StyleSheet } from 'react-native';
import { Text, Appbar, Divider, ActivityIndicator } from 'react-native-paper';
import { Calendar, DateData } from 'react-native-calendars';
import { useFocusEffect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import TaskCard from '../../components/tasks/TaskCard';
import {
  getTasksForDate,
  getDatesWithTasks,
  toggleTaskComplete,
} from '../../services/taskService';
import { Task } from '../../types/task';

type MarkedDates = Record<string, { marked?: boolean; selected?: boolean; selectedColor?: string; dotColor?: string }>;

export default function CalendarScreen() {
  const router = useRouter();
  const today = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState(today);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [markedDates, setMarkedDates] = useState<MarkedDates>({});
  const [loadingTasks, setLoadingTasks] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadMarkers();
      loadDayTasks(selectedDate);
    }, [])
  );

  async function loadMarkers() {
    const dates = await getDatesWithTasks();
    const marks: MarkedDates = {};
    for (const d of dates) {
      marks[d] = { marked: true, dotColor: '#1976D2' };
    }
    // keep selected styling
    setMarkedDates((prev) => {
      const next = { ...marks };
      if (selectedDate) {
        next[selectedDate] = {
          ...next[selectedDate],
          selected: true,
          selectedColor: '#1976D2',
        };
      }
      return next;
    });
  }

  async function loadDayTasks(date: string) {
    setLoadingTasks(true);
    const data = await getTasksForDate(date);
    setTasks(data);
    setLoadingTasks(false);
  }

  function handleDayPress(day: DateData) {
    const date = day.dateString;
    setSelectedDate(date);
    setMarkedDates((prev) => {
      const next: MarkedDates = {};
      for (const [k, v] of Object.entries(prev)) {
        next[k] = { ...v, selected: false };
      }
      next[date] = { ...next[date], selected: true, selectedColor: '#1976D2' };
      return next;
    });
    loadDayTasks(date);
  }

  async function handleToggle(id: string, completed: boolean) {
    await toggleTaskComplete(id, completed);
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, completed: completed ? 1 : 0 } : t))
    );
  }

  function formatDateLabel(dateStr: string): string {
    const [y, m, d] = dateStr.split('-');
    return `${parseInt(m)} 月 ${parseInt(d)} 日`;
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Appbar.Header style={styles.header} elevated={false}>
        <Appbar.Content title="月曆" titleStyle={styles.headerTitle} />
      </Appbar.Header>

      <Calendar
        current={today}
        onDayPress={handleDayPress}
        markedDates={markedDates}
        theme={{
          todayTextColor: '#1976D2',
          selectedDayBackgroundColor: '#1976D2',
          arrowColor: '#1976D2',
          dotColor: '#1976D2',
          textMonthFontWeight: '600',
          textDayFontSize: 14,
          calendarBackground: '#FFFFFF',
        }}
        style={styles.calendar}
      />

      <Divider />

      <View style={styles.daySection}>
        <Text variant="titleMedium" style={styles.dayLabel}>
          {formatDateLabel(selectedDate)}
          {selectedDate === today ? '　（今天）' : ''}
        </Text>
      </View>

      {loadingTasks ? (
        <View style={styles.center}>
          <ActivityIndicator color="#1976D2" />
        </View>
      ) : (
        <FlatList
          data={tasks}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <TaskCard
              task={item}
              onToggleComplete={handleToggle}
              onPress={(id) => router.push(`/task/${id}`)}
            />
          )}
          ItemSeparatorComponent={() => <View style={{ height: 2 }} />}
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
  safe: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  header: {
    backgroundColor: '#F5F7FA',
  },
  headerTitle: {
    fontWeight: '700',
    color: '#212121',
  },
  calendar: {
    borderBottomWidth: 0,
    elevation: 2,
  },
  daySection: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  dayLabel: {
    fontWeight: '600',
    color: '#212121',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: {
    paddingBottom: 24,
  },
  empty: {
    alignItems: 'center',
    paddingTop: 40,
  },
  emptyText: {
    color: '#9E9E9E',
  },
});
