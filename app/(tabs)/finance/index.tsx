import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Appbar } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function FinanceScreen() {
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Appbar.Header style={styles.header} elevated={false}>
        <Appbar.Content title="財務" titleStyle={styles.headerTitle} />
      </Appbar.Header>
      <View style={styles.center}>
        <MaterialCommunityIcons name="wallet-outline" size={64} color="#BDBDBD" />
        <Text variant="titleMedium" style={styles.label}>Phase 4 開發中</Text>
        <Text variant="bodySmall" style={styles.sub}>完成 Phase 3 後啟用</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F5F7FA' },
  header: { backgroundColor: '#F5F7FA' },
  headerTitle: { fontWeight: '700', color: '#212121' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  label: { color: '#9E9E9E', marginTop: 8 },
  sub: { color: '#BDBDBD' },
});
