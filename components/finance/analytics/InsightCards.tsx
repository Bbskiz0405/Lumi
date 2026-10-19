import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ExpenseCategoryMeta } from '../../../types/finance';
import { findCategoryMeta } from '../../../services/financeService';
import { CategoryChange, FixedCost, MonthPulse, SmallSpend } from '../../../services/financeInsightService';
import { formatAmount } from '../../../utils/money';

const UP = '#FF6655';
const DOWN = '#55DDAA';

/** 「這個月還好嗎」：跟自己的平常比，再給月底估計與每天可花。 */
export function MonthPulseCard({ pulse }: { pulse: MonthPulse }) {
  if (pulse.day === 0) return <Text style={styles.muted}>這個月還沒開始。</Text>;
  const compare = pulse.vsTypical === null ? null
    : Math.abs(pulse.vsTypical) < 0.05 ? { text: '跟你平常差不多', color: '#AAB2BA' }
      : { text: `比你平常${pulse.isCurrent ? '這時候' : ''}${pulse.vsTypical > 0 ? '多' : '少'} ${Math.round(Math.abs(pulse.vsTypical) * 100)}%`, color: pulse.vsTypical > 0 ? UP : DOWN };
  const target = pulse.allowanceBasis === 'budget' ? '預算' : '平常一個月';
  return <View>
    <Text style={styles.label}>{pulse.isCurrent ? `${Number(pulse.month.slice(5))}月到今天已花` : `${Number(pulse.month.slice(5))}月共花`}</Text>
    <Text style={styles.big}>{formatAmount(pulse.spent)}</Text>
    {compare
      ? <Text style={[styles.line, { color: compare.color }]}>{compare.text}{pulse.typicalSoFar !== null ? `（平常約 ${formatAmount(pulse.typicalSoFar)}）` : ''}</Text>
      : <Text style={styles.muted}>完整記錄滿一個月後，就能和你的平常比較。</Text>}
    {pulse.isCurrent && pulse.projected !== null && <Text style={styles.line}>
      {pulse.projectedBasis === 'history' ? '照你平常的節奏，' : '照目前速度粗估，'}月底約 <Text style={styles.strong}>{formatAmount(pulse.projected)}</Text>
    </Text>}
    {pulse.dailyAllowance !== null && <View style={styles.allowance}>
      {pulse.dailyAllowance > 0
        ? <Text style={styles.line}>還有 {pulse.daysLeft} 天，每天花 <Text style={styles.strong}>{formatAmount(pulse.dailyAllowance)}</Text> 以內，就不會超過{target}</Text>
        : <Text style={[styles.line, { color: UP }]}>已經超過{target}的花費了</Text>}
      <Text style={styles.muted}>{pulse.allowanceBasis === 'budget' ? '依本月預算總額計算' : `依你近 ${pulse.historyMonths} 個月的平均月花費計算`}</Text>
    </View>}
  </View>;
}

/** 「哪裡不一樣」：與平常同一時間點相比，差最多的分類與主因。 */
export function ChangeList({ changes, historyMonths, categories }: { changes: CategoryChange[]; historyMonths: number; categories: ExpenseCategoryMeta[] }) {
  if (historyMonths === 0) return <Text style={styles.muted}>需要至少一個完整月份的紀錄才能比較。</Text>;
  if (!changes.length) return <Text style={styles.muted}>各分類都跟平常差不多。</Text>;
  return <View>{changes.map(change => {
    const meta = findCategoryMeta(categories, change.category);
    const up = change.diff > 0;
    const pct = change.ratio === null ? '' : `（${up ? '↑' : '↓'}${Math.round(Math.abs(change.ratio) * 100)}%）`;
    return <View key={change.category} style={styles.row}>
      <View style={[styles.dot, { backgroundColor: meta.color }]} />
      <View style={styles.rowBody}>
        <View style={styles.rowTop}>
          <Text style={styles.rowTitle}>{meta.label}</Text>
          <Text style={[styles.rowValue, { color: up ? UP : DOWN }]}>{up ? '+' : '−'}{formatAmount(Math.abs(change.diff))}{pct}</Text>
        </View>
        <Text style={styles.muted}>
          {up
            ? `平常這時候約 ${formatAmount(change.typical)}${change.drivers.length ? '，主要是 ' + change.drivers.map(d => `${d.item}${d.count > 1 ? ` ×${d.count}` : ''} ${formatAmount(d.total)}`).join('、') : ''}`
            : `比平常省，平常這時候約 ${formatAmount(change.typical)}`}
        </Text>
      </View>
    </View>;
  })}</View>;
}

