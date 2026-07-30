import React, { useState, useCallback, useRef } from 'react';
import {
  View, FlatList, StyleSheet, Text, ActivityIndicator,
  TouchableOpacity, Modal, Alert,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import TaskCard from '../../../components/tasks/TaskCard';
import TaskForm from '../../../components/tasks/TaskForm';
import CalendarEventForm from '../../../components/calendar/CalendarEventForm';
import IconButton from '../../../components/ui/IconButton';
import TechIcon from '../../../components/ui/TechIcon';
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
import { LumiCalendarEvent, CreateLumiCalendarEventInput } from '../../../types/calendarEvent';
import {
  createLumiEvent,
  deleteLumiEvent,
  getLumiEventsForDate,
  updateLumiEvent,
} from '../../../services/calendarEventService';

type SourceFilter = 'all' | 'tasks' | 'calendar';

export default function CalendarScreen() {
  const router = useRouter();
  const { selectedDate, bumpRefresh } = useCalendar();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<CalendarAgendaEvent[]>([]);
  const [lumiEvents, setLumiEvents] = useState<LumiCalendarEvent[]>([]);
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all');
  const [selectedTaskTag, setSelectedTaskTag] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const hasLoaded = useRef(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [createMenuVisible, setCreateMenuVisible] = useState(false);
  const [eventModalVisible, setEventModalVisible] = useState(false);
  const [editingEvent, setEditingEvent] = useState<LumiCalendarEvent | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [calendarLoadError, setCalendarLoadError] = useState(false);

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
      setCalendarLoadError(false);
      getDayData(selectedDate)
        .then(({ taskData, eventData, lumiEventData, externalLoadFailed }) => {
          if (!active) return;
          setTasks(taskData);
          setCalendarEvents(eventData);
          setLumiEvents(lumiEventData);
          setCalendarLoadError(externalLoadFailed);
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
    const [taskData, externalResult, lumiEventData] = await Promise.all([
      getTasksForDate(date),
      getCalendarEventsForDate(date)
        .then(data => ({ data, failed: false }))
        .catch(() => ({ data: [] as CalendarAgendaEvent[], failed: true })),
      getLumiEventsForDate(date),
    ]);
    return {
      taskData,
      eventData: externalResult.data.filter(event => !event.isLinkedToLumi),
      lumiEventData,
      externalLoadFailed: externalResult.failed,
    };
  }

  async function loadDayData(date: string) {
    const { taskData, eventData, lumiEventData, externalLoadFailed } = await getDayData(date);
    setTasks(taskData);
    setCalendarEvents(eventData);
    setLumiEvents(lumiEventData);
    setCalendarLoadError(externalLoadFailed);
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

  function openTaskCreate() {
    setCreateMenuVisible(false);
    setModalVisible(true);
  }

  function openEventCreate() {
    setCreateMenuVisible(false);
    setEditingEvent(null);
    setEventModalVisible(true);
  }

  async function handleSaveEvent(input: CreateLumiCalendarEventInput) {
    if (editingEvent) {
      await updateLumiEvent(editingEvent.id, input);
    } else {
      await createLumiEvent(input);
    }
    setEventModalVisible(false);
    setEditingEvent(null);
    bumpRefresh();
    await loadDayData(selectedDate);
  }

  function handleDeleteEvent() {
    if (!editingEvent) return;
    Alert.alert('刪除行程', `確定要刪除「${editingEvent.title}」嗎？`, [
      { text: '取消', style: 'cancel' },
      {
        text: '刪除',
        style: 'destructive',
        onPress: async () => {
          try {
            const { calendarRemoved } = await deleteLumiEvent(editingEvent.id);
            setEventModalVisible(false);
            setEditingEvent(null);
            bumpRefresh();
            await loadDayData(selectedDate);
            if (!calendarRemoved) {
              Alert.alert(
                'Lumi 行程已刪除',
                '目前無法移除連動的系統日曆行程，請到手機日曆確認。'
              );
            }
          } catch {
            Alert.alert('刪除失敗', '行程仍保留在 Lumi，請再試一次。');
          }
        },
      },
    ]);
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
  const visibleLumiEvents = sourceFilter === 'tasks' ? [] : lumiEvents;
  const visibleScheduleItems = [
    ...visibleLumiEvents.map(event => ({ kind: 'lumi' as const, event })),
    ...visibleEvents.map(event => ({ kind: 'external' as const, event })),
  ].sort((a, b) => {
    const aAllDay = a.kind === 'lumi' ? a.event.all_day === 1 : a.event.allDay;
    const bAllDay = b.kind === 'lumi' ? b.event.all_day === 1 : b.event.allDay;
    if (aAllDay !== bAllDay) return aAllDay ? -1 : 1;
    const aTime = a.kind === 'lumi'
      ? new Date(`${a.event.start_date}T${a.event.start_time ?? '00:00'}:00`).getTime()
      : new Date(a.event.startDate).getTime();
    const bTime = b.kind === 'lumi'
      ? new Date(`${b.event.start_date}T${b.event.start_time ?? '00:00'}:00`).getTime()
      : new Date(b.event.startDate).getTime();
    return aTime - bTime;
  });
  const hasVisibleItems =
    visibleTasks.length > 0 || visibleEvents.length > 0 || visibleLumiEvents.length > 0;
  const taskTagOptions = [...new Set(
    tasks.map(task => task.tag).filter((tag): tag is string => !!tag)
  )].map(getTaskTagMeta);

  function formatEventTime(event: CalendarAgendaEvent): string {
    if (event.allDay) return '全天';
    const timeFormatter = new Intl.DateTimeFormat('zh-TW', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    const start = new Date(event.startDate);
    const end = new Date(event.endDate);
    const startDate = toLocalDateString(start);
    const endDate = toLocalDateString(end);
    if (startDate !== endDate) {
      return `${formatShortDate(startDate)} ${timeFormatter.format(start)} → ` +
        `${formatShortDate(endDate)} ${timeFormatter.format(end)}`;
    }
    return `${timeFormatter.format(start)}–${timeFormatter.format(end)}`;
  }

  function formatShortDate(date: string): string {
    const [, month, day] = date.split('-');
    return `${Number(month)}/${Number(day)}`;
  }

  function formatLumiEventTime(event: LumiCalendarEvent): string {
    const spansDays = event.start_date !== event.end_date;
    if (event.all_day) {
      return spansDays
        ? `全天 · ${formatShortDate(event.start_date)}–${formatShortDate(event.end_date)}`
        : '全天';
    }
    if (spansDays) {
      return `${formatShortDate(event.start_date)} ${event.start_time ?? ''} → ` +
        `${formatShortDate(event.end_date)} ${event.end_time ?? ''}`;
    }
    return `${event.start_time ?? ''}–${event.end_time ?? ''}`;
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
            label={`新增 ${dateMonth} 月 ${dateDay} 日的任務或行程`}
            onPress={() => setCreateMenuVisible(true)}
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
              {calendarLoadError && (
                <View style={styles.calendarWarning}>
                  <View style={styles.calendarWarningCopy}>
                    <Text style={styles.calendarWarningTitle}>外部日曆暫時無法讀取</Text>
                    <Text style={styles.calendarWarningText}>Lumi 任務與行程仍可正常使用。</Text>
                  </View>
                  <TouchableOpacity onPress={() => void retryLoad()}>
                    <Text style={styles.calendarWarningAction}>重試</Text>
                  </TouchableOpacity>
                </View>
              )}

              {(calendarEvents.length > 0 || lumiEvents.length > 0 || sourceFilter !== 'all') && (
                <View style={styles.filters}>
                  {([
                    ['all', '全部'],
                    ['tasks', `任務 ${tasks.length}`],
                    ['calendar', `行程 ${calendarEvents.length + lumiEvents.length}`],
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

              {visibleScheduleItems.map(item => {
                if (item.kind === 'lumi') {
                  const event = item.event;
                  const categoryMeta = event.category
                    ? getTaskTagMeta(event.category)
                    : null;
                  return (
                    <TouchableOpacity
                      key={`lumi-${event.id}`}
                      style={styles.eventCard}
                      onPress={() => {
                        setEditingEvent(event);
                        setEventModalVisible(true);
                      }}
                      accessibilityRole="button"
                      accessibilityLabel={`Lumi 行程：${event.title}`}
                    >
                      <View style={[
                        styles.eventAccent,
                        { backgroundColor: categoryMeta?.color ?? '#55DDAA' },
                      ]} />
                      <View style={styles.eventCopy}>
                        <Text style={styles.eventTitle} numberOfLines={2}>{event.title}</Text>
                        <Text style={styles.eventMeta}>
                          {formatLumiEventTime(event)}
                          {' · Lumi 行程'}
                          {categoryMeta ? ` · ${categoryMeta.label}` : ''}
                        </Text>
                        {!!event.location && (
                          <Text style={styles.eventLocation} numberOfLines={1}>{event.location}</Text>
                        )}
                        <Text style={styles.eventSyncState}>
                          {event.external_event_id ? '已寫入手機日曆' : '僅儲存在 Lumi'}
                        </Text>
                      </View>
                      <Text style={styles.eventOpenHint}>編輯</Text>
                    </TouchableOpacity>
                  );
                }

                const event = item.event;
                return (
                  <TouchableOpacity
                    key={`external-${event.id}`}
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
                );
              })}

              {(visibleEvents.length > 0 || visibleLumiEvents.length > 0) && visibleTasks.length > 0 && (
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
                    ? '這天沒有行程'
                    : sourceFilter === 'tasks'
                      ? '這天沒有 Lumi 任務'
                      : '這天沒有任務或行程'}
              </Text>
              {loadError ? (
                <TouchableOpacity style={styles.emptyAddBtn} onPress={() => void retryLoad()}>
                  <Text style={styles.emptyAddText}>重試</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity style={styles.emptyAddBtn} onPress={() => setCreateMenuVisible(true)}>
                  <Text style={{ color: '#888', fontSize: 14, marginRight: 4 }}>+</Text>
                  <Text style={styles.emptyAddText}>新增任務或行程</Text>
                </TouchableOpacity>
              )}
            </View>
          }
        />
      )}

      <Modal
        visible={createMenuVisible}
        onRequestClose={() => setCreateMenuVisible(false)}
        animationType="fade"
        transparent
      >
        <View style={styles.modalOverlay}>
          <View style={styles.createMenu}>
            <Text style={styles.createMenuTitle}>要記錄什麼？</Text>
            <Text style={styles.createMenuHint}>
              任務可以完成；行程會佔用一段時間。
            </Text>
            <TouchableOpacity style={styles.createChoice} onPress={openTaskCreate}>
              <View style={styles.createChoiceIcon}>
                <TechIcon name="check-square" size={18} color="#55DDAA" />
              </View>
              <View style={styles.createChoiceCopy}>
                <Text style={styles.createChoiceTitle}>任務</Text>
                <Text style={styles.createChoiceText}>要完成的事情，可設定優先度與分類</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity style={styles.createChoice} onPress={openEventCreate}>
              <View style={[styles.createChoiceIcon, styles.eventChoiceIcon]}>
                <TechIcon name="calendar" size={18} color="#88AAFF" />
              </View>
              <View style={styles.createChoiceCopy}>
                <Text style={styles.createChoiceTitle}>行程</Text>
                <Text style={styles.createChoiceText}>有開始與結束時間，可設定地點與提醒</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.createMenuCancel}
              onPress={() => setCreateMenuVisible(false)}
            >
              <Text style={styles.createMenuCancelText}>取消</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

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
            {modalVisible && (
              <TaskForm
                initialValues={{ due_date: selectedDate, priority: 'medium', tag: null }}
                onSubmit={handleCreate}
                onCancel={() => setModalVisible(false)}
              />
            )}
          </View>
        </View>
      </Modal>

      <Modal
        visible={eventModalVisible}
        onRequestClose={() => {
          setEventModalVisible(false);
          setEditingEvent(null);
        }}
        animationType="fade"
        transparent
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>
              {editingEvent ? '編輯行程' : `新增行程（${dateMonth}月${dateDay}日）`}
            </Text>
            <View style={styles.modalDivider} />
            {eventModalVisible && (
              <CalendarEventForm
                selectedDate={selectedDate}
                initialValues={editingEvent}
                onSubmit={handleSaveEvent}
                onCancel={() => {
                  setEventModalVisible(false);
                  setEditingEvent(null);
                }}
                onDelete={editingEvent ? handleDeleteEvent : undefined}
              />
            )}
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
  eventSyncState: { color: '#4F685F', fontSize: 10, marginTop: 4 },
  eventOpenHint: { color: '#4F5963', fontSize: 10, marginLeft: 8 },
  calendarWarning: {
    minHeight: 54,
    borderWidth: 1,
    borderColor: '#594632',
    backgroundColor: '#1A1713',
    borderRadius: 8,
    marginHorizontal: 6,
    marginVertical: 6,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  calendarWarningCopy: { flex: 1 },
  calendarWarningTitle: { color: '#D3A36F', fontSize: 12 },
  calendarWarningText: { color: '#7B6B5B', fontSize: 10, marginTop: 3 },
  calendarWarningAction: { color: '#D3A36F', fontSize: 11, padding: 8 },
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
  createMenu: {
    backgroundColor: '#111315',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderWidth: 1,
    borderColor: '#30343A',
    padding: 20,
    paddingBottom: 26,
  },
  createMenuTitle: { color: '#FFFFFF', fontSize: 17, fontWeight: '400' },
  createMenuHint: { color: '#697078', fontSize: 11, marginTop: 5, marginBottom: 16 },
  createChoice: {
    minHeight: 72,
    borderWidth: 1,
    borderColor: '#2D3237',
    backgroundColor: '#15181B',
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    marginBottom: 9,
  },
  createChoiceIcon: {
    width: 34,
    height: 34,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#315C50',
    backgroundColor: '#14201C',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  eventChoiceIcon: { borderColor: '#36465E', backgroundColor: '#141A22' },
  createChoiceCopy: { flex: 1 },
  createChoiceTitle: { color: '#E8EAED', fontSize: 14, marginBottom: 4 },
  createChoiceText: { color: '#697078', fontSize: 11, lineHeight: 16 },
  createMenuCancel: { alignItems: 'center', paddingTop: 10 },
  createMenuCancelText: { color: '#747B82', fontSize: 13 },
  modalTitle: {
    padding: 20, paddingBottom: 12,
    color: '#FFFFFF', fontSize: 16, fontWeight: '300', letterSpacing: 1,
  },
  modalDivider: { height: 1, backgroundColor: '#3A3A3A' },
});
