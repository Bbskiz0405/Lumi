import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

interface Props {
  title: string;
  hint?: string;
  action?: { label: string; onPress: () => void };
  children: React.ReactNode;
}

/** 分析頁每個區塊的外框，標題樣式集中在這裡，避免各區塊各自微調。 */
export default function Section({ title, hint, action, children }: Props) {
  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        {!!hint && <Text style={styles.hint}>{hint}</Text>}
        {action && (
          <TouchableOpacity onPress={action.onPress} accessibilityRole="button" hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={styles.action}>{action.label}</Text>
          </TouchableOpacity>
        )}
      </View>
      <View style={styles.card}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginBottom: 20 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  title: { color: '#5B6169', fontSize: 11, letterSpacing: 2, textTransform: 'uppercase' },
  hint: { color: '#3A3F45', fontSize: 10, marginLeft: 8, flex: 1 },
  action: { color: '#8C949C', fontSize: 12, marginLeft: 'auto' },
  card: {
    marginHorizontal: 16,
    backgroundColor: '#111111',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#252525',
    padding: 16,
  },
});
