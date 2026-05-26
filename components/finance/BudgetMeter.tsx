import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Modal } from 'react-native';
import { ExpenseCategory } from '../../types/finance';

interface Props {
  category: ExpenseCategory;
  spent: number;
  limit: number;
  onUpdateLimit?: (category: ExpenseCategory, newLimit: number) => void;
}

const CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  food: '餐飲',
  interest: '興趣',
  transport: '交通',
  other: '其他',
};

export default function BudgetMeter({ category, spent, limit, onUpdateLimit }: Props) {
  const [editing, setEditing] = useState(false);
  const [inputVal, setInputVal] = useState('');

  const hasLimit = limit > 0;
  const ratio = hasLimit ? Math.min(spent / limit, 1) : 0;
  const isOver = hasLimit && spent > limit;
  const barColor = isOver ? '#FF4444' : ratio > 0.8 ? '#FF8844' : '#55DDAA';

  function openEdit() {
    setInputVal(limit > 0 ? String(limit) : '');
    setEditing(true);
  }

  function handleSave() {
    const n = parseFloat(inputVal);
    if (!isNaN(n) && n > 0 && onUpdateLimit) {
      onUpdateLimit(category, n);
    }
    setEditing(false);
  }

  return (
    <>
      <TouchableOpacity style={styles.container} onPress={openEdit} activeOpacity={0.7}>
        <View style={styles.header}>
          <Text style={styles.label}>{CATEGORY_LABELS[category]}</Text>
          <Text style={[styles.amounts, isOver && styles.overText]}>
            {hasLimit
              ? `${spent.toLocaleString()} / ${limit.toLocaleString()}`
              : `${spent.toLocaleString()}  ·  未設上限`}
          </Text>
        </View>
        {hasLimit && (
          <View style={styles.track}>
            <View style={[styles.bar, { width: `${ratio * 100}%` as any, backgroundColor: barColor }]} />
          </View>
        )}
      </TouchableOpacity>

      <Modal visible={editing} transparent animationType="fade" onRequestClose={() => setEditing(false)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setEditing(false)}>
          <View style={styles.dialog}>
            <Text style={styles.dialogTitle}>{CATEGORY_LABELS[category]} 預算上限</Text>
            <TextInput
              style={styles.dialogInput}
              value={inputVal}
              onChangeText={setInputVal}
              keyboardType="numeric"
              autoFocus
              selectTextOnFocus
              placeholder="輸入金額"
              placeholderTextColor="#444"
            />
            <View style={styles.dialogActions}>
              <TouchableOpacity onPress={() => setEditing(false)} style={styles.dialogCancel}>
                <Text style={styles.dialogCancelText}>取消</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleSave} style={styles.dialogSave}>
                <Text style={styles.dialogSaveText}>儲存</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 14,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  label: {
    color: '#888',
    fontSize: 12,
  },
  amounts: {
    color: '#555',
    fontSize: 11,
  },
  overText: {
    color: '#FF4444',
  },
  track: {
    height: 3,
    backgroundColor: '#252525',
    borderRadius: 2,
    overflow: 'hidden',
  },
  bar: {
    height: '100%',
    borderRadius: 2,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dialog: {
    backgroundColor: '#161616',
    borderRadius: 12,
    padding: 20,
    width: 260,
    borderWidth: 1,
    borderColor: '#3A3A3A',
  },
  dialogTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '300',
    marginBottom: 12,
  },
  dialogInput: {
    borderWidth: 1,
    borderColor: '#3A3A3A',
    borderRadius: 8,
    padding: 10,
    color: '#FFFFFF',
    fontSize: 20,
    backgroundColor: '#0F0F0F',
    marginBottom: 16,
    textAlign: 'center',
  },
  dialogActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  dialogCancel: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
  },
  dialogCancelText: {
    color: '#666',
    fontSize: 13,
  },
  dialogSave: {
    backgroundColor: '#FFFFFF',
    borderRadius: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  dialogSaveText: {
    color: '#0F0F0F',
    fontSize: 13,
    fontWeight: '500',
  },
});
