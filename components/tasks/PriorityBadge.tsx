import React from 'react';
import { StyleSheet } from 'react-native';
import { Chip } from 'react-native-paper';
import { Priority } from '../../types/task';

interface Props {
  priority: Priority;
  compact?: boolean;
}

const PRIORITY_CONFIG: Record<Priority, { label: string; color: string; textColor: string }> = {
  high: { label: '高', color: '#FDECEA', textColor: '#C62828' },
  medium: { label: '中', color: '#FFF8E1', textColor: '#E65100' },
  low: { label: '低', color: '#E8F5E9', textColor: '#2E7D32' },
};

export default function PriorityBadge({ priority, compact = false }: Props) {
  const config = PRIORITY_CONFIG[priority];
  return (
    <Chip
      compact={compact}
      style={[styles.chip, { backgroundColor: config.color }]}
      textStyle={{ color: config.textColor, fontSize: compact ? 10 : 12 }}
    >
      {config.label}
    </Chip>
  );
}

const styles = StyleSheet.create({
  chip: {
    alignSelf: 'flex-start',
    height: 24,
  },
});
