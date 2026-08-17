import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { formatPercent } from '../../../utils/money';

interface Props {
  /** 0–1。null 代表沒有收入，無法計算。 */
  ratio: number | null;
  size?: number;
}

/** 儲蓄率環圈。負儲蓄率（花超過賺）畫成滿圈紅色，比截成 0 更誠實。 */
export default function SavingsRateRing({ ratio, size = 72 }: Props) {
  const stroke = 6;
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;

  const isNegative = ratio !== null && ratio < 0;
  const clamped = ratio === null ? 0 : Math.max(0, Math.min(1, ratio));
  const filled = isNegative ? 1 : clamped;
  const color = isNegative ? '#FF6655' : clamped >= 0.2 ? '#55DDAA' : '#F5C242';
  const label = formatPercent(ratio, 0) ?? '—';

  return (
    <View style={[styles.wrap, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="#252525"
          strokeWidth={stroke}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${circumference * filled} ${circumference}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={styles.center}>
        <Text style={[styles.value, { color }]}>{label}</Text>
        <Text style={styles.caption}>儲蓄率</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
  center: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  value: { fontSize: 15, fontWeight: '400' },
  caption: { color: '#4A4F55', fontSize: 9, letterSpacing: 0.5, marginTop: 1 },
});
