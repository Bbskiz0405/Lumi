import React, { useState, useCallback } from 'react';
import {
  View, FlatList, StyleSheet, Text, TouchableOpacity, Alert,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { getAllNotes, deleteNote } from '../services/noteService';
import { Note, NoteCategory } from '../types/note';

const CATEGORY_LABELS: Record<string, string> = {
  vtuber: 'VTuber',
  cardgame: '卡牌',
  tech: '科技',
  life: '生活',
};

const CATEGORY_COLORS: Record<string, string> = {
  vtuber: '#FF88BB',
  cardgame: '#FF9944',
  tech: '#88AAFF',
  life: '#55DDAA',
};

function formatDate(isoStr: string): string {
  const d = new Date(isoStr);
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export default function NotesScreen() {
  const router = useRouter();
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<NoteCategory | null>(null);

  useFocusEffect(
    useCallback(() => {
      loadNotes();
    }, [])
  );

  async function loadNotes() {
    setLoading(true);
    const data = await getAllNotes();
    setNotes(data);
    setLoading(false);
  }

  function handleDelete(id: string) {
    Alert.alert('刪除筆記', '確定要刪除嗎？', [
      { text: '取消', style: 'cancel' },
      {
        text: '刪除',
        style: 'destructive',
        onPress: async () => {
          await deleteNote(id);
          setNotes(prev => prev.filter(n => n.id !== id));
        },
      },
    ]);
  }

  const filtered = filter ? notes.filter(n => n.category === filter) : notes;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <MaterialCommunityIcons name="arrow-left" size={22} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>筆記</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* Category filter */}
      <View style={styles.filterRow}>
        <TouchableOpacity
          style={[styles.filterPill, !filter && styles.filterPillActive]}
          onPress={() => setFilter(null)}
        >
          <Text style={[styles.filterText, !filter && styles.filterTextActive]}>全部</Text>
        </TouchableOpacity>
        {(Object.keys(CATEGORY_LABELS) as NoteCategory[]).map(cat => (
          <TouchableOpacity
            key={cat}
            style={[
              styles.filterPill,
              filter === cat && { borderColor: CATEGORY_COLORS[cat], backgroundColor: CATEGORY_COLORS[cat] + '15' },
            ]}
            onPress={() => setFilter(filter === cat ? null : cat)}
          >
            <Text style={[styles.filterText, filter === cat && { color: CATEGORY_COLORS[cat] }]}>
              {CATEGORY_LABELS[cat]}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color="#FFFFFF" />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          renderItem={({ item }) => (
            <View style={styles.noteCard}>
              <View style={styles.noteBody}>
                <Text style={styles.noteContent} numberOfLines={4}>{item.content}</Text>
                <View style={styles.noteMeta}>
                  <Text style={styles.noteDate}>{formatDate(item.created_at)}</Text>
                  {item.category && (
                    <View style={[styles.noteTag, { borderColor: CATEGORY_COLORS[item.category] ?? '#444' }]}>
                      <Text style={[styles.noteTagText, { color: CATEGORY_COLORS[item.category] ?? '#444' }]}>
                        {CATEGORY_LABELS[item.category] ?? item.category}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
              <TouchableOpacity
                onPress={() => handleDelete(item.id)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={styles.deleteBtn}
              >
                <MaterialCommunityIcons name="close" size={14} color="#444" />
              </TouchableOpacity>
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <MaterialCommunityIcons name="lightbulb-outline" size={40} color="#222" />
              <Text style={styles.emptyText}>還沒有筆記</Text>
              <Text style={styles.emptyHint}>在首頁輸入任何想法，會自動歸類到這裡</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0F0F0F' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: { padding: 4 },
  headerTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: '300', letterSpacing: 2 },

  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
  },
  filterPill: {
    borderWidth: 1,
    borderColor: '#2A2A2A',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  filterPillActive: {
    borderColor: '#FFFFFF',
    backgroundColor: '#FFFFFF10',
  },
  filterText: { color: '#444', fontSize: 12 },
  filterTextActive: { color: '#FFFFFF' },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { paddingHorizontal: 16, paddingBottom: 40 },

  noteCard: {
    flexDirection: 'row',
    backgroundColor: '#111111',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1A1A1A',
    overflow: 'hidden',
  },
  noteBody: {
    flex: 1,
    padding: 14,
  },
  noteContent: {
    color: '#CCCCCC',
    fontSize: 14,
    fontWeight: '300',
    lineHeight: 22,
    marginBottom: 8,
  },
  noteMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  noteDate: { color: '#333', fontSize: 11 },
  noteTag: {
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  noteTagText: { fontSize: 10 },
  deleteBtn: { padding: 14, alignSelf: 'flex-start' },

  empty: { alignItems: 'center', paddingTop: 80 },
  emptyText: { color: '#333', fontSize: 14, fontWeight: '300', marginTop: 12 },
  emptyHint: { color: '#222', fontSize: 12, marginTop: 6 },
});
