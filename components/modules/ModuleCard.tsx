import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';

interface Props {
  title: string;
  icon: string;
  onPress: () => void;
  children?: React.ReactNode;
  accent?: string;
}

export default function ModuleCard({ title, icon, onPress, children, accent = '#FFFFFF' }: Props) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.header}>
        <Text style={[styles.icon, { color: accent }]}>{icon}</Text>
        <Text style={[styles.title, { color: accent }]}>{title}</Text>
      </View>
      <View style={styles.content}>{children}</View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: '#111111',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1E1E1E',
    minHeight: 120,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  icon: {
    width: 24,
    marginRight: 2,
    fontSize: 14,
    fontWeight: '500',
  },
  title: {
    fontSize: 11,
    fontWeight: '400',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  content: {
    flex: 1,
  },
});
