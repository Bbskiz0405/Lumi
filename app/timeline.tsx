import React, { useState, useCallback } from 'react';
import { View, StyleSheet, Text, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { getEventStream, UnifiedEvent } from '../services/eventStreamService';
import {
  getCachedNarrative,
  regenerateNarrative,
  currentMonth,
  MonthNarrative,
} from '../services/narrativeService';

const TYPE_META: Record<string, { icon: string; color: string; label: string }> = {
  task: { icon: '[v]', color: '#FF9944', label: '任務' },
  note: { icon: '!', color: '#88AAFF', label: '筆記' },
  income: { icon: '$', color: '#55DDAA', label: '收入' },
  expense: { icon: '$', color: '#FF6655', label: '支出' },
};

function metaFor(e: UnifiedEvent) {
  if (e.type === 'finance') return TYPE_META[e.financeType === 'income' ? 'income' : 'expense'];
  return TYPE_META[e.type] ?? TYPE_META.note;
}

function dayKey(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

function dayLabel(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const yest = new Date();
  yest.setDate(today.getDate() - 1);
  const same = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  if (same(d, today)) return '今天';
  if (same(d, yest)) return '昨天';
  const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
  return `${d.getMonth() + 1}月${d.getDate()}日 · 星期${weekdays[d.getDay()]}`;
}

function timeLabel(iso: string): string {
  const d = new Date(iso);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

interface DayGroup {
  key: string;
  label: string;
  events: UnifiedEvent[];
}

function groupByDay(events: UnifiedEvent[]): DayGroup[] {
  const groups: DayGroup[] = [];
  let current: DayGroup | null = null;
  for (const e of events) {
    const key = dayKey(e.timestamp);
    if (!current || current.key !== key) {
      current = { key, label: dayLabel(e.timestamp), events: [] };
      groups.push(current);
    }
    current.events.push(e);
  }
  return groups;
}

function monthTitle(month: string): string {
  return `${Number(month.split('-')[1])}月回顧`;
}

function genDateLabel(iso: string): string {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export default function TimelineScreen() {
  const router = useRouter();
  const [groups, setGroups] = useState<DayGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [narrative, setNarrative] = useState<MonthNarrative | null>(null);
  const [genLoading, setGenLoading] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setLoading(true);
      setLoadError(false);
      Promise.all([
        getEventStream({ types: ['task', 'finance', 'note'], limit: 300 }),
        getCachedNarrative(currentMonth()),
      ])
        .then(([events, cachedNarrative]) => {
          if (!active) return;
          setGroups(groupByDay(events));
          setNarrative(cachedNarrative);
        })
        .catch(() => {
          if (active) setLoadError(true);
        })
        .finally(() => {
          if (active) setLoading(false);
        });
      return () => {
        active = false;
      };
    }, [])
  );

  async function handleGenerate() {
    setGenLoading(true);
    setGenError(null);
    try {
      const data = await regenerateNarrative(currentMonth());
      setNarrative(data);
    } catch (error: unknown) {
      setGenError(error instanceof Error ? error.message : '生成失敗，請確認已設定 API key。');
    } finally {
      setGenLoading(false);
    }
  }

  function renderNarrative() {
    return (
      <View style={styles.narrativeCard}>
        <View style={styles.narrativeHead}>
          <Text style={styles.narrativeTitle}>{monthTitle(currentMonth())}</Text>
          {(narrative || genError) && !genLoading && (
            <TouchableOpacity onPress={handleGenerate} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={styles.narrativeAction}>↻ 重新生成</Text>
            </TouchableOpacity>
          )}
        </View>

        {genLoading ? (
          <View style={styles.narrativeLoading}>
            <ActivityIndicator color="#88AAFF" size="small" />
            <Text style={styles.narrativeLoadingText}>Lumi 正在回顧這個月…</Text>
          </View>
        ) : narrative ? (
          <>
            <Text style={styles.narrativeText}>{narrative.text}</Text>
            <Text style={styles.narrativeMeta}>生成於 {genDateLabel(narrative.generatedAt)}</Text>
          </>
        ) : (
          <>
            <Text style={styles.narrativeEmpty}>讓 Lumi 把這個月的紀錄串成一段回顧。</Text>
            <Text style={styles.narrativePrivacy}>
              生成時會把本月任務、記帳與筆記內容傳送到目前的 AI 供應商。
            </Text>
            <TouchableOpacity style={styles.genBtn} onPress={handleGenerate}>
              <Text style={styles.genBtnText}>生成本月回顧</Text>
            </TouchableOpacity>
          </>
        )}

        {genError && !genLoading && (
          <>
            <Text style={styles.narrativeError}>{genError}</Text>
            {genError.includes('未設定 API') && (
              <TouchableOpacity style={styles.settingsBtn} onPress={() => router.push('/settings')}>
                <Text style={styles.settingsBtnText}>前往 AI 設定</Text>
              </TouchableOpacity>
            )}
          </>
        )}
      </View>
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <View style={styles.center}>
          <ActivityIndicator color="#88AAFF" />
        </View>
      </SafeAreaView>
    );
  }

  if (groups.length === 0) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <View style={styles.center}>
          <Text style={styles.emptyTitle}>{loadError ? '讀取時間軸失敗' : '還沒有任何紀錄'}</Text>
          <Text style={styles.emptySub}>
            {loadError ? '請稍後重新開啟此頁。' : '記下任務、消費、筆記後，這裡會串成你的時間軸。'}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {renderNarrative()}
        {groups.map((g) => (
          <View key={g.key} style={styles.dayBlock}>
            <Text style={styles.dayLabel}>{g.label}</Text>
            {g.events.map((e) => {
              const m = metaFor(e);
              return (
                <View key={e.id} style={styles.row}>
                  <View style={styles.rail}>
                    <View style={[styles.dot, { backgroundColor: m.color }]} />
                    <View style={styles.line} />
                  </View>
                  <View style={styles.card}>
                    <View style={styles.cardHead}>
                      <Text style={[styles.typeTag, { color: m.color }]}>{m.icon} {m.label}</Text>
                      <Text style={styles.time}>{timeLabel(e.timestamp)}</Text>
                    </View>
                    <Text
                      style={[
                        styles.title,
                        e.type === 'task' && e.completed && styles.titleDone,
                      ]}
                      numberOfLines={2}
                    >
                      {e.title}
                    </Text>
                    {e.type === 'finance' && (
                      <Text style={[styles.amount, { color: m.color }]}>
                        {e.financeType === 'income' ? '+' : '-'}{e.amount ?? 0}
                        {e.category ? `  ·  ${e.category}` : ''}
                      </Text>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0F0F0F' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 },
  emptyTitle: { color: '#FFFFFF', fontSize: 16, fontWeight: '300', marginBottom: 8 },
  emptySub: { color: '#555555', fontSize: 13, fontWeight: '300', textAlign: 'center', lineHeight: 20 },
  scroll: { padding: 16, paddingBottom: 32 },
  dayBlock: { marginBottom: 8 },
  dayLabel: {
    color: '#666666',
    fontSize: 12,
    letterSpacing: 1,
    fontWeight: '300',
    marginBottom: 8,
    marginTop: 12,
  },
  row: { flexDirection: 'row' },
  rail: { width: 24, alignItems: 'center' },
  dot: { width: 9, height: 9, borderRadius: 5, marginTop: 16 },
  line: { flex: 1, width: 1, backgroundColor: '#1F1F1F', marginTop: 4 },
  card: {
    flex: 1,
    backgroundColor: '#111111',
    borderWidth: 1,
    borderColor: '#1A1A1A',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    marginLeft: 4,
  },
  cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  typeTag: { fontSize: 11, fontWeight: '500', letterSpacing: 0.5 },
  time: { color: '#444444', fontSize: 11 },
  title: { color: '#DDDDDD', fontSize: 14, fontWeight: '300', lineHeight: 21 },
  titleDone: { color: '#555555', textDecorationLine: 'line-through' },
  amount: { fontSize: 13, fontWeight: '400', marginTop: 6 },

  narrativeCard: {
    backgroundColor: '#111111',
    borderWidth: 1,
    borderColor: '#23262F',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
  },
  narrativeHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  narrativeTitle: { color: '#88AAFF', fontSize: 14, fontWeight: '400', letterSpacing: 1 },
  narrativeAction: { color: '#555555', fontSize: 12, fontWeight: '300' },
  narrativeText: { color: '#CCCCCC', fontSize: 14, fontWeight: '300', lineHeight: 23 },
  narrativeMeta: { color: '#3A3A3A', fontSize: 10, marginTop: 12 },
  narrativeEmpty: { color: '#666666', fontSize: 13, fontWeight: '300', lineHeight: 20, marginBottom: 14 },
  narrativePrivacy: { color: '#4F596D', fontSize: 11, lineHeight: 17, marginBottom: 12 },
  narrativeLoading: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6 },
  narrativeLoadingText: { color: '#666666', fontSize: 13, fontWeight: '300', marginLeft: 10 },
  narrativeError: { color: '#FF6655', fontSize: 12, fontWeight: '300', marginTop: 10 },
  genBtn: {
    backgroundColor: '#1A1D26',
    borderWidth: 1,
    borderColor: '#2E3340',
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: 'center',
  },
  genBtnText: { color: '#88AAFF', fontSize: 13, fontWeight: '400' },
  settingsBtn: {
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#2E3340',
    borderRadius: 10,
  },
  settingsBtnText: { color: '#88AAFF', fontSize: 13 },
});
