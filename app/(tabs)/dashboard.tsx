import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

export default function DashboardScreen() {
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>總覽</Text>
      </View>
      <View style={styles.center}>
        <MaterialCommunityIcons name="view-dashboard-outline" size={64} color="#333333" />
        <Text style={styles.label}>Phase 3 開發中</Text>
        <Text style={styles.sub}>完成 Phase 2 後啟用</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0F0F0F' },
  header: { paddingHorizontal: 24, paddingVertical: 16 },
  headerTitle: { color: '#FFFFFF', fontSize: 20, fontWeight: '300', letterSpacing: 2 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  label: { color: '#555555', marginTop: 8, fontSize: 16 },
  sub: { color: '#333333', fontSize: 13, marginTop: 4 },
});
