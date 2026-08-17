import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { useFocusEffect } from 'expo-router';
import PeriodBar from '../../components/finance/analytics/PeriodBar';
import Section from '../../components/finance/analytics/Section';
import KpiSummary from '../../components/finance/analytics/KpiSummary';
import BalanceCard from '../../components/finance/analytics/BalanceCard';
import SavingsGoals, { SavingsGoalDraft } from '../../components/finance/analytics/SavingsGoals';
import IncomeStructure from '../../components/finance/analytics/IncomeStructure';
import BudgetSection from '../../components/finance/analytics/BudgetSection';
import TrendChart from '../../components/finance/analytics/TrendChart';
import CategoryRanking from '../../components/finance/analytics/CategoryRanking';
import TopExpenseList from '../../components/finance/analytics/TopExpenseList';
import { getExpenseCategories, upsertBudget } from '../../services/financeService';
import {
  Period,
  FinanceOverview,
  MonthlyTrendPoint,
  CategoryRankItem,
  IncomeBreakdown,
  BufferEstimate,
  BudgetUsageItem,
  SavingsGoalProgress,
  CurrentBalance,
  monthKey,
  getFinanceOverview,
  getMonthlyTrend,
  getCategoryRanking,
  getTopExpenses,
  getIncomeBreakdown,
  getBufferEstimate,
  getCurrentBalance,
  reconcileBalance,
  getBudgetUsage,
  getSavingsGoals,
  getAvgMonthlySurplus,
  buildGoalProgress,
  createSavingsGoal,
  updateSavingsGoal,
  deleteSavingsGoal,
} from '../../services/financeAnalyticsService';
import {
  Transaction,
  ExpenseCategory,
  ExpenseCategoryMeta,
  SavingsGoal,
} from '../../types/finance';

const TREND_MONTHS = 6;

/**
 * 財務分析頁。逐日記帳在日曆群組的「記帳」子頁，這裡只讀不寫交易，
 * 唯一會寫入的是預算上限與儲蓄目標。
 */
