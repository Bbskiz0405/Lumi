import React, { useState, useCallback, useRef } from 'react';
import {
  View, FlatList, StyleSheet, TouchableOpacity, Text,
  Modal, ActivityIndicator, Alert,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import TaskCard from '../../components/tasks/TaskCard';
import TaskForm from '../../components/tasks/TaskForm';
import { getAllTasks, createTask, toggleTaskComplete } from '../../services/taskService';
import { useCalendar } from '../../contexts/CalendarContext';
import { Task, CreateTaskInput } from '../../types/task';
import IconButton from '../../components/ui/IconButton';
import TechIcon from '../../components/ui/TechIcon';

export default function TasksScreen() {
  const router = useRouter();
  const { bumpRefresh } = useCalendar();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [completedTasks, setCompletedTasks] = useState<Task[]>([]);
  const [showCompleted, setShowCompleted] = useState(false);
  const [loading, setLoading] = useState(true);
  const hasLoaded = useRef(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [loadError, setLoadError] = useState(false);

  async function loadTasks(showLoader = false) {
    if (showLoader) setLoading(true);
    setLoadError(false);
    try {
      const data = await getAllTasks();
      setTasks(data.filter(t => t.completed === 0));
      setCompletedTasks(data.filter(t => t.completed === 1));
      hasLoaded.current = true;
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }

  useFocusEffect(
    useCallback(() => {
      let active = true;
      if (!hasLoaded.current) setLoading(true);
      setLoadError(false);
      getAllTasks()
        .then(data => {
          if (!active) return;
          setTasks(data.filter(t => t.completed === 0));
          setCompletedTasks(data.filter(t => t.completed === 1));
          hasLoaded.current = true;
        })
        .catch(() => {
          if (active) setLoadError(true);
        })
        .finally(() => {
          if (active) setLoading(false);
        });
      return () => { active = false; };
    }, [])
  );

  async function handleToggle(id: string, completed: boolean) {
    try {
      await toggleTaskComplete(id, completed);
      if (completed) {
        const task = tasks.find(t => t.id === id);
        setTasks(prev => prev.filter(t => t.id !== id));
        if (task) setCompletedTasks(prev => [{ ...task, completed: 1 }, ...prev]);
      } else {
        const task = completedTasks.find(t => t.id === id);
        setCompletedTasks(prev => prev.filter(t => t.id !== id));
        if (task) setTasks(prev => [{ ...task, completed: 0 }, ...prev]);
      }
      bumpRefresh();
    } catch {
      Alert.alert('更新失敗', '任務狀態沒有變更，請再試一次。');
    }
  }

  async function handleCreate(input: CreateTaskInput) {
    await createTask(input);
    setModalVisible(false);
    bumpRefresh();
    await loadTasks(false);
  }

  return (
    <SafeAreaView style={styles.safe} edges={[]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>任務</Text>
        <IconButton
          icon="plus"
          label="新增任務"
          onPress={() => setModalVisible(true)}
        />
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
              <Text style={styles.emptyText}>
                {loadError ? '無法讀取任務' : '沒有待辦任務'}
              </Text>
              {loadError && (
                <TouchableOpacity style={styles.retryBtn} onPress={() => void loadTasks(true)}>
                  <Text style={styles.retryText}>重試</Text>
                </TouchableOpacity>
              )}
            </View>
          }
          ListFooterComponent={
            completedTasks.length > 0 ? (
              <View style={styles.completedSection}>
                <TouchableOpacity
                  style={styles.completedHeader}
                  onPress={() => setShowCompleted(!showCompleted)}
                >
                  <TechIcon
                    name={showCompleted ? 'chevron-down' : 'chevron-right'}
                    size={16}
                    color="#666"
                  />
                  <Text style={styles.completedTitle}>已完成 ({completedTasks.length})</Text>
                </TouchableOpacity>
                {showCompleted && completedTasks.map(item => (
                  <TaskCard
                    key={item.id}
                    task={item}
                    onToggleComplete={handleToggle}
                    onPress={id => router.push(`/task/${id}`)}
                  />
                ))}
              </View>
            ) : null
          }
        />
      )}

      <Modal
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
        animationType="slide"
        transparent
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>新增任務</Text>
            <View style={styles.modalDivider} />
            <TaskForm
              onSubmit={handleCreate}
              onCancel={() => setModalVisible(false)}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0F0F0F' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  headerTitle: { color: '#FFFFFF', fontSize: 20, fontWeight: '300', letterSpacing: 2 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { paddingBottom: 40, paddingTop: 4 },
  empty: { alignItems: 'center', marginTop: 80 },
  emptyText: { color: '#555555', fontSize: 13, letterSpacing: 1 },
  retryBtn: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 18,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#3A3A3A',
    borderRadius: 10,
  },
  retryText: { color: '#FFFFFF', fontSize: 13 },
  completedSection: { marginTop: 20, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#252525' },
  completedHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 8 },
  completedTitle: { color: '#666', fontSize: 13, fontWeight: '300', marginLeft: 4 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modal: {
    backgroundColor: '#111111',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: 600,
    borderWidth: 1,
    borderColor: '#3A3A3A',
  },
  modalTitle: {
    padding: 20,
    paddingBottom: 12,
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '300',
    letterSpacing: 1,
  },
  modalDivider: { height: 1, backgroundColor: '#3A3A3A' },
});
