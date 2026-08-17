import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Modal, TextInput, ScrollView, Alert,
} from 'react-native';
import TechIcon from '../../ui/TechIcon';
import { SavingsGoalProgress } from '../../../services/financeAnalyticsService';
import { SavingsGoal } from '../../../types/finance';
import { formatAmount } from '../../../utils/money';
import { isValidLocalDateString } from '../../../utils/date';

export interface SavingsGoalDraft {
  title: string;
  targetAmount: number;
  savedAmount: number;
  targetDate: string | null;
}

interface Props {
  goals: SavingsGoalProgress[];
  editing: SavingsGoal | null | undefined;
  onOpenCreate: () => void;
  onOpenEdit: (goal: SavingsGoal) => void;
  onCloseForm: () => void;
  onSubmit: (draft: SavingsGoalDraft, id: string | null) => Promise<void>;
  onDelete: (id: string) => void;
}

function projectionText(progress: SavingsGoalProgress): string {
  if (progress.remaining <= 0) return '已達標';
  const parts: string[] = [];
  if (progress.monthsNeeded !== null) parts.push(`依月均結餘還需 ${progress.monthsNeeded} 個月`);
  if (progress.requiredMonthly !== null) parts.push(`要如期達標每月需存 ${formatAmount(progress.requiredMonthly)}`);
  if (parts.length === 0) return '月均結餘為零或為負，無法推估完成時間';
  return parts.join('、');
}

/**
 * 已存金額是手動維護的：App 只記錄流水，沒有帳戶餘額，
 * 自動從結餘扣會把「還沒真的存起來的錢」算進目標。
 */
