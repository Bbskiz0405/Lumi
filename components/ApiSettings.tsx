import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  ApiProvider,
  getApiConfig,
  removeApiConfig,
  setApiConfig,
} from '../services/geminiService';

const PROVIDERS: { value: ApiProvider; label: string; hint: string }[] = [
  { value: 'gemini', label: 'Gemini', hint: 'Google 免費額度（推薦）' },
  { value: 'openrouter', label: 'OpenRouter', hint: '多模型，部分需付費' },
  { value: 'openai', label: 'OpenAI', hint: 'GPT 系列，需付費' },
];

export default function ApiSettings() {
  const [loading, setLoading] = useState(true);
  const [hasKey, setHasKey] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<ApiProvider>('gemini');
  const [keyInput, setKeyInput] = useState('');
  const [savedProvider, setSavedProvider] = useState<ApiProvider | null>(null);
  const [showKeyField, setShowKeyField] = useState(false);

  useEffect(() => {
    refresh();
  }, []);

  async function refresh() {
    setLoading(true);
    try {
      const config = await getApiConfig();
      if (config) {
        setHasKey(true);
        setSavedProvider(config.provider);
        setSelectedProvider(config.provider);
        setShowKeyField(false);
      } else {
        setHasKey(false);
        setSavedProvider(null);
        setShowKeyField(true);
      }
    } catch {
      setHasKey(false);
      setSavedProvider(null);
      setShowKeyField(true);
      Alert.alert('讀取失敗', '無法讀取 API 設定，請稍後再試。');
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    const key = keyInput.trim();
    if (!key) {
      Alert.alert('提示', '請輸入 API key');
      return;
    }
    try {
      await setApiConfig({ provider: selectedProvider, apiKey: key });
      setKeyInput('');
      await refresh();
    } catch {
      Alert.alert('儲存失敗', '無法安全儲存 API Key，請稍後再試。');
    }
  }

  function handleRemove() {
    Alert.alert(
      '移除 API 設定',
      '移除後 AI 功能將回到本地分類，需要重新輸入 key 才能再次使用。',
      [
        { text: '取消', style: 'cancel' },
        {
          text: '移除',
          style: 'destructive',
          onPress: async () => {
            try {
              await removeApiConfig();
              await refresh();
            } catch {
              Alert.alert('移除失敗', '請稍後再試。');
            }
          },
        },
      ]
    );
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#55DDAA" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 24}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        {hasKey && !showKeyField && (
          <View style={styles.statusCard}>
            <View style={styles.statusRow}>
              <Text style={styles.statusDot}>●</Text>
              <Text style={styles.statusText}>已設定 · {savedProvider}</Text>
            </View>
            <Text style={styles.statusHint}>
              首頁的智慧分類與財務顧問都會使用此 key。
            </Text>
            <View style={styles.actionRow}>
              <TouchableOpacity style={styles.secondaryBtn} onPress={() => setShowKeyField(true)}>
                <Text style={styles.secondaryBtnText}>更換 key</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.dangerBtn} onPress={handleRemove}>
                <Text style={styles.dangerBtnText}>移除</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {showKeyField && (
          <>
            <Text style={styles.label}>供應商</Text>
            <View style={styles.providerCol}>
              {PROVIDERS.map(p => {
                const active = selectedProvider === p.value;
                return (
                  <TouchableOpacity
                    key={p.value}
                    style={[styles.providerBtn, active && styles.providerBtnActive]}
                    onPress={() => setSelectedProvider(p.value)}
                  >
                    <View style={styles.providerHead}>
                      <Text style={[styles.providerLabel, active && styles.providerLabelActive]}>
                        {p.label}
                      </Text>
                      {active && <Text style={styles.providerCheck}>●</Text>}
                    </View>
                    <Text style={styles.providerHint}>{p.hint}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={styles.label}>API Key</Text>
            <TextInput
              style={styles.keyInput}
              value={keyInput}
              onChangeText={setKeyInput}
              placeholder="在此貼上 key..."
              placeholderTextColor="#444"
              autoCapitalize="none"
              autoCorrect={false}
              secureTextEntry
            />

            <View style={styles.actionRow}>
              {hasKey && (
                <TouchableOpacity style={styles.secondaryBtn} onPress={() => { setShowKeyField(false); setKeyInput(''); }}>
                  <Text style={styles.secondaryBtnText}>取消</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={styles.primaryBtn} onPress={handleSave}>
                <Text style={styles.primaryBtnText}>儲存</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.tipBox}>
              <Text style={styles.tipTitle}>取得 key</Text>
              <TouchableOpacity onPress={() => void Linking.openURL('https://aistudio.google.com/apikey')}>
                <Text style={styles.tipLink}>Gemini · 開啟 AI Studio</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => void Linking.openURL('https://openrouter.ai/keys')}>
                <Text style={styles.tipLink}>OpenRouter · 開啟 Keys</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => void Linking.openURL('https://platform.openai.com/api-keys')}>
                <Text style={styles.tipLink}>OpenAI · 開啟 API Keys</Text>
              </TouchableOpacity>
              <Text style={styles.tipText}>不同供應商可能產生費用，請查看各平台方案。</Text>
            </View>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  center: { padding: 40, alignItems: 'center' },
  container: { padding: 20, paddingBottom: 40 },

  label: { color: '#888', fontSize: 11, letterSpacing: 2, marginBottom: 10, marginTop: 4, textTransform: 'uppercase' },

  statusCard: {
    backgroundColor: '#161616',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#252525',
    padding: 16,
  },
  statusRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  statusDot: { color: '#55DDAA', fontSize: 11, marginRight: 8 },
  statusText: { color: '#FFFFFF', fontSize: 14, fontWeight: '300' },
  statusHint: { color: '#666', fontSize: 12, fontWeight: '300', lineHeight: 18, marginBottom: 12 },

  providerCol: { gap: 8, marginBottom: 18 },
  providerBtn: {
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 10,
    padding: 12,
    backgroundColor: '#161616',
  },
  providerBtnActive: { borderColor: '#55DDAA', backgroundColor: '#55DDAA15' },
  providerHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  providerLabel: { color: '#999', fontSize: 14, fontWeight: '500' },
  providerLabelActive: { color: '#55DDAA' },
  providerCheck: { color: '#55DDAA', fontSize: 11 },
  providerHint: { color: '#555', fontSize: 11, marginTop: 4 },

  keyInput: {
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 10,
    padding: 12,
    color: '#FFFFFF',
    fontSize: 13,
    backgroundColor: '#161616',
    marginBottom: 14,
  },

  actionRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  primaryBtn: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  primaryBtnText: { color: '#0F0F0F', fontSize: 14, fontWeight: '500' },
  secondaryBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#3A3A3A',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  secondaryBtnText: { color: '#888', fontSize: 14 },
  dangerBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#3A1010',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  dangerBtnText: { color: '#FF6666', fontSize: 14 },

  tipBox: {
    marginTop: 20,
    padding: 14,
    backgroundColor: '#161616',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#252525',
  },
  tipTitle: { color: '#888', fontSize: 11, letterSpacing: 1, marginBottom: 6, textTransform: 'uppercase' },
  tipText: { color: '#666', fontSize: 12, lineHeight: 22, fontWeight: '300' },
  tipLink: { color: '#88AAFF', fontSize: 13, lineHeight: 28, fontWeight: '300' },
});