/** 「小錢累積」：最近 30 天反覆出現的小額消費與一年的量。 */
export function SmallSpendList({ items, windowDays }: { items: SmallSpend[]; windowDays: number }) {
  if (!items.length) return <Text style={styles.muted}>最近 {windowDays} 天沒有反覆出現的小額消費。</Text>;
  return <View>{items.map(item => <View key={item.item} style={styles.row}>
    <View style={styles.rowBody}>
      <View style={styles.rowTop}>
        <Text style={styles.rowTitle}>{item.item}</Text>
        <Text style={styles.rowValue}>{item.count} 次 · {formatAmount(item.total)}</Text>
      </View>
      <Text style={styles.muted}>照這樣下去，一年大約 <Text style={styles.warn}>{formatAmount(item.yearly)}</Text></Text>
    </View>
  </View>)}</View>;
}

/** 「每月固定支出」：自動找出每月都會出現、金額穩定的支出。 */
export function FixedCostList({ items, total, historyMonths }: { items: FixedCost[]; total: number; historyMonths: number }) {
  if (historyMonths < 2) return <Text style={styles.muted}>需要至少兩個完整月份的紀錄，才能找出每月固定支出。</Text>;
  if (!items.length) return <Text style={styles.muted}>還沒找到每個月固定出現的支出。</Text>;
  return <View>
    {items.map(item => <View key={item.item} style={styles.rowTop}>
      <Text style={styles.rowTitle}>{item.item}</Text>
      <View style={styles.fixedRight}>
        <Text style={[styles.tag, item.paidThisMonth ? styles.tagDone : styles.tagTodo]}>{item.paidThisMonth ? '本月已記' : '本月未記'}</Text>
        <Text style={styles.rowValue}>{formatAmount(item.monthly)}</Text>
      </View>
    </View>)}
    <View style={styles.divider} />
    <View style={styles.rowTop}>
      <Text style={styles.label}>每月固定約</Text>
      <Text style={styles.strong}>{formatAmount(total)}</Text>
    </View>
  </View>;
}

const styles = StyleSheet.create({
  label: { color: '#6D737A', fontSize: 12 },
  big: { color: '#FFFFFF', fontSize: 30, fontWeight: '300', marginTop: 4, marginBottom: 6 },
  line: { color: '#C9CED3', fontSize: 13, lineHeight: 21, marginTop: 2 },
  strong: { color: '#FFFFFF', fontSize: 14, fontWeight: '500' },
  muted: { color: '#6D737A', fontSize: 12, lineHeight: 18, marginTop: 2 },
  warn: { color: '#F5C242' },
  allowance: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#1F1F1F' },
  row: { flexDirection: 'row', gap: 10, paddingVertical: 8 },
  dot: { width: 8, height: 8, borderRadius: 4, marginTop: 6 },
  rowBody: { flex: 1 },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10, paddingVertical: 4 },
  rowTitle: { color: '#E6E8EA', fontSize: 14, flexShrink: 1 },
  rowValue: { color: '#C9CED3', fontSize: 13 },
  fixedRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  tag: { fontSize: 10, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, overflow: 'hidden' },
  tagDone: { color: '#55DDAA', backgroundColor: '#14221E' },
  tagTodo: { color: '#8C949C', backgroundColor: '#1A1D20' },
  divider: { height: 1, backgroundColor: '#1F1F1F', marginVertical: 8 },
});
