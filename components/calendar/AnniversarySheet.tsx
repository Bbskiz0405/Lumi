import React, { useRef, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SavedAnniversary, deleteAnniversary, saveAnniversary } from '../../services/anniversaryService';

interface Props {
  initial: SavedAnniversary | null;
  selectedDate: string;
  onClose: () => void;
  onSaved: () => void;
}

export default function AnniversarySheet({initial, selectedDate, onClose, onSaved}: Props) {
  const insets = useSafeAreaInsets();
  const [name, setName] = useState(initial?.name ?? '');
  const [date, setDate] = useState(initial?.date ?? selectedDate);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [error, setError] = useState('');
  function close() {
    if (busyRef.current) return;
    if (name !== (initial?.name ?? '') || date !== (initial?.date ?? selectedDate)) {
      Alert.alert('放棄變更？', '尚未儲存的內容將不會保留。', [
        {text:'繼續編輯',style:'cancel'}, {text:'放棄',style:'destructive',onPress:onClose},
      ]);
    } else onClose();
  }
  async function submit(remove = false) {
    if (busyRef.current) return;
    busyRef.current = true; setBusy(true); setError('');
    try {
      if (remove && initial) await deleteAnniversary(initial.id);
      else await saveAnniversary({name:name.trim(),date:date.trim()},initial?.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : '儲存失敗，請重試');
      busyRef.current = false; setBusy(false);
      return;
    }
    busyRef.current = false; setBusy(false);
    onSaved();
  }
  return <Modal visible transparent animationType="slide" onRequestClose={close}>
    <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={[styles.sheet,{paddingBottom:Math.max(insets.bottom,16)}]}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
          <Text style={styles.title}>{initial ? '編輯紀念日' : '新增紀念日'}</Text>
          <Text style={styles.hint}>每年同月同日顯示在 Lumi 日曆，不計入筆記或任務。2 月 29 日僅在閏年顯示。</Text>
          <Text style={styles.label}>名稱（必填）</Text>
          <TextInput accessibilityLabel="紀念日名稱" style={styles.input} value={name} onChangeText={setName} editable={!busy} placeholder="例如：我們交往紀念日" placeholderTextColor="#888888" />
          <Text style={styles.label}>日期（YYYY-MM-DD，必填）</Text>
          <TextInput accessibilityLabel="紀念日日期" style={styles.input} value={date} onChangeText={setDate} editable={!busy} autoCapitalize="none" autoCorrect={false} placeholder="2026-09-22" placeholderTextColor="#888888" />
          {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
          <TouchableOpacity accessibilityRole="button" style={[styles.button,styles.primary,busy && styles.disabled]} disabled={busy} onPress={() => void submit()}>
            {busy ? <ActivityIndicator color="#111111" /> : <Text style={styles.primaryText}>儲存紀念日</Text>}
          </TouchableOpacity>
          <TouchableOpacity accessibilityRole="button" style={styles.button} disabled={busy} onPress={close}><Text style={styles.text}>取消</Text></TouchableOpacity>
          {initial && <TouchableOpacity accessibilityRole="button" style={styles.button} disabled={busy} onPress={() => Alert.alert('刪除紀念日', `確定刪除「${initial.name}」？所有年份的顯示及問 Lumi 的這筆記憶都會移除。`,[
            {text:'取消',style:'cancel'}, {text:'刪除',style:'destructive',onPress:() => void submit(true)},
          ])}><Text style={styles.error}>刪除紀念日</Text></TouchableOpacity>}
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  </Modal>;
}

const styles = StyleSheet.create({
  overlay:{flex:1,justifyContent:'flex-end',backgroundColor:'rgba(0,0,0,0.7)'},
  sheet:{maxHeight:'90%',backgroundColor:'#111111',borderTopLeftRadius:16,borderTopRightRadius:16,borderWidth:1,borderColor:'#2A2A2A'},
  content:{padding:20,gap:12}, title:{fontSize:20,color:'#FFFFFF',fontWeight:'300'},
  hint:{color:'#AAAAAA',fontSize:14,lineHeight:22}, label:{color:'#DDDDDD',fontSize:14},
  input:{minHeight:48,borderWidth:1,borderColor:'#444444',borderRadius:8,padding:12,color:'#FFFFFF',fontSize:16,backgroundColor:'#161616'},
  button:{minHeight:48,alignItems:'center',justifyContent:'center',borderRadius:8},
  primary:{backgroundColor:'#FF88BB',marginTop:8}, primaryText:{color:'#111111',fontSize:16},
  text:{color:'#DDDDDD',fontSize:16},error:{color:'#FF9999',fontSize:14},disabled:{opacity:0.5},
});
