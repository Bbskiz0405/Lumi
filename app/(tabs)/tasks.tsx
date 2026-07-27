import React, { useState, useCallback, useRef } from 'react';
import {
  View, FlatList, StyleSheet, TouchableOpacity, Text,
  Modal, ActivityIndicator,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import TaskCard from '../../components/tasks/TaskCard';
import TaskForm from '../../components/tasks/TaskForm';
import { getAllTasks, createTask, toggleTaskComplete } from '../../services/taskService';
import { useCalendar } from '../../contexts/CalendarContext';
import { Task, CreateTaskInput } from '../../types/task';

export default function TasksScreen() {
  const router = useRouter();
  const { bumpRefresh } = useCalendar();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [completedTasks, setCompletedTasks] = useState<Task[]>([]);
  const [showCompleted, setShowCompleted] = useState(false);
  const [loading, setLoading] = useState(true);
  const hasLoaded = useRef(false);
  const [modalVisible, setModalVisible] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      if (!hasLoaded.current) setLoading(true);
      
      getAllTasks()
        .then(data => {
          if (!active) return;
          setTasks(data.filter(t => t.completed === 0));
          setCompletedTasks(data.filter(t => t.completed === 1));
          hasLoaded.current = true;
        })
        .catch(err => console.error('[TasksScreen] getAllTasks failed:', err))
        .finally(() => {
          if (active) setLoading(false);
        });
      return () => { active = false; };
    }, [])
  );

  async function handleToggle(id: string, completed: boolean) {
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
  }

  async function handleCreate(input: CreateTaskInput) {
    await createTask(input);
    setModalVisible(false);
    const data = await getAllTasks();
    setTasks(data.filter(t => t.completed === 0));
    setCompletedTasks(data.filter(t => t.completed === 1));
    bumpRefresh();
  }

  return (
    <SafeAreaView style={styles.safe} edges={[]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>任務</Text>
        <TouchableOpacity onPress={() => setModalVisible(true)} style={styles.addBtn}>
          <Text style={{ color: '#FFFFFF', fontSize: 24, fontWeight: '200', marginTop: -2 }}>+</Text>
        </TouchableOpacity>
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
              <Text style={styles.emptyText}>沒有待辦任務</Text>
            </View>
          }
          ListFooterComponent={
            completedTasks.length > 0 ? (
              <View style={styles.completedSection}>
                <TouchableOpacity
                  style={styles.completedHeader}
                  onPress={() => setShowCompleted(!showCompleted)}
                >
                  <Text style={{ color: '#666', fontSize: 14, marginRight: 8, fontWeight: '500' }}>
                    {showCompleted ? 'v' : '>'}
                  </Text>
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
  addBtn: {
    width: 36, height: 36, borderRadius: 18,
    borderWidth: 1, borderColor: '#3A3A3A',
    alignItems: 'center', justifyContent: 'center',
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { paddingBottom: 40, paddingTop: 4 },
  empty: { alignItems: 'center', marginTop: 80 },
  emptyText: { color: '#555555', fontSize: 13, letterSpacing: 1 },
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
