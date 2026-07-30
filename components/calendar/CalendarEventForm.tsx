import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Text,
  Switch,
} from 'react-native';
import {
  CreateLumiCalendarEventInput,
  LumiCalendarEvent,
} from '../../types/calendarEvent';
import {
  isValidLocalDateString,
  parseLocalDate,
  toLocalDateString,
} from '../../utils/date';
import { DEFAULT_TASK_TAGS, getTaskTagMeta } from '../../utils/taskTags';
import { getCustomTaskTags } from '../../services/taskTagService';

interface Props {
  selectedDate: string;
  initialValues?: LumiCalendarEvent | null;
  onSubmit: (input: CreateLumiCalendarEventInput) => void | Promise<void>;
  onCancel: () => void;
  onDelete?: () => void;
}

const TIMED_REMINDERS = [
  { value: null, label: '不提醒' },
  { value: 0, label: '準時' },
  { value: 10, label: '10 分前' },
  { value: 30, label: '30 分前' },
  { value: 60, label: '1 小時前' },
] as const;

const ALL_DAY_REMINDERS = [
  { value: null, label: '不提醒' },
  { value: 0, label: '當天' },
  { value: 1440, label: '1 天前' },
] as const;

function isValidTime(value: string): boolean {
  if (!/^\d{2}:\d{2}$/.test(value)) return false;
  const [hour, minute] = value.split(':').map(Number);
  return hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59;
}

function addDays(dateString: string, days: number): string {
  const date = parseLocalDate(dateString);
  date.setDate(date.getDate() + days);
  return toLocalDateString(date);
}

