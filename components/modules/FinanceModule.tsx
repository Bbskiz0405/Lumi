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
  const [loadError, setLoadError] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setLoadError(false);
      const now = new Date();
      const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      getMonthSummary(month)
        .then(s => {
          if (!active) return;
          setIncome(s.income);
          setExpense(s.expense);
        })
        .catch(() => {
          if (active) setLoadError(true);
        });
      return () => {
        active = false;
      };
    }, [refreshKey])
  );

  const balance = income - expense;

  return (
    <ModuleCard title="財務" icon="$" onPress={onPress} accent="#55DDAA">
      {loadError ? (
        <Text style={styles.error}>暫時無法讀取</Text>
      ) : (
        <>
          <Text style={[styles.balance, { color: balance >= 0 ? '#FFFFFF' : '#FF4444' }]}>
            {balance >= 0 ? '+' : ''}{balance.toLocaleString()}
          </Text>
          <Text style={styles.label}>本月結餘</Text>
        </>
      )}
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
    color: '#666666',
    fontSize: 12,
    fontWeight: '300',
    marginTop: 4,
  },
  error: { color: '#AA6666', fontSize: 12, lineHeight: 20, marginTop: 8 },
});
