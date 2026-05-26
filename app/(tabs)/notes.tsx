import React, { useState, useCallback } from 'react';
import {
  View, FlatList, StyleSheet, Text, TouchableOpacity, Alert,
  ActivityIndicator, Modal, TextInput, ScrollView,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { getAllNotes, deleteNote, updateNote } from '../../services/noteService';
import { Note, NoteCategory } from '../../types/note';

const CATEGORY_LABELS: Record<string, string> = {
  vtuber: 'VTuber',
  cardgame: '卡牌',
  tech: '科技',
  life: '生活',
  goal: '目標',
};

const CATEGORY_COLORS: Record<string, string> = {
  vtuber: '#FF88BB',
  cardgame: '#FF9944',
  tech: '#88AAFF',
  life: '#55DDAA',
  goal: '#FF88BB',
};

function formatDate(isoStr: string): string {
  const d = new Date(isoStr);
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export default function NotesScreen() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string | null>(null);
  const [editNote, setEditNote] = useState<Note | null>(null);
  const [editContent, setEditContent] = useState('');
  const [editCategory, setEditCategory] = useState<string | null>(null);

  function openEdit(note: Note) {
    setEditNote(note);
    setEditContent(note.content);
    setEditCategory(note.category);
  }

  async function handleSaveEdit() {
    if (!editNote) return;
    await updateNote(editNote.id, {
      content: editContent.trim(),
      category: editCategory as NoteCategory | null,
    });
    setNotes(prev => prev.map(n =>
      n.id === editNote.id ? { ...n, content: editContent.trim(), category: editCategory as NoteCategory | null } : n
    ));
    setEditNote(null);
  }

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
        <Text style={styles.headerTitle}>筆記</Text>
      </View>

      <View style={styles.filterRow}>
        <TouchableOpacity
          style={[styles.filterPill, !filter && styles.filterPillActive]}
          onPress={() => setFilter(null)}
        >
          <Text style={[styles.filterText, !filter && styles.filterTextActive]}>全部</Text>
        </TouchableOpacity>
        {Object.keys(CATEGORY_LABELS).map(cat => (
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
            <TouchableOpacity style={styles.noteCard} onPress={() => openEdit(item)} activeOpacity={0.7}>
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
            </TouchableOpacity>
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

      {/* Edit modal */}
      <Modal
        visible={editNote !== null}
        onRequestClose={() => setEditNote(null)}
        animationType="fade"
        transparent
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>編輯筆記</Text>
            <View style={styles.modalDivider} />
            <ScrollView style={styles.modalBody} keyboardShouldPersistTaps="handled">
              <TextInput
                style={styles.editInput}
                value={editContent}
                onChangeText={setEditContent}
                multiline
                autoFocus
              />
              <Text style={styles.fieldLabel}>分類</Text>
              <View style={styles.catRow}>
                {Object.keys(CATEGORY_LABELS).map(cat => (
                  <TouchableOpacity
                    key={cat}
                    style={[
                      styles.catPill,
                      editCategory === cat && { borderColor: CATEGORY_COLORS[cat], backgroundColor: CATEGORY_COLORS[cat] + '15' },
                    ]}
                    onPress={() => setEditCategory(editCategory === cat ? null : cat)}
                  >
                    <Text style={[styles.catPillText, editCategory === cat && { color: CATEGORY_COLORS[cat] }]}>
                      {CATEGORY_LABELS[cat]}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <View style={styles.modalActions}>
                <TouchableOpacity onPress={() => setEditNote(null)} style={styles.cancelBtn}>
                  <Text style={styles.cancelText}>取消</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleSaveEdit} style={styles.saveBtn}>
                  <Text style={styles.saveText}>儲存</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0F0F0F' },
  header: {
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  headerTitle: { color: '#FFFFFF', fontSize: 20, fontWeight: '300', letterSpacing: 2 },

  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
    flexWrap: 'wrap',
  },
  filterPill: {
    borderWidth: 1,
    borderColor: '#3A3A3A',
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
    borderColor: '#252525',
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

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-start', paddingTop: 48 },
  modal: { backgroundColor: '#111111', borderRadius: 16, borderWidth: 1, borderColor: '#3A3A3A', marginHorizontal: 12, maxHeight: 500 },
  modalTitle: { padding: 20, paddingBottom: 12, color: '#FFFFFF', fontSize: 16, fontWeight: '300', letterSpacing: 1 },
  modalDivider: { height: 1, backgroundColor: '#3A3A3A' },
  modalBody: { padding: 16 },
  editInput: { borderWidth: 1, borderColor: '#3A3A3A', borderRadius: 8, padding: 12, color: '#FFFFFF', fontSize: 15, fontWeight: '300', backgroundColor: '#161616', minHeight: 100, textAlignVertical: 'top', marginBottom: 12 },
  fieldLabel: { color: '#555', fontSize: 12, letterSpacing: 1, marginBottom: 8 },
  catRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  catPill: { borderWidth: 1, borderColor: '#3A3A3A', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 5 },
  catPillText: { color: '#444', fontSize: 12 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginBottom: 16 },
  cancelBtn: { borderWidth: 1, borderColor: '#3A3A3A', borderRadius: 8, paddingHorizontal: 16, paddingVertical: 8 },
  cancelText: { color: '#666', fontSize: 13 },
  saveBtn: { backgroundColor: '#FFFFFF', borderRadius: 8, paddingHorizontal: 20, paddingVertical: 8 },
  saveText: { color: '#0F0F0F', fontSize: 13, fontWeight: '500' },
});