export default function SavingsGoals({
  goals,
  editing,
  onOpenCreate,
  onOpenEdit,
  onCloseForm,
  onSubmit,
  onDelete,
}: Props) {
  const [title, setTitle] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [savedAmount, setSavedAmount] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const formVisible = editing !== undefined;

  // editing 由外層在開啟表單時設定，這裡同步一次即可，不需要每次 render 重設。
  React.useEffect(() => {
    if (editing === undefined) return;
    setTitle(editing?.title ?? '');
    setTargetAmount(editing ? String(editing.target_amount) : '');
    setSavedAmount(editing ? String(editing.saved_amount) : '');
    setTargetDate(editing?.target_date ?? '');
    setError('');
  }, [editing]);

  async function handleSubmit() {
    const target = parseFloat(targetAmount);
    const saved = savedAmount.trim() ? parseFloat(savedAmount) : 0;

    if (!title.trim()) return setError('請輸入目標名稱');
    if (!Number.isFinite(target) || target <= 0) return setError('目標金額必須大於 0');
    if (!Number.isFinite(saved) || saved < 0) return setError('已存金額不可為負');
    if (targetDate.trim() && !isValidLocalDateString(targetDate.trim())) {
      return setError('目標日期格式為 YYYY-MM-DD');
    }

    setSubmitting(true);
    try {
      await onSubmit(
        {
          title: title.trim(),
          targetAmount: target,
          savedAmount: saved,
          targetDate: targetDate.trim() || null,
        },
        editing?.id ?? null
      );
    } catch {
      setError('儲存失敗，請稍後再試');
      return;
    } finally {
      setSubmitting(false);
    }
  }

  function confirmDelete(goal: SavingsGoal) {
    Alert.alert('刪除目標', `確定要刪除「${goal.title}」嗎？`, [
      { text: '取消', style: 'cancel' },
      { text: '刪除', style: 'destructive', onPress: () => onDelete(goal.id) },
    ]);
  }

  return (
    <View>
      {goals.length === 0 ? (
        <TouchableOpacity style={styles.emptyBtn} onPress={onOpenCreate} accessibilityRole="button">
          <TechIcon name="target" size={18} color="#5B6169" />
          <Text style={styles.emptyText}>還沒有儲蓄目標，點此新增</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.list}>
          {goals.map(progress => {
            const { goal } = progress;
            const done = progress.remaining <= 0;
            return (
              <TouchableOpacity
                key={goal.id}
                style={styles.goal}
                onPress={() => onOpenEdit(goal)}
                onLongPress={() => confirmDelete(goal)}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={`編輯目標 ${goal.title}`}
              >
                <View style={styles.goalHeader}>
                  <Text style={styles.goalTitle} numberOfLines={1}>{goal.title}</Text>
                  <Text style={styles.goalAmount}>
                    {formatAmount(goal.saved_amount)} / {formatAmount(goal.target_amount)}
                  </Text>
                  <Text style={[styles.goalPct, done && { color: '#55DDAA' }]}>
                    {Math.round(progress.progress * 100)}%
                  </Text>
                </View>
                <View style={styles.track}>
                  <View
                    style={[
                      styles.fill,
                      {
                        width: `${Math.max(1, progress.progress * 100)}%`,
                        backgroundColor: done ? '#55DDAA' : '#88AAFF',
                      },
                    ]}
                  />
                </View>
                <Text style={styles.projection}>{projectionText(progress)}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      <Modal visible={formVisible} transparent animationType="fade" onRequestClose={onCloseForm}>
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>{editing ? '編輯目標' : '新增儲蓄目標'}</Text>
            <View style={styles.sheetDivider} />
            <ScrollView style={styles.sheetBody} keyboardShouldPersistTaps="handled">
              <TextInput
                style={styles.input}
                value={title}
                onChangeText={setTitle}
                placeholder="目標名稱（例如：買車）"
                placeholderTextColor="#444"
                autoFocus
              />
              <Text style={styles.fieldLabel}>目標金額</Text>
              <TextInput
                style={styles.input}
                value={targetAmount}
                onChangeText={setTargetAmount}
                placeholder="300000"
                placeholderTextColor="#444"
                keyboardType="numeric"
              />
              <Text style={styles.fieldLabel}>已存金額</Text>
              <TextInput
                style={styles.input}
                value={savedAmount}
                onChangeText={setSavedAmount}
                placeholder="0"
                placeholderTextColor="#444"
                keyboardType="numeric"
              />
              <Text style={styles.fieldLabel}>目標日期（選填）</Text>
              <TextInput
                style={styles.input}
                value={targetDate}
                onChangeText={setTargetDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#444"
                autoCapitalize="none"
                autoCorrect={false}
              />
              {!!error && <Text style={styles.error}>{error}</Text>}

              <View style={styles.actions}>
                {editing && (
                  <TouchableOpacity style={styles.deleteBtn} onPress={() => confirmDelete(editing)}>
                    <Text style={styles.deleteText}>刪除</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity style={styles.cancelBtn} onPress={onCloseForm}>
                  <Text style={styles.cancelText}>取消</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={submitting}>
                  <Text style={styles.submitText}>{submitting ? '儲存中...' : '儲存'}</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: 16 },
  goal: { gap: 6 },
  goalHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  goalTitle: { color: '#E8EAED', fontSize: 13, fontWeight: '300', flex: 1 },
  goalAmount: { color: '#5B6169', fontSize: 11 },
  goalPct: { color: '#AAB2BA', fontSize: 11, width: 36, textAlign: 'right' },
  track: { height: 4, backgroundColor: '#1E1E1E', borderRadius: 2, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 2 },
  projection: { color: '#4A4F55', fontSize: 10, lineHeight: 14 },

  emptyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  emptyText: { color: '#5B6169', fontSize: 12 },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#111111',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderWidth: 1,
    borderColor: '#3A3A3A',
    maxHeight: '85%',
  },
  sheetTitle: {
    padding: 20,
    paddingBottom: 12,
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '300',
    letterSpacing: 1,
  },
  sheetDivider: { height: 1, backgroundColor: '#3A3A3A' },
  sheetBody: { padding: 16 },
  fieldLabel: { color: '#555', fontSize: 12, letterSpacing: 1, marginBottom: 8, marginTop: 4 },
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
  error: { color: '#FF4444', fontSize: 12, marginBottom: 8, marginLeft: 4 },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 24,
    gap: 12,
  },
  deleteBtn: {
    borderWidth: 1, borderColor: '#3A1010', borderRadius: 8,
    paddingHorizontal: 16, paddingVertical: 10, marginRight: 'auto',
  },
  deleteText: { color: '#FF6666', fontSize: 14 },
  cancelBtn: {
    borderWidth: 1, borderColor: '#3A3A3A', borderRadius: 8,
    paddingHorizontal: 20, paddingVertical: 10,
  },
  cancelText: { color: '#888', fontSize: 14 },
  submitBtn: { backgroundColor: '#FFFFFF', borderRadius: 8, paddingHorizontal: 20, paddingVertical: 10 },
  submitText: { color: '#0F0F0F', fontSize: 14, fontWeight: '500' },
});
