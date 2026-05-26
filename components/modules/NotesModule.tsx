import React, { useEffect, useState } from 'react';
import { Text, StyleSheet } from 'react-native';
import ModuleCard from './ModuleCard';
import { getNotesCount, getRecentNotes } from '../../services/noteService';

interface Props {
  onPress: () => void;
  refreshKey?: number;
}

export default function NotesModule({ onPress, refreshKey }: Props) {
  const [count, setCount] = useState(0);
  const [lastNote, setLastNote] = useState('');

  useEffect(() => {
    getNotesCount().then(setCount);
    getRecentNotes(1).then(notes => {
      if (notes.length > 0) {
        const preview = notes[0].content.length > 20
          ? notes[0].content.slice(0, 20) + '...'
          : notes[0].content;
        setLastNote(preview);
      }
    });
  }, [refreshKey]);

  return (
    <ModuleCard title="筆記" icon="lightbulb-outline" onPress={onPress} accent="#88AAFF">
      <Text style={styles.count}>{count}</Text>
      <Text style={styles.label}>則筆記</Text>
      {lastNote ? (
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
    color: '#444444',
    fontSize: 12,
    fontWeight: '300',
    marginTop: 2,
  },
  preview: {
    color: '#333',
    fontSize: 11,
    marginTop: 10,
  },
});
