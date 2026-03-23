import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import ModuleCard from './ModuleCard';
import { getTasksForDate } from '../../services/taskService';

interface Props {
  onPress: () => void;
}

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];

export default function CalendarModule({ onPress }: Props) {
  const [todayCount, setTodayCount] = useState(0);
  const now = new Date();
  const today = now.toISOString().split('T')[0];

  useEffect(() => {
    getTasksForDate(today).then(tasks =>
      setTodayCount(tasks.filter(t => t.completed === 0).length)
    );
  }, []);

  return (
    <ModuleCard title="月曆" icon="calendar-month-outline" onPress={onPress} accent="#88AAFF">
      <Text style={styles.day}>{now.getDate()}</Text>
      <Text style={styles.weekday}>星期{WEEKDAYS[now.getDay()]}</Text>
      {todayCount > 0 ? (
        <Text style={styles.taskCount}>今天 {todayCount} 件任務</Text>
      ) : (
        <Text style={styles.taskCount}>今天無任務</Text>
      )}
    </ModuleCard>
  );
}

const styles = StyleSheet.create({
  day: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '200',
    lineHeight: 36,
  },
  weekday: {
    color: '#444444',
    fontSize: 12,
    fontWeight: '300',
    marginTop: 2,
  },
  taskCount: {
    color: '#444444',
    fontSize: 11,
    marginTop: 10,
  },
});
