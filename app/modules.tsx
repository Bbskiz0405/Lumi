import React, { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Keyboard,
  KeyboardAvoidingView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import TechIcon from '../components/ui/TechIcon';
import TrackerDefinitionEditor from '../components/TrackerDefinitionEditor';
import { designTrackerModule, getApiConfig } from '../services/geminiService';
import { createTrackerModule, getTrackerModules } from '../services/trackerModuleService';
import { TrackerModule, TrackerModuleDefinition } from '../types/trackerModule';

export default function ModulesScreen() {
  const router = useRouter();
  const { draft } = useLocalSearchParams<{ draft?: string }>();
  const [modules, setModules] = useState<TrackerModule[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const busy = useRef(false);
  const loadVersion = useRef(0);
  const [request, setRequest] = useState('');
  const [designing, setDesigning] = useState(false);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState<TrackerModuleDefinition | null>(null);

  const load = useCallback(async () => {
    const version = ++loadVersion.current;
    setLoadError(null);
    try {
      const next = await getTrackerModules();
      if (version === loadVersion.current) setModules(next);
    }
    catch (error) { if (version === loadVersion.current) setLoadError(error instanceof Error ? error.message : '讀取失敗'); }
    finally { if (version === loadVersion.current) setLoading(false); }
  }, []);

  useFocusEffect(useCallback(() => { void load(); return () => { loadVersion.current += 1; }; }, [load]));

  async function handleDesign() {
    const trimmed = request.trim();
    if (!trimmed || busy.current) return;
    busy.current = true;
    setDesigning(true);
    Keyboard.dismiss();
    try {
      if (!(await getApiConfig())) {
        Alert.alert('尚未設定 AI', '請先到 AI 設定填入 API Key。', [
          { text: '取消', style: 'cancel' },
          { text: '前往設定', onPress: () => router.push('/settings') },
        ]);
        return;
      }
      setPreview(await designTrackerModule(trimmed));
    }
    catch (error) { Alert.alert('無法設計模組', error instanceof Error ? error.message : '請稍後再試'); }
    finally { busy.current = false; setDesigning(false); }
  }

  async function handleCreate() {
    if (!preview || busy.current) return;
    busy.current = true;
    setSaving(true);
    try {
      const created = await createTrackerModule(preview);
      setPreview(null);
      setRequest('');
      await load();
      router.push({ pathname: '/module/[id]', params: { id: created.id, ...(draft ? { draft } : {}) } });
    } catch (error) {
      Alert.alert('建立失敗', error instanceof Error ? error.message : '請稍後再試');
    } finally { busy.current = false; setSaving(false); }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.eyebrow}>AI MODULE LAB</Text>
        <Text style={styles.title}>建立你的追蹤工具</Text>
        <Text style={styles.subtitle}>描述想追蹤的事，Lumi 會設計安全、可編輯資料的模組。</Text>
        <Text style={styles.subtitle}>設計時只會將這次需求送到你設定的 AI。建立前可以調整名稱、欄位與選項。</Text>

        <View style={styles.promptCard}>
          <TextInput
            style={styles.prompt}
            value={request}
            onChangeText={setRequest}
            placeholder="例如：幫我做體重追蹤，每天記錄公斤數"
            placeholderTextColor="#555"
            multiline
            maxLength={300}
          />
          <TouchableOpacity style={[styles.primary, (!request.trim() || designing) && styles.disabled]} onPress={handleDesign} disabled={!request.trim() || designing}>
            {designing ? <ActivityIndicator color="#0F0F0F" /> : <><TechIcon name="command" size={17} color="#0F0F0F" /><Text style={styles.primaryText}>讓 AI 設計</Text></>}
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>{draft ? '選擇要儲存這句話的模組' : '我的模組'}</Text>
        {loadError && <TouchableOpacity style={styles.secondary} onPress={load}><Text style={styles.secondaryText}>{loadError} · 點擊重試</Text></TouchableOpacity>}
        {loading ? <ActivityIndicator color="#55DDAA" /> : modules.length === 0 ? (
          <Text style={styles.empty}>還沒有自訂模組</Text>
        ) : modules.map(module => (
          <TouchableOpacity key={module.id} style={styles.moduleCard} onPress={() => router.push({ pathname: '/module/[id]', params: { id: module.id, ...(draft ? { draft } : {}) } })}>
            <View style={styles.moduleIcon}><TechIcon name="grid" size={19} color="#55DDAA" /></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.moduleName}>{module.name}</Text>
              <Text style={styles.moduleDescription} numberOfLines={2}>{module.description || `${module.fields.length} 個欄位`}</Text>
            </View>
            <TechIcon name="chevron-right" size={17} color="#555" />
          </TouchableOpacity>
        ))}
      </ScrollView>

      <Modal visible={preview !== null} transparent animationType="fade" onRequestClose={() => { if (!busy.current) setPreview(null); }}>
        <KeyboardAvoidingView behavior="padding" style={styles.overlay}>
          <View style={styles.sheet}>
            <View style={styles.handle} />
            <Text style={styles.sheetTitle}>確認模組設計</Text>
            <ScrollView keyboardShouldPersistTaps="handled">
              {preview && <TrackerDefinitionEditor value={preview} onChange={setPreview} disabled={saving} />}
            </ScrollView>
            <View style={styles.actions}>
              <TouchableOpacity style={styles.secondary} disabled={saving} onPress={() => setPreview(null)}><Text style={styles.secondaryText}>取消</Text></TouchableOpacity>
              <TouchableOpacity style={styles.primarySmall} onPress={handleCreate} disabled={saving}><Text style={styles.primaryText}>{saving ? '建立中…' : '確認建立'}</Text></TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0F0F0F' },
  content: { padding: 20, paddingBottom: 48 },
  eyebrow: { color: '#55DDAA', fontSize: 10, letterSpacing: 2, marginTop: 10 },
  title: { color: '#FFF', fontSize: 27, fontWeight: '300', marginTop: 8 },
  subtitle: { color: '#777', fontSize: 13, lineHeight: 20, marginTop: 8 },
  promptCard: { backgroundColor: '#111', borderColor: '#242424', borderWidth: 1, borderRadius: 12, padding: 14, marginTop: 24 },
  prompt: { minHeight: 92, color: '#EEE', fontSize: 15, lineHeight: 22, textAlignVertical: 'top' },
  primary: { height: 44, borderRadius: 8, backgroundColor: '#55DDAA', flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center' },
  disabled: { opacity: 0.4 }, primaryText: { color: '#0F0F0F', fontWeight: '600' },
  sectionTitle: { color: '#AAA', fontSize: 12, letterSpacing: 1, marginTop: 30, marginBottom: 12 },
  empty: { color: '#555', textAlign: 'center', paddingVertical: 36 },
  moduleCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 15, backgroundColor: '#111', borderWidth: 1, borderColor: '#1F1F1F', borderRadius: 10, marginBottom: 10 },
  moduleIcon: { width: 38, height: 38, borderRadius: 8, backgroundColor: '#14221E', alignItems: 'center', justifyContent: 'center' },
  moduleName: { color: '#EEE', fontSize: 16 }, moduleDescription: { color: '#666', fontSize: 12, marginTop: 4 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,.68)', justifyContent: 'flex-end' },
  sheet: { maxHeight: '90%', backgroundColor: '#141414', borderTopWidth: 1, borderColor: '#292929', borderTopLeftRadius: 18, borderTopRightRadius: 18, padding: 22, paddingBottom: 34 },
  handle: { width: 38, height: 3, backgroundColor: '#444', borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  sheetTitle: { color: '#FFF', fontSize: 22, fontWeight: '300' }, sheetDescription: { color: '#777', marginTop: 7, lineHeight: 19 },
  fieldHeading: { color: '#55DDAA', fontSize: 11, marginTop: 22, marginBottom: 8 },
  fieldRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#202020' },
  fieldLabel: { color: '#DDD' }, fieldType: { color: '#666', fontSize: 12 },
  notice: { color: '#555', fontSize: 11, lineHeight: 17, marginTop: 16 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 20 },
  secondary: { flex: 1, height: 44, borderRadius: 8, borderWidth: 1, borderColor: '#333', alignItems: 'center', justifyContent: 'center' },
  secondaryText: { color: '#AAA' }, primarySmall: { flex: 1, height: 44, borderRadius: 8, backgroundColor: '#55DDAA', alignItems: 'center', justifyContent: 'center' },
});
