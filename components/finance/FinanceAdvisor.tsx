import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  chatWithFinanceAdvisor,
  getQuickAnalysis,
  ChatMessage,
  getApiConfig,
  setApiConfig,
  ApiProvider,
} from '../../services/geminiService';

interface Props {
  month: string;
  onClose: () => void;
}

const PROVIDERS: { value: ApiProvider; label: string; hint: string }[] = [
  { value: 'openrouter', label: 'OpenRouter', hint: '支援多種模型' },
  { value: 'gemini', label: 'Gemini', hint: 'Google 免費額度' },
  { value: 'openai', label: 'OpenAI', hint: 'GPT 系列' },
];

const SUGGESTIONS = [
  '這個月花最多的是什麼？',
  '有什麼可以省的？',
  '消費有異常嗎？',
  '給我一個省錢建議',
];

export default function FinanceAdvisor({ month, onClose }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [needsKey, setNeedsKey] = useState(true);
  const [checkingKey, setCheckingKey] = useState(true);
  const [selectedProvider, setSelectedProvider] = useState<ApiProvider>('gemini');
  const [keyInput, setKeyInput] = useState('');
  const scrollRef = useRef<ScrollView>(null);

  React.useEffect(() => {
    getApiConfig().then(config => {
      setNeedsKey(!config);
      if (config) setSelectedProvider(config.provider);
      setCheckingKey(false);
    });
  }, []);

  async function handleSetKey() {
    const key = keyInput.trim();
    if (!key) return;
    await setApiConfig({ provider: selectedProvider, apiKey: key });
    setNeedsKey(false);
    setKeyInput('');
  }

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    const history = messages;
    const userMsg: ChatMessage = { role: 'user', text: trimmed };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const reply = await chatWithFinanceAdvisor(trimmed, history, month);
      setMessages(prev => [...prev, { role: 'model', text: reply }]);
    } catch (e: any) {
      setMessages(prev => [...prev, { role: 'model', text: `錯誤：${e.message}` }]);
    } finally {
      setLoading(false);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }

  function handleSend() {
    send(input);
  }

  async function handleQuickAnalysis() {
    if (loading) return;
    setLoading(true);
    setMessages(prev => [...prev, { role: 'user', text: '幫我分析這個月的消費' }]);

    try {
      const reply = await getQuickAnalysis(month);
      setMessages(prev => [...prev, { role: 'model', text: reply }]);
    } catch (e: any) {
      setMessages(prev => [...prev, { role: 'model', text: `錯誤：${e.message}` }]);
    } finally {
      setLoading(false);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }

  if (checkingKey) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>AI 財務顧問</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Text style={{ color: '#666', fontSize: 20, fontWeight: '200' }}>x</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.keySetup}>
          <ActivityIndicator color="#55DDAA" />
        </View>
      </SafeAreaView>
    );
  }

  if (needsKey) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 24}
        >
          <View style={styles.header}>
            <Text style={styles.headerTitle}>AI 供應商設定</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={{ color: '#666', fontSize: 20, fontWeight: '200' }}>x</Text>
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.keySetup} keyboardShouldPersistTaps="handled">
            <Text style={{ color: '#55DDAA', fontSize: 40, marginBottom: 10, fontWeight: '100' }}>✧</Text>
            <Text style={styles.keyTitle}>選擇 AI 模型來源</Text>

            <View style={styles.providerRow}>
              {PROVIDERS.map(p => (
                <TouchableOpacity
                  key={p.value}
                  style={[styles.providerBtn, selectedProvider === p.value && styles.providerBtnActive]}
                  onPress={() => setSelectedProvider(p.value)}
                >
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={[styles.providerLabel, selectedProvider === p.value && styles.providerLabelActive]}>
                      {p.label}
                    </Text>
                    {selectedProvider === p.value && <Text style={{ color: '#55DDAA', fontSize: 12 }}>●</Text>}
                  </View>
                  <Text style={styles.providerHint}>{p.hint}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              style={styles.keyInput}
              value={keyInput}
              onChangeText={setKeyInput}
              placeholder="在此貼上 API 金鑰 (API Key)..."
              placeholderTextColor="#444"
              autoCapitalize="none"
              autoCorrect={false}
              secureTextEntry
            />
            <TouchableOpacity style={styles.keyBtn} onPress={handleSetKey}>
              <Text style={styles.keyBtnText}>儲存並開始使用</Text>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Lumi AI 顧問</Text>
        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
          <Text style={{ color: '#666', fontSize: 20, fontWeight: '200' }}>x</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        ref={scrollRef}
        style={styles.chatArea}
        contentContainerStyle={styles.chatContent}
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
        keyboardShouldPersistTaps="handled"
      >
        {messages.length === 0 && (
          <View style={styles.welcome}>
            <Text style={{ color: '#55DDAA', fontSize: 48, marginBottom: 16, fontWeight: '100' }}>✧</Text>
            <Text style={styles.welcomeText}>
              我是你的財務分析助手{'\n'}問我關於本月消費的任何問題
            </Text>
            <TouchableOpacity style={styles.quickBtn} onPress={handleQuickAnalysis}>
              <Text style={{ color: '#55DDAA', fontSize: 14, marginRight: 8 }}>→</Text>
              <Text style={styles.quickBtnText}>快速分析本月消費</Text>
            </TouchableOpacity>
          </View>
        )}

        {messages.map((msg, i) => (
          <View
            key={i}
            style={[
              styles.msgBubble,
              msg.role === 'user' ? styles.userBubble : styles.modelBubble,
            ]}
          >
            <Text style={[styles.msgText, msg.role === 'user' && styles.userMsgText]}>
              {msg.text}
            </Text>
          </View>
        ))}

        {loading && (
          <View style={styles.loadingRow}>
            <ActivityIndicator size="small" color="#55DDAA" />
            <Text style={styles.loadingText}>分析中...</Text>
          </View>
        )}
      </ScrollView>

      {messages.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.strip}
          contentContainerStyle={styles.stripContent}
          keyboardShouldPersistTaps="handled"
        >
          {SUGGESTIONS.map(s => (
            <TouchableOpacity
              key={s}
              style={styles.stripChip}
              onPress={() => send(s)}
              disabled={loading}
            >
              <Text style={styles.stripChipText}>{s}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      <View style={styles.inputRow}>
        <TextInput
          style={styles.chatInput}
          value={input}
          onChangeText={setInput}
          placeholder="問個問題..."
          placeholderTextColor="#555"
          multiline
          maxLength={500}
        />
        <TouchableOpacity
          onPress={handleSend}
          style={[styles.sendBtn, (!input.trim() || loading) && { opacity: 0.3 }]}
          disabled={!input.trim() || loading}
        >
          <Text style={{ color: '#0F0F0F', fontSize: 14, fontWeight: 'bold' }}>發送</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F0F0F' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#252525',
  },
  headerTitle: { color: '#FFFFFF', fontSize: 15, fontWeight: '300', letterSpacing: 1 },
  closeBtn: { padding: 4, justifyContent: 'center', alignItems: 'center' },

  keySetup: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, paddingTop: 60 },
  keyTitle: { color: '#FFFFFF', fontSize: 16, fontWeight: '300', marginTop: 10, marginBottom: 24 },
  providerRow: { width: '100%', gap: 10, marginBottom: 24 },
  providerBtn: {
    borderWidth: 1, borderColor: '#333', borderRadius: 12,
    padding: 16, width: '100%', backgroundColor: '#111',
  },
  providerBtnActive: { borderColor: '#55DDAA', backgroundColor: '#55DDAA15' },
  providerLabel: { color: '#888', fontSize: 15, fontWeight: '500' },
  providerLabelActive: { color: '#55DDAA', fontWeight: 'bold' },
  providerHint: { color: '#444', fontSize: 11, marginTop: 4 },
  keyInput: {
    width: '100%', borderWidth: 1, borderColor: '#333', borderRadius: 10,
    padding: 14, color: '#FFFFFF', fontSize: 14, backgroundColor: '#161616', marginBottom: 20,
  },
  keyBtn: { backgroundColor: '#FFFFFF', borderRadius: 10, width: '100%', paddingVertical: 14, alignItems: 'center' },
  keyBtnText: { color: '#0F0F0F', fontSize: 14, fontWeight: '600' },

  chatArea: { flex: 1 },
  chatContent: { padding: 16, paddingBottom: 8 },
  welcome: { alignItems: 'center', paddingTop: 60, paddingBottom: 20 },
  welcomeText: { color: '#666', fontSize: 14, fontWeight: '300', textAlign: 'center', lineHeight: 24, marginTop: 4, marginBottom: 24 },
  quickBtn: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#55DDAA60', borderRadius: 24, paddingHorizontal: 20, paddingVertical: 10 },
  quickBtnText: { color: '#55DDAA', fontSize: 14, fontWeight: '500' },

  msgBubble: { maxWidth: '85%', borderRadius: 16, padding: 14, marginBottom: 12 },
  userBubble: { alignSelf: 'flex-end', backgroundColor: '#FFFFFF', borderBottomRightRadius: 4 },
  modelBubble: { alignSelf: 'flex-start', backgroundColor: '#161616', borderWidth: 1, borderColor: '#252525', borderBottomLeftRadius: 4 },
  msgText: { color: '#CCCCCC', fontSize: 14, fontWeight: '300', lineHeight: 24 },
  userMsgText: { color: '#0F0F0F' },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 12 },
  loadingText: { color: '#666', fontSize: 13 },

  strip: { maxHeight: 44, borderTopWidth: 1, borderTopColor: '#1A1A1A' },
  stripContent: { paddingHorizontal: 12, paddingVertical: 8, gap: 8, alignItems: 'center' },
  stripChip: {
    borderWidth: 1, borderColor: '#55DDAA40', borderRadius: 16,
    paddingVertical: 6, paddingHorizontal: 12, backgroundColor: '#161616',
  },
  stripChipText: { color: '#55DDAA', fontSize: 13, fontWeight: '300' },
  inputRow: {
    flexDirection: 'row', alignItems: 'flex-end',
    paddingHorizontal: 16, paddingVertical: 12,
    borderTopWidth: 1, borderTopColor: '#252525', gap: 10,
    backgroundColor: '#0F0F0F',
  },
  chatInput: {
    flex: 1, borderWidth: 1, borderColor: '#333', borderRadius: 20,
    paddingHorizontal: 16, paddingVertical: 10,
    color: '#FFFFFF', fontSize: 14, fontWeight: '300',
    maxHeight: 100, backgroundColor: '#161616',
  },
  sendBtn: { backgroundColor: '#55DDAA', borderRadius: 20, paddingHorizontal: 16, height: 40, alignItems: 'center', justifyContent: 'center' },
});
