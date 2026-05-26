import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface Props {
  initialValue?: string;
  onConfirm: (value: number) => void;
  onCancel: () => void;
}

const BUTTONS = [
  ['7', '8', '9', '/'],
  ['4', '5', '6', 'x'],
  ['1', '2', '3', '-'],
  ['.', '0', 'C', '+'],
];

export default function Calculator({ initialValue, onConfirm, onCancel }: Props) {
  const [display, setDisplay] = useState(initialValue || '');
  const [hasOperator, setHasOperator] = useState(false);

  function handlePress(key: string) {
    if (key === 'C') {
      setDisplay('');
      setHasOperator(false);
      return;
    }

    if (['+', '-', 'x', '/'].includes(key)) {
      if (display === '' || /[+\-x/]$/.test(display)) return;
      setDisplay(prev => prev + key);
      setHasOperator(true);
      return;
    }

    if (key === '.') {
      const parts = display.split(/[+\-x/]/);
      const lastPart = parts[parts.length - 1];
      if (lastPart.includes('.')) return;
    }

    setDisplay(prev => prev + key);
  }

  function calculate(): number {
    if (!display) return 0;
    try {
      const expr = display.replace(/x/g, '*');
      const result = Function(`"use strict"; return (${expr})`)();
      return typeof result === 'number' && isFinite(result) ? Math.round(result * 100) / 100 : 0;
    } catch {
      return 0;
    }
  }

  function handleConfirm() {
    const result = calculate();
    if (result > 0) onConfirm(result);
  }

  const result = hasOperator ? calculate() : null;

  return (
    <View style={styles.container}>
      {/* Display */}
      <View style={styles.displayArea}>
        <Text style={styles.displayText} numberOfLines={1}>{display || '0'}</Text>
        {result !== null && result > 0 && (
          <Text style={styles.resultText}>= {result}</Text>
        )}
      </View>

      {/* Buttons */}
      {BUTTONS.map((row, ri) => (
        <View key={ri} style={styles.row}>
          {row.map(key => {
            const isOp = ['+', '-', 'x', '/'].includes(key);
            const isClear = key === 'C';
            return (
              <TouchableOpacity
                key={key}
                style={[
                  styles.btn,
                  isOp && styles.opBtn,
                  isClear && styles.clearBtn,
                ]}
                onPress={() => handlePress(key)}
                activeOpacity={0.6}
              >
                <Text style={[
                  styles.btnText,
                  isOp && styles.opBtnText,
                  isClear && styles.clearBtnText,
                ]}>
                  {key === 'x' ? '×' : key === '/' ? '÷' : key}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      ))}

      {/* Action row */}
      <View style={styles.actionRow}>
        <TouchableOpacity style={styles.cancelAction} onPress={onCancel}>
          <Text style={styles.cancelActionText}>取消</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.backspaceAction]}
          onPress={() => setDisplay(prev => prev.slice(0, -1))}
        >
          <Text style={styles.backspaceText}>⌫</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.confirmAction} onPress={handleConfirm}>
          <Text style={styles.confirmActionText}>確認</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#111111',
    borderTopWidth: 1,
    borderTopColor: '#252525',
    paddingBottom: 8,
  },
  displayArea: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    alignItems: 'flex-end',
  },
  displayText: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '200',
  },
  resultText: {
    color: '#55DDAA',
    fontSize: 16,
    fontWeight: '300',
    marginTop: 2,
  },
  row: {
    flexDirection: 'row',
    paddingHorizontal: 8,
  },
  btn: {
    flex: 1,
    margin: 4,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#1A1A1A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  opBtn: {
    backgroundColor: '#252525',
  },
  clearBtn: {
    backgroundColor: '#2A1515',
  },
  btnText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '300',
  },
  opBtnText: {
    color: '#55DDAA',
  },
  clearBtnText: {
    color: '#FF6655',
  },
  actionRow: {
    flexDirection: 'row',
    paddingHorizontal: 8,
    paddingTop: 4,
  },
  cancelAction: {
    flex: 1,
    margin: 4,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#3A3A3A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelActionText: {
    color: '#666',
    fontSize: 15,
  },
  backspaceAction: {
    flex: 1,
    margin: 4,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#1A1A1A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backspaceText: {
    color: '#AAAAAA',
    fontSize: 20,
  },
  confirmAction: {
    flex: 2,
    margin: 4,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#55DDAA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmActionText: {
    color: '#0F0F0F',
    fontSize: 15,
    fontWeight: '500',
  },
});
