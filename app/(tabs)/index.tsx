import React, { useState, useCallback, useRef } from 'react';
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
  classifyByKeywords,
  saveEntry,
  rollbackEntry,
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

function canSaveClassification(text: string, result: ClassificationResult): boolean {
  if (result.type !== 'FINANCE') return true;
  if (parseMultipleTransactions(text).length >= 2) return true;
  const amount = result.parsed?.amount;
  return typeof amount === 'number' && Number.isFinite(amount) && amount > 0;
}

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
  const [submitting, setSubmitting] = useState(false);
  const [classifying, setClassifying] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackOpacity] = useState(new Animated.Value(0));
  const [recentItems, setRecentItems] = useState<RecentItem[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [classifySource, setClassifySource] = useState<'ai' | 'local'>('local');
  const sourceRef = useRef<'ai' | 'local'>('local');

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setRefreshKey(k => k + 1);
      getRecentActivity(5)
        .then(items => {
          if (active) setRecentItems(items);
        })
        .catch(err => console.error('[HomeScreen] recent activity failed:', err));
      return () => {
        active = false;
      };
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

      const source: 'ai' | 'local' = ai ? 'ai' : 'local';
      sourceRef.current = source;
      setClassifySource(source);
    } catch {
      showFeedback('分類失敗，請再試一次', false);
      return;
    } finally {
      setClassifying(false);
    }

    if (!result) {
      showFeedback('無法判斷內容類型，請再試一次', false);
      return;
    }

    if (result.confidence === 'high' && canSaveClassification(trimmed, result)) {
      await doSave(trimmed, result);
    } else {
      setClassification(result);
    }
  }

  function handleChangeType(newType: ClassifiedType) {
    if (!classification) return;
    let parsed = newType === classification.type ? classification.parsed : undefined;
    if (newType === 'FINANCE') {
      const localResult = classifyByKeywords(text.trim());
      parsed = localResult.type === 'FINANCE' ? localResult.parsed : undefined;
    }
    setClassification({ type: newType, confidence: 'high', parsed });
  }

  async function doSave(trimmed: string, result: ClassificationResult) {
    if (!canSaveClassification(trimmed, result)) {
      showFeedback('請在輸入內容中補上有效金額', false);
      return;
    }

    setSubmitting(true);
    let entryId: string | null = null;
    let feedback = '已儲存';
    let succeeded = false;

    try {
      entryId = await saveEntry(trimmed, result.type);
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
          feedback = result.parsed?.dueDate ? `已新增任務（${result.parsed.dueDate}）` : '已新增任務';
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
            feedback = `已記 ${multi.length} 筆`;
          } else {
            const p = result.parsed;
            const amount = p?.amount;
            if (typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0) {
              throw new Error('記帳金額無效');
            }
            await createTransaction({
              type: p?.transactionType ?? 'expense',
              item: trimmed.replace(/\d+(?:\.\d+)?\s*(?:元|塊|NT\$?|\$)?/g, '').trim() || trimmed,
              amount,
              category: p?.transactionType === 'income' ? null : p?.category ?? 'other',
              entry_id: entryId,
            });
            feedback = '已記帳';
          }
          break;
        }

        case 'IDEA':
          await createNote({ content: trimmed, entry_id: entryId });
          feedback = '已儲存筆記';
          break;

        default:
          await createNote({ content: trimmed, entry_id: entryId });
          break;
      }
      succeeded = true;
      showFeedback(feedback);
    } catch {
      if (entryId) {
        await rollbackEntry(entryId).catch(() => undefined);
      }
      showFeedback('儲存失敗，內容已保留，請再試一次', false);
    } finally {
      if (succeeded) {
        setText('');
        setClassification(null);
        setRefreshKey(k => k + 1);
        bumpRefresh();
      }
      setSubmitting(false);
    }
  }

  async function handleConfirm() {
    if (!classification) return;
    await doSave(text.trim(), classification);
  }

  function handleCancel() {
    setClassification(null);
  }

  function showFeedback(msg: string, includeSource = true) {
    const tag = sourceRef.current === 'ai' ? 'AI' : '本地';
    setFeedbackText(includeSource ? `${msg} · ${tag}判斷` : msg);
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
  const canConfirm = classification !== null && canSaveClassification(text.trim(), classification);

  return (
    <SafeAreaView style={styles.safe} edges={[]}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* 日期 + 問 Lumi + 側邊選單 */}
        <View style={styles.topRow}>
          <Text style={styles.dateText}>{formatDate()}</Text>
          <View style={styles.topActions}>
            <TouchableOpacity
              onPress={() => router.push('/timeline')}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={styles.menuBtn}
            >
              <Text style={styles.menuBtnIcon}>≣</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => router.push('/ask')}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={styles.menuBtn}
            >
              <Text style={styles.menuBtnIcon}>⌕</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setDrawerOpen(true)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={styles.menuBtn}
            >
              <Text style={styles.menuBtnIcon}>≡</Text>
            </TouchableOpacity>
          </View>
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
              <View style={styles.classHeadRow}>
                <Text style={styles.classLabel}>分類為</Text>
                <Text
                  style={[
                    styles.sourceBadge,
                    classifySource === 'ai' ? styles.sourceAi : styles.sourceLocal,
                  ]}
                >
                  {classifySource === 'ai' ? 'AI 判斷' : '本地判斷'}
                </Text>
              </View>
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
                style={[styles.confirmBtn, (!canConfirm || submitting) && { opacity: 0.5 }]}
                disabled={!canConfirm || submitting}
              >
                <Text style={styles.confirmText}>
                  {submitting ? '儲存中...' : canConfirm ? '確認' : '請補金額'}
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
  topActions: {
    flexDirection: 'row',
    gap: 10,
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
  classHeadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  classLabel: {
    color: '#444',
    fontSize: 11,
    letterSpacing: 1,
  },
  sourceBadge: {
    fontSize: 10,
    fontWeight: '400',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    overflow: 'hidden',
  },
  sourceAi: {
    color: '#88AAFF',
    backgroundColor: '#88AAFF15',
  },
  sourceLocal: {
    color: '#666',
    backgroundColor: '#1A1A1A',
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
