import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Transaction, ExpenseCategoryMeta } from '../../../types/finance';
import { findCategoryMeta } from '../../../services/financeService';
import { formatAmount } from '../../../utils/money';

interface Props {
  transactions: Transaction[];
  categories: ExpenseCategoryMeta[];
}

function formatDate(isoStr: string): string {
  const d = new Date(isoStr);
  if (!Number.isFinite(d.getTime())) return '';
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

/** 分類排行看得出「哪一類花最多」，這裡補上「哪一筆花最多」。 */
export default function TopExpenseList({ transactions, categories }: Props) {
  if (transactions.length === 0) {
    return <Text style={styles.empty}>這段期間沒有支出</Text>;
  }

  return (
    <View style={styles.list}>
      {transactions.map((tx, index) => {
        const meta = tx.category ? findCategoryMeta(categories, tx.category) : null;
        return (
          <View key={tx.id} style={styles.row}>
            <Text style={styles.rank}>{index + 1}</Text>
            <View style={styles.body}>
              <Text style={styles.item} numberOfLines={1}>{tx.item}</Text>
              <View style={styles.meta}>
                <Text style={styles.date}>{formatDate(tx.created_at)}</Text>
                {meta && (
                  <>
                    <View style={[styles.dot, { backgroundColor: meta.color }]} />
                    <Text style={styles.category}>{meta.label}</Text>
                  </>
                )}
              </View>
            </View>
            <Text style={styles.amount}>{formatAmount(tx.amount)}</Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rank: { color: '#3A3F45', fontSize: 11, width: 12 },
  body: { flex: 1 },
  item: { color: '#E8EAED', fontSize: 13, fontWeight: '300' },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  date: { color: '#4A4F55', fontSize: 10 },
  dot: { width: 4, height: 4, borderRadius: 2 },
  category: { color: '#5B6169', fontSize: 10 },
  amount: { color: '#FF6655', fontSize: 13, fontWeight: '400' },
  empty: { color: '#4A4F55', fontSize: 12, textAlign: 'center', paddingVertical: 16 },
});
