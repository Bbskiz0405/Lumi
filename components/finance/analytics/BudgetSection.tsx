import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import BudgetMeter from '../BudgetMeter';
import { BudgetUsageItem } from '../../../services/financeAnalyticsService';
import { findCategoryMeta } from '../../../services/financeService';
import { ExpenseCategory, ExpenseCategoryMeta } from '../../../types/finance';
import { formatAmount } from '../../../utils/money';

interface Props {
  items: BudgetUsageItem[];
  categories: ExpenseCategoryMeta[];
  /** 這個月還剩幾天，用來提醒剩餘額度撐不撐得完。 */
  daysLeft: number;
  onUpdateLimit: (category: ExpenseCategory, limit: number) => void;
}

/** 預算只論月：年度或全部期間下沒有意義，由呼叫端決定要不要顯示本區塊。 */
export default function BudgetSection({ items, categories, daysLeft, onUpdateLimit }: Props) {
  if (items.length === 0) {
    return <Text style={styles.empty}>這個月還沒有支出，記一筆後就能設預算</Text>;
  }

  const withLimit = items.filter(item => item.limit > 0);
  const totalLimit = withLimit.reduce((sum, item) => sum + item.limit, 0);
  const totalSpent = withLimit.reduce((sum, item) => sum + item.spent, 0);
  const remaining = totalLimit - totalSpent;

  return (
    <View>
      {items.map(item => (
        <BudgetMeter
          key={item.category}
          category={findCategoryMeta(categories, item.category)}
          spent={item.spent}
          limit={item.limit}
          onUpdateLimit={onUpdateLimit}
        />
      ))}

      {totalLimit > 0 ? (
        <Text style={styles.summary}>
          {remaining >= 0
            ? `剩餘可用 ${formatAmount(remaining)}，本月還有 ${daysLeft} 天`
            : `已超出預算 ${formatAmount(-remaining)}，本月還有 ${daysLeft} 天`}
        </Text>
      ) : (
        <Text style={styles.summary}>點任一分類即可設定每月上限。</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  empty: { color: '#4A4F55', fontSize: 12, textAlign: 'center', paddingVertical: 16 },
  summary: {
    color: '#5B6169',
    fontSize: 11,
    marginTop: 4,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#1E1E1E',
  },
});
