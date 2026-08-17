import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { CategoryRankItem } from '../../../services/financeAnalyticsService';
import { findCategoryMeta } from '../../../services/financeService';
import { ExpenseCategoryMeta } from '../../../types/finance';
import { formatAmount, formatChange } from '../../../utils/money';

interface Props {
  items: CategoryRankItem[];
  categories: ExpenseCategoryMeta[];
}

export default function CategoryRanking({ items, categories }: Props) {
  if (items.length === 0) {
    return <Text style={styles.empty}>這段期間沒有支出</Text>;
  }

  return (
    <View style={styles.list}>
      {items.map(item => {
        const meta = findCategoryMeta(categories, item.category);
        const change = formatChange(item.changePct, false);
        return (
          <View key={item.category} style={styles.row}>
            <View style={styles.headerRow}>
              <View style={[styles.dot, { backgroundColor: meta.color }]} />
              <Text style={styles.label}>{meta.label}</Text>
              <Text style={styles.amount}>{formatAmount(item.amount)}</Text>
              <Text style={styles.share}>{Math.round(item.share * 100)}%</Text>
              <Text style={[styles.change, change ? { color: change.color } : styles.changeMuted]}>
                {change ? change.text : '—'}
              </Text>
            </View>
            <View style={styles.track}>
              <View
                style={[
                  styles.fill,
                  { width: `${Math.max(1, item.share * 100)}%`, backgroundColor: meta.color },
                ]}
              />
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: 12 },
  row: { gap: 6 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 5, height: 5, borderRadius: 3 },
  label: { color: '#AAB2BA', fontSize: 12, flex: 1 },
  amount: { color: '#E8EAED', fontSize: 12, fontWeight: '300' },
  share: { color: '#5B6169', fontSize: 11, width: 34, textAlign: 'right' },
  change: { fontSize: 10, width: 40, textAlign: 'right' },
  changeMuted: { color: '#3A3F45' },
  track: { height: 3, backgroundColor: '#1E1E1E', borderRadius: 2, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 2 },
  empty: { color: '#4A4F55', fontSize: 12, textAlign: 'center', paddingVertical: 16 },
});
