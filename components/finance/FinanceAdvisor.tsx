import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import {
  chatWithFinanceAdvisor,
  getQuickAnalysis,
  ChatMessage,
  getApiConfig,
  setApiConfig,
  removeApiConfig,
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

export default function FinanceAdvisor({ month, onClose }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [needsKey, setNeedsKey] = useState(true);
  const [checkingKey, setCheckingKey] = useState(true);
  const [selectedProvider, setSelectedProvider] = useState<ApiProvider>('openrouter');
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

  function handleKeySettings() {
    Alert.alert(
      'API 設定',
      '管理 AI 連線設定',
      [
        { text: '取消', style: 'cancel' },
        {
          text: '移除設定',
          style: 'destructive',
          onPress: async () => {
            await removeApiConfig();
            setNeedsKey(true);
            setMessages([]);
          },
        },
      ]
    );
  }

  async function handleSend() {
    const trimmed = input.trim();
    if (!trimmed || loading) return;

    const userMsg: ChatMessage = { role: 'user', text: trimmed };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const reply = await chatWithFinanceAdvisor(trimmed, messages, month);
      setMessages(prev => [...prev, { role: 'model', text: reply }]);
    } catch (e: any) {
      setMessages(prev => [...prev, { role: 'model', text: `錯誤：${e.message}` }]);
    } finally {
      setLoading(false);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
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
            <MaterialCommunityIcons name="close" size={20} color="#666" />
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
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>AI 財務顧問</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <MaterialCommunityIcons name="close" size={20} color="#666" />
          </TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={styles.keySetup} keyboardShouldPersistTaps="handled">
          <MaterialCommunityIcons name="key-variant" size={32} color="#666" />
          <Text style={styles.keyTitle}>設定 AI 供應商</Text>

          <View style={styles.providerRow}>
            {PROVIDERS.map(p => (
              <TouchableOpacity
                key={p.value}
                style={[styles.providerBtn, selectedProvider === p.value && styles.providerBtnActive]}
                onPress={() => setSelectedProvider(p.value)}
              >
                <Text style={[styles.providerLabel, selectedProvider === p.value && styles.providerLabelActive]}>
                  {p.label}
                </Text>
                <Text style={styles.providerHint}>{p.hint}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TextInput
            style={styles.keyInput}
            value={keyInput}
            onChangeText={setKeyInput}
            placeholder="貼上 API Key..."
            placeholderTextColor="#555"
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TouchableOpacity style={styles.keyBtn} onPress={handleSetKey}>
            <Text style={styles.keyBtnText}>確認</Text>
          </TouchableOpacity>
        </ScrollView>
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
        <Text style={styles.headerTitle}>AI 財務顧問</Text>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <TouchableOpacity onPress={handleKeySettings} style={styles.closeBtn}>
            <MaterialCommunityIcons name="cog-outline" size={18} color="#666" />
          </TouchableOpacity>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <MaterialCommunityIcons name="close" size={20} color="#666" />
          </TouchableOpacity>
        </View>
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
            <MaterialCommunityIcons name="robot-outline" size={40} color="#555" />
            <Text style={styles.welcomeText}>
              我是你的財務分析助手{'\n'}問我任何關於消費的問題
            </Text>
            <TouchableOpacity style={styles.quickBtn} onPress={handleQuickAnalysis}>
              <MaterialCommunityIcons name="chart-line" size={16} color="#55DDAA" />
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
          <MaterialCommunityIcons name="send" size={18} color="#0F0F0F" />
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
  closeBtn: { padding: 4 },

  keySetup: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, paddingTop: 60 },
  keyTitle: { color: '#FFFFFF', fontSize: 16, fontWeight: '300', marginTop: 16, marginBottom: 20 },
  providerRow: { width: '100%', gap: 8, marginBottom: 20 },
  providerBtn: {
    borderWidth: 1, borderColor: '#3A3A3A', borderRadius: 10,
    padding: 12, width: '100%',
  },
  providerBtnActive: { borderColor: '#55DDAA', backgroundColor: '#55DDAA10' },
  providerLabel: { color: '#888', fontSize: 14, fontWeight: '400' },
  providerLabelActive: { color: '#55DDAA' },
  providerHint: { color: '#555', fontSize: 11, marginTop: 2 },
  keyInput: {
    width: '100%', borderWidth: 1, borderColor: '#3A3A3A', borderRadius: 8,
    padding: 12, color: '#FFFFFF', fontSize: 13, backgroundColor: '#161616', marginBottom: 16,
  },
  keyBtn: { backgroundColor: '#FFFFFF', borderRadius: 8, paddingHorizontal: 24, paddingVertical: 10 },
  keyBtnText: { color: '#0F0F0F', fontSize: 14, fontWeight: '500' },

  chatArea: { flex: 1 },
  chatContent: { padding: 16, paddingBottom: 8 },
  welcome: { alignItems: 'center', paddingTop: 60, paddingBottom: 20 },
  welcomeText: { color: '#666', fontSize: 13, fontWeight: '300', textAlign: 'center', lineHeight: 22, marginTop: 12, marginBottom: 20 },
  quickBtn: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#55DDAA40', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8, gap: 6 },
  quickBtnText: { color: '#55DDAA', fontSize: 13 },

  msgBubble: { maxWidth: '85%', borderRadius: 12, padding: 12, marginBottom: 8 },
  userBubble: { alignSelf: 'flex-end', backgroundColor: '#FFFFFF' },
  modelBubble: { alignSelf: 'flex-start', backgroundColor: '#161616', borderWidth: 1, borderColor: '#252525' },
  msgText: { color: '#CCCCCC', fontSize: 14, fontWeight: '300', lineHeight: 22 },
  userMsgText: { color: '#0F0F0F' },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8 },
  loadingText: { color: '#666', fontSize: 12 },

  inputRow: {
    flexDirection: 'row', alignItems: 'flex-end',
    paddingHorizontal: 16, paddingVertical: 12,
    borderTopWidth: 1, borderTopColor: '#252525', gap: 8,
  },
  chatInput: {
    flex: 1, borderWidth: 1, borderColor: '#3A3A3A', borderRadius: 20,
    paddingHorizontal: 16, paddingVertical: 8,
    color: '#FFFFFF', fontSize: 14, fontWeight: '300',
    maxHeight: 80, backgroundColor: '#161616',
  },
  sendBtn: { backgroundColor: '#55DDAA', borderRadius: 20, width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
});
