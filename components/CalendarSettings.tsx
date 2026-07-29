import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  CalendarSyncConfig,
  DeviceCalendarOption,
  getCalendarPermission,
  getCalendarSyncConfig,
  getWritableDeviceCalendars,
  requestCalendarPermission,
  saveCalendarSyncConfig,
  setCalendarAutoSync,
  setCalendarIntegrationEnabled,
  syncUpcomingTasks,
} from '../services/calendarIntegrationService';
import { useCalendar } from '../contexts/CalendarContext';
import TechIcon from './ui/TechIcon';

export default function CalendarSettings() {
  const { bumpRefresh } = useCalendar();
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [canAskAgain, setCanAskAgain] = useState(true);
  const [config, setConfig] = useState<CalendarSyncConfig | null>(null);
  const [calendars, setCalendars] = useState<DeviceCalendarOption[]>([]);

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    setLoading(true);
    try {
      const [permission, savedConfig] = await Promise.all([
        getCalendarPermission(),
        getCalendarSyncConfig(),
      ]);
      setPermissionGranted(permission.granted);
      setCanAskAgain(permission.canAskAgain);
      setConfig(savedConfig);
      setCalendars(permission.granted ? await getWritableDeviceCalendars() : []);
    } catch {
      Alert.alert('讀取失敗', '目前無法取得手機的日曆設定，請稍後再試。');
    } finally {
      setLoading(false);
    }
  }

  async function handlePermission() {
    setBusy(true);
    try {
      const permission = await requestCalendarPermission();
      setPermissionGranted(permission.granted);
      setCanAskAgain(permission.canAskAgain);
      if (!permission.granted) {
        Alert.alert(
          '需要日曆權限',
          'Lumi 只有在你允許後，才能顯示行程並同步有日期的任務。你可以隨時在系統設定關閉。',
          permission.canAskAgain
            ? [{ text: '知道了' }]
            : [
                { text: '取消', style: 'cancel' },
                { text: '開啟系統設定', onPress: () => void Linking.openSettings() },
              ]
        );
        return;
      }
      setCalendars(await getWritableDeviceCalendars());
    } catch {
      Alert.alert('授權失敗', '目前無法開啟日曆權限，請稍後再試。');
    } finally {
      setBusy(false);
    }
  }

  async function chooseCalendar(calendar: DeviceCalendarOption) {
    const nextConfig: CalendarSyncConfig = {
      enabled: true,
      autoSyncTasks: true,
      calendarId: calendar.id,
      calendarTitle: calendar.title,
      accountName: calendar.accountName,
      calendarColor: calendar.color,
    };
    setBusy(true);
    try {
      await saveCalendarSyncConfig(nextConfig);
      setConfig(nextConfig);
      bumpRefresh();
    } catch {
      Alert.alert('連接失敗', '無法儲存日曆選擇，請再試一次。');
    } finally {
      setBusy(false);
    }
  }

  async function toggleEnabled(enabled: boolean) {
    if (!config) return;
    setConfig({ ...config, enabled });
    try {
      await setCalendarIntegrationEnabled(enabled);
      bumpRefresh();
    } catch {
      setConfig(config);
      Alert.alert('更新失敗', '日曆連動設定沒有變更，請再試一次。');
    }
  }

  async function toggleAutoSync(enabled: boolean) {
    if (!config) return;
    setConfig({ ...config, autoSyncTasks: enabled });
    try {
      await setCalendarAutoSync(enabled);
    } catch {
      setConfig(config);
      Alert.alert('更新失敗', '自動同步設定沒有變更，請再試一次。');
    }
  }

  async function handleSyncExisting() {
    if (busy) return;
    setBusy(true);
    try {
      const result = await syncUpcomingTasks();
      bumpRefresh();
      Alert.alert(
        '同步完成',
        `已同步 ${result.synced} 件任務。略過 ${result.skipped} 件，失敗 ${result.failed} 件。`
      );
    } catch {
      Alert.alert('同步失敗', '未完成任務仍保留在 Lumi，請稍後再試。');
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#88AAFF" />
      </View>
    );
  }

  const selectedCalendarAvailable =
    !config || calendars.some(calendar => calendar.id === config.calendarId);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.intro}>
        <View style={styles.introIcon}>
          <TechIcon name="calendar" size={23} color="#88AAFF" />
        </View>
        <View style={styles.introCopy}>
          <Text style={styles.introTitle}>讓任務出現在你每天看的日曆</Text>
          <Text style={styles.introText}>
            Google 原有行程只會顯示在 Lumi，不會自動變成任務。Lumi 只管理自己建立的連動行程。
          </Text>
        </View>
      </View>

      {!permissionGranted ? (
        <TouchableOpacity
          style={[styles.primaryButton, busy && styles.disabled]}
          onPress={canAskAgain ? handlePermission : () => void Linking.openSettings()}
          disabled={busy}
        >
          {busy ? (
            <ActivityIndicator color="#0F0F0F" />
          ) : (
            <Text style={styles.primaryButtonText}>
              {canAskAgain ? '允許存取日曆' : '前往系統設定開啟權限'}
            </Text>
          )}
        </TouchableOpacity>
      ) : (
        <>
          {config && (
            <>
              <Text style={styles.sectionLabel}>目前連動</Text>
              <View style={styles.statusCard}>
                <View style={styles.statusHead}>
                  <View style={[
                    styles.statusDot,
                    (!config.enabled || !selectedCalendarAvailable) && styles.statusDotInactive,
                  ]} />
                  <View style={styles.statusCopy}>
                    <Text style={styles.statusTitle}>{config.calendarTitle}</Text>
                    <Text style={styles.statusAccount}>
                      {selectedCalendarAvailable
                        ? config.accountName
                        : '手機目前找不到這個日曆，請重新選擇'}
                    </Text>
                  </View>
                  <Switch
                    value={config.enabled}
                    onValueChange={value => void toggleEnabled(value)}
                    trackColor={{ false: '#34383D', true: '#315C50' }}
                    thumbColor={config.enabled ? '#55DDAA' : '#777'}
                  />
                </View>

                <View style={styles.settingRow}>
                  <View style={styles.settingCopy}>
                    <Text style={styles.settingTitle}>自動同步有日期的任務</Text>
                    <Text style={styles.settingHint}>新增或改期後，自動更新 Lumi 建立的日曆行程</Text>
                  </View>
                  <Switch
                    value={config.autoSyncTasks}
                    onValueChange={value => void toggleAutoSync(value)}
                    disabled={!config.enabled}
                    trackColor={{ false: '#34383D', true: '#315C50' }}
                    thumbColor={config.autoSyncTasks ? '#55DDAA' : '#777'}
                  />
                </View>

                <TouchableOpacity
                  style={[
                    styles.syncButton,
                    (!config.enabled || !selectedCalendarAvailable || busy) && styles.disabled,
                  ]}
                  onPress={handleSyncExisting}
                  disabled={!config.enabled || !selectedCalendarAvailable || busy}
                >
                  {busy ? (
                    <ActivityIndicator size="small" color="#88AAFF" />
                  ) : (
                    <>
                      <TechIcon name="rotate-ccw" size={16} color="#88AAFF" />
                      <Text style={styles.syncButtonText}>同步目前未完成任務</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </>
          )}

          <Text style={styles.sectionLabel}>{config ? '更換日曆' : '選擇要連動的日曆'}</Text>
          {calendars.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>找不到可寫入的日曆</Text>
              <Text style={styles.emptyText}>
                請先在手機加入 Google 帳號，並確認 Google 日曆已開啟同步。
              </Text>
            </View>
          ) : (
            calendars.map(calendar => {
              const selected = config?.calendarId === calendar.id;
              return (
                <TouchableOpacity
                  key={calendar.id}
                  style={[styles.calendarRow, selected && styles.calendarRowSelected]}
                  onPress={() => void chooseCalendar(calendar)}
                  disabled={busy}
                >
                  <View style={[styles.calendarColor, { backgroundColor: calendar.color }]} />
                  <View style={styles.calendarCopy}>
                    <View style={styles.calendarTitleRow}>
                      <Text style={[styles.calendarTitle, selected && styles.calendarTitleSelected]}>
                        {calendar.title}
                      </Text>
                      {calendar.isGoogle && <Text style={styles.googleBadge}>Google</Text>}
                    </View>
                    <Text style={styles.calendarAccount}>{calendar.accountName}</Text>
                  </View>
                  {selected && <TechIcon name="check-square" size={18} color="#55DDAA" />}
                </TouchableOpacity>
              );
            })
          )}
        </>
      )}

      <View style={styles.privacyCard}>
        <Text style={styles.privacyTitle}>本機優先</Text>
        <Text style={styles.privacyText}>
          日曆內容由手機系統提供，不會傳給 Lumi 的 AI 供應商。你關閉連動後，既有 Google 行程不會被批次刪除。
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  container: { padding: 20, paddingBottom: 48 },
  intro: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#263040',
    backgroundColor: '#11151B',
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
  },
  introIcon: {
    width: 40,
    height: 40,
    borderWidth: 1,
    borderColor: '#303A4B',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  introCopy: { flex: 1 },
  introTitle: { color: '#FFFFFF', fontSize: 14, fontWeight: '400', marginBottom: 5 },
  introText: { color: '#788396', fontSize: 12, lineHeight: 18, fontWeight: '300' },
  sectionLabel: {
    color: '#777',
    fontSize: 11,
    letterSpacing: 1.5,
    marginTop: 4,
    marginBottom: 10,
  },
  primaryButton: {
    minHeight: 46,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  primaryButtonText: { color: '#0F0F0F', fontSize: 14, fontWeight: '600' },
  disabled: { opacity: 0.5 },
  statusCard: {
    borderWidth: 1,
    borderColor: '#2A2E33',
    backgroundColor: '#151719',
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
  },
  statusHead: { flexDirection: 'row', alignItems: 'center' },
  statusDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#55DDAA', marginRight: 10 },
  statusDotInactive: { backgroundColor: '#C88752' },
  statusCopy: { flex: 1 },
  statusTitle: { color: '#FFFFFF', fontSize: 14, fontWeight: '400' },
  statusAccount: { color: '#666', fontSize: 11, marginTop: 3 },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#292C30',
    marginTop: 14,
    paddingTop: 14,
  },
  settingCopy: { flex: 1, paddingRight: 12 },
  settingTitle: { color: '#D2D5D8', fontSize: 13 },
  settingHint: { color: '#5F656C', fontSize: 11, lineHeight: 17, marginTop: 3 },
  syncButton: {
    minHeight: 42,
    borderWidth: 1,
    borderColor: '#33405A',
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 14,
  },
  syncButtonText: { color: '#88AAFF', fontSize: 13 },
  emptyCard: {
    borderWidth: 1,
    borderColor: '#2A2A2A',
    borderRadius: 10,
    padding: 14,
    marginBottom: 20,
  },
  emptyTitle: { color: '#AAAAAA', fontSize: 13, marginBottom: 5 },
  emptyText: { color: '#5F5F5F', fontSize: 12, lineHeight: 18 },
  calendarRow: {
    minHeight: 62,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#292C30',
    backgroundColor: '#141618',
    borderRadius: 9,
    paddingHorizontal: 13,
    marginBottom: 8,
  },
  calendarRowSelected: { borderColor: '#315C50', backgroundColor: '#14201C' },
  calendarColor: { width: 4, height: 30, borderRadius: 2, marginRight: 12 },
  calendarCopy: { flex: 1 },
  calendarTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  calendarTitle: { color: '#C9CDD1', fontSize: 14 },
  calendarTitleSelected: { color: '#FFFFFF' },
  calendarAccount: { color: '#5D6268', fontSize: 11, marginTop: 3 },
  googleBadge: {
    color: '#88AAFF',
    fontSize: 9,
    borderWidth: 1,
    borderColor: '#35405A',
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  privacyCard: {
    marginTop: 14,
    borderWidth: 1,
    borderColor: '#173326',
    backgroundColor: '#55DDAA0D',
    borderRadius: 10,
    padding: 14,
  },
  privacyTitle: { color: '#55DDAA', fontSize: 11, letterSpacing: 1, marginBottom: 6 },
  privacyText: { color: '#70877C', fontSize: 12, lineHeight: 19, fontWeight: '300' },
});
