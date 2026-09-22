import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import TechIcon from '../../components/ui/TechIcon';
import TrackerDefinitionEditor from '../../components/TrackerDefinitionEditor';
import { draftTrackerRecord } from '../../services/geminiService';
import {
  createTrackerRecord,
  deleteTrackerModule,
  deleteTrackerRecord,
  getTrackerModule,
  getTrackerRecords,
  updateTrackerRecord,
  updateTrackerModule,
} from '../../services/trackerModuleService';
import { TrackerModule, TrackerModuleDefinition, TrackerRecord } from '../../types/trackerModule';

function today(): string {
  const date = new Date();
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export default function TrackerModuleScreen() {
  const { id, draft } = useLocalSearchParams<{ id: string; draft?: string }>();
  const router = useRouter();
  const [module, setModule] = useState<TrackerModule | null>(null);
  const [records, setRecords] = useState<TrackerRecord[]>([]);
  const [formVisible, setFormVisible] = useState(false);
  const [values, setValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [editing, setEditing] = useState<TrackerRecord | null>(null);
  const [definition, setDefinition] = useState<TrackerModuleDefinition | null>(null);
  const [draftText, setDraftText] = useState('');
  const [drafting, setDrafting] = useState(false);
  const busy = useRef(false);
  const loadVersion = useRef(0);
  const consumedDraft = useRef<string | null>(null);

  const load = useCallback(async () => {
    const version = ++loadVersion.current;
    setLoadError(null);
    try {
      const nextModule = id ? await getTrackerModule(id) : null;
      const nextRecords = nextModule ? await getTrackerRecords(nextModule.id) : [];
      if (version !== loadVersion.current) return;
      setModule(nextModule);
      setRecords(nextRecords);
      if (nextModule && draft && consumedDraft.current !== draft) {
        consumedDraft.current = draft;
        setDraftText(draft);
        setEditing(null);
        setValues(Object.fromEntries(nextModule.fields.map(field => [field.key, field.type === 'date' ? today() : ''])));
        setFormVisible(true);
      }
    } catch (error) {
      if (version === loadVersion.current) setLoadError(error instanceof Error ? error.message : '讀取失敗');
    } finally {
      if (version === loadVersion.current) setLoading(false);
    }
  }, [id, draft]);
  useFocusEffect(useCallback(() => { void load(); return () => { loadVersion.current += 1; }; }, [load]));

  const numberStats = useMemo(() => {
    if (!module) return [];
    return module.fields.filter(field => field.type === 'number').map(field => {
      const numbers = records.map(record => record.data[field.key]).filter((value): value is number => typeof value === 'number');
      return { field, latest: numbers[0], average: numbers.length ? numbers.reduce((a, b) => a + b, 0) / numbers.length : undefined };
    });
  }, [module, records]);

  function openForm(record?: TrackerRecord) {
    if (!module || busy.current) return;
    const initial: Record<string, string> = {};
    for (const field of module.fields) initial[field.key] = record ? String(record.data[field.key] ?? '') : field.type === 'date' ? today() : '';
    setEditing(record ?? null);
    setDraftText('');
    setValues(initial);
    setFormVisible(true);
  }

  async function saveRecord() {
    if (!module || busy.current) return;
    busy.current = true;
    setSaving(true);
    try {
      if (editing) await updateTrackerRecord(module.id, editing.id, values);
      else await createTrackerRecord(module, values);
      setFormVisible(false);
      await load();
    } catch (error) { Alert.alert('無法儲存', error instanceof Error ? error.message : '請檢查欄位'); }
    finally { busy.current = false; setSaving(false); }
  }

  async function fillDraft() {
    if (!module || busy.current || !draftText.trim()) return;
    busy.current = true;
    setDrafting(true);
    try {
      const next = await draftTrackerRecord(module, draftText);
      setValues(Object.fromEntries(module.fields.map(field => [field.key, next[field.key] ?? ''])));
    } catch (error) {
      Alert.alert('無法整理紀錄', error instanceof Error ? error.message : '請重試或手動填寫', [
        { text: '繼續填寫', style: 'cancel' },
        { text: 'AI 設定', onPress: () => { setFormVisible(false); router.push('/settings'); } },
      ]);
    } finally { busy.current = false; setDrafting(false); }
  }

  async function saveDefinition() {
    if (!module || !definition || busy.current) return;
    busy.current = true;
    setSaving(true);
    try { await updateTrackerModule(module.id, definition); setDefinition(null); await load(); }
    catch (error) { Alert.alert('無法儲存設定', error instanceof Error ? error.message : '請重試'); }
    finally { busy.current = false; setSaving(false); }
  }

  async function removeRecord(record: TrackerRecord) {
    if (busy.current) return;
    busy.current = true;
    try { await deleteTrackerRecord(record.id); setFormVisible(false); await load(); }
    catch (error) { Alert.alert('刪除失敗', error instanceof Error ? error.message : '請重試'); }
    finally { busy.current = false; }
  }

  function confirmDeleteRecord(record: TrackerRecord) {
    Alert.alert('刪除紀錄', '確定刪除這筆紀錄？', [
      { text: '取消', style: 'cancel' },
      { text: '刪除', style: 'destructive', onPress: () => { void removeRecord(record); } },
    ]);
  }

  function confirmDeleteModule() {
    if (!module) return;
    Alert.alert('刪除模組', `刪除「${module.name}」及所有紀錄？`, [
      { text: '取消', style: 'cancel' },
      { text: '刪除', style: 'destructive', onPress: async () => {
        if (busy.current) return;
        busy.current = true;
        try { await deleteTrackerModule(module.id); router.back(); }
        catch (error) { Alert.alert('刪除失敗', error instanceof Error ? error.message : '請重試'); }
        finally { busy.current = false; }
      } },
    ]);
  }

  if (loading || !module || loadError) return <SafeAreaView style={styles.safe} edges={['bottom']}>
    <Text style={styles.empty}>{loading ? '載入中…' : loadError ?? '此模組已不存在'}</Text>
    {!loading && <TouchableOpacity style={styles.add} onPress={load}><Text style={styles.addText}>重新載入</Text></TouchableOpacity>}
    {!loading && <TouchableOpacity style={styles.cancel} onPress={() => router.back()}><Text style={styles.cancelText}>返回</Text></TouchableOpacity>}
  </SafeAreaView>;

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.heading}>
          <View style={{ flex: 1 }}><Text style={styles.title}>{module.name}</Text><Text style={styles.description}>{module.description}</Text></View>
          <TouchableOpacity style={styles.iconButton} onPress={() => setDefinition(module)} accessibilityLabel="模組設定"><TechIcon name="settings" size={19} color="#AAA" /></TouchableOpacity>
          <TouchableOpacity style={styles.iconButton} onPress={confirmDeleteModule} accessibilityLabel="刪除模組"><TechIcon name="trash" size={19} color="#CC7777" /></TouchableOpacity>
        </View>

        {numberStats.length > 0 && <View style={styles.stats}>
          {numberStats.map(({ field, latest, average }) => <View key={field.key} style={styles.stat}>
            <Text style={styles.statLabel}>{field.label}</Text>
            <Text style={styles.statValue}>{latest ?? '—'}{latest !== undefined && field.unit ? ` ${field.unit}` : ''}</Text>
            <Text style={styles.statMeta}>{average === undefined ? '尚無資料' : `平均 ${average.toFixed(1)}${field.unit ? ` ${field.unit}` : ''}`}</Text>
          </View>)}
        </View>}

        <TouchableOpacity style={styles.add} onPress={() => openForm()}><TechIcon name="plus" size={17} color="#0F0F0F" /><Text style={styles.addText}>新增紀錄</Text></TouchableOpacity>
        <Text style={styles.description}>點擊歷史紀錄即可修改。也可以在首頁輸入「{module.name} …」開始記錄。</Text>
        <Text style={styles.section}>歷史紀錄</Text>
        {records.length === 0 ? <Text style={styles.empty}>還沒有紀錄</Text> : records.map(record => (
          <TouchableOpacity key={record.id} style={styles.record} onPress={() => openForm(record)} onLongPress={() => confirmDeleteRecord(record)}>
            <Text style={styles.recordDate}>{new Date(record.recorded_at).toLocaleDateString('zh-TW')}</Text>
            {module.fields.map(field => record.data[field.key] !== undefined && (
              <View key={field.key} style={styles.valueRow}><Text style={styles.valueLabel}>{field.label}</Text><Text style={styles.value}>{String(record.data[field.key])}{field.unit ? ` ${field.unit}` : ''}</Text></View>
            ))}
          </TouchableOpacity>
        ))}
      </ScrollView>

      <Modal visible={formVisible} transparent animationType="fade" onRequestClose={() => { if (!busy.current) setFormVisible(false); }}>
        <KeyboardAvoidingView behavior="padding" style={styles.overlay}><View style={styles.sheet}>
          <View style={styles.handle} /><Text style={styles.sheetTitle}>{editing ? '編輯' : '新增'}{module.name}紀錄</Text>
          <ScrollView keyboardShouldPersistTaps="handled">
            {!editing && <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>用一句話記錄，或直接填寫下方欄位</Text>
              <TextInput style={styles.input} editable={!saving && !drafting} value={draftText} maxLength={2000} onChangeText={setDraftText} placeholder="例如：今天 70.5 公斤" placeholderTextColor="#777" />
              <Text style={styles.description}>AI 整理會傳送這句話與本模組欄位；帶入後請確認再儲存。</Text>
              <TouchableOpacity style={styles.add} disabled={saving || drafting || !draftText.trim()} onPress={fillDraft}>{drafting ? <ActivityIndicator color="#0F0F0F" /> : <Text style={styles.addText}>AI 整理並帶入</Text>}</TouchableOpacity>
            </View>}
            {module.fields.map(field => <View key={field.key} style={styles.inputGroup}>
              <Text style={styles.inputLabel}>{field.label}{field.required ? ' *' : ''}{field.unit ? `（${field.unit}）` : ''}</Text>
              {field.type === 'select' ? <View style={styles.options}>{field.options?.map(option => (
                <TouchableOpacity key={option} disabled={saving || drafting} style={[styles.option, values[field.key] === option && styles.optionActive]} onPress={() => setValues(current => ({ ...current, [field.key]: current[field.key] === option && !field.required ? '' : option }))}><Text style={[styles.optionText, values[field.key] === option && styles.optionTextActive]}>{option}</Text></TouchableOpacity>
              ))}</View> : <TextInput
                style={styles.input}
                value={values[field.key] ?? ''}
                editable={!saving && !drafting}
                maxLength={field.type === 'date' ? 10 : 2000}
                onChangeText={value => setValues(current => ({ ...current, [field.key]: value }))}
                placeholder={field.type === 'date' ? 'YYYY-MM-DD' : `輸入${field.label}`}
                placeholderTextColor="#4A4A4A"
                keyboardType={field.type === 'number' ? 'numbers-and-punctuation' : 'default'}
              />}
            </View>)}
          </ScrollView>
          {editing && <TouchableOpacity disabled={saving || drafting} style={styles.iconButton} onPress={() => confirmDeleteRecord(editing)}><Text style={styles.cancelText}>刪除這筆紀錄</Text></TouchableOpacity>}
          <View style={styles.actions}><TouchableOpacity style={styles.cancel} disabled={saving || drafting} onPress={() => setFormVisible(false)}><Text style={styles.cancelText}>取消</Text></TouchableOpacity><TouchableOpacity style={styles.save} onPress={saveRecord} disabled={saving || drafting}><Text style={styles.saveText}>{saving ? '儲存中…' : '儲存'}</Text></TouchableOpacity></View>
        </View></KeyboardAvoidingView>
      </Modal>
      <Modal visible={definition !== null} transparent animationType="fade" onRequestClose={() => { if (!busy.current) setDefinition(null); }}>
        <KeyboardAvoidingView behavior="padding" style={styles.overlay}><View style={styles.sheet}>
          <View style={styles.handle} /><Text style={styles.sheetTitle}>模組設定</Text>
          <ScrollView keyboardShouldPersistTaps="handled">{definition && <TrackerDefinitionEditor value={definition} onChange={setDefinition} existing disabled={saving} />}</ScrollView>
          <View style={styles.actions}>
            <TouchableOpacity style={styles.cancel} disabled={saving} onPress={() => setDefinition(null)}><Text style={styles.cancelText}>取消</Text></TouchableOpacity>
            <TouchableOpacity style={styles.save} disabled={saving} onPress={saveDefinition}><Text style={styles.saveText}>{saving ? '儲存中…' : '儲存設定'}</Text></TouchableOpacity>
          </View>
        </View></KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  iconButton: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  safe: { flex: 1, backgroundColor: '#0F0F0F' }, content: { padding: 20, paddingBottom: 50 },
  heading: { flexDirection: 'row', gap: 16, alignItems: 'flex-start', marginTop: 12 }, title: { color: '#FFF', fontSize: 27, fontWeight: '300' }, description: { color: '#777', marginTop: 7, lineHeight: 19 },
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 24 }, stat: { flexGrow: 1, minWidth: 145, backgroundColor: '#111', borderWidth: 1, borderColor: '#222', borderRadius: 10, padding: 14 }, statLabel: { color: '#777', fontSize: 11 }, statValue: { color: '#55DDAA', fontSize: 23, fontWeight: '300', marginTop: 7 }, statMeta: { color: '#555', fontSize: 11, marginTop: 4 },
  add: { height: 46, backgroundColor: '#55DDAA', borderRadius: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 24 }, addText: { color: '#0F0F0F', fontWeight: '600' }, section: { color: '#888', fontSize: 12, letterSpacing: 1, marginTop: 28, marginBottom: 12 }, empty: { color: '#555', textAlign: 'center', marginTop: 40 },
  record: { backgroundColor: '#111', borderWidth: 1, borderColor: '#202020', borderRadius: 10, padding: 14, marginBottom: 10 }, recordDate: { color: '#666', fontSize: 11, marginBottom: 8 }, valueRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 }, valueLabel: { color: '#777' }, value: { color: '#DDD' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,.68)', justifyContent: 'flex-end' }, sheet: { maxHeight: '88%', backgroundColor: '#141414', borderTopWidth: 1, borderColor: '#292929', borderTopLeftRadius: 18, borderTopRightRadius: 18, padding: 22, paddingBottom: 34 }, handle: { width: 38, height: 3, backgroundColor: '#444', borderRadius: 2, alignSelf: 'center', marginBottom: 20 }, sheetTitle: { color: '#FFF', fontSize: 21, fontWeight: '300', marginBottom: 16 }, inputGroup: { marginBottom: 15 }, inputLabel: { color: '#888', fontSize: 12, marginBottom: 7 }, input: { height: 46, backgroundColor: '#101010', borderWidth: 1, borderColor: '#292929', borderRadius: 8, paddingHorizontal: 13, color: '#EEE' }, options: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, option: { borderWidth: 1, borderColor: '#303030', borderRadius: 7, paddingHorizontal: 12, paddingVertical: 9 }, optionActive: { borderColor: '#55DDAA', backgroundColor: '#14221E' }, optionText: { color: '#777' }, optionTextActive: { color: '#55DDAA' },
  actions: { flexDirection: 'row', gap: 10, marginTop: 8 }, cancel: { flex: 1, height: 44, borderWidth: 1, borderColor: '#333', borderRadius: 8, alignItems: 'center', justifyContent: 'center' }, cancelText: { color: '#999' }, save: { flex: 1, height: 44, backgroundColor: '#55DDAA', borderRadius: 8, alignItems: 'center', justifyContent: 'center' }, saveText: { color: '#0F0F0F', fontWeight: '600' },
});
