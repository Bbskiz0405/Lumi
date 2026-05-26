import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Transaction } from '../../types/finance';

interface Props {
  transaction: Transaction;
  onDelete?: (id: string) => void;
  onEdit?: (tx: Transaction) => void;
}

const CATEGORY_LABELS: Record<string, string> = {
  food: '餐飲',
  interest: '興趣',
  transport: '交通',
  other: '其他',
};

function formatDate(isoStr: string): string {
  const d = new Date(isoStr);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

export default function TransactionCard({ transaction: tx, onDelete, onEdit }: Props) {
  const isIncome = tx.type === 'income';

  return (
    <TouchableOpacity style={styles.card} onPress={() => onEdit?.(tx)} activeOpacity={0.7}>
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
          {tx.category && (
            <View style={styles.tag}>
              <Text style={styles.tagText}>{CATEGORY_LABELS[tx.category] ?? tx.category}</Text>
            </View>
          )}
        </View>
      </View>
      {onDelete && (
        <TouchableOpacity
          onPress={() => onDelete(tx.id)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={styles.deleteBtn}
        >
          <MaterialCommunityIcons name="close" size={14} color="#444" />
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
    backgroundColor: '#1A1A2A',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  tagText: {
    color: '#6688CC',
    fontSize: 10,
  },
  deleteBtn: {
    padding: 12,
  },
});
