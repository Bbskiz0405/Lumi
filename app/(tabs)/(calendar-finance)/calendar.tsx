import React, { useState, useCallback, useRef } from 'react';
import {
  View, FlatList, StyleSheet, Text, ActivityIndicator,
  TouchableOpacity, Modal, Alert,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import TaskCard from '../../../components/tasks/TaskCard';
import TaskForm from '../../../components/tasks/TaskForm';
import IconButton from '../../../components/ui/IconButton';
import { useCalendar } from '../../../contexts/CalendarContext';
import {
  getTasksForDate,
  toggleTaskComplete,
  createTask,
} from '../../../services/taskService';
import { Task, CreateTaskInput } from '../../../types/task';
import { toLocalDateString } from '../../../utils/date';
import {
  CalendarAgendaEvent,
  getCalendarEventsForDate,
  openDeviceCalendarEvent,
} from '../../../services/calendarIntegrationService';
import { getTaskTagMeta } from '../../../utils/taskTags';

type SourceFilter = 'all' | 'tasks' | 'calendar';

export default function CalendarScreen() {
  const router = useRouter();
  const { selectedDate, bumpRefresh } = useCalendar();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<CalendarAgendaEvent[]>([]);
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all');
  const [selectedTaskTag, setSelectedTaskTag] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const hasLoaded = useRef(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [loadError, setLoadError] = useState(false);

  async function retryLoad() {
    setLoading(true);
    setLoadError(false);
    try {
      await loadDayData(selectedDate);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setSourceFilter('all');
      setSelectedTaskTag(null);
      if (!hasLoaded.current) setLoading(true);
      setLoadError(false);
      getDayData(selectedDate)
        .then(({ taskData, eventData }) => {
          if (!active) return;
          setTasks(taskData);
          setCalendarEvents(eventData);
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

  async function getDayData(date: string) {
    const [taskData, eventData] = await Promise.all([
      getTasksForDate(date),
      getCalendarEventsForDate(date).catch(() => []),
    ]);
    return {
      taskData,
      eventData: eventData.filter(event => !event.isLinkedToLumi),
    };
  }

  async function loadDayData(date: string) {
    const { taskData, eventData } = await getDayData(date);
    setTasks(taskData);
    setCalendarEvents(eventData);
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
    await loadDayData(selectedDate).catch(() => setLoadError(true));
  }

  const dateMonth = parseInt(selectedDate.split('-')[1]);
  const dateDay = parseInt(selectedDate.split('-')[2]);
  const todayStr = toLocalDateString();
  const visibleTasks = sourceFilter === 'calendar'
    ? []
    : selectedTaskTag
      ? tasks.filter(task => task.tag === selectedTaskTag)
      : tasks;
  const visibleEvents = sourceFilter === 'tasks' ? [] : calendarEvents;
  const hasVisibleItems = visibleTasks.length > 0 || visibleEvents.length > 0;
  const taskTagOptions = [...new Set(
    tasks.map(task => task.tag).filter((tag): tag is string => !!tag)
  )].map(getTaskTagMeta);

  function formatEventTime(event: CalendarAgendaEvent): string {
    if (event.allDay) return '全天';
    return new Intl.DateTimeFormat('zh-TW', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(new Date(event.startDate));
  }

  function handleOpenEvent(eventId: string) {
    openDeviceCalendarEvent(eventId).catch(() => {
      Alert.alert('無法開啟行程', '請確認系統日曆仍有這筆行程。');
    });
  }

  return (
    <View style={styles.safe}>
      <View style={styles.daySection}>
        <Text style={styles.dayLabel}>
          {dateMonth}月{dateDay}日
          {selectedDate === todayStr ? '  今天' : ''}
        </Text>
        <View style={styles.dayActions}>
          <IconButton
            icon="calendar"
            label="日曆連動設定"
            onPress={() => router.push('/calendar-settings')}
            color="#8A929A"
            size={32}
            iconSize={16}
          />
          <IconButton
            icon="plus"
            label={`新增 ${dateMonth} 月 ${dateDay} 日的任務`}
            onPress={() => setModalVisible(true)}
            color="#FFFFFF"
            size={32}
            iconSize={17}
          />
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color="#FFFFFF" />
        </View>
      ) : (
        <FlatList
          data={visibleTasks}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={{ height: 2 }} />}
          ListHeaderComponent={
            <View>
              {(calendarEvents.length > 0 || sourceFilter !== 'all') && (
                <View style={styles.filters}>
                  {([
                    ['all', '全部'],
                    ['tasks', `任務 ${tasks.length}`],
                    ['calendar', `行程 ${calendarEvents.length}`],
                  ] as const).map(([value, label]) => (
                    <TouchableOpacity
                      key={value}
                      style={[styles.filterButton, sourceFilter === value && styles.filterButtonActive]}
                      onPress={() => setSourceFilter(value)}
                      accessibilityRole="button"
                      accessibilityState={{ selected: sourceFilter === value }}
                    >
                      <Text style={[styles.filterText, sourceFilter === value && styles.filterTextActive]}>
                        {label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {sourceFilter !== 'calendar' && taskTagOptions.length > 1 && (
                <View style={styles.categoryFilters}>
                  <TouchableOpacity
                    style={[
                      styles.categoryFilter,
                      selectedTaskTag === null && styles.categoryFilterActive,
                    ]}
                    onPress={() => setSelectedTaskTag(null)}
                  >
                    <Text style={[
                      styles.categoryFilterText,
                      selectedTaskTag === null && styles.categoryFilterTextActive,
                    ]}>
                      全部分類
                    </Text>
                  </TouchableOpacity>
                  {taskTagOptions.map(option => (
                    <TouchableOpacity
                      key={option.value}
                      style={[
                        styles.categoryFilter,
                        selectedTaskTag === option.value && {
                          borderColor: option.color,
                          backgroundColor: `${option.color}14`,
                        },
                      ]}
                      onPress={() => setSelectedTaskTag(
                        selectedTaskTag === option.value ? null : option.value
                      )}
                    >
                      <View style={[styles.categoryFilterDot, { backgroundColor: option.color }]} />
                      <Text style={[
                        styles.categoryFilterText,
                        selectedTaskTag === option.value && { color: option.color },
                      ]}>
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {visibleEvents.map(event => (
                <TouchableOpacity
                  key={event.id}
                  style={styles.eventCard}
                  onPress={() => handleOpenEvent(event.id)}
                  accessibilityRole="button"
                  accessibilityLabel={`${event.title}，${formatEventTime(event)}，外部行程`}
                >
                  <View style={[styles.eventAccent, { backgroundColor: event.calendarColor }]} />
                  <View style={styles.eventCopy}>
                    <Text style={styles.eventTitle} numberOfLines={2}>{event.title}</Text>
                    <Text style={styles.eventMeta}>
                      {formatEventTime(event)} · {event.calendarTitle}
                    </Text>
                    {!!event.location && (
                      <Text style={styles.eventLocation} numberOfLines={1}>{event.location}</Text>
                    )}
                  </View>
                  <Text style={styles.eventOpenHint}>開啟</Text>
                </TouchableOpacity>
              ))}

              {visibleEvents.length > 0 && visibleTasks.length > 0 && (
                <Text style={styles.taskSectionLabel}>LUMI 任務</Text>
              )}
            </View>
          }
          renderItem={({ item }) => (
            <TaskCard
              task={item}
              onToggleComplete={handleToggle}
              onPress={id => router.push(`/task/${id}`)}
            />
          )}
          ListEmptyComponent={
            hasVisibleItems ? null : <View style={styles.empty}>
              <Text style={styles.emptyText}>
                {loadError
                  ? '無法讀取這天的內容'
                  : sourceFilter === 'calendar'
                    ? '這天沒有外部行程'
                    : sourceFilter === 'tasks'
                      ? '這天沒有 Lumi 任務'
                      : '這天沒有任務或行程'}
              </Text>
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
  dayActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { paddingBottom: 24, paddingHorizontal: 14 },
  filters: { flexDirection: 'row', gap: 7, marginVertical: 5, marginHorizontal: 6 },
  filterButton: {
    borderWidth: 1,
    borderColor: '#292D32',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  filterButtonActive: { borderColor: '#46505A', backgroundColor: '#191D21' },
  filterText: { color: '#687078', fontSize: 11 },
  filterTextActive: { color: '#D9DDE2' },
  categoryFilters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginHorizontal: 6,
    marginBottom: 4,
  },
  categoryFilter: {
    minHeight: 28,
    borderWidth: 1,
    borderColor: '#292D32',
    borderRadius: 14,
    paddingHorizontal: 9,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  categoryFilterActive: { borderColor: '#46505A', backgroundColor: '#191D21' },
  categoryFilterText: { color: '#687078', fontSize: 10 },
  categoryFilterTextActive: { color: '#D9DDE2' },
  categoryFilterDot: { width: 5, height: 5, borderRadius: 3 },
  eventCard: {
    minHeight: 66,
    borderWidth: 1,
    borderColor: '#292D33',
    backgroundColor: '#131619',
    borderRadius: 9,
    marginHorizontal: 6,
    marginTop: 7,
    paddingVertical: 11,
    paddingRight: 12,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
  },
  eventAccent: { alignSelf: 'stretch', width: 3, borderRadius: 2, marginRight: 12 },
  eventCopy: { flex: 1 },
  eventTitle: { color: '#E5E8EB', fontSize: 14, fontWeight: '400', lineHeight: 19 },
  eventMeta: { color: '#718094', fontSize: 11, marginTop: 5 },
  eventLocation: { color: '#5E656C', fontSize: 11, marginTop: 3 },
  eventOpenHint: { color: '#4F5963', fontSize: 10, marginLeft: 8 },
  taskSectionLabel: {
    color: '#5E656C',
    fontSize: 10,
    letterSpacing: 1.3,
    marginHorizontal: 8,
    marginTop: 17,
    marginBottom: 5,
  },
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
