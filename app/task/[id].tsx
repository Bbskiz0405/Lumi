import React, { useState, useEffect } from 'react';
import {
  View, StyleSheet, Alert, ScrollView,
  Text, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import TaskForm from '../../components/tasks/TaskForm';
import PriorityBadge from '../../components/tasks/PriorityBadge';
import { getTaskById, updateTask, deleteTask } from '../../services/taskService';
import { Task, CreateTaskInput } from '../../types/task';

const TAG_LABELS: Record<string, string> = {
  research: '研究',
  school: '學校',
  application: '申請',
  life: '生活',
};

export default function TaskDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (id) {
      getTaskById(id).then((t) => {
        setTask(t);
        setLoading(false);
      });
    }
  }, [id]);

  async function handleUpdate(input: CreateTaskInput) {
    if (!task) return;
    await updateTask(task.id, {
      title: input.title,
      due_date: input.due_date,
      priority: input.priority,
      tag: input.tag,
    });
    const updated = await getTaskById(task.id);
    setTask(updated);
    setEditing(false);
  }

  async function handleDelete() {
    Alert.alert('刪除任務', '確定要刪除這個任務嗎？', [
      { text: '取消', style: 'cancel' },
      {
        text: '刪除',
        style: 'destructive',
        onPress: async () => {
          await deleteTask(task!.id);
          router.back();
        },
      },
    ]);
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
        <Text style={styles.notFound}>找不到任務</Text>
      </View>
    );
  }

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

        {task.tag && (
          <View style={styles.row}>
            <Text style={styles.rowLabel}>標籤</Text>
            <Text style={styles.rowValue}>{TAG_LABELS[task.tag] ?? task.tag}</Text>
          </View>
        )}

        {task.due_date && (
          <View style={styles.row}>
            <Text style={styles.rowLabel}>截止日期</Text>
            <Text style={styles.rowValue}>{task.due_date}</Text>
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
  divider: { height: 1, backgroundColor: '#1A1A1A', marginVertical: 16 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  rowLabel: { width: 72, color: '#555555', fontSize: 14 },
  rowValue: { fontSize: 14, color: '#CCCCCC', fontWeight: '300', flex: 1 },
  actions: { flexDirection: 'row', marginTop: 8 },
  editBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginRight: 12,
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
