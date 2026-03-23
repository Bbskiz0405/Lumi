import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  Platform,
  TextInput,
  TouchableOpacity,
  Text,
} from 'react-native';
import { Task, Priority, TaskTag, CreateTaskInput } from '../../types/task';

interface Props {
  initialValues?: Partial<Task>;
  onSubmit: (input: CreateTaskInput) => void;
  onCancel: () => void;
  submitLabel?: string;
}

const PRIORITY_OPTIONS: { value: Priority; label: string }[] = [
  { value: 'high', label: '高' },
  { value: 'medium', label: '中' },
  { value: 'low', label: '低' },
];

const TAG_OPTIONS: { value: TaskTag; label: string }[] = [
  { value: 'research', label: '研究' },
  { value: 'school', label: '學校' },
  { value: 'application', label: '申請' },
  { value: 'life', label: '生活' },
];

export default function TaskForm({ initialValues, onSubmit, onCancel, submitLabel = '新增' }: Props) {
  const [title, setTitle] = useState(initialValues?.title ?? '');
  const [dueDate, setDueDate] = useState(initialValues?.due_date ?? '');
  const [priority, setPriority] = useState<Priority>(initialValues?.priority ?? 'medium');
  const [tag, setTag] = useState<TaskTag | null>(initialValues?.tag ?? null);
  const [titleError, setTitleError] = useState('');
  const [dateError, setDateError] = useState('');

  function validateDate(value: string): boolean {
    if (!value) return true;
    return /^\d{4}-\d{2}-\d{2}$/.test(value);
  }

  function handleSubmit() {
    let valid = true;
    if (!title.trim()) { setTitleError('請輸入標題'); valid = false; }
    else setTitleError('');
    if (dueDate && !validateDate(dueDate)) { setDateError('格式需為 YYYY-MM-DD'); valid = false; }
    else setDateError('');
    if (!valid) return;
    onSubmit({
      title: title.trim(),
      due_date: dueDate || null,
      priority,
      tag,
      source: 'manual',
      entry_id: initialValues?.entry_id ?? null,
    });
  }

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      <TextInput
        style={[styles.input, !!titleError && styles.inputError]}
        value={title}
        onChangeText={setTitle}
        placeholder="任務標題 *"
        placeholderTextColor="#444"
        autoFocus
      />
      {!!titleError && <Text style={styles.errorText}>{titleError}</Text>}

      <TextInput
        style={[styles.input, !!dateError && styles.inputError]}
        value={dueDate}
        onChangeText={setDueDate}
        placeholder="截止日期 (YYYY-MM-DD)"
        placeholderTextColor="#444"
        keyboardType={Platform.OS === 'android' ? 'numeric' : 'numbers-and-punctuation'}
      />
      {!!dateError && <Text style={styles.errorText}>{dateError}</Text>}

      <Text style={styles.sectionLabel}>優先度</Text>
      <View style={styles.segRow}>
        {PRIORITY_OPTIONS.map(o => (
          <TouchableOpacity
            key={o.value}
            style={[styles.seg, priority === o.value && styles.segActive]}
            onPress={() => setPriority(o.value)}
          >
            <Text style={[styles.segText, priority === o.value && styles.segTextActive]}>
              {o.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.divider} />

      <Text style={styles.sectionLabel}>標籤</Text>
      <View style={styles.tagRow}>
        {TAG_OPTIONS.map(opt => (
          <TouchableOpacity
            key={opt.value}
            style={[styles.tagBtn, tag === opt.value && styles.tagBtnActive]}
            onPress={() => setTag(tag === opt.value ? null : opt.value)}
          >
            <Text style={[styles.tagBtnText, tag === opt.value && styles.tagBtnTextActive]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.divider} />

      <View style={styles.actions}>
        <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
          <Text style={styles.cancelText}>取消</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit}>
          <Text style={styles.submitText}>{submitLabel}</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16 },
  input: {
    borderWidth: 1,
    borderColor: '#2A2A2A',
    borderRadius: 8,
    padding: 12,
    color: '#FFFFFF',
    fontSize: 15,
    marginBottom: 8,
    backgroundColor: '#161616',
  },
  inputError: { borderColor: '#FF4444' },
  errorText: { color: '#FF4444', fontSize: 12, marginBottom: 8, marginLeft: 4 },
  sectionLabel: { color: '#555', fontSize: 12, letterSpacing: 1, marginBottom: 8, marginTop: 4 },
  segRow: { flexDirection: 'row', marginBottom: 4 },
  seg: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2A2A2A',
    marginRight: 6,
    borderRadius: 6,
  },
  segActive: { borderColor: '#FFFFFF', backgroundColor: '#1A1A1A' },
  segText: { color: '#444', fontSize: 13 },
  segTextActive: { color: '#FFFFFF' },
  divider: { height: 1, backgroundColor: '#1A1A1A', marginVertical: 12 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap' },
  tagBtn: {
    borderWidth: 1,
    borderColor: '#2A2A2A',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    marginBottom: 8,
  },
  tagBtnActive: { borderColor: '#FFFFFF', backgroundColor: '#1A1A1A' },
  tagBtnText: { color: '#444', fontSize: 12 },
  tagBtnTextActive: { color: '#FFFFFF' },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 8, marginBottom: 24 },
  cancelBtn: {
    borderWidth: 1,
    borderColor: '#2A2A2A',
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginRight: 12,
  },
  cancelText: { color: '#888', fontSize: 14 },
  submitBtn: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  submitText: { color: '#0F0F0F', fontSize: 14, fontWeight: '500' },
});
