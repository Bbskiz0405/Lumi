import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import {
  chatWithFinanceAdvisor,
  getQuickAnalysis,
  ChatMessage,
  getGeminiApiKey,
  setGeminiApiKey,
} from '../../services/geminiService';

interface Props {
  month: string;
  onClose: () => void;
}

export default function FinanceAdvisor({ month, onClose }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [needsKey, setNeedsKey] = useState(true);
  const [checkingKey, setCheckingKey] = useState(true);
  const [keyInput, setKeyInput] = useState('');
  const scrollRef = useRef<ScrollView>(null);

  React.useEffect(() => {
    getGeminiApiKey().then(key => {
      setNeedsKey(!key);
      setCheckingKey(false);
    });
  }, []);

  async function handleSetKey() {
    const key = keyInput.trim();
    if (!key) return;
    await setGeminiApiKey(key);
    setNeedsKey(false);
    setKeyInput('');
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
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>AI 財務顧問</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <MaterialCommunityIcons name="close" size={20} color="#666" />
          </TouchableOpacity>
        </View>
        <View style={styles.keySetup}>
          <ActivityIndicator color="#55DDAA" />
        </View>
      </View>
    );
  }

  if (needsKey) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>AI 財務顧問</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <MaterialCommunityIcons name="close" size={20} color="#666" />
          </TouchableOpacity>
        </View>
        <View style={styles.keySetup}>
          <MaterialCommunityIcons name="key-variant" size={32} color="#444" />
          <Text style={styles.keyTitle}>設定 Gemini API Key</Text>
          <Text style={styles.keyHint}>使用 Gemini Flash 免費額度</Text>
          <TextInput
            style={styles.keyInput}
            value={keyInput}
            onChangeText={setKeyInput}
            placeholder="貼上 API Key..."
            placeholderTextColor="#333"
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TouchableOpacity style={styles.keyBtn} onPress={handleSetKey}>
            <Text style={styles.keyBtnText}>確認</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>AI 財務顧問</Text>
        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
          <MaterialCommunityIcons name="close" size={20} color="#666" />
        </TouchableOpacity>
      </View>

      <ScrollView
        ref={scrollRef}
        style={styles.chatArea}
        contentContainerStyle={styles.chatContent}
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
      >
        {messages.length === 0 && (
          <View style={styles.welcome}>
            <MaterialCommunityIcons name="robot-outline" size={40} color="#333" />
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
          placeholderTextColor="#333"
          multiline
          maxLength={500}
          onSubmitEditing={handleSend}
          blurOnSubmit
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
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F0F0F',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1A1A1A',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '300',
    letterSpacing: 1,
  },
  closeBtn: { padding: 4 },

  keySetup: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  keyTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '300',
    marginTop: 16,
    marginBottom: 8,
  },
  keyHint: {
    color: '#444',
    fontSize: 12,
    marginBottom: 20,
  },
  keyInput: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#2A2A2A',
    borderRadius: 8,
    padding: 12,
    color: '#FFFFFF',
    fontSize: 13,
    backgroundColor: '#161616',
    marginBottom: 16,
  },
  keyBtn: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingHorizontal: 24,
    paddingVertical: 10,
  },
  keyBtnText: {
    color: '#0F0F0F',
    fontSize: 14,
    fontWeight: '500',
  },

  chatArea: { flex: 1 },
  chatContent: { padding: 16, paddingBottom: 8 },

  welcome: {
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 20,
  },
  welcomeText: {
    color: '#444',
    fontSize: 13,
    fontWeight: '300',
    textAlign: 'center',
    lineHeight: 22,
    marginTop: 12,
    marginBottom: 20,
  },
  quickBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#55DDAA40',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 6,
  },
  quickBtnText: {
    color: '#55DDAA',
    fontSize: 13,
  },

  msgBubble: {
    maxWidth: '85%',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: '#FFFFFF',
  },
  modelBubble: {
    alignSelf: 'flex-start',
    backgroundColor: '#161616',
    borderWidth: 1,
    borderColor: '#1A1A1A',
  },
  msgText: {
    color: '#CCCCCC',
    fontSize: 14,
    fontWeight: '300',
    lineHeight: 22,
  },
  userMsgText: {
    color: '#0F0F0F',
  },

  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
  },
  loadingText: {
    color: '#444',
    fontSize: 12,
  },

  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#1A1A1A',
    gap: 8,
  },
  chatInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '300',
    maxHeight: 80,
    backgroundColor: '#161616',
  },
  sendBtn: {
    backgroundColor: '#55DDAA',
    borderRadius: 20,
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
