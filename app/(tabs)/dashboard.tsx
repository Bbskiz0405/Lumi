import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Appbar } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function DashboardScreen() {
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Appbar.Header style={styles.header} elevated={false}>
        <Appbar.Content title="總覽" titleStyle={styles.headerTitle} />
      </Appbar.Header>
      <View style={styles.center}>
        <MaterialCommunityIcons name="view-dashboard-outline" size={64} color="#333333" />
        <Text variant="titleMedium" style={styles.label}>Phase 3 開發中</Text>
        <Text variant="bodySmall" style={styles.sub}>完成 Phase 2 後啟用</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0F0F0F' },
  header: { backgroundColor: '#0F0F0F' },
  headerTitle: { fontWeight: '700', color: '#FFFFFF' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  label: { color: '#555555', marginTop: 8 },
  sub: { color: '#333333' },
});
