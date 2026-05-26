import React, { useState, useCallback } from 'react';
import {
  View, ScrollView, StyleSheet, TouchableOpacity, Text,
  Modal, TextInput, ActivityIndicator, Alert,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import TransactionCard from '../../../components/finance/TransactionCard';
import BudgetMeter from '../../../components/finance/BudgetMeter';
import FinanceAdvisor from '../../../components/finance/FinanceAdvisor';
import {
  getTransactionsForMonth,
  getMonthSummary,
  getBudgetsForMonth,
  getExpenseByCategory,
  createTransaction,
  deleteTransaction,
  upsertBudget,
  resetAllFinance,
} from '../../../services/financeService';
import { Transaction, ExpenseCategory } from '../../../types/finance';

const EXPENSE_CATEGORIES: { value: ExpenseCategory; label: string }[] = [
  { value: 'food', label: '餐飲' },
  { value: 'interest', label: '興趣' },
  { value: 'transport', label: '交通' },
  { value: 'other', label: '其他' },
];

const MONTHS = ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月'];

function toMonthStr(year: number, month: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}`;
}

export default function FinanceScreen() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [summary, setSummary] = useState({ income: 0, expense: 0 });
  const [budgetLimits, setBudgetLimits] = useState<Record<string, number>>({});
  const [categoryExpense, setCategoryExpense] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  const [advisorVisible, setAdvisorVisible] = useState(false);

  // Add modal
  const [modalVisible, setModalVisible] = useState(false);
  const [formType, setFormType] = useState<'income' | 'expense'>('expense');
  const [formItem, setFormItem] = useState('');
  const [formAmount, setFormAmount] = useState('');
  const [formCategory, setFormCategory] = useState<ExpenseCategory>('food');
  const [formItemError, setFormItemError] = useState('');
  const [formAmountError, setFormAmountError] = useState('');
  const [formSubmitting, setFormSubmitting] = useState(false);

  const currentMonth = toMonthStr(year, month);

  async function loadAll(m: string) {
    setLoading(true);
    const [txs, sum, budgets, catExp] = await Promise.all([
      getTransactionsForMonth(m),
      getMonthSummary(m),
      getBudgetsForMonth(m),
      getExpenseByCategory(m),
    ]);
    setTransactions(txs);
    setSummary(sum);
    const limits: Record<string, number> = {};
    for (const b of budgets) limits[b.category] = b.limit_amount;
    setBudgetLimits(limits);
    setCategoryExpense(catExp);
    setLoading(false);
  }

  useFocusEffect(
    useCallback(() => {
      loadAll(currentMonth);
    }, [currentMonth])
  );

  function prevMonth() {
    if (month === 0) { setYear(y => y - 1); setMonth(11); }
    else setMonth(m => m - 1);
  }

  function nextMonth() {
    if (month === 11) { setYear(y => y + 1); setMonth(0); }
    else setMonth(m => m + 1);
  }

  function openModal() {
    setFormType('expense');
    setFormItem('');
    setFormAmount('');
    setFormCategory('food');
    setFormItemError('');
    setFormAmountError('');
    setModalVisible(true);
  }

  async function handleSubmit() {
    let valid = true;
    if (!formItem.trim()) { setFormItemError('請輸入項目'); valid = false; }
    else setFormItemError('');
    const amt = parseFloat(formAmount);
    if (isNaN(amt) || amt <= 0) { setFormAmountError('請輸入有效金額'); valid = false; }
    else setFormAmountError('');
    if (!valid) return;
    setFormSubmitting(true);
    await createTransaction({
      type: formType,
      item: formItem.trim(),
      amount: amt,
      category: formType === 'expense' ? formCategory : null,
    });
    setFormSubmitting(false);
    setModalVisible(false);
    loadAll(currentMonth);
  }

  async function handleDelete(id: string) {
    await deleteTransaction(id);
    loadAll(currentMonth);
  }

  async function handleUpdateBudget(category: ExpenseCategory, newLimit: number) {
    await upsertBudget(category, newLimit, currentMonth);
    setBudgetLimits(prev => ({ ...prev, [category]: newLimit }));
  }

  function handleReset() {
    Alert.alert(
      '重置所有記帳資料',
      '將刪除所有月份的交易記錄和預算設定，此操作無法復原。',
      [
        { text: '取消', style: 'cancel' },
        {
          text: '確認重置',
          style: 'destructive',
          onPress: async () => {
            await resetAllFinance();
            loadAll(currentMonth);
          },
        },
      ]
    );
  }

  const balance = summary.income - summary.expense;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>財務</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity onPress={() => setAdvisorVisible(true)} style={styles.addBtn}>
            <MaterialCommunityIcons name="robot-outline" size={18} color="#55DDAA" />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleReset} style={styles.addBtn}>
            <MaterialCommunityIcons name="refresh" size={18} color="#666" />
          </TouchableOpacity>
          <TouchableOpacity onPress={openModal} style={styles.addBtn}>
            <MaterialCommunityIcons name="plus" size={22} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator color="#FFFFFF" /></View>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {/* Month nav */}
          <View style={styles.monthNav}>
            <TouchableOpacity onPress={prevMonth} style={styles.navBtn}>
              <Text style={styles.navText}>‹</Text>
            </TouchableOpacity>
            <Text style={styles.monthTitle}>{year}年 {MONTHS[month]}</Text>
            <TouchableOpacity onPress={nextMonth} style={styles.navBtn}>
              <Text style={styles.navText}>›</Text>
            </TouchableOpacity>
          </View>

          {/* Summary */}
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>收入</Text>
              <Text style={[styles.summaryAmount, { color: '#55DDAA' }]}>
                {summary.income.toLocaleString()}
              </Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>支出</Text>
              <Text style={[styles.summaryAmount, { color: '#FF6655' }]}>
                {summary.expense.toLocaleString()}
              </Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>結餘</Text>
              <Text style={[styles.summaryAmount, { color: balance >= 0 ? '#FFFFFF' : '#FF4444' }]}>
                {balance.toLocaleString()}
              </Text>
            </View>
          </View>

          {/* Budget */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>預算</Text>
            <Text style={styles.sectionHint}>點擊設定上限</Text>
          </View>
          <View style={styles.budgetContainer}>
            {EXPENSE_CATEGORIES.map(cat => (
              <BudgetMeter
                key={cat.value}
                category={cat.value}
                spent={categoryExpense[cat.value] ?? 0}
                limit={budgetLimits[cat.value] ?? 0}
                onUpdateLimit={handleUpdateBudget}
              />
            ))}
          </View>

          {/* Transactions */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>本月記錄</Text>
          </View>

          {transactions.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>這個月還沒有記錄</Text>
            </View>
          ) : (
            transactions.map(tx => (
              <TransactionCard key={tx.id} transaction={tx} onDelete={handleDelete} />
            ))
          )}
        </ScrollView>
      )}

      {/* AI Advisor */}
      <Modal
        visible={advisorVisible}
        onRequestClose={() => setAdvisorVisible(false)}
        animationType="slide"
      >
        <FinanceAdvisor month={currentMonth} onClose={() => setAdvisorVisible(false)} />
      </Modal>

      {/* Add modal */}
      <Modal
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
        animationType="fade"
        transparent
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>新增記錄</Text>
            <View style={styles.modalDivider} />

            <ScrollView style={styles.modalBody} keyboardShouldPersistTaps="handled">
              {/* Type toggle */}
              <View style={styles.typeRow}>
                <TouchableOpacity
                  style={[styles.typeBtn, formType === 'expense' && styles.typeBtnExpense]}
                  onPress={() => setFormType('expense')}
                >
                  <Text style={[styles.typeBtnText, formType === 'expense' && styles.typeBtnTextActive]}>
                    支出
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.typeBtn, formType === 'income' && styles.typeBtnIncome]}
                  onPress={() => setFormType('income')}
                >
                  <Text style={[styles.typeBtnText, formType === 'income' && styles.typeBtnTextActive]}>
                    收入
                  </Text>
                </TouchableOpacity>
              </View>

              <TextInput
                style={[styles.input, !!formItemError && styles.inputError]}
                value={formItem}
                onChangeText={setFormItem}
                placeholder="項目名稱"
                placeholderTextColor="#444"
                autoFocus
              />
              {!!formItemError && <Text style={styles.errorText}>{formItemError}</Text>}

              <TextInput
                style={[styles.input, !!formAmountError && styles.inputError]}
                value={formAmount}
                onChangeText={setFormAmount}
                placeholder="金額"
                placeholderTextColor="#444"
                keyboardType="numeric"
              />
              {!!formAmountError && <Text style={styles.errorText}>{formAmountError}</Text>}

              {formType === 'expense' && (
                <>
                  <Text style={styles.fieldLabel}>分類</Text>
                  <View style={styles.catRow}>
                    {EXPENSE_CATEGORIES.map(cat => (
                      <TouchableOpacity
                        key={cat.value}
                        style={[styles.catBtn, formCategory === cat.value && styles.catBtnActive]}
                        onPress={() => setFormCategory(cat.value)}
                      >
                        <Text style={[styles.catBtnText, formCategory === cat.value && styles.catBtnTextActive]}>
                          {cat.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              )}

              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)}>
                  <Text style={styles.cancelText}>取消</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={formSubmitting}>
                  <Text style={styles.submitText}>{formSubmitting ? '儲存中...' : '新增'}</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0F0F0F' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  headerTitle: { color: '#FFFFFF', fontSize: 20, fontWeight: '300', letterSpacing: 2 },
  addBtn: {
    width: 36, height: 36, borderRadius: 18,
    borderWidth: 1, borderColor: '#2A2A2A',
    alignItems: 'center', justifyContent: 'center',
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  scroll: { paddingBottom: 48 },

  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingBottom: 12,
  },
  navBtn: { padding: 8 },
  navText: { color: '#FFFFFF', fontSize: 24, fontWeight: '200' },
  monthTitle: { flex: 1, textAlign: 'center', color: '#FFFFFF', fontSize: 15, fontWeight: '300', letterSpacing: 1 },

  summaryRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    backgroundColor: '#111111',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1A1A1A',
    marginBottom: 20,
    paddingVertical: 16,
  },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryDivider: { width: 1, backgroundColor: '#1A1A1A' },
  summaryLabel: { color: '#444', fontSize: 11, marginBottom: 4, letterSpacing: 1 },
  summaryAmount: { fontSize: 18, fontWeight: '300' },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 10,
    marginTop: 4,
  },
  sectionTitle: { color: '#333', fontSize: 11, letterSpacing: 2, textTransform: 'uppercase' },
  sectionHint: { color: '#222', fontSize: 10, marginLeft: 8 },

  budgetContainer: {
    marginHorizontal: 20,
    marginBottom: 20,
  },

  empty: { alignItems: 'center', paddingTop: 32 },
  emptyText: { color: '#333333', fontSize: 13, letterSpacing: 1 },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-start',
    paddingTop: 48,
  },
  modal: {
    backgroundColor: '#111111',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    maxHeight: 520,
    marginHorizontal: 12,
  },
  modalTitle: {
    padding: 20,
    paddingBottom: 12,
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '300',
    letterSpacing: 1,
  },
  modalDivider: { height: 1, backgroundColor: '#2A2A2A' },
  modalBody: { padding: 16 },

  typeRow: { flexDirection: 'row', marginBottom: 12 },
  typeBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2A2A2A',
    marginRight: 8,
    borderRadius: 6,
  },
  typeBtnExpense: { borderColor: '#FF6655', backgroundColor: '#1A1010' },
  typeBtnIncome: { borderColor: '#55DDAA', backgroundColor: '#101A14' },
  typeBtnText: { color: '#444', fontSize: 14 },
  typeBtnTextActive: { color: '#FFFFFF' },

  input: {
    borderWidth: 1,
    borderColor: '#2A2A2A',
    borderRadius: 8,
    padding: 12,
    color: '#FFFFFF',
    fontSize: 15,
    marginBottom: 8,
    backgroundColor: '#161616',
  },
  inputError: { borderColor: '#FF4444' },
  errorText: { color: '#FF4444', fontSize: 12, marginBottom: 8, marginLeft: 4 },
  fieldLabel: { color: '#555', fontSize: 12, letterSpacing: 1, marginBottom: 8, marginTop: 4 },

  catRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 8 },
  catBtn: {
    borderWidth: 1, borderColor: '#2A2A2A', borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 6, marginRight: 8, marginBottom: 8,
  },
  catBtnActive: { borderColor: '#55DDAA', backgroundColor: '#101A14' },
  catBtnText: { color: '#444', fontSize: 12 },
  catBtnTextActive: { color: '#55DDAA' },

  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 8, marginBottom: 24 },
  cancelBtn: {
    borderWidth: 1, borderColor: '#2A2A2A', borderRadius: 8,
    paddingHorizontal: 20, paddingVertical: 10, marginRight: 12,
  },
  cancelText: { color: '#888', fontSize: 14 },
  submitBtn: {
    backgroundColor: '#FFFFFF', borderRadius: 8,
    paddingHorizontal: 20, paddingVertical: 10,
  },
  submitText: { color: '#0F0F0F', fontSize: 14, fontWeight: '500' },
});
