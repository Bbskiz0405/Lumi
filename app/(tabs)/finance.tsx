import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';

/**
 * 財務分析頁（底部「財務」入口）。
 * 逐日記帳在日曆群組的「記帳」子頁，這裡只做彙總與分析，不掛月曆。
 */
export default function FinanceScreen() {
  return (
    <View style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>財務分析</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0F0F0F' },
  scroll: { paddingBottom: 48 },
  title: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '300',
    letterSpacing: 1,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
});
