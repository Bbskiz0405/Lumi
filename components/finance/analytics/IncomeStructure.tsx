import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { IncomeBreakdown, BufferEstimate } from '../../../services/financeAnalyticsService';
import { formatAmount } from '../../../utils/money';

interface Props {
  breakdown: IncomeBreakdown;
  buffer: BufferEstimate;
}

const SEGMENTS: { key: keyof Pick<IncomeBreakdown, 'fixed' | 'extra' | 'unclassified'>; label: string; color: string }[] = [
  { key: 'fixed', label: '固定', color: '#55DDAA' },
  { key: 'extra', label: '額外', color: '#88AAFF' },
  { key: 'unclassified', label: '未標記', color: '#4A4F55' },
];

export default function IncomeStructure({ breakdown, buffer }: Props) {
  const hasIncome = breakdown.total > 0;

  return (
    <View>
      {hasIncome ? (
        <>
          <View style={styles.stack}>
            {SEGMENTS.map(segment => {
              const amount = breakdown[segment.key];
              if (amount <= 0) return null;
              return (
                <View
                  key={segment.key}
                  style={{ flex: amount, backgroundColor: segment.color }}
                />
              );
            })}
          </View>
          <View style={styles.legend}>
            {SEGMENTS.map(segment => {
              const amount = breakdown[segment.key];
              if (amount <= 0) return null;
              return (
                <View key={segment.key} style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: segment.color }]} />
                  <Text style={styles.legendLabel}>{segment.label}</Text>
                  <Text style={styles.legendValue}>{formatAmount(amount)}</Text>
                </View>
              );
            })}
          </View>
          {breakdown.unclassified > 0 && (
            <Text style={styles.note}>未標記的收入可在記帳頁編輯該筆，選固定或額外。</Text>
          )}
        </>
      ) : (
        <Text style={styles.empty}>這段期間沒有收入</Text>
      )}

      <View style={styles.divider} />

      <View style={styles.bufferRow}>
        <Text style={styles.bufferLabel}>緩衝區</Text>
        <Text style={styles.bufferValue}>
          {buffer.months === null
            ? '尚無支出可推估'
            : `可支撐 ${buffer.months.toFixed(1)} 個月開銷`}
        </Text>
      </View>
      <Text style={styles.bufferNote}>
        以存款 {formatAmount(buffer.currentBalance)} ÷ 近月均支出{' '}
        {formatAmount(buffer.avgMonthlyExpense)} 估算。
        {!buffer.hasReconciled && ' 尚未對帳，存款目前只是收支淨額。'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  stack: {
    flexDirection: 'row',
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    backgroundColor: '#1E1E1E',
  },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginTop: 12 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 5, height: 5, borderRadius: 3 },
  legendLabel: { color: '#5B6169', fontSize: 11 },
  legendValue: { color: '#AAB2BA', fontSize: 11 },
  note: { color: '#3A3F45', fontSize: 10, marginTop: 10, lineHeight: 14 },
  empty: { color: '#4A4F55', fontSize: 12, textAlign: 'center', paddingVertical: 8 },
  divider: { height: 1, backgroundColor: '#1E1E1E', marginVertical: 14 },
  bufferRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  bufferLabel: { color: '#5B6169', fontSize: 11, letterSpacing: 1 },
  bufferValue: { color: '#E8EAED', fontSize: 13, fontWeight: '300' },
  bufferNote: { color: '#3A3F45', fontSize: 10, marginTop: 6, lineHeight: 14 },
});
