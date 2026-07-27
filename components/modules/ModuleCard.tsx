import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import TechIcon, { TechIconName } from '../ui/TechIcon';

interface Props {
  title: string;
  icon: TechIconName;
  onPress: () => void;
  children?: React.ReactNode;
  accent?: string;
}

export default function ModuleCard({ title, icon, onPress, children, accent = '#FFFFFF' }: Props) {
  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`開啟${title}`}
    >
      <View style={styles.header}>
        <View style={styles.iconFrame}>
          <TechIcon name={icon} size={16} color={accent} strokeWidth={1.7} />
        </View>
        <Text style={[styles.title, { color: accent }]}>{title}</Text>
      </View>
      <View style={styles.content}>{children}</View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: '#111315',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#22262B',
    minHeight: 120,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconFrame: {
    width: 28,
    height: 28,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: '#292D32',
    backgroundColor: '#15181B',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 9,
  },
  title: {
    fontSize: 11,
    fontWeight: '400',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  content: {
    flex: 1,
  },
});
