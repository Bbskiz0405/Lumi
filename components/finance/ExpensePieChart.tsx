import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';

interface Props {
  data: Record<string, number>;
  size?: number;
}

const CATEGORY_CONFIG: Record<string, { label: string; color: string }> = {
  food: { label: '餐飲', color: '#FF6655' },
  interest: { label: '興趣', color: '#88AAFF' },
  transport: { label: '交通', color: '#FF9944' },
  other: { label: '其他', color: '#666666' },
};

function polarToCartesian(cx: number, cy: number, r: number, angle: number) {
  const rad = ((angle - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function arcPath(cx: number, cy: number, r: number, startAngle: number, endAngle: number): string {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArc = endAngle - startAngle > 180 ? 1 : 0;
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 0 ${end.x} ${end.y} L ${cx} ${cy} Z`;
}

export default function ExpensePieChart({ data, size = 120 }: Props) {
  const total = Object.values(data).reduce((sum, v) => sum + v, 0);
  if (total === 0) {
    return (
      <View style={styles.container}>
        <Svg width={size} height={size}>
          <Circle cx={size / 2} cy={size / 2} r={size / 2 - 2} fill="#1A1A1A" />
        </Svg>
        <Text style={styles.noData}>無支出</Text>
      </View>
    );
  }

  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 2;
  let currentAngle = 0;

  const slices = Object.entries(data)
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1]);

  return (
    <View style={styles.container}>
      <Svg width={size} height={size}>
        {slices.map(([category, amount]) => {
          const sliceAngle = (amount / total) * 360;
          if (sliceAngle < 0.5) return null;
          const startAngle = currentAngle;
          const endAngle = currentAngle + sliceAngle;
          currentAngle = endAngle;

          if (sliceAngle >= 359.5) {
            return (
              <Circle
                key={category}
                cx={cx}
                cy={cy}
                r={r}
                fill={CATEGORY_CONFIG[category]?.color ?? '#444'}
              />
            );
          }

          return (
            <Path
              key={category}
              d={arcPath(cx, cy, r, startAngle, endAngle)}
              fill={CATEGORY_CONFIG[category]?.color ?? '#444'}
            />
          );
        })}
        <Circle cx={cx} cy={cy} r={r * 0.55} fill="#0F0F0F" />
      </Svg>

      <View style={styles.legend}>
        {slices.map(([category, amount]) => {
          const config = CATEGORY_CONFIG[category];
          const pct = Math.round((amount / total) * 100);
          return (
            <View key={category} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: config?.color ?? '#444' }]} />
              <Text style={styles.legendLabel}>{config?.label ?? category}</Text>
              <Text style={styles.legendPct}>{pct}%</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111111',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1A1A1A',
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 20,
  },
  noData: {
    color: '#333',
    fontSize: 12,
    marginLeft: 16,
  },
  legend: {
    flex: 1,
    marginLeft: 20,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  legendLabel: {
    color: '#888',
    fontSize: 12,
    fontWeight: '300',
    flex: 1,
  },
  legendPct: {
    color: '#666',
    fontSize: 12,
    fontWeight: '400',
  },
});
