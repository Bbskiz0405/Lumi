import React, { useState, useCallback } from 'react';
import {
  View, FlatList, StyleSheet, Text, ActivityIndicator,
  TouchableOpacity, Modal,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import TaskCard from '../../../components/tasks/TaskCard';
import TaskForm from '../../../components/tasks/TaskForm';
import { useCalendar } from '../../../contexts/CalendarContext';
import {
  getTasksForDate,
  toggleTaskComplete,
  createTask,
} from '../../../services/taskService';
import { Task, CreateTaskInput } from '../../../types/task';

export default function CalendarScreen() {
  const router = useRouter();
  const { selectedDate, bumpRefresh } = useCalendar();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      getTasksForDate(selectedDate).then(data => {
        if (active) {
          setTasks(data);
          setLoading(false);
        }
      });
      return () => { active = false; };
    }, [selectedDate])
  );

  async function loadDayTasks(date: string) {
    const data = await getTasksForDate(date);
    setTasks(data);
  }

  async function handleToggle(id: string, completed: boolean) {
    await toggleTaskComplete(id, completed);
    setTasks(prev => prev.map(t => (t.id === id ? { ...t, completed: completed ? 1 : 0 } : t)));
    bumpRefresh();
  }

  async function handleCreate(input: CreateTaskInput) {
    await createTask({ ...input, due_date: input.due_date ?? selectedDate });
    setModalVisible(false);
    loadDayTasks(selectedDate);
    bumpRefresh();
  }

  const dateMonth = parseInt(selectedDate.split('-')[1]);
  const dateDay = parseInt(selectedDate.split('-')[2]);
  const todayStr = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}`;

  return (
    <View style={styles.safe}>
      <View style={styles.daySection}>
        <Text style={styles.dayLabel}>
          {dateMonth}月{dateDay}日
          {selectedDate === todayStr ? '  今天' : ''}
        </Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => setModalVisible(true)}>
          <Text style={{ color: '#FFFFFF', fontSize: 22, fontWeight: '200', marginTop: -2 }}>+</Text>
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
              <Text style={styles.emptyText}>這天沒有任務</Text>
              <TouchableOpacity style={styles.emptyAddBtn} onPress={() => setModalVisible(true)}>
                <Text style={{ color: '#888', fontSize: 14, marginRight: 4 }}>+</Text>
                <Text style={styles.emptyAddText}>新增任務</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}

      <Modal
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
        animationType="fade"
        transparent
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>新增任務（{dateMonth}月{dateDay}日）</Text>
            <View style={styles.modalDivider} />
            <TaskForm
              initialValues={{ due_date: selectedDate, priority: 'medium', tag: null }}
              onSubmit={handleCreate}
              onCancel={() => setModalVisible(false)}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0F0F0F' },
  daySection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  dayLabel: { color: '#FFFFFF', fontSize: 14, fontWeight: '300', letterSpacing: 1 },
  addBtn: {
    width: 32, height: 32, borderRadius: 16,
    borderWidth: 1, borderColor: '#3A3A3A',
    alignItems: 'center', justifyContent: 'center',
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { paddingBottom: 24 },
  empty: { alignItems: 'center', paddingTop: 30 },
  emptyText: { color: '#555555', fontSize: 13, letterSpacing: 1, marginBottom: 16 },
  emptyAddBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderWidth: 1, borderColor: '#3A3A3A', borderRadius: 16,
    paddingHorizontal: 12, paddingVertical: 6,
  },
  emptyAddText: { color: '#888', fontSize: 12 },
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-start', paddingTop: 48,
  },
  modal: {
    backgroundColor: '#111111', borderRadius: 16,
    borderWidth: 1, borderColor: '#3A3A3A',
    marginHorizontal: 12, maxHeight: 560,
  },
  modalTitle: {
    padding: 20, paddingBottom: 12,
    color: '#FFFFFF', fontSize: 16, fontWeight: '300', letterSpacing: 1,
  },
  modalDivider: { height: 1, backgroundColor: '#3A3A3A' },
});
