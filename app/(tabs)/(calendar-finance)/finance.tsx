import React, { useState, useCallback } from 'react';
import {
  View, ScrollView, StyleSheet, TouchableOpacity, Text,
  Modal, TextInput, ActivityIndicator, Alert,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import TransactionCard from '../../../components/finance/TransactionCard';
import ExpensePieChart from '../../../components/finance/ExpensePieChart';
import FinanceAdvisor from '../../../components/finance/FinanceAdvisor';
import Calculator from '../../../components/finance/Calculator';
import { useCalendar } from '../../../contexts/CalendarContext';
import {
  getTransactionsForMonth,
  getTransactionsForYear,
  getAllTransactions,
  getMonthSummary,
  getYearSummary,
  getAllTimeSummary,
  getExpenseByCategory,
  getExpenseByCategoryForYear,
  getExpenseByCategoryAllTime,
  createTransaction,
  updateTransaction,
  deleteTransaction,
  resetAllFinance,
  getExpenseCategories,
  saveExpenseCategories,
} from '../../../services/financeService';
import { Transaction, ExpenseCategory } from '../../../types/finance';
import { isValidLocalDateString } from '../../../utils/date';

type ViewMode = 'month' | 'year' | 'all';

const MONTHS = ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月'];

function toMonthStr(year: number, month: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}`;
}

export default function FinanceScreen() {
  const { year, month, selectedDate, bumpRefresh } = useCalendar();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [summary, setSummary] = useState({ income: 0, expense: 0 });
  const [categoryExpense, setCategoryExpense] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [expenseCategories, setExpenseCategories] = useState<{ value: string; label: string }[]>([]);
  const [addingCat, setAddingCat] = useState(false);
  const [newCatLabel, setNewCatLabel] = useState('');

  const [advisorVisible, setAdvisorVisible] = useState(false);

  // Edit modal
  const [editTx, setEditTx] = useState<Transaction | null>(null);
  const [editItem, setEditItem] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editType, setEditType] = useState<'income' | 'expense'>('expense');
  const [editCategory, setEditCategory] = useState<ExpenseCategory>('food');
  const [editDate, setEditDate] = useState('');

  function openEditTx(tx: Transaction) {
    setEditTx(tx);
    setEditItem(tx.item);
    setEditAmount(String(tx.amount));
    setEditType(tx.type);
    setEditCategory((tx.category as ExpenseCategory) ?? 'other');
    setEditDate(tx.created_at.split('T')[0]);
  }

  async function handleSaveEdit() {
    if (!editTx) return;
    const amt = parseFloat(editAmount);
    if (!editItem.trim() || isNaN(amt) || amt <= 0 || !isValidLocalDateString(editDate)) {
      Alert.alert('無法儲存', '請輸入項目名稱、有效金額與日期。');
      return;
    }
    const originalTime = editTx.created_at.includes('T')
      ? editTx.created_at.slice(editTx.created_at.indexOf('T'))
      : 'T12:00:00.000';
    try {
      await updateTransaction(editTx.id, {
        item: editItem.trim(),
        amount: amt,
        type: editType,
        category: editType === 'expense' ? editCategory : null,
        created_at: `${editDate}${originalTime}`,
      });
    } catch {
      Alert.alert('儲存失敗', '請稍後再試。');
      return;
    }
    setEditTx(null);
    bumpRefresh();
    await loadAll(viewMode).catch(() => undefined);
  }

  // Add modal
  const [modalVisible, setModalVisible] = useState(false);
  const [formType, setFormType] = useState<'income' | 'expense'>('expense');
  const [formItem, setFormItem] = useState('');
  const [formAmount, setFormAmount] = useState('');
  const [formCategory, setFormCategory] = useState<ExpenseCategory>('food');
  const [formDate, setFormDate] = useState(selectedDate);
  const [formItemError, setFormItemError] = useState('');
  const [formAmountError, setFormAmountError] = useState('');
  const [formDateError, setFormDateError] = useState('');
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [showCalc, setShowCalc] = useState(false);
  const [calcTarget, setCalcTarget] = useState<'add' | 'edit'>('add');

  const currentMonth = toMonthStr(year, month);

  async function loadAll(mode: ViewMode, silent = false) {
    if (!silent) setLoading(true);
    setLoadError(false);
    try {
      let txs: Transaction[];
      let sum: { income: number; expense: number };
      let catExp: Record<string, number>;

      if (mode === 'year') {
        [txs, sum, catExp] = await Promise.all([
          getTransactionsForYear(String(year)),
          getYearSummary(String(year)),
          getExpenseByCategoryForYear(String(year)),
        ]);
      } else if (mode === 'all') {
        [txs, sum, catExp] = await Promise.all([
          getAllTransactions(),
          getAllTimeSummary(),
          getExpenseByCategoryAllTime(),
        ]);
      } else {
        [txs, sum, catExp] = await Promise.all([
          getTransactionsForMonth(currentMonth),
          getMonthSummary(currentMonth),
          getExpenseByCategory(currentMonth),
        ]);
      }

      setTransactions(txs);
      setSummary(sum);
      setCategoryExpense(catExp);
    } catch (error) {
      setLoadError(true);
      throw error;
    } finally {
      setLoading(false);
    }
  }

  useFocusEffect(
    useCallback(() => {
      loadAll(viewMode, true).catch(err => console.error('[FinanceScreen] load failed:', err));
      getExpenseCategories()
        .then(setExpenseCategories)
        .catch(err => console.error('[FinanceScreen] categories failed:', err));
    }, [currentMonth, viewMode])
  );

  async function handleAddCategory() {
    const label = newCatLabel.trim();
    if (!label) return;
    const value = label.toLowerCase().replace(/\s/g, '_');
    if (expenseCategories.some(c => c.value === value)) return;
    const updated = [...expenseCategories, { value, label }];
    setExpenseCategories(updated);
    await saveExpenseCategories(updated);
    setNewCatLabel('');
    setAddingCat(false);
  }

  function openModal() {
    setFormType('expense');
    setFormItem('');
    setFormAmount('');
    setFormCategory('food');
    setFormDate(selectedDate);
    setFormItemError('');
    setFormAmountError('');
    setFormDateError('');
    setModalVisible(true);
  }

  async function handleSubmit() {
    let valid = true;
    if (!formItem.trim()) { setFormItemError('請輸入項目'); valid = false; }
    else setFormItemError('');
    const amt = parseFloat(formAmount);
    if (isNaN(amt) || amt <= 0) { setFormAmountError('請輸入有效金額'); valid = false; }
    else setFormAmountError('');
    if (!isValidLocalDateString(formDate)) { setFormDateError('請輸入有效日期（YYYY-MM-DD）'); valid = false; }
    else setFormDateError('');
    if (!valid) return;
    setFormSubmitting(true);
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const pad3 = (n: number) => String(n).padStart(3, '0');
    const timeStr = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}.${pad3(now.getMilliseconds())}`;
    const useDate = `${formDate}T${timeStr}`;
    try {
      await createTransaction({
        type: formType,
        item: formItem.trim(),
        amount: amt,
        category: formType === 'expense' ? formCategory : null,
        created_at: useDate,
      });
    } catch {
      setFormItemError('儲存失敗，請稍後再試');
      return;
    } finally {
      setFormSubmitting(false);
    }
    setModalVisible(false);
    bumpRefresh();
    await loadAll(viewMode).catch(() => undefined);
  }

  async function handleDelete(id: string, closeEdit = false) {
    Alert.alert('刪除記錄', '確定要刪除這筆記帳嗎？', [
      { text: '取消', style: 'cancel' },
      {
        text: '刪除',
        style: 'destructive',
        onPress: async () => {
          try {
            if (closeEdit) setEditTx(null);
            await deleteTransaction(id);
          } catch {
            Alert.alert('刪除失敗', '請稍後再試。');
            return;
          }
          bumpRefresh();
          await loadAll(viewMode).catch(() => undefined);
        },
      },
    ]);
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
            try {
              await resetAllFinance();
            } catch {
              Alert.alert('重置失敗', '請稍後再試。');
              return;
            }
            bumpRefresh();
            await loadAll(viewMode).catch(() => undefined);
          },
        },
      ]
    );
  }

  const balance = summary.income - summary.expense;

  return (
    <View style={styles.safe}>
      {loading ? (
        <View style={styles.center}><ActivityIndicator color="#FFFFFF" /></View>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {/* Toolbar: mode toggle + action buttons */}
          <View style={styles.toolbar}>
            <View style={styles.modeRow}>
              {(['month', 'year', 'all'] as ViewMode[]).map(m => (
                <TouchableOpacity
                  key={m}
                  style={[styles.modePill, viewMode === m && styles.modePillActive]}
                  onPress={() => setViewMode(m)}
                >
                  <Text style={[styles.modePillText, viewMode === m && styles.modePillTextActive]}>
                    {m === 'month' ? '月' : m === 'year' ? '年' : '全部'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity
                onPress={() => setAdvisorVisible(true)}
                style={styles.addBtn}
                hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
                accessibilityRole="button"
                accessibilityLabel="開啟 AI 財務顧問"
              >
                <Text style={{ color: '#55DDAA', fontSize: 18, fontWeight: '200' }}>✧</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleReset}
                style={styles.addBtn}
                hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
                accessibilityRole="button"
                accessibilityLabel="重置所有記帳資料"
              >
                <Text style={{ color: '#666', fontSize: 22, fontWeight: '200', marginTop: -2 }}>↻</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={openModal}
                style={styles.addBtn}
                hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
                accessibilityRole="button"
                accessibilityLabel="新增記帳"
              >
                <Text style={{ color: '#FFFFFF', fontSize: 24, fontWeight: '200', marginTop: -2 }}>+</Text>
              </TouchableOpacity>
            </View>
          </View>

          {loadError && (
            <View style={styles.loadErrorBanner}>
              <Text style={styles.loadErrorText}>資料可能不是最新，讀取失敗。</Text>
              <TouchableOpacity onPress={() => void loadAll(viewMode)}>
                <Text style={styles.loadErrorRetry}>重試</Text>
              </TouchableOpacity>
            </View>
          )}

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

          {/* Pie Chart */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>支出分佈</Text>
          </View>
          <ExpensePieChart data={categoryExpense} />

          {/* Transactions */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              {viewMode === 'month' ? '本月記錄' : viewMode === 'year' ? '本年記錄' : '所有記錄'}
            </Text>
          </View>

          {transactions.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>還沒有記錄</Text>
            </View>
          ) : (
            transactions.map(tx => (
              <TransactionCard key={tx.id} transaction={tx} onDelete={handleDelete} onEdit={openEditTx} />
            ))
          )}
        </ScrollView>
      )}

      {/* Edit modal */}
      <Modal
        visible={editTx !== null}
        onRequestClose={() => setEditTx(null)}
        animationType="fade"
        transparent
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>編輯記錄</Text>
            <View style={styles.modalDivider} />
            <ScrollView style={styles.modalBody} keyboardShouldPersistTaps="handled">
              <View style={styles.typeRow}>
                <TouchableOpacity
                  style={[styles.typeBtn, editType === 'expense' && styles.typeBtnExpense]}
                  onPress={() => setEditType('expense')}
                >
                  <Text style={[styles.typeBtnText, editType === 'expense' && styles.typeBtnTextActive]}>支出</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.typeBtn, editType === 'income' && styles.typeBtnIncome]}
                  onPress={() => setEditType('income')}
                >
                  <Text style={[styles.typeBtnText, editType === 'income' && styles.typeBtnTextActive]}>收入</Text>
                </TouchableOpacity>
              </View>
              <TextInput
                style={styles.input}
                value={editItem}
                onChangeText={setEditItem}
                placeholder="項目名稱"
                placeholderTextColor="#444"
              />
              <Text style={styles.fieldLabel}>日期</Text>
              <TextInput
                style={styles.input}
                value={editDate}
                onChangeText={setEditDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#444"
                keyboardType="numeric"
              />
              <View style={styles.amountRow}>
                <TextInput
                  style={[styles.input, { flex: 1, marginBottom: 0 }]}
                  value={editAmount}
                  onChangeText={setEditAmount}
                  placeholder="金額"
                  placeholderTextColor="#666"
                  keyboardType="numeric"
                />
                <TouchableOpacity
                  style={styles.calcBtn}
                  onPress={() => { setCalcTarget('edit'); setShowCalc(true); }}
                >
                  <Text style={styles.calcBtnText}>[=]</Text>
                </TouchableOpacity>
              </View>
              {editType === 'expense' && (
                <View style={styles.catRow}>
                  {expenseCategories.map(cat => (
                    <TouchableOpacity
                      key={cat.value}
                      style={[styles.catBtn, editCategory === cat.value && styles.catBtnActive]}
                      onPress={() => setEditCategory(cat.value)}
                    >
                      <Text style={[styles.catBtnText, editCategory === cat.value && styles.catBtnTextActive]}>
                        {cat.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.deleteBtn}
                  onPress={() => {
                    if (!editTx) return;
                    void handleDelete(editTx.id, true);
                  }}
                >
                  <Text style={styles.deleteText}>刪除</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setEditTx(null)}>
                  <Text style={styles.cancelText}>取消</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.submitBtn} onPress={handleSaveEdit}>
                  <Text style={styles.submitText}>儲存</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

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

              <Text style={styles.fieldLabel}>日期</Text>
              <TextInput
                style={[styles.input, !!formDateError && styles.inputError]}
                value={formDate}
                onChangeText={setFormDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#444"
                keyboardType="numeric"
              />
              {!!formDateError && <Text style={styles.errorText}>{formDateError}</Text>}

              <View style={styles.amountRow}>
                <TextInput
                  style={[styles.input, { flex: 1, marginBottom: 0 }, !!formAmountError && styles.inputError]}
                  value={formAmount}
                  onChangeText={setFormAmount}
                  placeholder="金額"
                  placeholderTextColor="#666"
                  keyboardType="numeric"
                />
                <TouchableOpacity
                  style={styles.calcBtn}
                  onPress={() => { setCalcTarget('add'); setShowCalc(true); }}
                >
                  <Text style={styles.calcBtnText}>[=]</Text>
                </TouchableOpacity>
              </View>
              {!!formAmountError && <Text style={styles.errorText}>{formAmountError}</Text>}

              {formType === 'expense' && (
                <>
                  <Text style={styles.fieldLabel}>分類</Text>
                  <View style={styles.catRow}>
                    {expenseCategories.map(cat => (
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

      {/* Calculator */}
      <Modal
        visible={showCalc}
        onRequestClose={() => setShowCalc(false)}
        animationType="slide"
        transparent
      >
        <View style={styles.calcOverlay}>
          <TouchableOpacity style={styles.calcDismiss} onPress={() => setShowCalc(false)} />
          <Calculator
            initialValue={calcTarget === 'add' ? formAmount : editAmount}
            onConfirm={(val) => {
              if (calcTarget === 'add') setFormAmount(String(val));
              else setEditAmount(String(val));
              setShowCalc(false);
            }}
            onCancel={() => setShowCalc(false)}
          />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0F0F0F' },
  addBtn: {
    width: 36, height: 36, borderRadius: 18,
    borderWidth: 1, borderColor: '#3A3A3A',
    alignItems: 'center', justifyContent: 'center',
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  scroll: { paddingBottom: 48 },

  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  modeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  modePill: {
    borderWidth: 1,
    borderColor: '#3A3A3A',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 5,
  },
  modePillActive: {
    borderColor: '#FFFFFF',
    backgroundColor: '#FFFFFF15',
  },
  modePillText: { color: '#444', fontSize: 12 },
  modePillTextActive: { color: '#FFFFFF' },
  loadErrorBanner: {
    minHeight: 44,
    marginHorizontal: 16,
    marginBottom: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#4A2626',
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  loadErrorText: { flex: 1, color: '#CC7777', fontSize: 12 },
  loadErrorRetry: { color: '#FFFFFF', fontSize: 13, padding: 10 },

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
    borderColor: '#252525',
    marginBottom: 20,
    paddingVertical: 16,
  },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryDivider: { width: 1, backgroundColor: '#252525' },
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
  emptyText: { color: '#555555', fontSize: 13, letterSpacing: 1 },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modal: {
    backgroundColor: '#111111',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderWidth: 1,
    borderColor: '#3A3A3A',
    maxHeight: '85%',
  },
  modalTitle: {
    padding: 20,
    paddingBottom: 12,
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '300',
    letterSpacing: 1,
  },
  modalDivider: { height: 1, backgroundColor: '#3A3A3A' },
  modalBody: { padding: 16 },

  typeRow: { flexDirection: 'row', marginBottom: 12 },
  typeBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#3A3A3A',
    marginRight: 8,
    borderRadius: 6,
  },
  typeBtnExpense: { borderColor: '#FF6655', backgroundColor: '#1A1010' },
  typeBtnIncome: { borderColor: '#55DDAA', backgroundColor: '#101A14' },
  typeBtnText: { color: '#444', fontSize: 14 },
  typeBtnTextActive: { color: '#FFFFFF' },

  input: {
    borderWidth: 1,
    borderColor: '#3A3A3A',
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
    borderWidth: 1, borderColor: '#3A3A3A', borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 6, marginRight: 8, marginBottom: 8,
  },
  catBtnActive: { borderColor: '#55DDAA', backgroundColor: '#101A14' },
  catBtnText: { color: '#444', fontSize: 12 },
  catBtnTextActive: { color: '#55DDAA' },

  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', marginTop: 8, marginBottom: 24, gap: 12 },
  deleteBtn: {
    borderWidth: 1, borderColor: '#3A1010', borderRadius: 8,
    paddingHorizontal: 16, paddingVertical: 10,
    marginRight: 'auto',
  },
  deleteText: { color: '#FF6666', fontSize: 14 },
  cancelBtn: {
    borderWidth: 1, borderColor: '#3A3A3A', borderRadius: 8,
    paddingHorizontal: 20, paddingVertical: 10,
  },
  cancelText: { color: '#888', fontSize: 14 },
  submitBtn: {
    backgroundColor: '#FFFFFF', borderRadius: 8,
    paddingHorizontal: 20, paddingVertical: 10,
  },
  submitText: { color: '#0F0F0F', fontSize: 14, fontWeight: '500' },

  amountRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  calcBtn: {
    width: 44, height: 44, borderRadius: 10, borderWidth: 1, borderColor: '#3A3A3A',
    backgroundColor: '#1A1A1A', alignItems: 'center', justifyContent: 'center',
  },
  calcBtnText: { color: '#55DDAA', fontSize: 14, fontWeight: '500' },
  calcOverlay: { flex: 1, justifyContent: 'flex-end' },
  calcDismiss: { flex: 1 },
});
