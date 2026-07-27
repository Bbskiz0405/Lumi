import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useFocusEffect } from 'expo-router';
import ModuleCard from './ModuleCard';
import { getAllTasks } from '../../services/taskService';
import { Task } from '../../types/task';
import { calendarDaysFromToday } from '../../utils/date';

interface Props {
  onPress: () => void;
  refreshKey?: number;
}

export default function TasksModule({ onPress, refreshKey }: Props) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loadError, setLoadError] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setLoadError(false);
      getAllTasks()
        .then(data => {
          if (active) setTasks(data.filter(t => t.completed === 0));
        })
        .catch(() => {
          if (active) setLoadError(true);
        });
      return () => {
        active = false;
      };
    }, [refreshKey])
  );

  const urgent = tasks.filter(t => {
    if (!t.due_date) return false;
    const days = calendarDaysFromToday(t.due_date);
    return days <= 1;
  });

  return (
    <ModuleCard title="任務" icon="[v]" onPress={onPress} accent="#FF9944">
      {loadError ? (
        <Text style={styles.error}>暫時無法讀取</Text>
      ) : (
        <>
          <Text style={styles.count}>{tasks.length}</Text>
          <Text style={styles.label}>件待辦</Text>
        </>
      )}
      {!loadError && urgent.length > 0 && (
        <View style={styles.urgentRow}>
          <View style={[styles.urgentDot, { marginRight: 5 }]} />
          <Text style={styles.urgentText}>{urgent.length} 件即將到期</Text>
        </View>
      )}
    </ModuleCard>
  );
}

const styles = StyleSheet.create({
  count: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '200',
    lineHeight: 36,
  },
  label: {
    color: '#666666',
    fontSize: 12,
    fontWeight: '300',
    marginTop: 2,
  },
  urgentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  urgentDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#FF4444',
  },
  urgentText: {
    color: '#FF4444',
    fontSize: 11,
  },
  error: { color: '#AA6666', fontSize: 12, lineHeight: 20, marginTop: 8 },
});
