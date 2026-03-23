import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Priority } from '../../types/task';

interface Props {
  priority: Priority;
  compact?: boolean;
}

const PRIORITY_CONFIG: Record<Priority, { label: string; bg: string; color: string }> = {
  high:   { label: '高', bg: '#2A1010', color: '#FF6666' },
  medium: { label: '中', bg: '#1A1500', color: '#FFAA44' },
  low:    { label: '低', bg: '#0A1A0A', color: '#66BB66' },
};

export default function PriorityBadge({ priority, compact = false }: Props) {
  const cfg = PRIORITY_CONFIG[priority];
  return (
    <View style={[styles.badge, { backgroundColor: cfg.bg }]}>
      <Text style={[styles.text, { color: cfg.color, fontSize: compact ? 10 : 12 }]}>
        {cfg.label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    alignSelf: 'flex-start',
  },
  text: {
    fontWeight: '500',
  },
});
