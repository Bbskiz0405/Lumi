import React from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import CalendarSettings from '../components/CalendarSettings';

export default function CalendarSettingsScreen() {
  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <CalendarSettings />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0F0F0F' },
});
