import React from 'react';
import { Text, StyleSheet } from 'react-native';
import ModuleCard from './ModuleCard';

interface Props {
  onPress: () => void;
}

export default function GoalsModule({ onPress }: Props) {
  return (
    <ModuleCard title="目標" icon="target" onPress={onPress} accent="#FF88BB">
      <Text style={styles.soon}>Phase 5</Text>
      <Text style={styles.sub}>即將開放</Text>
    </ModuleCard>
  );
}

const styles = StyleSheet.create({
  soon: {
    color: '#333333',
    fontSize: 13,
    fontWeight: '300',
    marginTop: 4,
  },
  sub: {
    color: '#2A2A2A',
    fontSize: 11,
    marginTop: 4,
  },
});
