import React, { useState, useCallback } from 'react';
import { Text, StyleSheet } from 'react-native';
import { useFocusEffect } from 'expo-router';
import ModuleCard from './ModuleCard';
import { getNotesCount, getRecentNotes } from '../../services/noteService';

interface Props {
  onPress: () => void;
  refreshKey?: number;
}

export default function NotesModule({ onPress, refreshKey }: Props) {
  const [count, setCount] = useState(0);
  const [lastNote, setLastNote] = useState('');
  const [loadError, setLoadError] = useState(false);

  useFocusEffect(useCallback(() => {
    let active = true;
    setLoadError(false);
    Promise.all([getNotesCount(), getRecentNotes(1)])
      .then(([noteCount, notes]) => {
        if (!active) return;
        setCount(noteCount);
        const latest = notes[0]?.content ?? '';
        setLastNote(latest.length > 20 ? latest.slice(0, 20) + '...' : latest);
      })
      .catch(() => {
        if (active) setLoadError(true);
      });
    return () => {
      active = false;
    };
  }, [refreshKey]));

  return (
    <ModuleCard title="筆記" icon="file-text" onPress={onPress} accent="#88AAFF">
      {loadError ? (
        <Text style={styles.error}>暫時無法讀取</Text>
      ) : (
        <>
          <Text style={styles.count}>{count}</Text>
          <Text style={styles.label}>則筆記</Text>
        </>
      )}
      {!loadError && lastNote ? (
        <Text style={styles.preview} numberOfLines={1}>{lastNote}</Text>
      ) : null}
    </ModuleCard>
  );
}

const styles = StyleSheet.create({
  count: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '200',
    lineHeight: 36,
  },
  label: {
    color: '#666666',
    fontSize: 12,
    fontWeight: '300',
    marginTop: 2,
  },
  preview: {
    color: '#333',
    fontSize: 11,
    marginTop: 10,
  },
  error: { color: '#AA6666', fontSize: 12, lineHeight: 20, marginTop: 8 },
});
