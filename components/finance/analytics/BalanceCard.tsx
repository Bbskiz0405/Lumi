import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Modal, TextInput,
} from 'react-native';
import TechIcon from '../../ui/TechIcon';
import { CurrentBalance } from '../../../services/financeAnalyticsService';
import { formatAmount } from '../../../utils/money';

interface Props {
  balance: CurrentBalance;
  onReconcile: (actualBalance: number) => Promise<number>;
}

function formatWhen(iso: string): string {
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return '';
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
}

/**
 * 目前存款。沒對過帳時這個數字只是流水淨額，會明講，
 * 免得使用者把「裝 App 之後的收支差」當成銀行餘額。
 */
export default function BalanceCard({ balance, onReconcile }: Props) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<number | null>(null);

  function openSheet() {
    setInput(String(Math.round(balance.balance)));
    setError('');
    setResult(null);
    setOpen(true);
  }

  async function handleSubmit() {
    const actual = parseFloat(input);
    if (!Number.isFinite(actual)) {
      setError('請輸入有效金額');
      return;
    }
    setSubmitting(true);
    try {
      const diff = await onReconcile(actual);
      setResult(diff);
    } catch {
      setError('對帳失敗，請稍後再試');
      return;
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <View style={styles.left}>
          <Text style={styles.label}>目前存款</Text>
          <Text style={[styles.value, balance.balance < 0 && { color: '#FF4444' }]}>
            {formatAmount(balance.balance)}
          </Text>
          <Text style={styles.note}>
            {balance.hasReconciled && balance.lastReconciledAt
              ? `上次對帳 ${formatWhen(balance.lastReconciledAt)}`
              : '尚未對帳，目前只是收支淨額'}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.reconcileBtn}
          onPress={openSheet}
          accessibilityRole="button"
          accessibilityLabel="對帳，輸入實際存款"
        >
          <TechIcon name="rotate-ccw" size={15} color="#55DDAA" />
          <Text style={styles.reconcileText}>{balance.hasReconciled ? '對帳' : '設定'}</Text>
        </TouchableOpacity>
      </View>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>{balance.hasReconciled ? '對帳' : '設定目前存款'}</Text>
            <View style={styles.sheetDivider} />
            <View style={styles.sheetBody}>
              {result === null ? (
                <>
                  <Text style={styles.sheetHint}>
                    輸入你現在實際有多少錢。差額會記成一筆「對帳調整」，
                    不會算進收入或支出統計。
                  </Text>
                  <Text style={styles.fieldLabel}>實際存款</Text>
                  <TextInput
                    style={styles.input}
                    value={input}
                    onChangeText={setInput}
                    keyboardType="numeric"
                    autoFocus
                    selectTextOnFocus
                    placeholder="0"
                    placeholderTextColor="#444"
                  />
                  <Text style={styles.compare}>
                    帳面 {formatAmount(balance.balance)}
                  </Text>
                  {!!error && <Text style={styles.error}>{error}</Text>}

                  <View style={styles.actions}>
                    <TouchableOpacity style={styles.cancelBtn} onPress={() => setOpen(false)}>
                      <Text style={styles.cancelText}>取消</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={submitting}>
                      <Text style={styles.submitText}>{submitting ? '處理中...' : '確認'}</Text>
                    </TouchableOpacity>
                  </View>
                </>
              ) : (
                <>
                  <Text style={styles.resultText}>
                    {result === 0
                      ? '帳面與實際一致，沒有產生調整。'
                      : result > 0
                        ? `帳面少了 ${formatAmount(result)}，已補一筆調整。`
                        : `帳面多了 ${formatAmount(-result)}，已扣一筆調整。`}
                  </Text>
                  <View style={styles.actions}>
                    <TouchableOpacity style={styles.submitBtn} onPress={() => setOpen(false)}>
                      <Text style={styles.submitText}>完成</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: '#111111',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#252525',
    padding: 16,
  },
  row: { flexDirection: 'row', alignItems: 'center' },
  left: { flex: 1 },
  label: { color: '#4A4F55', fontSize: 11, letterSpacing: 1 },
  value: { color: '#FFFFFF', fontSize: 26, fontWeight: '200', marginTop: 4 },
  note: { color: '#3A3F45', fontSize: 10, marginTop: 4 },
  reconcileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#2B2F34',
    backgroundColor: '#121417',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  reconcileText: { color: '#55DDAA', fontSize: 12 },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#111111',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderWidth: 1,
    borderColor: '#3A3A3A',
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
  sheetHint: { color: '#5B6169', fontSize: 11, lineHeight: 17, marginBottom: 12 },
  fieldLabel: { color: '#555', fontSize: 12, letterSpacing: 1, marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderColor: '#3A3A3A',
    borderRadius: 8,
    padding: 12,
    color: '#FFFFFF',
    fontSize: 20,
    backgroundColor: '#161616',
    textAlign: 'center',
  },
  compare: { color: '#4A4F55', fontSize: 11, marginTop: 8, textAlign: 'center' },
  error: { color: '#FF4444', fontSize: 12, marginTop: 8, marginLeft: 4 },
  resultText: { color: '#E8EAED', fontSize: 13, lineHeight: 20 },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 24,
    gap: 12,
  },
  cancelBtn: {
    borderWidth: 1, borderColor: '#3A3A3A', borderRadius: 8,
    paddingHorizontal: 20, paddingVertical: 10,
  },
  cancelText: { color: '#888', fontSize: 14 },
  submitBtn: { backgroundColor: '#FFFFFF', borderRadius: 8, paddingHorizontal: 20, paddingVertical: 10 },
  submitText: { color: '#0F0F0F', fontSize: 14, fontWeight: '500' },
});
