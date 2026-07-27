import React, { useState, useCallback, useRef } from 'react';
import {
  View, FlatList, StyleSheet, Text, ActivityIndicator,
  TouchableOpacity, Modal, Alert,
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
import { toLocalDateString } from '../../../utils/date';

export default function CalendarScreen() {
  const router = useRouter();
  const { selectedDate, bumpRefresh } = useCalendar();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const hasLoaded = useRef(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [loadError, setLoadError] = useState(false);

  async function retryLoad() {
    setLoading(true);
    setLoadError(false);
    try {
      await loadDayTasks(selectedDate);
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
      getTasksForDate(selectedDate)
        .then(data => {
          if (!active) return;
          setTasks(data);
          hasLoaded.current = true;
        })
        .catch(() => {
          if (active) setLoadError(true);
        })
        .finally(() => {
          if (active) setLoading(false);
        });
      return () => { active = false; };
    }, [selectedDate])
  );

  async function loadDayTasks(date: string) {
    const data = await getTasksForDate(date);
    setTasks(data);
  }

  async function handleToggle(id: string, completed: boolean) {
    try {
      await toggleTaskComplete(id, completed);
      setTasks(prev => prev.map(t => (t.id === id ? { ...t, completed: completed ? 1 : 0 } : t)));
      bumpRefresh();
    } catch {
      Alert.alert('更新失敗', '任務狀態沒有變更，請再試一次。');
    }
  }

  async function handleCreate(input: CreateTaskInput) {
    await createTask({ ...input, due_date: input.due_date ?? selectedDate });
    setModalVisible(false);
    bumpRefresh();
    await loadDayTasks(selectedDate).catch(() => setLoadError(true));
  }

  const dateMonth = parseInt(selectedDate.split('-')[1]);
  const dateDay = parseInt(selectedDate.split('-')[2]);
  const todayStr = toLocalDateString();

  return (
    <View style={styles.safe}>
      <View style={styles.daySection}>
        <Text style={styles.dayLabel}>
          {dateMonth}月{dateDay}日
          {selectedDate === todayStr ? '  今天' : ''}
        </Text>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => setModalVisible(true)}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          accessibilityRole="button"
          accessibilityLabel={`新增 ${dateMonth} 月 ${dateDay} 日的任務`}
        >
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
              <Text style={styles.emptyText}>{loadError ? '無法讀取這天的任務' : '這天沒有任務'}</Text>
              {loadError ? (
                <TouchableOpacity style={styles.emptyAddBtn} onPress={() => void retryLoad()}>
                  <Text style={styles.emptyAddText}>重試</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity style={styles.emptyAddBtn} onPress={() => setModalVisible(true)}>
                  <Text style={{ color: '#888', fontSize: 14, marginRight: 4 }}>+</Text>
                  <Text style={styles.emptyAddText}>新增任務</Text>
                </TouchableOpacity>
              )}
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
    justifyContent: 'flex-end',
  },
  modal: {
    backgroundColor: '#111111', borderTopLeftRadius: 16, borderTopRightRadius: 16,
    borderWidth: 1, borderColor: '#3A3A3A',
    maxHeight: '85%',
  },
  modalTitle: {
    padding: 20, paddingBottom: 12,
    color: '#FFFFFF', fontSize: 16, fontWeight: '300', letterSpacing: 1,
  },
  modalDivider: { height: 1, backgroundColor: '#3A3A3A' },
});
