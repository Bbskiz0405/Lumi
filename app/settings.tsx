import React from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ApiSettings from '../components/ApiSettings';

export default function SettingsScreen() {
  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ApiSettings />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0F0F0F' },
});
