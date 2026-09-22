import React from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { TrackerModuleDefinition, TrackerFieldType } from '../types/trackerModule';
import { FIELD_TYPE_LABELS } from '../services/trackerModuleService';

interface Props {
  value: TrackerModuleDefinition;
  onChange: (value: TrackerModuleDefinition) => void;
  existing?: boolean;
  disabled?: boolean;
}

export default function TrackerDefinitionEditor({ value, onChange, existing = false, disabled = false }: Props) {
  function fieldChange(index: number, patch: Partial<TrackerModuleDefinition['fields'][number]>) {
    onChange({ ...value, fields: value.fields.map((field, i) => i === index ? { ...field, ...patch } : field) });
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
          {value.fields.length > 1 && <TouchableOpacity disabled={disabled} style={styles.chip} onPress={() => onChange({ ...value, fields: value.fields.filter((_, i) => i !== index) })}><Text style={styles.text}>移除欄位</Text></TouchableOpacity>}
        </View>
      </>}
    </View>)}
    {!existing && value.fields.length < 8 && <TouchableOpacity disabled={disabled} style={styles.chip} onPress={() => {
      let n = 1;
      while (value.fields.some(field => field.key === 'field_' + n)) n += 1;
      onChange({ ...value, fields: [...value.fields, { key: 'field_' + n, label: '新欄位', type: 'text', required: false }] });
    }}><Text style={styles.text}>＋ 新增欄位</Text></TouchableOpacity>}
    {existing && <Text style={styles.hint}>可修改名稱與欄位標題。欄位類型、單位與選項會保留，避免改變既有紀錄的意思。</Text>}
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
});
