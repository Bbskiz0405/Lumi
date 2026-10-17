import React from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { TrackerField, TrackerInsight, TrackerInsightType, TrackerModuleDefinition, TrackerFieldType } from '../types/trackerModule';
import { FIELD_TYPE_LABELS } from '../services/trackerModuleService';
import { describeTrackerInsight, TRACKER_REMINDER_HOUR } from '../services/trackerInsightService';

const INSIGHT_LABELS: Record<TrackerInsightType, string> = { cycle: '週期推算', duration: '持續天數', trend: '數字趨勢' };

// Drop insights whose referenced fields were removed or changed type in this edit.
function pruneInsights(fields: TrackerField[], insights: TrackerInsight[]): TrackerInsight[] {
  const has = (key: string, type: TrackerFieldType) => fields.some(field => field.key === key && field.type === type);
  return insights.filter(insight => insight.type === 'cycle' ? has(insight.field, 'date')
    : insight.type === 'duration' ? has(insight.start, 'date') && has(insight.end, 'date')
      : has(insight.field, 'number'));
}

function newInsight(type: TrackerInsightType, fields: TrackerField[]): TrackerInsight | null {
  const dates = fields.filter(field => field.type === 'date');
  const numbers = fields.filter(field => field.type === 'number');
  if (type === 'cycle' && dates.length) return { type, label: '下次預測', field: dates[0].key, offsets: [] };
  if (type === 'duration' && dates.length >= 2) return { type, label: '持續天數', start: dates[0].key, end: dates[1].key };
  if (type === 'trend' && numbers.length) return { type, label: (numbers[0].label + '趨勢').slice(0, 20), field: numbers[0].key, window: 10 };
  return null;
}

const REMINDER_OPTIONS: [number | undefined, string][] = [[undefined, '不提醒'], [0, '當天'], [1, '前 1 天'], [2, '前 2 天'], [3, '前 3 天']];

const relative = (days: number) => days < 0 ? `前 ${-days} 天` : days > 0 ? `後 ${days} 天` : '當天';

interface Props {
  value: TrackerModuleDefinition;
  onChange: (value: TrackerModuleDefinition) => void;
  existing?: boolean;
  disabled?: boolean;
}

