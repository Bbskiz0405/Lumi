import React from 'react';
import { StyleSheet, View, TouchableOpacity, Text } from 'react-native';
import { Task } from '../../types/task';
import PriorityBadge from './PriorityBadge';

interface Props {
  task: Task;
  onToggleComplete: (id: string, completed: boolean) => void;
  onPress: (id: string) => void;
}

function getDaysUntil(dueDateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDateStr);
  due.setHours(0, 0, 0, 0);
  return Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function DeadlineLabel({ dueDate }: { dueDate: string }) {
  const days = getDaysUntil(dueDate);
  let label = '';
  let color = '#555';
  if (days < 0)       { label = `${Math.abs(days)}天前逾期`; color = '#FF4444'; }
  else if (days === 0){ label = '今天到期'; color = '#FF8844'; }
  else if (days === 1){ label = '明天到期'; color = '#FF8844'; }
  else if (days <= 7) { label = `${days}天後`; color = '#4488FF'; }
  else                { label = `${days}天後`; color = '#555'; }
  return <Text style={[styles.deadline, { color }]}>{label}</Text>;
}

const TAG_LABELS: Record<string, string> = {
  research: '研究', school: '學校', application: '申請', life: '生活',
};

export default function TaskCard({ task, onToggleComplete, onPress }: Props) {
  const isCompleted = task.completed === 1;

  return (
    <TouchableOpacity
      onPress={() => onPress(task.id)}
      activeOpacity={0.7}
      style={[styles.card, isCompleted && styles.completedCard]}
    >
      <TouchableOpacity
        onPress={() => onToggleComplete(task.id, !isCompleted)}
        style={styles.checkbox}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <View style={[styles.checkCircle, isCompleted && styles.checkCircleDone]}>
          {isCompleted && <Text style={styles.checkMark}>✓</Text>}
        </View>
      </TouchableOpacity>

      <View style={styles.middle}>
        <Text
          style={[styles.title, isCompleted && styles.completedText]}
          numberOfLines={2}
        >
          {task.title}
        </Text>
        <View style={styles.meta}>
          <PriorityBadge priority={task.priority} compact />
          {task.tag && (
            <View style={styles.tag}>
              <Text style={styles.tagText}>{TAG_LABELS[task.tag] ?? task.tag}</Text>
            </View>
          )}
        </View>
      </View>

      {task.due_date && !isCompleted && (
        <View style={styles.right}>
          <DeadlineLabel dueDate={task.due_date} />
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginVertical: 4,
    backgroundColor: '#111111',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#1A1A1A',
  },
  completedCard: { backgroundColor: '#0A0A0A' },
  checkbox: { marginRight: 12 },
  checkCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: '#333',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkCircleDone: { backgroundColor: '#333', borderColor: '#555' },
  checkMark: { color: '#FFFFFF', fontSize: 12 },
  middle: { flex: 1 },
  title: { color: '#FFFFFF', fontSize: 15, fontWeight: '300', lineHeight: 20, marginBottom: 4 },
  completedText: { textDecorationLine: 'line-through', color: '#444' },
  meta: { flexDirection: 'row', flexWrap: 'wrap' },
  tag: { backgroundColor: '#1A1A2A', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2, marginLeft: 6 },
  tagText: { color: '#6688CC', fontSize: 10 },
  right: { marginLeft: 8, alignItems: 'flex-end' },
  deadline: { fontSize: 11, fontWeight: '500' },
});
