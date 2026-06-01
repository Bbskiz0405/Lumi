import React, { useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Text,
  ScrollView,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { createTask } from '../../services/taskService';
import { createNote } from '../../services/noteService';
import { createTransaction } from '../../services/financeService';
import {
  classifyWithHabits,
  saveEntry,
  updateEntryType,
  ClassificationResult,
  parseMultipleTransactions,
} from '../../services/classificationService';
import { classifyTextWithAI } from '../../services/geminiService';
import { ClassifiedType } from '../../types/entry';
import { getRecentActivity, RecentItem } from '../../services/recentService';
import { useCalendar } from '../../contexts/CalendarContext';
import SidebarDrawer from '../../components/SidebarDrawer';
import TasksModule from '../../components/modules/TasksModule';
import CalendarModule from '../../components/modules/CalendarModule';
import FinanceModule from '../../components/modules/FinanceModule';
import NotesModule from '../../components/modules/NotesModule';

function formatDate(): string {
  const now = new Date();
  const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
  return `${now.getMonth() + 1}月${now.getDate()}日  星期${weekdays[now.getDay()]}`;
}

const TYPE_CONFIG: Record<string, { label: string; icon: string; color: string }> = {
  TASK: { label: '任務', icon: '[v]', color: '#FF9944' },
  FINANCE: { label: '記帳', icon: '$', color: '#55DDAA' },
  IDEA: { label: '筆記', icon: '!', color: '#88AAFF' },
  GOAL: { label: '目標', icon: '◎', color: '#FF88BB' },
  UNCERTAIN: { label: '未分類', icon: '?', color: '#666666' },
};

const RECENT_TYPE_CONFIG: Record<string, { icon: string; color: string }> = {
  task: { icon: '[v]', color: '#FF9944' },
  finance: { icon: '$', color: '#55DDAA' },
  note: { icon: '!', color: '#88AAFF' },
};

const SELECTABLE_TYPES: ClassifiedType[] = ['TASK', 'FINANCE', 'IDEA'];

function timeAgo(isoStr: string): string {
  const diff = Date.now() - new Date(isoStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return '剛剛';
  if (mins < 60) return `${mins} 分鐘前`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} 小時前`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days} 天前`;
  return `${Math.floor(days / 7)} 週前`;
}

export default function HomeScreen() {
  const router = useRouter();
  const { bumpRefresh } = useCalendar();
  const [text, setText] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [classification, setClassification] = useState<ClassificationResult | null>(null);
  const [pendingEntryId, setPendingEntryId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [classifying, setClassifying] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackOpacity] = useState(new Animated.Value(0));
  const [recentItems, setRecentItems] = useState<RecentItem[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useFocusEffect(
    useCallback(() => {
      setRefreshKey(k => k + 1);
      getRecentActivity(5).then(setRecentItems);
    }, [])
  );

  async function handleClassify() {
    const trimmed = text.trim();
    if (!trimmed) return;

    setClassifying(true);
    let result: ClassificationResult | null = null;

    try {
      const ai = await classifyTextWithAI(trimmed);
      if (ai) {
        if (ai.type === 'FINANCE') {
          result = {
            type: 'FINANCE',
            confidence: 'high',
            parsed: {
              amount: ai.amount,
              category: ai.category,
              transactionType: ai.transactionType,
            },
          };
        } else if (ai.type === 'TASK') {
          result = {
            type: 'TASK',
            confidence: 'high',
            parsed: ai.dueDate ? { dueDate: ai.dueDate } : undefined,
          };
        } else {
          result = { type: 'IDEA', confidence: 'high' };
        }
      }

      if (!result) {
        result = await classifyWithHabits(trimmed);
      }
    } finally {
      setClassifying(false);
    }

    const entryId = await saveEntry(trimmed, result.type);

    if (result.confidence === 'high') {
      setPendingEntryId(entryId);
      setClassification(result);
      await doSave(trimmed, result, entryId);
    } else {
      setClassification(result);
      setPendingEntryId(entryId);
    }
  }

  function handleChangeType(newType: ClassifiedType) {
    if (!classification || !pendingEntryId) return;
    setClassification({ ...classification, type: newType, confidence: 'high' });
    updateEntryType(pendingEntryId, newType);
  }

  async function doSave(trimmed: string, result: ClassificationResult, entryId: string) {
    setSubmitting(true);
    try {
      switch (result.type) {
        case 'TASK':
          await createTask({
            title: trimmed,
            due_date: result.parsed?.dueDate ?? null,
            priority: 'medium',
            tag: null,
            source: 'manual',
            entry_id: entryId,
          });
          showFeedback(result.parsed?.dueDate ? `已新增任務（${result.parsed.dueDate}）` : '已新增任務');
          break;

        case 'FINANCE': {
          const multi = parseMultipleTransactions(trimmed);
          if (multi.length >= 2) {
            for (const tx of multi) {
              await createTransaction({
                type: tx.transactionType,
                item: tx.item,
                amount: tx.amount,
                category: tx.transactionType === 'income' ? null : tx.category || 'other',
                entry_id: entryId,
              });
            }
            showFeedback(`已記 ${multi.length} 筆`);
          } else {
            const p = result.parsed;
            await createTransaction({
              type: p?.transactionType ?? 'expense',
              item: trimmed.replace(/\d+(?:\.\d+)?\s*(?:元|塊|NT\$?|\$)?/g, '').trim() || trimmed,
              amount: p?.amount ?? 0,
              category: p?.transactionType === 'income' ? null : (p?.category as any) ?? 'other',
              entry_id: entryId,
            });
            showFeedback('已記帳');
          }
          break;
        }

        case 'IDEA':
          await createNote({ content: trimmed, entry_id: entryId });
          showFeedback('已儲存筆記');
          break;

        default:
          await createNote({ content: trimmed, entry_id: entryId });
          showFeedback('已儲存');
          break;
      }
    } finally {
      setText('');
      setClassification(null);
      setPendingEntryId(null);
      setSubmitting(false);
      setRefreshKey(k => k + 1);
      bumpRefresh();
    }
  }

  async function handleConfirm() {
    if (!classification || !pendingEntryId) return;
    await doSave(text.trim(), classification, pendingEntryId);
  }

  function handleCancel() {
    setClassification(null);
    setPendingEntryId(null);
  }

  function showFeedback(msg: string) {
    setFeedbackText(msg);
    feedbackOpacity.setValue(1);
    Animated.timing(feedbackOpacity, {
      toValue: 0,
      duration: 1500,
      delay: 800,
      useNativeDriver: true,
    }).start();
  }

  const hasText = text.trim().length > 0;
  const showClassification = classification !== null;

  return (
    <SafeAreaView style={styles.safe} edges={[]}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* 日期 + 側邊選單 */}
        <View style={styles.topRow}>
          <Text style={styles.dateText}>{formatDate()}</Text>
          <TouchableOpacity
            onPress={() => setDrawerOpen(true)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={styles.menuBtn}
          >
            <Text style={styles.menuBtnIcon}>≡</Text>
          </TouchableOpacity>
        </View>

        {/* 輸入框 */}
        <View style={styles.inputCard}>
          <TextInput
            style={styles.input}
            value={text}
            onChangeText={(t) => {
              setText(t);
              if (classification) handleCancel();
            }}
            placeholder="想到什麼就寫..."
            placeholderTextColor="#3A3A3A"
            multiline
            blurOnSubmit={false}
            returnKeyType="default"
            editable={!submitting}
          />
          {hasText && !showClassification && (
            <TouchableOpacity
              onPress={handleClassify}
              style={[styles.submitBtn, classifying && { opacity: 0.7 }]}
              disabled={classifying}
            >
              {classifying ? (
                <ActivityIndicator size="small" color="#0F0F0F" />
              ) : (
                <Text style={styles.submitBtnArrow}>↑</Text>
              )}
            </TouchableOpacity>
          )}
        </View>

        {/* 分類結果 */}
        {showClassification && classification && (
          <View style={styles.classificationCard}>
            <View style={styles.classRow}>
              <Text style={styles.classLabel}>分類為</Text>
              <View style={styles.typePills}>
                {SELECTABLE_TYPES.map(t => {
                  const config = TYPE_CONFIG[t];
                  const isActive = classification.type === t;
                  return (
                    <TouchableOpacity
                      key={t}
                      style={[
                        styles.typePill,
                        isActive && { borderColor: config.color, backgroundColor: config.color + '15' },
                      ]}
                      onPress={() => handleChangeType(t)}
                    >
                      <Text
                        style={[
                          styles.typePillIcon,
                          { color: isActive ? config.color : '#444' },
                        ]}
                      >
                        {config.icon}
                      </Text>
                      <Text style={[styles.typePillText, isActive && { color: config.color }]}>
                        {config.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {classification.type === 'FINANCE' && classification.parsed && (
              <View style={styles.parsePreview}>
                <Text style={styles.parseText}>
                  {classification.parsed.transactionType === 'income' ? '收入' : '支出'}
                  {classification.parsed.amount ? ` $${classification.parsed.amount}` : ' (請確認金額)'}
                  {classification.parsed.category ? ` · ${classification.parsed.category}` : ''}
                </Text>
              </View>
            )}

            <View style={styles.classActions}>
              <TouchableOpacity onPress={handleCancel} style={styles.cancelBtn}>
                <Text style={styles.cancelText}>取消</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleConfirm}
                style={[styles.confirmBtn, submitting && { opacity: 0.5 }]}
                disabled={submitting}
              >
                <Text style={styles.confirmText}>
                  {submitting ? '儲存中...' : '確認'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Feedback toast */}
        <Animated.View style={[styles.feedback, { opacity: feedbackOpacity }]} pointerEvents="none">
          <Text style={styles.feedbackText}>{feedbackText}</Text>
        </Animated.View>

        {/* 模組格 */}
        <View style={styles.grid}>
          <View style={[styles.row, { marginBottom: 12 }]}>
            <TasksModule onPress={() => router.push('/(tabs)/tasks')} refreshKey={refreshKey} />
            <View style={styles.gap} />
            <CalendarModule onPress={() => router.push('/(tabs)/calendar')} refreshKey={refreshKey} />
          </View>
          <View style={styles.row}>
            <FinanceModule onPress={() => router.push('/(tabs)/finance/')} refreshKey={refreshKey} />
            <View style={styles.gap} />
            <NotesModule onPress={() => router.push('/(tabs)/notes')} refreshKey={refreshKey} />
          </View>
        </View>

        {/* 最近動態 */}
        {recentItems.length > 0 && (
          <View style={styles.recentSection}>
            <Text style={styles.recentTitle}>最近動態</Text>
            {recentItems.map(item => {
              const cfg = RECENT_TYPE_CONFIG[item.type];
              function handleRecentPress() {
                if (item.type === 'task') router.push(`/task/${item.id}`);
                else if (item.type === 'finance') router.push('/(tabs)/finance/');
                else if (item.type === 'note') router.push('/(tabs)/notes');
              }
              return (
                <TouchableOpacity key={item.id} style={styles.recentItem} onPress={handleRecentPress} activeOpacity={0.6}>
                  <Text style={[styles.recentIconText, { color: cfg.color }]}>{cfg.icon}</Text>
                  <Text style={styles.recentText} numberOfLines={1}>{item.title}</Text>
                  {item.subtitle && (
                    <Text style={[styles.recentSub, { color: cfg.color }]}>{item.subtitle}</Text>
                  )}
                  <Text style={styles.recentTime}>{timeAgo(item.created_at)}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

      </ScrollView>

      <SidebarDrawer visible={drawerOpen} onClose={() => setDrawerOpen(false)} />
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
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  dateText: {
    color: '#555555',
    fontSize: 12,
    letterSpacing: 2,
    fontWeight: '300',
  },
  menuBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#3A3A3A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuBtnIcon: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '300',
    lineHeight: 18,
    marginTop: -2,
  },
  inputCard: {
    borderWidth: 1,
    borderColor: '#3A3A3A',
    borderRadius: 16,
    padding: 16,
    backgroundColor: '#161616',
    marginBottom: 12,
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
  submitBtnArrow: {
    color: '#0F0F0F',
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 18,
  },
  classificationCard: {
    backgroundColor: '#111111',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#252525',
    padding: 14,
    marginBottom: 12,
  },
  classRow: {
    marginBottom: 10,
  },
  classLabel: {
    color: '#444',
    fontSize: 11,
    letterSpacing: 1,
    marginBottom: 8,
  },
  typePills: {
    flexDirection: 'row',
    gap: 8,
  },
  typePill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#3A3A3A',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  typePillIcon: {
    fontSize: 12,
    marginRight: 4,
    fontWeight: '500',
  },
  typePillText: {
    color: '#444',
    fontSize: 12,
  },
  parsePreview: {
    backgroundColor: '#0A0A0A',
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
  },
  parseText: {
    color: '#55DDAA',
    fontSize: 13,
    fontWeight: '300',
  },
  classActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  cancelBtn: {
    borderWidth: 1,
    borderColor: '#3A3A3A',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  cancelText: {
    color: '#666',
    fontSize: 13,
  },
  confirmBtn: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  confirmText: {
    color: '#0F0F0F',
    fontSize: 13,
    fontWeight: '500',
  },
  feedback: {
    alignItems: 'center',
    marginBottom: 8,
  },
  feedbackText: {
    color: '#55DDAA',
    fontSize: 12,
    fontWeight: '300',
    letterSpacing: 1,
  },
  grid: {},
  row: {
    flexDirection: 'row',
  },
  gap: {
    width: 12,
  },
  recentSection: {
    marginTop: 20,
  },
  recentTitle: {
    color: '#333',
    fontSize: 11,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  recentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#111111',
  },
  recentIcon: {
    marginRight: 10,
  },
  recentIconText: {
    fontSize: 13,
    marginRight: 10,
    width: 16,
    textAlign: 'center',
    fontWeight: '500',
  },
  recentText: {
    flex: 1,
    color: '#999',
    fontSize: 13,
    fontWeight: '300',
  },
  recentSub: {
    fontSize: 12,
    fontWeight: '400',
    marginRight: 8,
  },
  recentTime: {
    color: '#333',
    fontSize: 10,
  },
});
