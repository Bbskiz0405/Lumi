import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import ModuleCard from './ModuleCard';
import { getAllTasks } from '../../services/taskService';
import { Task } from '../../types/task';

interface Props {
  onPress: () => void;
}

export default function TasksModule({ onPress }: Props) {
  const [tasks, setTasks] = useState<Task[]>([]);

  useEffect(() => {
    getAllTasks().then(data => setTasks(data.filter(t => t.completed === 0)));
  }, []);

  const urgent = tasks.filter(t => {
    if (!t.due_date) return false;
    const days = Math.round(
      (new Date(t.due_date).getTime() - new Date().setHours(0, 0, 0, 0)) / 86400000
    );
    return days <= 1;
  });

  return (
    <ModuleCard title="任務" icon="checkbox-marked-outline" onPress={onPress} accent="#FF9944">
      <Text style={styles.count}>{tasks.length}</Text>
      <Text style={styles.label}>件待辦</Text>
      {urgent.length > 0 && (
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
    color: '#444444',
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
});
