import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import TechIcon from '../../ui/TechIcon';
import { Period, PeriodMode, shiftMonth } from '../../../services/financeAnalyticsService';

interface Props {
  period: Period;
  onChange: (period: Period) => void;
}

const MODES: { value: PeriodMode; label: string }[] = [
  { value: 'month', label: '月' },
  { value: 'year', label: '年' },
  { value: 'all', label: '全部' },
];

function periodLabel(period: Period): string {
  if (period.mode === 'month') {
    const [year, month] = period.month.split('-');
    return `${year} 年 ${Number(month)} 月`;
  }
  if (period.mode === 'year') return `${period.year} 年`;
  return '全部期間';
}

/** 分析頁自己的期間選擇。這頁沒有共用月曆，切期間只能靠這一列。 */
export default function PeriodBar({ period, onChange }: Props) {
  const canStep = period.mode !== 'all';

  function step(offset: number) {
    if (period.mode === 'month') {
      onChange({ ...period, month: shiftMonth(period.month, offset) });
    } else if (period.mode === 'year') {
      onChange({ ...period, year: String(Number(period.year) + offset) });
    }
  }

  return (
    <View style={styles.bar}>
      <View style={styles.modeRow}>
        {MODES.map(mode => {
          const isActive = period.mode === mode.value;
          return (
            <TouchableOpacity
              key={mode.value}
              style={[styles.modePill, isActive && styles.modePillActive]}
              onPress={() => onChange({ ...period, mode: mode.value })}
              accessibilityRole="button"
              accessibilityState={{ selected: isActive }}
            >
              <Text style={[styles.modeText, isActive && styles.modeTextActive]}>{mode.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.stepper}>
        <TouchableOpacity
          onPress={() => step(-1)}
          disabled={!canStep}
          style={styles.stepBtn}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityRole="button"
          accessibilityLabel="上一個期間"
        >
          <TechIcon name="chevron-left" size={16} color={canStep ? '#55DDAA' : '#2B2F34'} />
        </TouchableOpacity>
        <Text style={styles.periodText}>{periodLabel(period)}</Text>
        <TouchableOpacity
          onPress={() => step(1)}
          disabled={!canStep}
          style={styles.stepBtn}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityRole="button"
          accessibilityLabel="下一個期間"
        >
          <TechIcon name="chevron-right" size={16} color={canStep ? '#55DDAA' : '#2B2F34'} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  modeRow: { flexDirection: 'row', gap: 8 },
  modePill: {
    borderWidth: 1,
    borderColor: '#3A3A3A',
    borderRadius: 7,
    paddingHorizontal: 14,
    paddingVertical: 5,
  },
  modePillActive: { borderColor: '#FFFFFF', backgroundColor: '#FFFFFF15' },
  modeText: { color: '#5B6169', fontSize: 12 },
  modeTextActive: { color: '#FFFFFF' },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  stepBtn: { padding: 4 },
  periodText: { color: '#AAB2BA', fontSize: 12, minWidth: 88, textAlign: 'center' },
});
