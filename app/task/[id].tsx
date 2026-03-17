import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Alert, ScrollView } from 'react-native';
import { Text, Button, Divider, ActivityIndicator, Appbar } from 'react-native-paper';
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
        <ActivityIndicator color="#1976D2" />
      </View>
    );
  }

  if (!task) {
    return (
      <View style={styles.center}>
        <Text>找不到任務</Text>
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
        <Text variant="headlineSmall" style={styles.title}>
          {task.title}
        </Text>

        <Divider style={styles.divider} />

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
          <Text style={[styles.rowValue, { color: task.completed ? '#2E7D32' : '#1565C0' }]}>
            {task.completed ? '已完成' : '進行中'}
          </Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.rowLabel}>建立時間</Text>
          <Text style={styles.rowValue}>
            {new Date(task.created_at).toLocaleString('zh-TW')}
          </Text>
        </View>

        <Divider style={styles.divider} />

        <View style={styles.actions}>
          <Button
            mode="outlined"
            icon="pencil"
            onPress={() => setEditing(true)}
            style={styles.actionButton}
          >
            編輯
          </Button>
          <Button
            mode="outlined"
            icon="delete"
            onPress={handleDelete}
            textColor="#C62828"
            style={[styles.actionButton, styles.deleteButton]}
          >
            刪除
          </Button>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  container: {
    padding: 20,
  },
  title: {
    fontWeight: '700',
    color: '#212121',
    marginBottom: 4,
  },
  divider: {
    marginVertical: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    gap: 12,
  },
  rowLabel: {
    width: 72,
    color: '#757575',
    fontSize: 14,
  },
  rowValue: {
    fontSize: 14,
    color: '#212121',
    fontWeight: '500',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
  },
  deleteButton: {
    borderColor: '#EF9A9A',
  },
});
