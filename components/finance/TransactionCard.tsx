import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Transaction, ExpenseCategoryMeta } from '../../types/finance';
import { findCategoryMeta } from '../../services/financeService';
import TechIcon from '../ui/TechIcon';

interface Props {
  transaction: Transaction;
  categories: ExpenseCategoryMeta[];
  onDelete?: (id: string) => void;
  onEdit?: (tx: Transaction) => void;
}

function formatDate(isoStr: string): string {
  const d = new Date(isoStr);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

export default function TransactionCard({ transaction: tx, categories, onDelete, onEdit }: Props) {
  const isIncome = tx.type === 'income';
  const categoryMeta = tx.category ? findCategoryMeta(categories, tx.category) : null;

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => onEdit?.(tx)}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`編輯${isIncome ? '收入' : '支出'}：${tx.item}，${tx.amount}`}
    >
      <View style={[styles.indicator, { backgroundColor: isIncome ? '#55DDAA' : '#FF6655' }]} />
      <View style={styles.body}>
        <View style={styles.top}>
          <Text style={styles.item} numberOfLines={1}>{tx.item}</Text>
          <Text style={[styles.amount, { color: isIncome ? '#55DDAA' : '#FF6655' }]}>
            {isIncome ? '+' : '-'}{tx.amount.toLocaleString('zh-TW')}
          </Text>
        </View>
        <View style={styles.bottom}>
          <Text style={styles.date}>{formatDate(tx.created_at)}</Text>
          {categoryMeta && (
            <View style={[styles.tag, { borderColor: `${categoryMeta.color}55` }]}>
              <View style={[styles.tagDot, { backgroundColor: categoryMeta.color }]} />
              <Text style={styles.tagText}>{categoryMeta.label}</Text>
            </View>
          )}
        </View>
      </View>
      {onDelete && (
        <TouchableOpacity
          onPress={() => onDelete(tx.id)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={styles.deleteBtn}
          accessibilityRole="button"
          accessibilityLabel={`刪除記帳：${tx.item}`}
        >
          <TechIcon name="trash" size={16} color="#555" />
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111111',
    borderRadius: 12,
    marginHorizontal: 16,
    marginVertical: 4,
    borderWidth: 1,
    borderColor: '#252525',
    overflow: 'hidden',
  },
  indicator: {
    width: 3,
    alignSelf: 'stretch',
  },
  body: {
    flex: 1,
    padding: 12,
  },
  top: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  item: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '300',
    flex: 1,
    marginRight: 8,
  },
  amount: {
    fontSize: 15,
    fontWeight: '400',
  },
  bottom: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  date: {
    color: '#444',
    fontSize: 11,
    marginRight: 8,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  tagDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  tagText: {
    color: '#8C949C',
    fontSize: 10,
  },
  deleteBtn: {
    padding: 12,
  },
});
