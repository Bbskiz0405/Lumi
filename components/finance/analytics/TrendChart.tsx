import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MonthlyTrendPoint } from '../../../services/financeAnalyticsService';
import { formatCompactAmount } from '../../../utils/money';

interface Props {
  data: MonthlyTrendPoint[];
}

const CHART_HEIGHT = 96;

/**
 * 收入／支出雙柱。用 View 高度畫，不引 SVG chart 套件 —— 這裡只有幾根柱子，
 * 多一個依賴不划算。所有柱子共用同一個尺度，月與月之間才能直接比高度。
 */
export default function TrendChart({ data }: Props) {
  const max = data.reduce((m, point) => Math.max(m, point.income, point.expense), 0);

  if (max === 0) {
    return <Text style={styles.empty}>這段期間沒有紀錄</Text>;
  }

  return (
    <View>
      <View style={styles.chart}>
        {data.map(point => {
          const [, month] = point.month.split('-');
          return (
            <View key={point.month} style={styles.column}>
              <View style={styles.bars}>
                <View
                  style={[
                    styles.bar,
                    { height: Math.max(2, (point.income / max) * CHART_HEIGHT), backgroundColor: '#55DDAA' },
                  ]}
                />
                <View
                  style={[
                    styles.bar,
                    { height: Math.max(2, (point.expense / max) * CHART_HEIGHT), backgroundColor: '#FF6655' },
                  ]}
                />
              </View>
              <Text style={styles.monthLabel}>{Number(month)}月</Text>
            </View>
          );
        })}
      </View>

      <View style={styles.footer}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#55DDAA' }]} />
          <Text style={styles.legendText}>收入</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#FF6655' }]} />
          <Text style={styles.legendText}>支出</Text>
        </View>
        <Text style={styles.scale}>上限 {formatCompactAmount(max)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  chart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: CHART_HEIGHT + 18,
  },
  column: { flex: 1, alignItems: 'center' },
  bars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 3,
    height: CHART_HEIGHT,
  },
  bar: { width: 7, borderTopLeftRadius: 2, borderTopRightRadius: 2 },
  monthLabel: { color: '#4A4F55', fontSize: 10, marginTop: 6 },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#1E1E1E',
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 5, height: 5, borderRadius: 3 },
  legendText: { color: '#5B6169', fontSize: 10 },
  scale: { color: '#3A3F45', fontSize: 10, marginLeft: 'auto' },
  empty: { color: '#4A4F55', fontSize: 12, textAlign: 'center', paddingVertical: 16 },
});