export default function FinanceAnalyticsScreen() {
  const today = new Date();
  const [period, setPeriod] = useState<Period>({
    mode: 'month',
    month: monthKey(today),
    year: String(today.getFullYear()),
  });

  const [categories, setCategories] = useState<ExpenseCategoryMeta[]>([]);
  const [overview, setOverview] = useState<FinanceOverview | null>(null);
  const [trend, setTrend] = useState<MonthlyTrendPoint[]>([]);
  const [ranking, setRanking] = useState<CategoryRankItem[]>([]);
  const [topExpenses, setTopExpenses] = useState<Transaction[]>([]);
  const [income, setIncome] = useState<IncomeBreakdown | null>(null);
  const [buffer, setBuffer] = useState<BufferEstimate | null>(null);
  const [balance, setBalance] = useState<CurrentBalance | null>(null);
  const [budgets, setBudgets] = useState<BudgetUsageItem[]>([]);
  const [goals, setGoals] = useState<SavingsGoalProgress[]>([]);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  // undefined = 表單關閉；null = 新增；SavingsGoal = 編輯該筆。
  const [editingGoal, setEditingGoal] = useState<SavingsGoal | null | undefined>(undefined);

  // 趨勢、緩衝、預算與儲蓄目標都以「當前月份」為錨點，年／全部模式下
  // 仍看本月，否則切到年模式就沒有月份可以定位這幾個區塊。
  const anchorMonth = period.mode === 'month' ? period.month : monthKey(today);

  const load = useCallback(async () => {
    setLoadError(false);
    const [
      nextCategories,
      nextOverview,
      nextTrend,
      nextRanking,
      nextTop,
      nextIncome,
      nextBuffer,
      nextBudgets,
      rawGoals,
      avgSurplus,
      nextBalance,
    ] = await Promise.all([
      getExpenseCategories(),
      getFinanceOverview(period),
      getMonthlyTrend(anchorMonth, TREND_MONTHS),
      getCategoryRanking(period),
      getTopExpenses(period, 5),
      getIncomeBreakdown(period),
      getBufferEstimate(anchorMonth),
      getBudgetUsage(anchorMonth),
      getSavingsGoals(),
      getAvgMonthlySurplus(anchorMonth),
      getCurrentBalance(),
    ]);

    setCategories(nextCategories);
    setOverview(nextOverview);
    setTrend(nextTrend);
    setRanking(nextRanking);
    setTopExpenses(nextTop);
    setIncome(nextIncome);
    setBuffer(nextBuffer);
    setBudgets(nextBudgets);
    setGoals(rawGoals.map(goal => buildGoalProgress(goal, avgSurplus)));
    setBalance(nextBalance);
    setLoading(false);
  }, [period, anchorMonth]);

  useFocusEffect(
    useCallback(() => {
      load().catch(err => {
        console.error('[FinanceAnalytics] load failed:', err);
        setLoadError(true);
        setLoading(false);
      });
    }, [load])
  );

  async function handleReconcile(actualBalance: number): Promise<number> {
    const diff = await reconcileBalance(actualBalance);
    await load().catch(() => setLoadError(true));
    return diff;
  }

  async function handleUpdateBudget(category: ExpenseCategory, limit: number) {
    try {
      await upsertBudget(category, limit, anchorMonth);
    } catch {
      Alert.alert('預算儲存失敗', '請稍後再試。');
      return;
    }
    await load().catch(() => setLoadError(true));
  }

  async function handleSubmitGoal(draft: SavingsGoalDraft, id: string | null) {
    if (id) {
      await updateSavingsGoal(id, {
        title: draft.title,
        target_amount: draft.targetAmount,
        saved_amount: draft.savedAmount,
        target_date: draft.targetDate,
        status: draft.savedAmount >= draft.targetAmount ? 'done' : 'active',
      });
    } else {
      await createSavingsGoal({
        title: draft.title,
        targetAmount: draft.targetAmount,
        savedAmount: draft.savedAmount,
        targetDate: draft.targetDate,
      });
    }
    setEditingGoal(undefined);
    await load().catch(() => setLoadError(true));
  }

  async function handleDeleteGoal(id: string) {
    try {
      await deleteSavingsGoal(id);
    } catch {
      Alert.alert('刪除失敗', '請稍後再試。');
      return;
    }
    setEditingGoal(undefined);
    await load().catch(() => setLoadError(true));
  }

  const daysLeft = (() => {
    const [y, m] = anchorMonth.split('-').map(Number);
    const isCurrentMonth = y === today.getFullYear() && m === today.getMonth() + 1;
    const daysInMonth = new Date(y, m, 0).getDate();
    return isCurrentMonth ? daysInMonth - today.getDate() : 0;
  })();

  if (loading) {
    return (
      <View style={[styles.safe, styles.center]}>
        <ActivityIndicator color="#FFFFFF" />
      </View>
    );
  }

  return (
    <View style={styles.safe}>
      <PeriodBar period={period} onChange={setPeriod} />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {loadError && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>資料可能不是最新，讀取失敗。</Text>
            <TouchableOpacity onPress={() => void load().catch(() => setLoadError(true))}>
              <Text style={styles.errorRetry}>重試</Text>
            </TouchableOpacity>
          </View>
        )}

        {balance && <BalanceCard balance={balance} onReconcile={handleReconcile} />}

        {overview && <KpiSummary overview={overview} />}

        <Section
          title="儲蓄目標"
          action={goals.length > 0 ? { label: '＋ 新增', onPress: () => setEditingGoal(null) } : undefined}
        >
          <SavingsGoals
            goals={goals}
            editing={editingGoal}
            onOpenCreate={() => setEditingGoal(null)}
            onOpenEdit={goal => setEditingGoal(goal)}
            onCloseForm={() => setEditingGoal(undefined)}
            onSubmit={handleSubmitGoal}
            onDelete={handleDeleteGoal}
          />
        </Section>

        {income && buffer && (
          <Section title="收入結構">
            <IncomeStructure breakdown={income} buffer={buffer} />
          </Section>
        )}

        <Section title="本月預算" hint={period.mode === 'month' ? undefined : `以 ${anchorMonth} 計`}>
          <BudgetSection
            items={budgets}
            categories={categories}
            daysLeft={daysLeft}
            onUpdateLimit={handleUpdateBudget}
          />
        </Section>

        <Section title={`近 ${TREND_MONTHS} 個月趨勢`}>
          <TrendChart data={trend} />
        </Section>

        <Section title="分類排行" hint={period.mode === 'all' ? undefined : '與前期比較'}>
          <CategoryRanking items={ranking} categories={categories} />
        </Section>

        <Section title="最大支出 TOP 5">
          <TopExpenseList transactions={topExpenses} categories={categories} />
        </Section>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0F0F0F' },
  center: { alignItems: 'center', justifyContent: 'center' },
  scroll: { paddingBottom: 48, paddingTop: 4 },
  errorBanner: {
    minHeight: 44,
    marginHorizontal: 16,
    marginBottom: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#4A2626',
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  errorText: { flex: 1, color: '#CC7777', fontSize: 12 },
  errorRetry: { color: '#FFFFFF', fontSize: 13, padding: 10 },
});
