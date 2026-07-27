import React, { useState, useRef } from 'react';
import {
  View,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Text,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useHeaderHeight } from '@react-navigation/elements';
import { askLumi, ChatMessage } from '../services/geminiService';

const SUGGESTIONS = [
  '這個月花最多的是什麼？',
  '我有哪些還沒完成的任務？',
  '上次記的筆記是什麼時候？',
  '我這週花了多少錢？',
];

export default function AskScreen() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const headerHeight = useHeaderHeight();

  async function send(question: string) {
    const q = question.trim();
    if (!q || loading) return;

    const history = messages;
    const next: ChatMessage[] = [...messages, { role: 'user', text: q }];
    setMessages(next);
    setInput('');
    setLoading(true);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);

    try {
      const answer = await askLumi(q, history);
      setMessages([...next, { role: 'model', text: answer }]);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '未知錯誤';
      setMessages([...next, { role: 'model', text: `出錯了：${message}` }]);
    } finally {
      setLoading(false);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
    }
  }

  const empty = messages.length === 0;

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior="padding"
        keyboardVerticalOffset={headerHeight}
      >
        <ScrollView
          ref={scrollRef}
          style={styles.flex}
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          {empty && (
            <View style={styles.intro}>
              <Text style={styles.introTitle}>問 Lumi 任何事</Text>
              <Text style={styles.introSub}>
                我會翻你的任務、記帳、筆記紀錄回答你。
              </Text>
              <View style={styles.chips}>
                {SUGGESTIONS.map((s) => (
                  <TouchableOpacity key={s} style={styles.chip} onPress={() => send(s)}>
                    <Text style={styles.chipText}>{s}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {messages.map((m, i) => (
            <View
              key={i}
              style={[styles.bubbleRow, m.role === 'user' ? styles.rowRight : styles.rowLeft]}
            >
              <View style={[styles.bubble, m.role === 'user' ? styles.userBubble : styles.lumiBubble]}>
                <Text style={[styles.bubbleText, m.role === 'user' && styles.userText]}>{m.text}</Text>
              </View>
            </View>
          ))}

          {loading && (
            <View style={[styles.bubbleRow, styles.rowLeft]}>
              <View style={[styles.bubble, styles.lumiBubble]}>
                <ActivityIndicator size="small" color="#88AAFF" />
              </View>
            </View>
          )}
        </ScrollView>

        {!empty && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.strip}
            contentContainerStyle={styles.stripContent}
            keyboardShouldPersistTaps="handled"
          >
            {SUGGESTIONS.map((s) => (
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

        <View style={styles.inputBar}>
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder="問問你的紀錄..."
            placeholderTextColor="#3A3A3A"
            multiline
            editable={!loading}
            onSubmitEditing={() => send(input)}
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!input.trim() || loading) && { opacity: 0.4 }]}
            onPress={() => send(input)}
            disabled={!input.trim() || loading}
          >
            <Text style={styles.sendArrow}>↑</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0F0F0F' },
  flex: { flex: 1 },
  scroll: { padding: 16, paddingBottom: 24 },
  intro: { paddingTop: 32, alignItems: 'center' },
  introTitle: { color: '#FFFFFF', fontSize: 20, fontWeight: '300', marginBottom: 8 },
  introSub: {
    color: '#555555',
    fontSize: 13,
    fontWeight: '300',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  chips: { gap: 10, width: '100%' },
  chip: {
    borderWidth: 1,
    borderColor: '#2A2A2A',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: '#161616',
  },
  chipText: { color: '#AAAAAA', fontSize: 14, fontWeight: '300' },
  strip: { maxHeight: 44, borderTopWidth: 1, borderTopColor: '#1A1A1A' },
  stripContent: { paddingHorizontal: 12, paddingVertical: 8, gap: 8, alignItems: 'center' },
  stripChip: {
    borderWidth: 1,
    borderColor: '#2A2A2A',
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#161616',
  },
  stripChipText: { color: '#999999', fontSize: 13, fontWeight: '300' },
  bubbleRow: { marginBottom: 12, flexDirection: 'row' },
  rowRight: { justifyContent: 'flex-end' },
  rowLeft: { justifyContent: 'flex-start' },
  bubble: { maxWidth: '82%', borderRadius: 14, paddingVertical: 10, paddingHorizontal: 14 },
  userBubble: { backgroundColor: '#FFFFFF' },
  lumiBubble: { backgroundColor: '#161616', borderWidth: 1, borderColor: '#2A2A2A' },
  bubbleText: { color: '#EEEEEE', fontSize: 14, fontWeight: '300', lineHeight: 21 },
  userText: { color: '#0F0F0F' },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#1A1A1A',
    backgroundColor: '#0F0F0F',
  },
  input: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '300',
    maxHeight: 120,
    paddingTop: 8,
    paddingBottom: 8,
    paddingHorizontal: 14,
    backgroundColor: '#161616',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  sendBtn: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  sendArrow: { color: '#0F0F0F', fontSize: 18, fontWeight: '600', lineHeight: 20 },
});
