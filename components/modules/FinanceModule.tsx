import React, { useState, useCallback } from 'react';
import { Text, StyleSheet } from 'react-native';
import { useFocusEffect } from 'expo-router';
import ModuleCard from './ModuleCard';
import { getMonthSummary } from '../../services/financeService';

interface Props {
  onPress: () => void;
  refreshKey?: number;
}

export default function FinanceModule({ onPress, refreshKey }: Props) {
  const [income, setIncome] = useState(0);
  const [expense, setExpense] = useState(0);

  useFocusEffect(
    useCallback(() => {
      const now = new Date();
      const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      getMonthSummary(month).then(s => {
        setIncome(s.income);
        setExpense(s.expense);
      });
    }, [refreshKey])
  );

  const balance = income - expense;

  return (
    <ModuleCard title="財務" icon="wallet-outline" onPress={onPress} accent="#55DDAA">
      <Text style={[styles.balance, { color: balance >= 0 ? '#FFFFFF' : '#FF4444' }]}>
        {balance >= 0 ? '+' : ''}{balance.toLocaleString()}
      </Text>
      <Text style={styles.label}>本月結餘</Text>
    </ModuleCard>
  );
}

const styles = StyleSheet.create({
  balance: {
    fontSize: 28,
    fontWeight: '200',
    lineHeight: 32,
  },
  label: {
    color: '#444444',
    fontSize: 12,
    fontWeight: '300',
    marginTop: 4,
  },
});
