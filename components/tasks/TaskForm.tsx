import React, { useState } from 'react';
import { StyleSheet, View, ScrollView, Platform } from 'react-native';
import {
  TextInput,
  Button,
  SegmentedButtons,
  Text,
  Divider,
} from 'react-native-paper';
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
    if (!title.trim()) {
      setTitleError('請輸入標題');
      valid = false;
    } else {
      setTitleError('');
    }
    if (dueDate && !validateDate(dueDate)) {
      setDateError('格式需為 YYYY-MM-DD');
      valid = false;
    } else {
      setDateError('');
    }
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
        label="任務標題 *"
        value={title}
        onChangeText={setTitle}
        mode="outlined"
        error={!!titleError}
        style={styles.input}
        autoFocus
      />
      {!!titleError && <Text style={styles.errorText}>{titleError}</Text>}

      <TextInput
        label="截止日期 (YYYY-MM-DD)"
        value={dueDate}
        onChangeText={setDueDate}
        mode="outlined"
        placeholder="2025-12-31"
        keyboardType={Platform.OS === 'android' ? 'numeric' : 'numbers-and-punctuation'}
        error={!!dateError}
        style={styles.input}
      />
      {!!dateError && <Text style={styles.errorText}>{dateError}</Text>}

      <Text variant="labelLarge" style={styles.sectionLabel}>優先度</Text>
      <SegmentedButtons
        value={priority}
        onValueChange={(v) => setPriority(v as Priority)}
        buttons={PRIORITY_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
        style={styles.segmented}
      />

      <Divider style={styles.divider} />

      <Text variant="labelLarge" style={styles.sectionLabel}>標籤</Text>
      <View style={styles.tagRow}>
        {TAG_OPTIONS.map((opt) => (
          <Button
            key={opt.value}
            mode={tag === opt.value ? 'contained' : 'outlined'}
            compact
            onPress={() => setTag(tag === opt.value ? null : opt.value)}
            style={styles.tagButton}
          >
            {opt.label}
          </Button>
        ))}
      </View>

      <Divider style={styles.divider} />

      <View style={styles.actions}>
        <Button mode="outlined" onPress={onCancel} style={styles.actionButton}>
          取消
        </Button>
        <Button mode="contained" onPress={handleSubmit} style={styles.actionButton}>
          {submitLabel}
        </Button>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  input: {
    marginBottom: 4,
  },
  errorText: {
    color: '#C62828',
    fontSize: 12,
    marginBottom: 8,
    marginLeft: 4,
  },
  sectionLabel: {
    marginTop: 12,
    marginBottom: 8,
    color: '#424242',
  },
  segmented: {
    marginBottom: 4,
  },
  divider: {
    marginVertical: 12,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tagButton: {
    borderRadius: 20,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 8,
    marginBottom: 24,
  },
  actionButton: {
    minWidth: 80,
  },
});
