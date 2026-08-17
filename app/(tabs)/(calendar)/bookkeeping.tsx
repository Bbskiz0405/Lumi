import React, { useState, useCallback } from 'react';
import {
  View, ScrollView, FlatList, StyleSheet, TouchableOpacity, Text,
  Modal, TextInput, ActivityIndicator, Alert,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import TransactionCard from '../../../components/finance/TransactionCard';
import { useCalendarWorkspaceScroll } from '../../../contexts/CalendarWorkspaceScrollContext';
import ExpensePieChart from '../../../components/finance/ExpensePieChart';
import FinanceAdvisor from '../../../components/finance/FinanceAdvisor';
import Calculator from '../../../components/finance/Calculator';
import IconButton from '../../../components/ui/IconButton';
import TechIcon from '../../../components/ui/TechIcon';
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
  createCategoryMeta,
} from '../../../services/financeService';
import { Transaction, ExpenseCategory, ExpenseCategoryMeta, IncomeKind } from '../../../types/finance';
import { isValidLocalDateString } from '../../../utils/date';

type ViewMode = 'month' | 'year' | 'all';

/** 收入分固定／額外，餵給財務分析頁的收入結構。留空代表未標記。 */
const INCOME_KINDS: { value: IncomeKind; label: string; color: string }[] = [
  { value: 'fixed', label: '固定收入', color: '#55DDAA' },
  { value: 'extra', label: '額外收入', color: '#88AAFF' },
];

