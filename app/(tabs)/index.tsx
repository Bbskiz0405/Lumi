import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Text,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { createTask } from '../../services/taskService';

function formatDate(): string {
  const now = new Date();
  const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
  return `${now.getMonth() + 1}月${now.getDate()}日  星期${weekdays[now.getDay()]}`;
}

export default function HomeScreen() {
  const [text, setText] = useState('');
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit() {
    const trimmed = text.trim();
    if (!trimmed) return;
    await createTask({
      title: trimmed,
      due_date: null,
      priority: 'medium',
      tag: null,
      source: 'manual',
      entry_id: null,
    });
    setText('');
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 1500);
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* 日期 */}
        <View style={styles.dateArea}>
          <Text style={styles.dateText}>{formatDate()}</Text>
        </View>

        {/* 中央輸入框 */}
        <View style={styles.center}>
          <View style={styles.inputCard}>
            <TextInput
              style={styles.input}
              value={text}
              onChangeText={setText}
              placeholder={submitted ? '已記錄' : '想到什麼就寫...'}
              placeholderTextColor={submitted ? '#555555' : '#2A2A2A'}
              multiline
              autoFocus={false}
            />
            {text.trim().length > 0 && (
              <TouchableOpacity onPress={handleSubmit} style={styles.submitBtn}>
                <MaterialCommunityIcons name="arrow-up" size={16} color="#0F0F0F" />
              </TouchableOpacity>
            )}
          </View>
          </View>

        <View style={styles.bottom} />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#0F0F0F',
  },
  flex: {
    flex: 1,
  },
  dateArea: {
    paddingHorizontal: 28,
    paddingTop: 24,
  },
  dateText: {
    color: '#333333',
    fontSize: 12,
    letterSpacing: 2,
    fontWeight: '300',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 28,
    marginBottom: 60,
  },
  inputCard: {
    borderWidth: 1,
    borderColor: '#3A3A3A',
    borderRadius: 16,
    padding: 20,
    backgroundColor: '#161616',
    minHeight: 120,
  },
  input: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '300',
    lineHeight: 26,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  submitBtn: {
    alignSelf: 'flex-end',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  hint: {
    color: '#222222',
    fontSize: 11,
    letterSpacing: 1,
    textAlign: 'center',
    marginTop: 12,
  },
  bottom: {
    height: 20,
  },
});
