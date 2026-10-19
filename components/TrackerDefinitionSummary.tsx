import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { TrackerModuleDefinition } from '../types/trackerModule';

/** Plain-language overview of a module so creating one needs no field-by-field review. */
export default function TrackerDefinitionSummary({ value }: { value: TrackerModuleDefinition }) {
  const label = (key: string) => value.fields.find(field => field.key === key)?.label ?? key;
  const insights = value.insights.map(insight => {
    if (insight.type === 'cycle') {
      const extras = insight.offsets.map(offset => offset.label);
      const remind = insight.remindDaysBefore === undefined ? ''
        : `，${insight.remindDaysBefore === 0 ? '當天' : `前 ${insight.remindDaysBefore} 天`}提醒`;
      return insight.label + (extras.length ? `（含${extras.join('、')}）` : '') + remind;
    }
    if (insight.type === 'duration') return `${insight.label}（${label(insight.start)}到${label(insight.end)}）`;
    return insight.label;
  });
  const required = value.fields.filter(field => field.required).map(field => field.label);
  return <View>
    <Text style={styles.name}>{value.name}</Text>
    {!!value.description && <Text style={styles.description}>{value.description}</Text>}
    <View style={styles.block}>
      <Text style={styles.heading}>每次記錄</Text>
      <Text style={styles.body}>{value.fields.map(field => field.label).join('、')}</Text>
      <Text style={styles.note}>{required.length ? `只有${required.join('、')}必填，其他可以留空。` : '全部都可以留空。'}</Text>
    </View>
    {insights.length > 0 && <View style={styles.block}>
      <Text style={styles.heading}>自動推算</Text>
      {insights.map(line => <Text key={line} style={styles.body}>• {line}</Text>)}
      <Text style={styles.note}>累積幾筆紀錄後就會出現，在手機上計算，僅供參考。</Text>
    </View>}
  </View>;
}

const styles = StyleSheet.create({
  name: { color: '#FFF', fontSize: 20, fontWeight: '300', marginTop: 4 },
  description: { color: '#888', fontSize: 13, lineHeight: 19, marginTop: 6 },
  block: { backgroundColor: '#101010', borderWidth: 1, borderColor: '#242424', borderRadius: 10, padding: 14, marginTop: 14 },
  heading: { color: '#55DDAA', fontSize: 11, letterSpacing: 1, marginBottom: 8 },
  body: { color: '#DDD', fontSize: 14, lineHeight: 22 },
  note: { color: '#666', fontSize: 12, lineHeight: 18, marginTop: 8 },
});