function getDefaultRange(selectedDate: string) {
  const today = toLocalDateString();
  if (selectedDate !== today) {
    return { endDate: selectedDate, startTime: '09:00', endTime: '10:00' };
  }

  const now = new Date();
  const roundedStart = Math.ceil((now.getHours() * 60 + now.getMinutes()) / 30) * 30;
  const startMinutes = Math.min(roundedStart, 23 * 60 + 30);
  const endMinutes = startMinutes + 60;
  const formatTime = (minutes: number) =>
    `${String(Math.floor((minutes % 1440) / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;

  return {
    endDate: endMinutes >= 1440 ? addDays(selectedDate, 1) : selectedDate,
    startTime: formatTime(startMinutes),
    endTime: formatTime(endMinutes),
  };
}

export default function CalendarEventForm({
  selectedDate,
  initialValues,
  onSubmit,
  onCancel,
  onDelete,
}: Props) {
  const defaultRange = getDefaultRange(selectedDate);
  const [title, setTitle] = useState(initialValues?.title ?? '');
  const [startDate, setStartDate] = useState(initialValues?.start_date ?? selectedDate);
  const [endDate, setEndDate] = useState(initialValues?.end_date ?? defaultRange.endDate);
  const [allDay, setAllDay] = useState(initialValues ? initialValues.all_day === 1 : false);
  const [startTime, setStartTime] = useState(initialValues?.start_time ?? defaultRange.startTime);
  const [endTime, setEndTime] = useState(initialValues?.end_time ?? defaultRange.endTime);
  const [location, setLocation] = useState(initialValues?.location ?? '');
  const [notes, setNotes] = useState(initialValues?.notes ?? '');
  const [category, setCategory] = useState<string | null>(initialValues?.category ?? null);
  const [reminder, setReminder] = useState<number | null>(initialValues?.reminder_minutes ?? null);
  const [customTags, setCustomTags] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    getCustomTaskTags().then(setCustomTags).catch(() => {});
  }, []);

  const categoryOptions = [
    ...DEFAULT_TASK_TAGS,
    ...customTags.map(getTaskTagMeta),
  ];
  const reminderOptions = allDay ? ALL_DAY_REMINDERS : TIMED_REMINDERS;

  function toggleAllDay(value: boolean) {
    setAllDay(value);
    setReminder(null);
  }

  function setEndOffset(days: number) {
    if (!isValidLocalDateString(startDate)) return;
    setEndDate(addDays(startDate, days));
  }

  function setDuration(minutes: number) {
    if (!isValidLocalDateString(startDate) || !isValidTime(startTime)) return;
    const start = parseLocalDate(startDate);
    const [hour, minute] = startTime.split(':').map(Number);
    start.setHours(hour, minute, 0, 0);
    const end = new Date(start.getTime() + minutes * 60 * 1000);
    setEndDate(toLocalDateString(end));
    setEndTime(
      `${String(end.getHours()).padStart(2, '0')}:${String(end.getMinutes()).padStart(2, '0')}`
    );
  }

  async function handleSubmit() {
    if (submitting) return;
    if (!title.trim()) {
      setError('請輸入行程名稱');
      return;
    }
    if (!isValidLocalDateString(startDate) || !isValidLocalDateString(endDate)) {
      setError('請輸入有效的開始與結束日期（YYYY-MM-DD）');
      return;
    }
    if (endDate < startDate) {
      setError('結束日期不可早於開始日期');
      return;
    }
    if (!allDay) {
      if (!isValidTime(startTime) || !isValidTime(endTime)) {
        setError('時間格式請使用 HH:mm');
        return;
      }
      if (endDate === startDate && endTime <= startTime) {
        setError('結束時間必須晚於開始時間');
        return;
      }
    }

    setSubmitting(true);
    setError('');
    try {
      await onSubmit({
        title: title.trim(),
        start_date: startDate,
        end_date: endDate,
        all_day: allDay ? 1 : 0,
        start_time: allDay ? null : startTime,
        end_time: allDay ? null : endTime,
        location: location.trim() || null,
        category,
        notes: notes.trim() || null,
        reminder_minutes: reminder,
      });
    } catch {
      setError('行程儲存失敗，請稍後再試');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <TextInput
        style={styles.input}
        value={title}
        onChangeText={setTitle}
        placeholder="行程名稱 *"
        placeholderTextColor="#4A4F54"
        autoFocus
      />

      <View style={styles.dateRow}>
        <View style={styles.dateField}>
          <Text style={styles.fieldLabel}>開始日期</Text>
          <TextInput
            style={styles.input}
            value={startDate}
            onChangeText={value => {
              setStartDate(value);
              if (endDate < value) setEndDate(value);
            }}
            placeholder="YYYY-MM-DD"
            placeholderTextColor="#4A4F54"
            keyboardType="numbers-and-punctuation"
          />
        </View>
        <View style={styles.dateField}>
          <Text style={styles.fieldLabel}>結束日期</Text>
          <TextInput
            style={styles.input}
            value={endDate}
            onChangeText={setEndDate}
            placeholder="YYYY-MM-DD"
            placeholderTextColor="#4A4F54"
            keyboardType="numbers-and-punctuation"
          />
        </View>
      </View>
      <View style={styles.quickRow}>
        <TouchableOpacity style={styles.quickButton} onPress={() => setEndOffset(0)}>
          <Text style={styles.quickText}>同一天</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.quickButton} onPress={() => setEndOffset(1)}>
          <Text style={styles.quickText}>到隔天</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.switchRow}>
        <View>
          <Text style={styles.switchTitle}>全天</Text>
          <Text style={styles.switchHint}>關閉後可設定開始與結束時間</Text>
        </View>
        <Switch
          value={allDay}
          onValueChange={toggleAllDay}
          trackColor={{ false: '#34383D', true: '#315C50' }}
          thumbColor={allDay ? '#55DDAA' : '#777'}
        />
      </View>

      {!allDay && (
        <>
          <View style={styles.timeRow}>
            <View style={styles.timeField}>
              <Text style={styles.fieldLabel}>開始時間</Text>
              <TextInput
                style={styles.input}
                value={startTime}
                onChangeText={setStartTime}
                placeholder="09:00"
                placeholderTextColor="#4A4F54"
                keyboardType="numbers-and-punctuation"
              />
            </View>
            <View style={styles.timeField}>
              <Text style={styles.fieldLabel}>結束時間</Text>
              <TextInput
                style={styles.input}
                value={endTime}
                onChangeText={setEndTime}
                placeholder="10:00"
                placeholderTextColor="#4A4F54"
                keyboardType="numbers-and-punctuation"
              />
            </View>
          </View>
          <View style={styles.quickRow}>
            {[30, 60, 120].map(minutes => (
              <TouchableOpacity
                key={minutes}
                style={styles.quickButton}
                onPress={() => setDuration(minutes)}
              >
                <Text style={styles.quickText}>
                  {minutes < 60 ? `${minutes} 分` : `${minutes / 60} 小時`}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </>
      )}

      <TextInput
        style={styles.input}
        value={location}
        onChangeText={setLocation}
        placeholder="地點（選填）"
        placeholderTextColor="#4A4F54"
      />

      <Text style={styles.fieldLabel}>分類</Text>
      <View style={styles.chipRow}>
        {categoryOptions.map(option => (
          <TouchableOpacity
            key={option.value}
            style={[
              styles.chip,
              category === option.value && {
                borderColor: option.color,
                backgroundColor: `${option.color}16`,
              },
            ]}
            onPress={() => setCategory(category === option.value ? null : option.value)}
          >
            <View style={[styles.chipDot, { backgroundColor: option.color }]} />
            <Text style={[
              styles.chipText,
              category === option.value && { color: option.color },
            ]}>
              {option.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.fieldLabel}>提醒</Text>
      <View style={styles.chipRow}>
        {reminderOptions.map(option => (
          <TouchableOpacity
            key={option.label}
            style={[styles.chip, reminder === option.value && styles.chipActive]}
            onPress={() => setReminder(option.value)}
          >
            <Text style={[
              styles.chipText,
              reminder === option.value && styles.chipTextActive,
            ]}>
              {option.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <Text style={styles.reminderHint}>
        連動日曆後由手機日曆發出提醒；未連動時行程仍會保存在 Lumi。
      </Text>

      <TextInput
        style={[styles.input, styles.notesInput]}
        value={notes}
        onChangeText={setNotes}
        placeholder="備註（選填）"
        placeholderTextColor="#4A4F54"
        multiline
        textAlignVertical="top"
      />

      {!!error && <Text style={styles.errorText}>{error}</Text>}

      <View style={styles.actions}>
        {onDelete ? (
          <TouchableOpacity style={styles.deleteButton} onPress={onDelete} disabled={submitting}>
            <Text style={styles.deleteText}>刪除</Text>
          </TouchableOpacity>
        ) : <View />}
        <View style={styles.rightActions}>
          <TouchableOpacity style={styles.cancelButton} onPress={onCancel} disabled={submitting}>
            <Text style={styles.cancelText}>取消</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.submitButton, submitting && styles.disabled]}
            onPress={() => void handleSubmit()}
            disabled={submitting}
          >
            <Text style={styles.submitText}>{submitting ? '儲存中…' : '儲存'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { maxHeight: 610 },
  content: { padding: 16, paddingBottom: 28 },
  input: {
    minHeight: 44,
    borderWidth: 1,
    borderColor: '#34383D',
    borderRadius: 8,
    paddingHorizontal: 12,
    color: '#FFFFFF',
    fontSize: 14,
    backgroundColor: '#151719',
    marginBottom: 10,
  },
  switchRow: {
    minHeight: 52,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  switchTitle: { color: '#DADDE0', fontSize: 13 },
  switchHint: { color: '#5C6268', fontSize: 10, marginTop: 3 },
  timeRow: { flexDirection: 'row', gap: 10 },
  timeField: { flex: 1 },
  dateRow: { flexDirection: 'row', gap: 10 },
  dateField: { flex: 1 },
  fieldLabel: { color: '#646B72', fontSize: 11, letterSpacing: 1, marginBottom: 7 },
  quickRow: { flexDirection: 'row', gap: 7, marginTop: -3, marginBottom: 10 },
  quickButton: {
    minHeight: 29,
    borderWidth: 1,
    borderColor: '#2D3237',
    borderRadius: 6,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickText: { color: '#737B83', fontSize: 10 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginBottom: 13 },
  chip: {
    minHeight: 30,
    borderWidth: 1,
    borderColor: '#34383D',
    borderRadius: 15,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  chipActive: { borderColor: '#6B747D', backgroundColor: '#202428' },
  chipDot: { width: 5, height: 5, borderRadius: 3 },
  chipText: { color: '#666D74', fontSize: 11 },
  chipTextActive: { color: '#E1E4E7' },
  reminderHint: { color: '#4D5359', fontSize: 10, lineHeight: 15, marginTop: -6, marginBottom: 12 },
  notesInput: { minHeight: 76, paddingTop: 11 },
  errorText: { color: '#FF6655', fontSize: 12, marginBottom: 10 },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 5,
  },
  rightActions: { flexDirection: 'row', gap: 9 },
  deleteButton: { paddingHorizontal: 8, paddingVertical: 10 },
  deleteText: { color: '#C86A64', fontSize: 13 },
  cancelButton: {
    borderWidth: 1,
    borderColor: '#34383D',
    borderRadius: 8,
    paddingHorizontal: 17,
    paddingVertical: 10,
  },
  cancelText: { color: '#8A9198', fontSize: 13 },
  submitButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingHorizontal: 19,
    paddingVertical: 10,
  },
  submitText: { color: '#0F0F0F', fontSize: 13, fontWeight: '600' },
  disabled: { opacity: 0.5 },
});