export default function TrackerDefinitionEditor({ value, onChange, existing = false, disabled = false }: Props) {
  function setFields(fields: TrackerField[]) {
    onChange({ ...value, fields, insights: pruneInsights(fields, value.insights) });
  }
  function fieldChange(index: number, patch: Partial<TrackerField>) {
    setFields(value.fields.map((field, i) => i === index ? { ...field, ...patch } : field));
  }
  function insightChange(index: number, next: TrackerInsight) {
    onChange({ ...value, insights: value.insights.map((insight, i) => i === index ? next : insight) });
  }
  function fieldChips(type: TrackerFieldType, selected: string, onSelect: (key: string) => void, prefix = '') {
    const eligible = value.fields.filter(field => field.type === type);
    if (eligible.length < 2) return null;
    return <View style={styles.row}>{eligible.map(field =>
      <TouchableOpacity key={field.key} disabled={disabled} style={[styles.chip, field.key === selected && styles.selected]} onPress={() => onSelect(field.key)}>
        <Text style={styles.text}>{prefix}{field.label}</Text>
      </TouchableOpacity>)}</View>;
  }
  function stepper(label: string, days: number, onStep: (next: number) => void) {
    return <View style={styles.stepper}>
      <Text style={styles.stepLabel}>{label}</Text>
      <TouchableOpacity accessibilityLabel={label + '減一天'} disabled={disabled || days <= -60} style={styles.step} onPress={() => onStep(days - 1)}><Text style={styles.text}>−</Text></TouchableOpacity>
      <Text style={styles.stepValue}>{relative(days)}</Text>
      <TouchableOpacity accessibilityLabel={label + '加一天'} disabled={disabled || days >= 60} style={styles.step} onPress={() => onStep(days + 1)}><Text style={styles.text}>＋</Text></TouchableOpacity>
    </View>;
  }
  return <View>
    <Text style={styles.label}>模組名稱</Text>
    <TextInput accessibilityLabel="模組名稱" editable={!disabled} style={styles.input} value={value.name} maxLength={20} onChangeText={name => onChange({ ...value, name })} />
    <Text style={styles.label}>用途說明</Text>
    <TextInput accessibilityLabel="用途說明" editable={!disabled} style={styles.input} value={value.description} maxLength={80} onChangeText={description => onChange({ ...value, description })} />
    {value.fields.map((field, index) => <View key={field.key} style={styles.field}>
      <Text style={styles.label}>欄位 {index + 1} · {FIELD_TYPE_LABELS[field.type]}</Text>
      <TextInput accessibilityLabel={'欄位 ' + (index + 1) + ' 名稱'} editable={!disabled} style={styles.input} value={field.label} maxLength={20} onChangeText={label => fieldChange(index, { label })} />
      {!existing && <>
        <View style={styles.row}>
          {(Object.keys(FIELD_TYPE_LABELS) as TrackerFieldType[]).map(type =>
            <TouchableOpacity key={type} disabled={disabled} style={[styles.chip, type === field.type && styles.selected]} onPress={() => fieldChange(index, { type, unit: undefined, options: type === 'select' ? ['選項一', '選項二'] : undefined })}>
              <Text style={styles.text}>{FIELD_TYPE_LABELS[type]}</Text>
            </TouchableOpacity>)}
        </View>
        {field.type === 'number' && <TextInput accessibilityLabel={field.label + '單位'} editable={!disabled} style={styles.input} placeholder="單位（可留空）" placeholderTextColor="#777" value={field.unit ?? ''} maxLength={10} onChangeText={unit => fieldChange(index, { unit })} />}
        {field.type === 'select' && <TextInput accessibilityLabel={field.label + '選項'} editable={!disabled} style={styles.input} placeholder="選項用逗號分開，2–10 個" placeholderTextColor="#777" value={field.options?.join('，')} onChangeText={text => fieldChange(index, { options: text.split(/[,，]/) })} />}
        <View style={styles.row}>
          <TouchableOpacity disabled={disabled} style={styles.chip} onPress={() => fieldChange(index, { required: !field.required })}><Text style={styles.text}>{field.required ? '必填' : '選填'} · 點擊切換</Text></TouchableOpacity>
          {value.fields.length > 1 && <TouchableOpacity disabled={disabled} style={styles.chip} onPress={() => setFields(value.fields.filter((_, i) => i !== index))}><Text style={styles.text}>移除欄位</Text></TouchableOpacity>}
        </View>
      </>}
    </View>)}
    {!existing && value.fields.length < 8 && <TouchableOpacity disabled={disabled} style={styles.chip} onPress={() => {
      let n = 1;
      while (value.fields.some(field => field.key === 'field_' + n)) n += 1;
      setFields([...value.fields, { key: 'field_' + n, label: '新欄位', type: 'text', required: false }]);
    }}><Text style={styles.text}>＋ 新增欄位</Text></TouchableOpacity>}
    {existing && <Text style={styles.hint}>可修改名稱與欄位標題。欄位類型、單位與選項會保留，避免改變既有紀錄的意思。</Text>}

    <Text style={styles.section}>推算</Text>
    <Text style={styles.hint}>由手機依紀錄計算，不傳給 AI；結果僅供參考。推算可隨時新增、修改或移除，不影響紀錄。</Text>
    {value.insights.map((insight, index) => <View key={index} style={styles.field}>
      <Text style={styles.label}>{INSIGHT_LABELS[insight.type]}</Text>
      <TextInput accessibilityLabel={'推算 ' + (index + 1) + ' 名稱'} editable={!disabled} style={styles.input} value={insight.label} maxLength={20} onChangeText={label => insightChange(index, { ...insight, label })} />
      <Text style={styles.hint}>{describeTrackerInsight(insight, value.fields)}</Text>
      {insight.type === 'cycle' && fieldChips('date', insight.field, field => insightChange(index, { ...insight, field }))}
      {insight.type === 'duration' && <>
        {fieldChips('date', insight.start, start => insightChange(index, { ...insight, start }), '開始：')}
        {fieldChips('date', insight.end, end => insightChange(index, { ...insight, end }), '結束：')}
      </>}
      {insight.type === 'trend' && fieldChips('number', insight.field, field => insightChange(index, { ...insight, field }))}
      {insight.type === 'cycle' && insight.offsets.map((offset, offsetIndex) => {
        const setOffset = (patch: Partial<typeof offset>) => insightChange(index, { ...insight, offsets: insight.offsets.map((item, i) => i === offsetIndex ? { ...item, ...patch } : item) });
        return <View key={offsetIndex} style={styles.offset}>
          <TextInput accessibilityLabel={'區間 ' + (offsetIndex + 1) + ' 名稱'} editable={!disabled} style={styles.input} value={offset.label} maxLength={12} onChangeText={label => setOffset({ label })} />
          {stepper('從', offset.from, from => setOffset({ from, to: Math.max(from, offset.to) }))}
          {stepper('到', offset.to, to => setOffset({ to, from: Math.min(to, offset.from) }))}
          <TouchableOpacity disabled={disabled} style={styles.chip} onPress={() => insightChange(index, { ...insight, offsets: insight.offsets.filter((_, i) => i !== offsetIndex) })}><Text style={styles.text}>移除區間</Text></TouchableOpacity>
        </View>;
      })}
      {insight.type === 'cycle' && <>
        <Text style={styles.label}>提醒（當天 {TRACKER_REMINDER_HOUR}:00，鎖定畫面不顯示內容）</Text>
        <View style={styles.row}>{REMINDER_OPTIONS.map(([days, text]) =>
          <TouchableOpacity key={text} disabled={disabled} style={[styles.chip, insight.remindDaysBefore === days && styles.selected]}
            accessibilityState={{ selected: insight.remindDaysBefore === days }}
            onPress={() => {
              const { remindDaysBefore: _, ...rest } = insight;
              insightChange(index, days === undefined ? rest : { ...rest, remindDaysBefore: days });
            }}>
            <Text style={styles.text}>{text}</Text>
          </TouchableOpacity>)}</View>
      </>}
      <View style={styles.row}>
        {insight.type === 'cycle' && insight.offsets.length < 3 && <TouchableOpacity disabled={disabled} style={styles.chip} onPress={() => insightChange(index, { ...insight, offsets: [...insight.offsets, { label: '區間', from: -1, to: 1 }] })}><Text style={styles.text}>＋ 預測區間</Text></TouchableOpacity>}
        <TouchableOpacity disabled={disabled} style={styles.chip} onPress={() => onChange({ ...value, insights: value.insights.filter((_, i) => i !== index) })}><Text style={styles.text}>移除推算</Text></TouchableOpacity>
      </View>
    </View>)}
    {value.insights.length < 4 && <View style={styles.row}>
      {(Object.keys(INSIGHT_LABELS) as TrackerInsightType[]).map(type => {
        const next = newInsight(type, value.fields);
        return next && <TouchableOpacity key={type} disabled={disabled} style={styles.chip} onPress={() => onChange({ ...value, insights: [...value.insights, next] })}>
          <Text style={styles.text}>＋ {INSIGHT_LABELS[type]}</Text>
        </TouchableOpacity>;
      })}
    </View>}
  </View>;
}

const styles = StyleSheet.create({
  label: { color: '#AAA', fontSize: 12, marginBottom: 6, marginTop: 10 },
  input: { minHeight: 44, color: '#FFF', borderWidth: 1, borderColor: '#303030', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 8 },
  field: { borderTopWidth: 1, borderTopColor: '#292929', marginTop: 12, paddingTop: 4 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  chip: { minHeight: 44, justifyContent: 'center', borderWidth: 1, borderColor: '#333', borderRadius: 8, paddingHorizontal: 12 },
  selected: { borderColor: '#55DDAA', backgroundColor: '#14221E' },
  text: { color: '#DDD', fontSize: 12 }, hint: { color: '#999', fontSize: 12, lineHeight: 19, marginTop: 16 },
  section: { color: '#AAA', fontSize: 12, letterSpacing: 1, marginTop: 28 },
  offset: { borderLeftWidth: 1, borderLeftColor: '#303030', paddingLeft: 12, marginVertical: 8 },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  stepLabel: { color: '#888', fontSize: 12, width: 20 },
  step: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#333', borderRadius: 8 },
  stepValue: { color: '#DDD', fontSize: 13, minWidth: 72, textAlign: 'center' },
});
