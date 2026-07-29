import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import {
  BackupCounts,
  BackupPreview,
  createBackup,
  getLocalDataCounts,
  importBackup,
  ImportMode,
  previewBackupJson,
} from '../services/backupService';
import { useCalendar } from '../contexts/CalendarContext';

const MAX_IMPORT_BYTES = 15 * 1024 * 1024;

function formatError(error: unknown): string {
  return error instanceof Error ? error.message : '發生未知錯誤';
}

function formatBackupSummary(preview: BackupPreview): string {
  const { counts, backup } = preview;
  const exportedAt = new Date(backup.exportedAt).toLocaleString('zh-TW');
  return [
    `備份版本：Lumi ${backup.appVersion}`,
    `匯出時間：${exportedAt}`,
    '',
    `任務 ${counts.tasks} 筆`,
    `行程 ${counts.events} 筆`,
    `記帳 ${counts.transactions} 筆`,
    `筆記 ${counts.notes} 筆`,
    `原始輸入 ${counts.entries} 筆`,
    `預算 ${counts.budgets} 筆`,
    `其他資料 ${counts.total - counts.tasks - counts.events - counts.transactions - counts.notes - counts.entries - counts.budgets} 筆`,
  ].join('\n');
}

export default function DataSettings() {
  const { bumpRefresh } = useCalendar();
  const [counts, setCounts] = useState<BackupCounts | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyAction, setBusyAction] = useState<'export' | 'import' | null>(null);

  useEffect(() => {
    refreshCounts();
  }, []);

  async function refreshCounts() {
    try {
      setCounts(await getLocalDataCounts());
    } catch (error) {
      Alert.alert('讀取失敗', formatError(error));
    } finally {
      setLoading(false);
    }
  }

  async function handleExport() {
    if (busyAction) return;
    setBusyAction('export');
    try {
      if (!(await Sharing.isAvailableAsync())) {
        throw new Error('這台裝置目前不支援系統分享功能');
      }

      const backup = await createBackup();
      const safeTime = backup.exportedAt.replace(/[:.]/g, '-');
      const file = new File(Paths.cache, `lumi-backup-${safeTime}.json`);
      file.create({ overwrite: true });
      file.write(JSON.stringify(backup, null, 2));

      await Sharing.shareAsync(file.uri, {
        dialogTitle: '匯出 Lumi 備份',
        mimeType: 'application/json',
        UTI: 'public.json',
      });
    } catch (error) {
      Alert.alert('匯出失敗', formatError(error));
    } finally {
      setBusyAction(null);
    }
  }

  async function runImport(preview: BackupPreview, mode: ImportMode) {
    setBusyAction('import');
    try {
      const result = await importBackup(preview, mode);
      bumpRefresh();
      await refreshCounts();

      const action = mode === 'merge' ? '合併' : '取代';
      const skipped = result.skipped > 0 ? `\n略過重複資料 ${result.skipped} 筆。` : '';
      Alert.alert('匯入完成', `已${action} ${result.imported} 筆資料。${skipped}`);
    } catch (error) {
      Alert.alert('匯入失敗', `${formatError(error)}\n\n資料庫已回復到匯入前狀態。`);
    } finally {
      setBusyAction(null);
    }
  }

  function confirmReplace(preview: BackupPreview) {
    Alert.alert(
      '完全取代本機資料？',
      '任務、記帳、筆記與自訂設定會先清除，再換成備份內容。API Key 不受影響。這個動作無法復原，建議先匯出目前資料。',
      [
        { text: '取消', style: 'cancel' },
        {
          text: '確認取代',
          style: 'destructive',
          onPress: () => {
            void runImport(preview, 'replace');
          },
        },
      ]
    );
  }

  function chooseImportMode(preview: BackupPreview) {
    Alert.alert(
      '確認備份內容',
      `${formatBackupSummary(preview)}\n\n「合併」會保留本機資料並略過相同 ID；「取代」會清除本機資料後完整還原。`,
      [
        { text: '取消', style: 'cancel' },
        {
          text: '合併',
          onPress: () => {
            void runImport(preview, 'merge');
          },
        },
        {
          text: '取代',
          style: 'destructive',
          onPress: () => confirmReplace(preview),
        },
      ]
    );
  }

  async function handlePickBackup() {
    if (busyAction) return;
    setBusyAction('import');
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/json', 'text/json', 'text/plain'],
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (result.canceled) return;

      const asset = result.assets[0];
      const file = new File(asset.uri);
      const fileSize = asset.size ?? file.size;
      if (fileSize > MAX_IMPORT_BYTES) {
        throw new Error('備份檔超過 15 MB，請確認是否選到正確檔案');
      }

      const json = await file.text();
      chooseImportMode(previewBackupJson(json));
    } catch (error) {
      Alert.alert('無法讀取備份', formatError(error));
    } finally {
      setBusyAction(null);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.sectionLabel}>本機資料</Text>

      <View style={styles.summaryCard}>
        {loading ? (
          <ActivityIndicator color="#55DDAA" />
        ) : counts ? (
          <>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryName}>任務</Text>
              <Text style={styles.summaryValue}>{counts.tasks}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryName}>行程</Text>
              <Text style={styles.summaryValue}>{counts.events}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryName}>記帳</Text>
              <Text style={styles.summaryValue}>{counts.transactions}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryName}>筆記</Text>
              <Text style={styles.summaryValue}>{counts.notes}</Text>
            </View>
            <View style={[styles.summaryRow, styles.summaryTotal]}>
              <Text style={styles.summaryName}>全部紀錄</Text>
              <Text style={styles.summaryValue}>{counts.total}</Text>
            </View>
          </>
        ) : (
          <Text style={styles.mutedText}>無法取得資料統計</Text>
        )}
      </View>

      <Text style={styles.sectionLabel}>備份與還原</Text>

      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel="匯出 Lumi 備份"
        style={[styles.actionButton, busyAction && styles.disabled]}
        onPress={handleExport}
        disabled={busyAction !== null}
      >
        <View style={styles.actionCopy}>
          <Text style={styles.actionTitle}>匯出備份</Text>
          <Text style={styles.actionHint}>建立 JSON 檔並分享到雲端硬碟或其他位置</Text>
        </View>
        {busyAction === 'export' ? (
          <ActivityIndicator size="small" color="#55DDAA" />
        ) : (
          <Text style={styles.actionArrow}>{'>'}</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel="選擇 Lumi 備份檔並還原"
        style={[styles.actionButton, busyAction && styles.disabled]}
        onPress={handlePickBackup}
        disabled={busyAction !== null}
      >
        <View style={styles.actionCopy}>
          <Text style={styles.actionTitle}>匯入備份</Text>
          <Text style={styles.actionHint}>先預覽內容，再選擇合併或完全取代</Text>
        </View>
        {busyAction === 'import' ? (
          <ActivityIndicator size="small" color="#88AAFF" />
        ) : (
          <Text style={styles.actionArrow}>{'>'}</Text>
        )}
      </TouchableOpacity>

      <View style={styles.privacyCard}>
        <Text style={styles.privacyTitle}>隱私保護</Text>
        <Text style={styles.privacyText}>
          備份只包含任務、記帳、筆記、預算與非敏感設定。AI API Key
          會被明確排除，不會寫入備份檔。
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, paddingBottom: 40 },
  sectionLabel: {
    color: '#888',
    fontSize: 11,
    letterSpacing: 2,
    marginBottom: 10,
    marginTop: 4,
    textTransform: 'uppercase',
  },
  summaryCard: {
    backgroundColor: '#161616',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#252525',
    padding: 14,
    marginBottom: 20,
    minHeight: 112,
    justifyContent: 'center',
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 5,
  },
  summaryTotal: {
    borderTopWidth: 1,
    borderTopColor: '#252525',
    marginTop: 5,
    paddingTop: 10,
  },
  summaryName: { color: '#777', fontSize: 13, fontWeight: '300' },
  summaryValue: { color: '#FFFFFF', fontSize: 14, fontWeight: '500' },
  mutedText: { color: '#666', fontSize: 12, textAlign: 'center' },
  actionButton: {
    minHeight: 68,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#161616',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 10,
  },
  disabled: { opacity: 0.55 },
  actionCopy: { flex: 1, paddingRight: 12 },
  actionTitle: { color: '#FFFFFF', fontSize: 14, fontWeight: '400', marginBottom: 4 },
  actionHint: { color: '#666', fontSize: 11, lineHeight: 17, fontWeight: '300' },
  actionArrow: { color: '#555', fontSize: 16 },
  privacyCard: {
    marginTop: 12,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#173326',
    backgroundColor: '#55DDAA0D',
  },
  privacyTitle: {
    color: '#55DDAA',
    fontSize: 11,
    letterSpacing: 1,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  privacyText: { color: '#70877C', fontSize: 12, lineHeight: 19, fontWeight: '300' },
});
