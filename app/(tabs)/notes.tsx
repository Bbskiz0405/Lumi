import React, { useState, useCallback, useRef } from 'react';
import {
  View, FlatList, StyleSheet, Text, TouchableOpacity, Alert,
  ActivityIndicator, Modal, TextInput, ScrollView,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getAllNotes, createNote, deleteNote, updateNote, getCustomTags, saveCustomTags } from '../../services/noteService';
import { Note, NoteCategory } from '../../types/note';

const TAG_COLORS = ['#FF88BB', '#FF9944', '#88AAFF', '#55DDAA', '#FFCC44', '#AA88FF', '#FF6655', '#66CCCC'];

function getTagColor(index: number): string {
  return TAG_COLORS[index % TAG_COLORS.length];
}

function formatDate(isoStr: string): string {
  const d = new Date(isoStr);
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export default function NotesScreen() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const hasLoaded = useRef(false);
  const [filter, setFilter] = useState<string | null>(null);
  const [tags, setTags] = useState<string[]>(['目標']);

  const [editNote, setEditNote] = useState<Note | null>(null);
  const [addingNote, setAddingNote] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [editCategory, setEditCategory] = useState<string | null>(null);

  const [addingTag, setAddingTag] = useState(false);
  const [newTagName, setNewTagName] = useState('');

  function openEdit(note: Note) {
    setEditNote(note);
    setEditContent(note.content);
    setEditCategory(note.category);
  }

  function openAdd() {
    setAddingNote(true);
    setEditContent('');
    setEditCategory(null);
  }

  function closeModal() {
    setEditNote(null);
    setAddingNote(false);
    setEditContent('');
    setEditCategory(null);
  }

  async function handleSaveEdit() {
    const content = editContent.trim();
    if (!content) {
      closeModal();
      return;
    }
    if (addingNote) {
      const created = await createNote({
        content,
        category: editCategory as NoteCategory | null,
      });
      setNotes(prev => [created, ...prev]);
    } else if (editNote) {
      await updateNote(editNote.id, {
        content,
        category: editCategory as NoteCategory | null,
      });
      setNotes(prev => prev.map(n =>
        n.id === editNote.id ? { ...n, content, category: editCategory as NoteCategory | null } : n
      ));
    }
    closeModal();
  }

  async function handleAddTag() {
    const name = newTagName.trim();
    if (!name || tags.includes(name)) return;
    const updated = [...tags, name];
    setTags(updated);
    await saveCustomTags(updated);
    setNewTagName('');
    setAddingTag(false);
  }

  function handleDeleteTag(tag: string) {
    Alert.alert('刪除標籤', `確定要刪除「${tag}」嗎？`, [
      { text: '取消', style: 'cancel' },
      {
        text: '刪除',
        style: 'destructive',
        onPress: async () => {
          const updated = tags.filter(t => t !== tag);
          setTags(updated);
          await saveCustomTags(updated);
          if (filter === tag) setFilter(null);
        },
      },
    ]);
  }

  useFocusEffect(
    useCallback(() => {
      let active = true;
      if (!hasLoaded.current) setLoading(true);

      Promise.all([getAllNotes(), getCustomTags()])
        .then(([data, customTags]) => {
          if (!active) return;
          setNotes(data);
          setTags(customTags);
          hasLoaded.current = true;
        })
        .catch(err => console.error('[NotesScreen] load failed:', err))
        .finally(() => {
          if (active) setLoading(false);
        });
      return () => { active = false; };
    }, [])
  );

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
    <SafeAreaView style={styles.safe} edges={[]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>筆記</Text>
        <TouchableOpacity onPress={openAdd} style={styles.headerAddBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={styles.headerAddText}>+</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.filterRow}>
        <TouchableOpacity
          style={[styles.filterPill, !filter && styles.filterPillActive]}
          onPress={() => setFilter(null)}
        >
          <Text style={[styles.filterText, !filter && styles.filterTextActive]}>全部</Text>
        </TouchableOpacity>
        {tags.map((tag, i) => (
          <TouchableOpacity
            key={tag}
            style={[
              styles.filterPill,
              filter === tag && { borderColor: getTagColor(i), backgroundColor: getTagColor(i) + '15' },
            ]}
            onPress={() => setFilter(filter === tag ? null : tag)}
            onLongPress={() => handleDeleteTag(tag)}
          >
            <Text style={[styles.filterText, filter === tag && { color: getTagColor(i) }]}>
              {tag}
            </Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity style={styles.addTagBtn} onPress={() => setAddingTag(true)}>
          <Text style={{ color: '#666', fontSize: 18, fontWeight: '200' }}>+</Text>
        </TouchableOpacity>
      </View>

      {addingTag && (
        <View style={styles.addTagRow}>
          <TextInput
            style={styles.addTagInput}
            value={newTagName}
            onChangeText={setNewTagName}
            placeholder="新標籤名稱..."
            placeholderTextColor="#555"
            autoFocus
            maxLength={10}
          />
          <TouchableOpacity onPress={handleAddTag} style={styles.addTagConfirm}>
            <Text style={styles.addTagConfirmText}>新增</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => { setAddingTag(false); setNewTagName(''); }}>
            <Text style={styles.addTagCancelText}>取消</Text>
          </TouchableOpacity>
        </View>
      )}

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
          renderItem={({ item }) => {
            const tagIdx = item.category ? tags.indexOf(item.category) : -1;
            const tagColor = tagIdx >= 0 ? getTagColor(tagIdx) : '#666';
            return (
              <TouchableOpacity style={styles.noteCard} onPress={() => openEdit(item)} activeOpacity={0.7}>
                <View style={styles.noteBody}>
                  <Text style={styles.noteContent} numberOfLines={4}>{item.content}</Text>
                  <View style={styles.noteMeta}>
                    <Text style={styles.noteDate}>{formatDate(item.created_at)}</Text>
                    {item.category && (
                      <View style={[styles.noteTag, { borderColor: tagColor }]}>
                        <Text style={[styles.noteTagText, { color: tagColor }]}>
                          {item.category}
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
                  <Text style={{ color: '#666', fontSize: 16, fontWeight: '200' }}>x</Text>
                </TouchableOpacity>
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={{ fontSize: 40, color: '#333', marginBottom: 12 }}>!</Text>
              <Text style={styles.emptyText}>還沒有筆記</Text>
              <Text style={styles.emptyHint}>在首頁輸入任何想法，會自動歸類到這裡</Text>
            </View>
          }
        />
      )}

      {/* Edit / Add modal */}
      <Modal
        visible={editNote !== null || addingNote}
        onRequestClose={closeModal}
        animationType="fade"
        transparent
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>{addingNote ? '新增筆記' : '編輯筆記'}</Text>
            <View style={styles.modalDivider} />
            <ScrollView style={styles.modalBody} keyboardShouldPersistTaps="handled">
              <TextInput
                style={styles.editInput}
                value={editContent}
                onChangeText={setEditContent}
                multiline
                autoFocus
                placeholder={addingNote ? '寫點什麼...' : undefined}
                placeholderTextColor="#444"
              />
              <Text style={styles.fieldLabel}>標籤</Text>
              <View style={styles.catRow}>
                <TouchableOpacity
                  style={[styles.catPill, !editCategory && styles.catPillNone]}
                  onPress={() => setEditCategory(null)}
                >
                  <Text style={[styles.catPillText, !editCategory && { color: '#FFFFFF' }]}>無</Text>
                </TouchableOpacity>
                {tags.map((tag, i) => (
                  <TouchableOpacity
                    key={tag}
                    style={[
                      styles.catPill,
                      editCategory === tag && { borderColor: getTagColor(i), backgroundColor: getTagColor(i) + '15' },
                    ]}
                    onPress={() => setEditCategory(tag)}
                  >
                    <Text style={[styles.catPillText, editCategory === tag && { color: getTagColor(i) }]}>
                      {tag}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <View style={styles.modalActions}>
                <TouchableOpacity onPress={closeModal} style={styles.cancelBtn}>
                  <Text style={styles.cancelText}>取消</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleSaveEdit} style={styles.saveBtn}>
                  <Text style={styles.saveText}>{addingNote ? '新增' : '儲存'}</Text>
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
  header: { paddingHorizontal: 24, paddingVertical: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerTitle: { color: '#FFFFFF', fontSize: 20, fontWeight: '300', letterSpacing: 2 },
  headerAddBtn: { borderWidth: 1, borderColor: '#3A3A3A', borderRadius: 18, width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  headerAddText: { color: '#FFFFFF', fontSize: 22, fontWeight: '200', lineHeight: 24, marginTop: -2 },

  filterRow: { flexDirection: 'row', paddingHorizontal: 16, paddingBottom: 8, gap: 8, flexWrap: 'wrap', alignItems: 'center' },
  filterPill: { borderWidth: 1, borderColor: '#3A3A3A', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 5 },
  filterPillActive: { borderColor: '#FFFFFF', backgroundColor: '#FFFFFF10' },
  filterText: { color: '#666', fontSize: 12 },
  filterTextActive: { color: '#FFFFFF' },
  addTagBtn: { borderWidth: 1, borderColor: '#3A3A3A', borderRadius: 16, width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },

  addTagRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 12, gap: 8 },
  addTagInput: { flex: 1, borderWidth: 1, borderColor: '#3A3A3A', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, color: '#FFFFFF', fontSize: 13, backgroundColor: '#161616' },
  addTagConfirm: { backgroundColor: '#FFFFFF', borderRadius: 6, paddingHorizontal: 12, paddingVertical: 6 },
  addTagConfirmText: { color: '#0F0F0F', fontSize: 12, fontWeight: '500' },
  addTagCancelText: { color: '#666', fontSize: 12 },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { paddingHorizontal: 16, paddingBottom: 40 },

  noteCard: { flexDirection: 'row', backgroundColor: '#111111', borderRadius: 12, borderWidth: 1, borderColor: '#252525', overflow: 'hidden' },
  noteBody: { flex: 1, padding: 14 },
  noteContent: { color: '#CCCCCC', fontSize: 14, fontWeight: '300', lineHeight: 22, marginBottom: 8 },
  noteMeta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  noteDate: { color: '#555', fontSize: 11 },
  noteTag: { borderWidth: 1, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 1 },
  noteTagText: { fontSize: 10 },
  deleteBtn: { padding: 14, alignSelf: 'flex-start' },

  empty: { alignItems: 'center', paddingTop: 80 },
  emptyText: { color: '#555', fontSize: 14, fontWeight: '300', marginTop: 12 },
  emptyHint: { color: '#444', fontSize: 12, marginTop: 6 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modal: { backgroundColor: '#111111', borderTopLeftRadius: 16, borderTopRightRadius: 16, borderWidth: 1, borderColor: '#3A3A3A', maxHeight: '85%' },
  modalTitle: { padding: 20, paddingBottom: 12, color: '#FFFFFF', fontSize: 16, fontWeight: '300', letterSpacing: 1 },
  modalDivider: { height: 1, backgroundColor: '#3A3A3A' },
  modalBody: { padding: 16 },
  editInput: { borderWidth: 1, borderColor: '#3A3A3A', borderRadius: 8, padding: 12, color: '#FFFFFF', fontSize: 15, fontWeight: '300', backgroundColor: '#161616', minHeight: 100, textAlignVertical: 'top', marginBottom: 12 },
  fieldLabel: { color: '#777', fontSize: 12, letterSpacing: 1, marginBottom: 8 },
  catRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  catPill: { borderWidth: 1, borderColor: '#3A3A3A', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 5 },
  catPillNone: { borderColor: '#FFFFFF', backgroundColor: '#FFFFFF10' },
  catPillText: { color: '#666', fontSize: 12 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginBottom: 16 },
  cancelBtn: { borderWidth: 1, borderColor: '#3A3A3A', borderRadius: 8, paddingHorizontal: 16, paddingVertical: 8 },
  cancelText: { color: '#666', fontSize: 13 },
  saveBtn: { backgroundColor: '#FFFFFF', borderRadius: 8, paddingHorizontal: 20, paddingVertical: 8 },
  saveText: { color: '#0F0F0F', fontSize: 13, fontWeight: '500' },
});
