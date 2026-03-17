import React from 'react';
import { StyleSheet, View, TouchableOpacity } from 'react-native';
import { Card, Text, Checkbox, Chip } from 'react-native-paper';
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
  let color = '#666';

  if (days < 0) {
    label = `${Math.abs(days)} 天前逾期`;
    color = '#C62828';
  } else if (days === 0) {
    label = '今天到期';
    color = '#E65100';
  } else if (days === 1) {
    label = '明天到期';
    color = '#E65100';
  } else if (days <= 7) {
    label = `${days} 天後`;
    color = '#1565C0';
  } else {
    label = `${days} 天後`;
    color = '#666';
  }

  return <Text style={[styles.deadline, { color }]}>{label}</Text>;
}

const TAG_LABELS: Record<string, string> = {
  research: '研究',
  school: '學校',
  application: '申請',
  life: '生活',
};

export default function TaskCard({ task, onToggleComplete, onPress }: Props) {
  const isCompleted = task.completed === 1;

  return (
    <TouchableOpacity onPress={() => onPress(task.id)} activeOpacity={0.7}>
      <Card style={[styles.card, isCompleted && styles.completedCard]} mode="contained">
        <Card.Content style={styles.content}>
          <View style={styles.left}>
            <Checkbox.Android
              status={isCompleted ? 'checked' : 'unchecked'}
              onPress={() => onToggleComplete(task.id, !isCompleted)}
              color="#1976D2"
            />
          </View>
          <View style={styles.middle}>
            <Text
              variant="bodyLarge"
              style={[styles.title, isCompleted && styles.completedText]}
              numberOfLines={2}
            >
              {task.title}
            </Text>
            <View style={styles.meta}>
              <PriorityBadge priority={task.priority} compact />
              {task.tag && (
                <Chip compact style={styles.tagChip} textStyle={styles.tagText}>
                  {TAG_LABELS[task.tag] ?? task.tag}
                </Chip>
              )}
            </View>
          </View>
          {task.due_date && !isCompleted && (
            <View style={styles.right}>
              <DeadlineLabel dueDate={task.due_date} />
            </View>
          )}
        </Card.Content>
      </Card>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginVertical: 4,
    backgroundColor: '#FFFFFF',
  },
  completedCard: {
    backgroundColor: '#F5F5F5',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  left: {
    marginRight: 4,
  },
  middle: {
    flex: 1,
    gap: 4,
  },
  right: {
    marginLeft: 8,
    alignItems: 'flex-end',
  },
  title: {
    fontWeight: '500',
    lineHeight: 20,
  },
  completedText: {
    textDecorationLine: 'line-through',
    color: '#9E9E9E',
  },
  meta: {
    flexDirection: 'row',
    gap: 4,
    flexWrap: 'wrap',
  },
  deadline: {
    fontSize: 11,
    fontWeight: '500',
  },
  tagChip: {
    height: 24,
    backgroundColor: '#E3F2FD',
  },
  tagText: {
    fontSize: 10,
    color: '#1565C0',
  },
});