function toMonthStr(year: number, month: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}`;
}

export default function BookkeepingScreen() {
  const { contentInset, onScroll } = useCalendarWorkspaceScroll();
  const { year, month, selectedDate, bumpRefresh } = useCalendar();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [summary, setSummary] = useState({ income: 0, expense: 0 });
  const [categoryExpense, setCategoryExpense] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [expenseCategories, setExpenseCategories] = useState<ExpenseCategoryMeta[]>([]);
  const [addingCat, setAddingCat] = useState(false);
  const [newCatLabel, setNewCatLabel] = useState('');

  const [advisorVisible, setAdvisorVisible] = useState(false);

  // Edit modal
  const [editTx, setEditTx] = useState<Transaction | null>(null);
  const [editItem, setEditItem] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editType, setEditType] = useState<'income' | 'expense'>('expense');
  const [editCategory, setEditCategory] = useState<ExpenseCategory>('food');
  const [editIncomeKind, setEditIncomeKind] = useState<IncomeKind | null>(null);
  const [editDate, setEditDate] = useState('');
  const [editSubmitting, setEditSubmitting] = useState(false);

  function openEditTx(tx: Transaction) {
    setEditTx(tx);
    setEditItem(tx.item);
    setEditAmount(String(tx.amount));
    setEditType(tx.type);
    setEditCategory((tx.category as ExpenseCategory) ?? 'other');
    setEditIncomeKind(tx.income_kind);
    setEditDate(tx.created_at.split('T')[0]);
  }

  async function handleSaveEdit() {
    if (!editTx || editSubmitting) return;
    const amt = parseFloat(editAmount);
    if (!editItem.trim() || isNaN(amt) || amt <= 0 || !isValidLocalDateString(editDate)) {
      Alert.alert('無法儲存', '請輸入項目名稱、有效金額與日期。');
      return;
    }
    const originalTime = editTx.created_at.includes('T')
      ? editTx.created_at.slice(editTx.created_at.indexOf('T'))
      : 'T12:00:00.000';
    setEditSubmitting(true);
    try {
      await updateTransaction(editTx.id, {
        item: editItem.trim(),
        amount: amt,
        type: editType,
        category: editType === 'expense' ? editCategory : null,
        income_kind: editType === 'income' ? editIncomeKind : null,
        created_at: `${editDate}${originalTime}`,
      });
    } catch {
      Alert.alert('儲存失敗', '請稍後再試。');
      return;
    } finally {
      setEditSubmitting(false);
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
  const [formIncomeKind, setFormIncomeKind] = useState<IncomeKind | null>(null);
  const [formDate, setFormDate] = useState(selectedDate);
  const [formItemError, setFormItemError] = useState('');
  const [formAmountError, setFormAmountError] = useState('');
  const [formDateError, setFormDateError] = useState('');
  // 儲存失敗與欄位驗證分開，否則錯誤會長在「項目名稱」底下，看起來像是名稱有問題。
  const [formSubmitError, setFormSubmitError] = useState('');
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
    const created = createCategoryMeta(newCatLabel, expenseCategories);
    if (!created) return;
    if (expenseCategories.some(c => c.label === created.label)) {
      setAddingCat(false);
      setNewCatLabel('');
      return;
    }
    const updated = [...expenseCategories, created];
    setExpenseCategories(updated);
    try {
      await saveExpenseCategories(updated);
    } catch {
      setExpenseCategories(expenseCategories);
      Alert.alert('新增分類失敗', '請稍後再試。');
      return;
    }
    setNewCatLabel('');
    setAddingCat(false);
    if (formType === 'expense') setFormCategory(created.value);
  }

  function openModal() {
    setFormType('expense');
    setFormItem('');
    setFormAmount('');
    setFormCategory('food');
    setFormIncomeKind(null);
    setFormDate(selectedDate);
    setFormItemError('');
    setFormAmountError('');
    setFormDateError('');
    setFormSubmitError('');
    setModalVisible(true);
  }

  async function handleSubmit() {
    setFormSubmitError('');
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
        income_kind: formType === 'income' ? formIncomeKind : null,
        created_at: useDate,
      });
    } catch {
      setFormSubmitError('儲存失敗，請稍後再試');
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

  // 「全部」模式下這份清單可以長到歷來每一筆，交給 FlatList 虛擬化，
  // 表頭放進 ListHeaderComponent 才能跟著同一份捲動與共用月曆收合。
  const listHeader = (
    <>
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
        <View style={styles.toolbarActions}>
          <IconButton
            icon="command"
            label="開啟 AI 財務顧問"
            onPress={() => setAdvisorVisible(true)}
            color="#55DDAA"
          />
          <IconButton
            icon="rotate-ccw"
            label="重置所有記帳資料"
            onPress={handleReset}
            color="#6D737A"
          />
          <IconButton icon="plus" label="新增記帳" onPress={openModal} />
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
      <ExpensePieChart data={categoryExpense} categories={expenseCategories} />

      {/* Transactions */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>
          {viewMode === 'month' ? '本月記錄' : viewMode === 'year' ? '本年記錄' : '所有記錄'}
        </Text>
      </View>
    </>
  );

  return (
    <View style={styles.safe}>
      {loading ? (
        <View style={[styles.center, { paddingTop: contentInset }]}><ActivityIndicator color="#FFFFFF" /></View>
      ) : (
        <FlatList
          data={transactions}
          keyExtractor={tx => tx.id}
          renderItem={({ item }) => (
            <TransactionCard
              transaction={item}
              categories={expenseCategories}
              onDelete={handleDelete}
              onEdit={openEditTx}
            />
          )}
          ListHeaderComponent={listHeader}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>還沒有記錄</Text>
            </View>
          }
          contentContainerStyle={[styles.scroll, { paddingTop: contentInset }]}
          showsVerticalScrollIndicator={false}
          onScroll={onScroll('bookkeeping')}
          scrollEventThrottle={16}
          keyboardShouldPersistTaps="handled"
        />
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
                autoCapitalize="none"
                autoCorrect={false}
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
                  accessibilityRole="button"
                  accessibilityLabel="開啟計算機"
                >
                  <TechIcon name="calculator" size={18} color="#55DDAA" />
                </TouchableOpacity>
              </View>
              {editType === 'income' && (
                <View style={styles.catRow}>
                  {INCOME_KINDS.map(kind => (
                    <TouchableOpacity
                      key={kind.value}
                      style={[
                        styles.catBtn,
                        editIncomeKind === kind.value && { borderColor: kind.color, backgroundColor: `${kind.color}1A` },
                      ]}
                      onPress={() => setEditIncomeKind(editIncomeKind === kind.value ? null : kind.value)}
                    >
                      <View style={[styles.catDot, { backgroundColor: kind.color }]} />
                      <Text style={[styles.catBtnText, editIncomeKind === kind.value && { color: kind.color }]}>
                        {kind.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
              {editType === 'expense' && (
                <View style={styles.catRow}>
                  {expenseCategories.map(cat => (
                    <TouchableOpacity
                      key={cat.value}
                      style={[
                        styles.catBtn,
                        editCategory === cat.value && { borderColor: cat.color, backgroundColor: `${cat.color}1A` },
                      ]}
                      onPress={() => setEditCategory(cat.value)}
                    >
                      <View style={[styles.catDot, { backgroundColor: cat.color }]} />
                      <Text style={[styles.catBtnText, editCategory === cat.value && { color: cat.color }]}>
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
                <TouchableOpacity style={styles.submitBtn} onPress={handleSaveEdit} disabled={editSubmitting}>
                  <Text style={styles.submitText}>{editSubmitting ? '儲存中...' : '儲存'}</Text>
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
                autoCapitalize="none"
                autoCorrect={false}
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
                  accessibilityRole="button"
                  accessibilityLabel="開啟計算機"
                >
                  <TechIcon name="calculator" size={18} color="#55DDAA" />
                </TouchableOpacity>
              </View>
              {!!formAmountError && <Text style={styles.errorText}>{formAmountError}</Text>}

              {formType === 'income' && (
                <>
                  <Text style={styles.fieldLabel}>收入性質</Text>
                  <View style={styles.catRow}>
                    {INCOME_KINDS.map(kind => (
                      <TouchableOpacity
                        key={kind.value}
                        style={[
                          styles.catBtn,
                          formIncomeKind === kind.value && { borderColor: kind.color, backgroundColor: `${kind.color}1A` },
                        ]}
                        onPress={() => setFormIncomeKind(formIncomeKind === kind.value ? null : kind.value)}
                      >
                        <View style={[styles.catDot, { backgroundColor: kind.color }]} />
                        <Text style={[styles.catBtnText, formIncomeKind === kind.value && { color: kind.color }]}>
                          {kind.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              )}

              {formType === 'expense' && (
                <>
                  <Text style={styles.fieldLabel}>分類</Text>
                  <View style={styles.catRow}>
                    {expenseCategories.map(cat => (
                      <TouchableOpacity
                        key={cat.value}
                        style={[
                          styles.catBtn,
                          formCategory === cat.value && { borderColor: cat.color, backgroundColor: `${cat.color}1A` },
                        ]}
                        onPress={() => setFormCategory(cat.value)}
                      >
                        <View style={[styles.catDot, { backgroundColor: cat.color }]} />
                        <Text style={[styles.catBtnText, formCategory === cat.value && { color: cat.color }]}>
                          {cat.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                    <TouchableOpacity
                      style={styles.catAddBtn}
                      onPress={() => setAddingCat(true)}
                      accessibilityRole="button"
                      accessibilityLabel="新增分類"
                    >
                      <TechIcon name="plus" size={13} color="#8C949C" />
                    </TouchableOpacity>
                  </View>

                  {addingCat && (
                    <View style={styles.catAddRow}>
                      <TextInput
                        style={[styles.input, { flex: 1, marginBottom: 0 }]}
                        value={newCatLabel}
                        onChangeText={setNewCatLabel}
                        placeholder="新分類名稱"
                        placeholderTextColor="#444"
                        autoFocus
                        onSubmitEditing={handleAddCategory}
                        returnKeyType="done"
                      />
                      <TouchableOpacity style={styles.catAddCancel} onPress={() => { setAddingCat(false); setNewCatLabel(''); }}>
                        <Text style={styles.cancelText}>取消</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.catAddConfirm} onPress={handleAddCategory}>
                        <Text style={styles.submitText}>加入</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </>
              )}

              {!!formSubmitError && <Text style={styles.errorText}>{formSubmitError}</Text>}

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
  toolbarActions: { flexDirection: 'row', gap: 8 },
  modePill: {
    borderWidth: 1,
    borderColor: '#3A3A3A',
    borderRadius: 7,
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
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderWidth: 1, borderColor: '#3A3A3A', borderRadius: 7,
    paddingHorizontal: 12, paddingVertical: 6, marginRight: 8, marginBottom: 8,
  },
  catDot: { width: 5, height: 5, borderRadius: 3 },
  catBtnText: { color: '#7A8189', fontSize: 12 },
  catAddBtn: {
    borderWidth: 1, borderColor: '#2B2F34', borderRadius: 7, backgroundColor: '#121417',
    paddingHorizontal: 12, paddingVertical: 6, marginBottom: 8,
    alignItems: 'center', justifyContent: 'center',
  },
  catAddRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  catAddCancel: {
    borderWidth: 1, borderColor: '#3A3A3A', borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 10,
  },
  catAddConfirm: {
    backgroundColor: '#FFFFFF', borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 10,
  },

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
    width: 44, height: 44, borderRadius: 8, borderWidth: 1, borderColor: '#2B2F34',
    backgroundColor: '#121417', alignItems: 'center', justifyContent: 'center',
  },
  calcOverlay: { flex: 1, justifyContent: 'flex-end' },
  calcDismiss: { flex: 1 },
});
