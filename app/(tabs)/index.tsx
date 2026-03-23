import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Text,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useRouter } from 'expo-router';
import { createTask } from '../../services/taskService';
import TasksModule from '../../components/modules/TasksModule';
import CalendarModule from '../../components/modules/CalendarModule';
import FinanceModule from '../../components/modules/FinanceModule';
import GoalsModule from '../../components/modules/GoalsModule';

function formatDate(): string {
  const now = new Date();
  const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
  return `${now.getMonth() + 1}月${now.getDate()}日  星期${weekdays[now.getDay()]}`;
}

export default function HomeScreen() {
  const router = useRouter();
  const [text, setText] = useState('');

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
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* 日期 */}
        <Text style={styles.dateText}>{formatDate()}</Text>

        {/* 輸入框 */}
        <View style={styles.inputCard}>
          <TextInput
            style={styles.input}
            value={text}
            onChangeText={setText}
            placeholder="想到什麼就寫..."
            placeholderTextColor="#2A2A2A"
            multiline
            blurOnSubmit
            onSubmitEditing={handleSubmit}
          />
          {text.trim().length > 0 && (
            <TouchableOpacity onPress={handleSubmit} style={styles.submitBtn}>
              <MaterialCommunityIcons name="arrow-up" size={16} color="#0F0F0F" />
            </TouchableOpacity>
          )}
        </View>

        {/* 模組格 */}
        <View style={styles.grid}>
          <View style={[styles.row, { marginBottom: 12 }]}>
            <TasksModule onPress={() => router.push('/(tabs)/tasks')} />
            <View style={styles.gap} />
            <CalendarModule onPress={() => router.push('/(tabs)/calendar')} />
          </View>
          <View style={styles.row}>
            <FinanceModule onPress={() => router.push('/(tabs)/finance/')} />
            <View style={styles.gap} />
            <GoalsModule onPress={() => router.push('/(tabs)/goals/')} />
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#0F0F0F',
  },
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 40,
  },
  dateText: {
    color: '#333333',
    fontSize: 12,
    letterSpacing: 2,
    fontWeight: '300',
    marginBottom: 16,
  },
  inputCard: {
    borderWidth: 1,
    borderColor: '#3A3A3A',
    borderRadius: 16,
    padding: 16,
    backgroundColor: '#161616',
    marginBottom: 24,
    minHeight: 80,
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  input: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '300',
    lineHeight: 24,
    textAlignVertical: 'top',
    minHeight: 48,
  },
  submitBtn: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  grid: {
  },
  row: {
    flexDirection: 'row',
  },
  gap: {
    width: 12,
  },
});
