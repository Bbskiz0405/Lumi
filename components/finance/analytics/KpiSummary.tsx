import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import SavingsRateRing from './SavingsRateRing';
import { FinanceOverview } from '../../../services/financeAnalyticsService';
import { formatAmount, formatChange } from '../../../utils/money';

interface Props {
  overview: FinanceOverview;
}

function ChangeTag({ ratio, upIsGood }: { ratio: number | null; upIsGood: boolean }) {
  const change = formatChange(ratio, upIsGood);
  if (!change) return null;
  return <Text style={[styles.change, { color: change.color }]}>{change.text}</Text>;
}

export default function KpiSummary({ overview }: Props) {
  const balancePositive = overview.balance >= 0;

  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <View style={styles.figures}>
          <View style={styles.figureRow}>
            <Text style={styles.figureLabel}>收入</Text>
            <Text style={[styles.figureValue, { color: '#55DDAA' }]}>{formatAmount(overview.income)}</Text>
            <ChangeTag ratio={overview.incomeChangePct} upIsGood />
          </View>
          <View style={styles.figureRow}>
            <Text style={styles.figureLabel}>支出</Text>
            <Text style={[styles.figureValue, { color: '#FF6655' }]}>{formatAmount(overview.expense)}</Text>
            <ChangeTag ratio={overview.expenseChangePct} upIsGood={false} />
          </View>
          <View style={styles.figureRow}>
            <Text style={styles.figureLabel}>結餘</Text>
            <Text style={[styles.figureValue, { color: balancePositive ? '#FFFFFF' : '#FF4444' }]}>
              {formatAmount(overview.balance)}
            </Text>
          </View>
        </View>

        <SavingsRateRing ratio={overview.savingsRate} />
      </View>

      <View style={styles.divider} />
      <Text style={styles.footnote}>
        平均每日支出 <Text style={styles.footnoteValue}>{formatAmount(overview.dailyAvgExpense)}</Text>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginBottom: 20,
    backgroundColor: '#111111',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#252525',
    padding: 16,
  },
  topRow: { flexDirection: 'row', alignItems: 'center' },
  figures: { flex: 1, gap: 10 },
  figureRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  figureLabel: { color: '#4A4F55', fontSize: 11, letterSpacing: 1, width: 30 },
  figureValue: { fontSize: 19, fontWeight: '300' },
  change: { fontSize: 11 },
  divider: { height: 1, backgroundColor: '#252525', marginTop: 14, marginBottom: 10 },
  footnote: { color: '#4A4F55', fontSize: 11 },
  footnoteValue: { color: '#AAB2BA' },
});
