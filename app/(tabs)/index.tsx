import React, { useState, useCallback } from 'react';
import { View, FlatList, StyleSheet, RefreshControl } from 'react-native';
import { Text, FAB, Portal, Modal, Appbar, Divider, ActivityIndicator } from 'react-native-paper';
import { useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import TaskCard from '../../components/tasks/TaskCard';
import TaskForm from '../../components/tasks/TaskForm';
import {
  getTodayTasks,
  createTask,
  toggleTaskComplete,
  deleteTask,
} from '../../services/taskService';
import { Task } from '../../types/task';
import { CreateTaskInput } from '../../types/task';
import { useRouter } from 'expo-router';

function formatTodayHeader(): string {
  const now = new Date();
  const weekdays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
  return `${now.getMonth() + 1} 月 ${now.getDate()} 日　${weekdays[now.getDay()]}`;
}

export default function TodayScreen() {
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);

  async function loadTasks() {
    const data = await getTodayTasks();
    setTasks(data);
  }

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadTasks().finally(() => setLoading(false));
    }, [])
  );

  async function onRefresh() {
    setRefreshing(true);
    await loadTasks();
    setRefreshing(false);
  }

  async function handleToggle(id: string, completed: boolean) {
    await toggleTaskComplete(id, completed);
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, completed: completed ? 1 : 0 } : t))
    );
  }

  async function handleCreate(input: CreateTaskInput) {
    await createTask(input);
    setModalVisible(false);
    await loadTasks();
  }

  const pending = tasks.filter((t) => t.completed === 0);
  const done = tasks.filter((t) => t.completed === 1);
  const completionRate = tasks.length > 0 ? Math.round((done.length / tasks.length) * 100) : 0;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Appbar.Header style={styles.header} elevated={false}>
        <Appbar.Content
          title="Lumi"
          titleStyle={styles.appTitle}
          subtitle={formatTodayHeader()}
        />
      </Appbar.Header>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#1976D2" />
        </View>
      ) : (
        <FlatList
          data={[...pending, ...done]}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListHeaderComponent={
            <View style={styles.statsRow}>
              <Text variant="bodyMedium" style={styles.statsText}>
                今日任務：{tasks.length} 件
              </Text>
              {tasks.length > 0 && (
                <Text variant="bodyMedium" style={styles.statsText}>
                  完成率 {completionRate}%
                </Text>
              )}
            </View>
          }
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          renderItem={({ item }) => (
            <TaskCard
              task={item}
              onToggleComplete={handleToggle}
              onPress={(id) => router.push(`/task/${id}`)}
            />
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text variant="bodyLarge" style={styles.emptyTitle}>今天沒有任務</Text>
              <Text variant="bodySmall" style={styles.emptySubtitle}>點擊右下角 + 新增任務</Text>
            </View>
          }
        />
      )}

      <FAB
        icon="plus"
        style={styles.fab}
        color="#FFFFFF"
        onPress={() => setModalVisible(true)}
      />

      <Portal>
        <Modal
          visible={modalVisible}
          onDismiss={() => setModalVisible(false)}
          contentContainerStyle={styles.modal}
        >
          <Text variant="titleLarge" style={styles.modalTitle}>新增任務</Text>
          <Divider />
          <TaskForm
            onSubmit={handleCreate}
            onCancel={() => setModalVisible(false)}
          />
        </Modal>
      </Portal>
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
  appTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1976D2',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: {
    paddingBottom: 100,
    paddingTop: 8,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  statsText: {
    color: '#616161',
  },
  separator: {
    height: 2,
  },
  empty: {
    alignItems: 'center',
    marginTop: 80,
    gap: 8,
  },
  emptyTitle: {
    color: '#757575',
  },
  emptySubtitle: {
    color: '#9E9E9E',
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    backgroundColor: '#1976D2',
  },
  modal: {
    backgroundColor: '#FFFFFF',
    margin: 20,
    borderRadius: 16,
    maxHeight: '85%',
  },
  modalTitle: {
    padding: 20,
    paddingBottom: 12,
    fontWeight: '600',
  },
});
