import React, { useState, useEffect } from 'react';
import {
  View, StyleSheet, Alert, ScrollView,
  Text, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import TaskForm from '../../components/tasks/TaskForm';
import PriorityBadge from '../../components/tasks/PriorityBadge';
import { getTaskById, updateTask, deleteTask, toggleTaskComplete } from '../../services/taskService';
import { useCalendar } from '../../contexts/CalendarContext';
import { Task, CreateTaskInput } from '../../types/task';
import { getTaskTagMeta } from '../../utils/taskTags';

export default function TaskDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { bumpRefresh } = useCalendar();
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (id) {
      getTaskById(id)
        .then(setTask)
        .catch(() => setLoadError(true))
        .finally(() => setLoading(false));
    }
  }, [id]);

  async function handleUpdate(input: CreateTaskInput) {
    if (!task) return;
    await updateTask(task.id, {
      due_time: input.due_time ?? null,
      reminder_minutes: input.reminder_minutes ?? null,
      title: input.title,
      due_date: input.due_date,
      priority: input.priority,
      tag: input.tag,
    });
    const updated = await getTaskById(task.id).catch(() => null);
    setTask(updated ?? {
      ...task,
      due_time: input.due_time ?? null,
      reminder_minutes: input.reminder_minutes ?? null,
      title: input.title,
      due_date: input.due_date,
      priority: input.priority,
      tag: input.tag,
    });
    setEditing(false);
    bumpRefresh();
  }

  async function handleDelete() {
    Alert.alert('刪除任務', '確定要刪除這個任務嗎？', [
      { text: '取消', style: 'cancel' },
      {
        text: '刪除',
        style: 'destructive',
        onPress: async () => {
          try {
            const { calendarRemoved } = await deleteTask(task!.id);
            bumpRefresh();
            router.back();
            if (!calendarRemoved) {
              Alert.alert(
                '任務已刪除',
                'Lumi 任務已刪除，但目前無法移除連動的日曆行程，請稍後到系統日曆確認。'
              );
            }
          } catch {
            Alert.alert('刪除失敗', '任務沒有刪除，請再試一次。');
          }
        },
      },
    ]);
  }

  async function handleToggleComplete() {
    if (!task) return;
    const next = !task.completed;
    try {
      await toggleTaskComplete(task.id, next);
      const updated = await getTaskById(task.id);
      setTask(updated ?? { ...task, completed: next ? 1 : 0 });
      bumpRefresh();
    } catch {
      Alert.alert('更新失敗', '任務狀態沒有變更，請再試一次。');
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#FFFFFF" />
      </View>
    );
  }

  if (!task) {
    return (
      <View style={styles.center}>
        <Text style={styles.notFound}>{loadError ? '讀取任務失敗，請稍後再試' : '找不到任務'}</Text>
      </View>
    );
  }

  const tagMeta = task.tag ? getTaskTagMeta(task.tag) : null;

  if (editing) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <Stack.Screen options={{ headerTitle: '編輯任務' }} />
        <TaskForm
          initialValues={task}
          onSubmit={handleUpdate}
          onCancel={() => setEditing(false)}
          submitLabel="儲存"
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>{task.title}</Text>

        <View style={styles.divider} />

        <View style={styles.row}>
          <Text style={styles.rowLabel}>優先度</Text>
          <PriorityBadge priority={task.priority} />
        </View>

        {tagMeta && (
          <View style={styles.row}>
            <Text style={styles.rowLabel}>分類</Text>
            <Text style={[styles.rowValue, { color: tagMeta.color }]}>{tagMeta.label}</Text>
          </View>
        )}

        {task.due_date && (
          <View style={styles.row}>
            <Text style={styles.rowLabel}>截止日期</Text>
            <Text style={styles.rowValue}>
              {task.due_date}{task.due_time ? ` ${task.due_time}` : ''}
            </Text>
          </View>
        )}

        {task.reminder_minutes !== null && (
          <View style={styles.row}>
            <Text style={styles.rowLabel}>提醒</Text>
            <Text style={styles.rowValue}>
              {task.reminder_minutes === 0
                ? '準時'
                : task.reminder_minutes < 60
                  ? `提前 ${task.reminder_minutes} 分鐘`
                  : `提前 ${task.reminder_minutes / 60} 小時`}
            </Text>
          </View>
        )}

        <View style={styles.row}>
          <Text style={styles.rowLabel}>狀態</Text>
          <Text style={[styles.rowValue, { color: task.completed ? '#66BB66' : '#4488FF' }]}>
            {task.completed ? '已完成' : '進行中'}
          </Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.rowLabel}>建立時間</Text>
          <Text style={styles.rowValue}>
            {new Date(task.created_at).toLocaleString('zh-TW')}
          </Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.completeBtn, task.completed === 1 && styles.completeBtnDone]}
            onPress={handleToggleComplete}
          >
            <Text style={[styles.completeBtnText, task.completed === 1 && styles.completeBtnTextDone]}>
              {task.completed ? '取消完成' : '完成'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.editBtn} onPress={() => setEditing(true)}>
            <Text style={styles.editBtnText}>編輯</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
            <Text style={styles.deleteBtnText}>刪除</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0F0F0F' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0F0F0F' },
  notFound: { color: '#555', fontSize: 14 },
  container: { padding: 20 },
  title: { color: '#FFFFFF', fontSize: 20, fontWeight: '300', marginBottom: 4, lineHeight: 28 },
  divider: { height: 1, backgroundColor: '#252525', marginVertical: 16 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  rowLabel: { width: 72, color: '#555555', fontSize: 14 },
  rowValue: { fontSize: 14, color: '#CCCCCC', fontWeight: '300', flex: 1 },
  actions: { flexDirection: 'row', marginTop: 8, gap: 8 },
  completeBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#103A20',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  completeBtnText: { color: '#66BB66', fontSize: 14 },
  completeBtnDone: {
    borderColor: '#3A3A3A',
  },
  completeBtnTextDone: { color: '#888' },
  editBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#3A3A3A',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  editBtnText: { color: '#FFFFFF', fontSize: 14 },
  deleteBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#3A1010',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  deleteBtnText: { color: '#FF6666', fontSize: 14 },
});
