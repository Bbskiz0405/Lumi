import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useCalendar } from '../../../contexts/CalendarContext';
import {
  calculateWorkMetrics,
  clockIn,
  clockOut,
  DEFAULT_WORK_PREFERENCES,
  deleteWorkRecord,
  getActiveWorkRecord,
  getWorkPreferences,
  getWorkRecordForDate,
  getWorkRecordsForMonth,
  saveWorkPreferences,
  saveWorkRecord,
} from '../../../services/workTimeService';
import { WorkPreferences, WorkRecord } from '../../../types/workTime';
import { isValidLocalDateString, parseLocalDate, toLocalDateString } from '../../../utils/date';
import TechIcon from '../../../components/ui/TechIcon';

function formatClock(isoDate: string | null): string {
  if (!isoDate) return '進行中';
  const date = new Date(isoDate);
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function formatMinutes(minutes: number, signed = false): string {
  const sign = minutes < 0 ? '-' : signed && minutes > 0 ? '+' : '';
  const absolute = Math.abs(Math.round(minutes));
  return `${sign}${Math.floor(absolute / 60)}:${String(absolute % 60).padStart(2, '0')}`;
}

function formatWorkBalance(minutes: number): string {
  if (minutes === 0) return '剛好達標';
  return `${minutes > 0 ? '多 ' : '少 '}${formatMinutes(Math.abs(minutes))}`;
}

function parseDuration(value: string): number | null {
  if (!/^\d{1,2}:\d{2}$/.test(value)) return null;
  const [hours, minutes] = value.split(':').map(Number);
  if (minutes > 59) return null;
  return hours * 60 + minutes;
}

function localDateTime(dateString: string, timeString: string): Date {
  const date = parseLocalDate(dateString);
  const [hour, minute] = timeString.split(':').map(Number);
  date.setHours(hour, minute, 0, 0);
  return date;
}

function isValidTime(value: string): boolean {
  if (!/^\d{2}:\d{2}$/.test(value)) return false;
  const [hour, minute] = value.split(':').map(Number);
  return hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59;
}

export default function WorkScreen() {
  const {
    year,
    month,
    selectedDate,
    setSelectedDate,
    bumpRefresh,
  } = useCalendar();
  const [record, setRecord] = useState<WorkRecord | null>(null);
  const [activeRecord, setActiveRecord] = useState<WorkRecord | null>(null);
  const [monthRecords, setMonthRecords] = useState<WorkRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [busy, setBusy] = useState(false);
  const [tick, setTick] = useState(0);
  const [modalVisible, setModalVisible] = useState(false);
  const [settingsModalVisible, setSettingsModalVisible] = useState(false);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('18:00');
  const [targetTime, setTargetTime] = useState('8:00');
  const [preferences, setPreferences] = useState<WorkPreferences>(DEFAULT_WORK_PREFERENCES);
  const [defaultTargetTime, setDefaultTargetTime] = useState('8:00');
  const [defaultBreakMinutes, setDefaultBreakMinutes] = useState('60');
  const [settingsError, setSettingsError] = useState('');
  const [note, setNote] = useState('');
  const [formError, setFormError] = useState('');

  const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`;
  const today = toLocalDateString();

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setLoadError(false);
    try {
      const [dayRecord, active, records, workPreferences] = await Promise.all([
        getWorkRecordForDate(selectedDate),
        getActiveWorkRecord(),
        getWorkRecordsForMonth(monthKey),
        getWorkPreferences(),
      ]);
      setRecord(dayRecord);
      setActiveRecord(active);
      setMonthRecords(records);
      setPreferences(workPreferences);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [selectedDate, monthKey]);

  useFocusEffect(
    useCallback(() => {
      void load(true);
    }, [load])
  );

  useEffect(() => {
    if (!activeRecord) return;
    const timer = setInterval(() => setTick(value => value + 1), 30000);
    return () => clearInterval(timer);
  }, [activeRecord]);

  const selectedMetrics = record ? calculateWorkMetrics(record) : null;
  const monthSummary = useMemo(() => {
    let workedMinutes = 0;
    let balanceMinutes = 0;
    let completedDays = 0;
    for (const item of monthRecords) {
      const metrics = calculateWorkMetrics(item);
      if (!metrics.active) {
        workedMinutes += metrics.workedMinutes;
        balanceMinutes += metrics.balanceMinutes;
        completedDays += 1;
      }
    }
    return { workedMinutes, balanceMinutes, completedDays };
  }, [monthRecords, tick]);

  function openForm() {
    const now = new Date();
    const defaultStart = '09:00';
    const defaultEnd = selectedDate === today && now.getHours() >= 9
      ? formatClock(now.toISOString())
      : selectedDate === today
        ? '10:00'
        : '18:00';
    setStartTime(record ? formatClock(record.clock_in) : defaultStart);
    setEndTime(record?.clock_out ? formatClock(record.clock_out) : record ? '' : defaultEnd);
    setTargetTime(formatMinutes(record?.target_minutes ?? preferences.targetMinutes));
    setNote(record?.note ?? '');
    setFormError('');
    setModalVisible(true);
  }

  function openSettings() {
    setDefaultTargetTime(formatMinutes(preferences.targetMinutes));
    setDefaultBreakMinutes(String(preferences.breakMinutes));
    setSettingsError('');
    setSettingsModalVisible(true);
  }

  async function handleSaveSettings() {
    if (busy) return;
    const targetMinutes = parseDuration(defaultTargetTime);
    const breakMinutes = Number(defaultBreakMinutes);
    if (
      targetMinutes === null ||
      targetMinutes <= 0 ||
      !Number.isFinite(breakMinutes) ||
      breakMinutes < 0
    ) {
      setSettingsError('請輸入有效的標準工時與休息時間');
      return;
    }
    if (targetMinutes + breakMinutes > 24 * 60) {
      setSettingsError('標準工時加休息時間需在 24 小時內');
      return;
    }

    setBusy(true);
    setSettingsError('');
    try {
      const saved = await saveWorkPreferences({
        targetMinutes,
        breakMinutes: Math.round(breakMinutes),
      });
      if (activeRecord) {
        await saveWorkRecord({
          work_date: activeRecord.work_date,
          clock_in: activeRecord.clock_in,
          clock_out: null,
          break_minutes: saved.breakMinutes,
          target_minutes: saved.targetMinutes,
          note: activeRecord.note,
        }, activeRecord.id);
      }
      setPreferences(saved);
      setSettingsModalVisible(false);
      await load(true);
    } catch (error) {
      setSettingsError(error instanceof Error ? error.message : '儲存失敗，請稍後再試');
    } finally {
      setBusy(false);
    }
  }

  async function handleClockIn() {
    if (busy) return;
    if (selectedDate !== today) {
      Alert.alert('請先回到今天', '即時上班打卡只能記錄現在；過去日期請使用手動補登。');
      return;
    }
    setBusy(true);
    try {
      const started = await clockIn();
      if (started.work_date !== selectedDate) setSelectedDate(started.work_date);
      bumpRefresh();
      await load();
    } catch (error) {
      Alert.alert('打卡失敗', error instanceof Error ? error.message : '請稍後再試。');
    } finally {
      setBusy(false);
    }
  }

  async function handleClockOut() {
    if (!activeRecord || busy) return;
    Alert.alert('確認下班打卡', `上班時間 ${formatClock(activeRecord.clock_in)}`, [
      { text: '取消', style: 'cancel' },
      {
        text: '下班',
        onPress: () => {
          setBusy(true);
          clockOut(activeRecord.id)
            .then(async ended => {
              setSelectedDate(ended.work_date);
              bumpRefresh();
              await load();
            })
            .catch(error => {
              Alert.alert('打卡失敗', error instanceof Error ? error.message : '請稍後再試。');
            })
            .finally(() => setBusy(false));
        },
      },
    ]);
  }

  async function handleSave() {
    if (busy) return;
    if (!isValidLocalDateString(selectedDate)) {
      setFormError('日期無效');
      return;
    }
    if (selectedDate > today) {
      setFormError('工時是實際紀錄，不能補登未來日期');
      return;
    }
    if (!isValidTime(startTime) || (!!endTime && !isValidTime(endTime))) {
      setFormError('時間請使用 HH:mm');
      return;
    }
    if (!endTime && selectedDate !== today) {
      setFormError('過去日期需要填寫下班時間');
      return;
    }
    if (!endTime && activeRecord && activeRecord.id !== record?.id) {
      setFormError('已有另一筆進行中的上班紀錄');
      return;
    }

    const targetMinutes = parseDuration(targetTime);
    if (targetMinutes === null || targetMinutes <= 0) {
      setFormError('標準工時無效');
      return;
    }

    const start = localDateTime(selectedDate, startTime);
    let end: Date | null = null;
    if (endTime) {
      end = localDateTime(selectedDate, endTime);
      if (end.getTime() <= start.getTime()) {
        end.setDate(end.getDate() + 1);
      }
    }

    setBusy(true);
    setFormError('');
    try {
      await saveWorkRecord({
        work_date: selectedDate,
        clock_in: start.toISOString(),
        clock_out: end?.toISOString() ?? null,
        break_minutes: record?.break_minutes ?? preferences.breakMinutes,
        target_minutes: targetMinutes,
        note: note.trim() || null,
      }, record?.id);
      setModalVisible(false);
      bumpRefresh();
      await load();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : '儲存失敗，請稍後再試');
    } finally {
      setBusy(false);
    }
  }

  function handleDelete() {
    if (!record || busy) return;
    Alert.alert('刪除工時紀錄', `確定刪除 ${record.work_date} 的工時嗎？`, [
      { text: '取消', style: 'cancel' },
      {
        text: '刪除',
        style: 'destructive',
        onPress: () => {
          setBusy(true);
          deleteWorkRecord(record.id)
            .then(async () => {
              setModalVisible(false);
              bumpRefresh();
              await load();
            })
            .catch(() => Alert.alert('刪除失敗', '工時紀錄仍保留，請再試一次。'))
            .finally(() => setBusy(false));
        },
      },
    ]);
  }

  const selectedMonth = Number(selectedDate.split('-')[1]);
  const selectedDay = Number(selectedDate.split('-')[2]);
  const progress = selectedMetrics && record
    ? Math.min(
        100,
        selectedMetrics.active
          ? (
              Math.max(0, Date.now() - new Date(record.clock_in).getTime()) /
              ((record.target_minutes + record.break_minutes) * 60000)
            ) * 100
          : (selectedMetrics.workedMinutes / record.target_minutes) * 100
      )
    : 0;
  const activeElapsedMinutes = activeRecord
    ? Math.max(
        0,
        Math.floor((Date.now() - new Date(activeRecord.clock_in).getTime()) / 60000)
      )
    : null;
  const activeRemainingMinutes = activeRecord && activeElapsedMinutes !== null
    ? activeRecord.target_minutes + activeRecord.break_minutes - activeElapsedMinutes
    : null;
  const activeTargetTime = activeRecord
    ? new Date(
        new Date(activeRecord.clock_in).getTime() +
          (activeRecord.target_minutes + activeRecord.break_minutes) * 60000
      ).toISOString()
    : null;

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#88AAFF" />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {activeRecord && (
        <View style={styles.activeCard}>
          <View style={styles.activePulse} />
          <View style={styles.activeCopy}>
            <Text style={styles.activeTitle}>上班中</Text>
            <Text style={styles.activeTime}>
              {activeRecord.work_date} {formatClock(activeRecord.clock_in)} 開始
              {' · '}
              {activeRemainingMinutes !== null && activeRemainingMinutes > 0
                ? `預計 ${formatClock(activeTargetTime)} 達標，還有 ${formatMinutes(activeRemainingMinutes)}`
                : activeRemainingMinutes === 0
                  ? '已達標'
                  : `已超過標準 ${formatMinutes(Math.abs(activeRemainingMinutes ?? 0))}`}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.clockOutSmall}
            onPress={() => void handleClockOut()}
            disabled={busy}
          >
            <Text style={styles.clockOutSmallText}>下班</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.heading}>
        <View>
          <Text style={styles.dayTitle}>{selectedMonth}月{selectedDay}日</Text>
          <Text style={styles.dayHint}>{selectedDate === today ? '今天' : '工時紀錄'}</Text>
        </View>
        <View style={styles.headingActions}>
          <TouchableOpacity style={styles.policyButton} onPress={openSettings}>
            <Text style={styles.policyButtonText}>
              標準 {formatMinutes(preferences.targetMinutes)}
              {' · '}
              休 {formatMinutes(preferences.breakMinutes)}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.editButton} onPress={openForm}>
            <TechIcon name={record ? 'settings' : 'plus'} size={15} color="#9BA3AB" />
            <Text style={styles.editButtonText}>{record ? '編輯' : '補登'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {loadError ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>無法讀取工時</Text>
          <TouchableOpacity onPress={() => void load()}>
            <Text style={styles.retryText}>重試</Text>
          </TouchableOpacity>
        </View>
      ) : record && selectedMetrics ? (
        <View style={styles.recordCard}>
          <View style={styles.recordTimes}>
            <View style={styles.timeBlock}>
              <Text style={styles.metricLabel}>上班</Text>
              <Text style={styles.timeValue}>{formatClock(record.clock_in)}</Text>
            </View>
            <View style={styles.timeLine} />
            <View style={styles.timeBlock}>
              <Text style={styles.metricLabel}>下班</Text>
              <Text style={styles.timeValue}>{formatClock(record.clock_out)}</Text>
            </View>
          </View>

          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progress}%` }]} />
          </View>

          <View style={styles.metricGrid}>
            <View style={styles.metric}>
              <Text style={styles.metricLabel}>實際工時</Text>
              <Text style={styles.metricValue}>
                {selectedMetrics.active
                  ? '下班後結算'
                  : formatMinutes(selectedMetrics.workedMinutes)}
              </Text>
            </View>
            <View style={styles.metric}>
              <Text style={styles.metricLabel}>固定休息</Text>
              <Text style={styles.metricValue}>{formatMinutes(record.break_minutes)}</Text>
            </View>
            <View style={styles.metric}>
              <Text style={styles.metricLabel}>標準</Text>
              <Text style={styles.metricValue}>{formatMinutes(record.target_minutes)}</Text>
            </View>
            <View style={styles.metric}>
              <Text style={styles.metricLabel}>工時結餘</Text>
              <Text style={[
                styles.metricValue,
                selectedMetrics.balanceMinutes < 0 ? styles.negative : styles.positive,
              ]}>
                {selectedMetrics.active
                  ? '計算中'
                  : formatWorkBalance(selectedMetrics.balanceMinutes)}
              </Text>
            </View>
          </View>
          {!!record.note && <Text style={styles.noteText}>{record.note}</Text>}
        </View>
      ) : (
        <View style={styles.emptyCard}>
          <TechIcon name="clock" size={27} color="#4D555D" />
          <Text style={styles.emptyTitle}>這天還沒有工時紀錄</Text>
          <Text style={styles.emptyText}>可以即時打卡，或手動補上班與下班時間。</Text>
          {selectedDate === today && !activeRecord && (
            <TouchableOpacity
              style={styles.clockInButton}
              onPress={() => void handleClockIn()}
              disabled={busy}
            >
              {busy ? (
                <ActivityIndicator size="small" color="#0F0F0F" />
              ) : (
                <Text style={styles.clockInText}>上班打卡</Text>
              )}
            </TouchableOpacity>
          )}
        </View>
      )}

      <Text style={styles.sectionLabel}>{month + 1} 月摘要</Text>
      <View style={styles.monthCard}>
        <View style={styles.monthMetric}>
          <Text style={styles.monthValue}>{monthSummary.completedDays}</Text>
          <Text style={styles.monthLabel}>完成天數</Text>
        </View>
        <View style={styles.monthDivider} />
        <View style={styles.monthMetric}>
          <Text style={styles.monthValue}>
            {monthSummary.completedDays > 0
              ? formatMinutes(monthSummary.workedMinutes)
              : '—'}
          </Text>
          <Text style={styles.monthLabel}>已結算工時</Text>
        </View>
        <View style={styles.monthDivider} />
        <View style={styles.monthMetric}>
          <Text style={[
            styles.monthValue,
            monthSummary.completedDays > 0 && (
              monthSummary.balanceMinutes < 0 ? styles.negative : styles.positive
            ),
          ]}>
            {monthSummary.completedDays > 0
              ? formatWorkBalance(monthSummary.balanceMinutes)
              : '尚未結算'}
          </Text>
          <Text style={styles.monthLabel}>本月工時結餘</Text>
        </View>
      </View>

      <Text style={styles.disclaimer}>
        工時結餘＝實際工時－當日標準工時，不等同加班費或薪資。
      </Text>

      <Modal
        visible={settingsModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setSettingsModalVisible(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.settingsModalCard}>
            <Text style={styles.modalTitle}>工時設定</Text>
            <Text style={styles.settingsDescription}>
              設定每日有效工時與固定休息；會套用到目前上班中與之後的紀錄。
            </Text>

            <Text style={styles.formLabel}>每日標準工時</Text>
            <TextInput
              style={styles.input}
              value={defaultTargetTime}
              onChangeText={setDefaultTargetTime}
              placeholder="8:00"
              placeholderTextColor="#50565C"
              keyboardType="numbers-and-punctuation"
            />
            <View style={styles.targetChoices}>
              {['7:00', '7:30', '8:00', '8:30', '9:00'].map(value => (
                <TouchableOpacity
                  key={value}
                  style={[
                    styles.targetChoice,
                    defaultTargetTime === value && styles.targetChoiceActive,
                  ]}
                  onPress={() => setDefaultTargetTime(value)}
                >
                  <Text style={[
                    styles.targetChoiceText,
                    defaultTargetTime === value && styles.targetChoiceTextActive,
                  ]}>
                    {value}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.formLabel}>固定休息分鐘</Text>
            <TextInput
              style={styles.input}
              value={defaultBreakMinutes}
              onChangeText={setDefaultBreakMinutes}
              placeholder="60"
              placeholderTextColor="#50565C"
              keyboardType="number-pad"
            />
            <View style={styles.targetChoices}>
              {[0, 30, 60, 90].map(value => {
                const selected = defaultBreakMinutes === String(value);
                return (
                  <TouchableOpacity
                    key={value}
                    style={[styles.targetChoice, selected && styles.targetChoiceActive]}
                    onPress={() => setDefaultBreakMinutes(String(value))}
                  >
                    <Text style={[
                      styles.targetChoiceText,
                      selected && styles.targetChoiceTextActive,
                    ]}>
                      {value === 0 ? '不扣除' : `${value} 分`}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <Text style={styles.policyExplanation}>
              例如標準 8:00、休息 60 分，09:00 上班會在 18:00 達標；下班後有效工時會扣除 60 分。
            </Text>

            {!!settingsError && <Text style={styles.formError}>{settingsError}</Text>}

            <View style={styles.settingsActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setSettingsModalVisible(false)}
                disabled={busy}
              >
                <Text style={styles.cancelText}>取消</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveButton, busy && styles.disabled]}
                onPress={() => void handleSaveSettings()}
                disabled={busy}
              >
                <Text style={styles.saveText}>{busy ? '儲存中…' : '儲存設定'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalCard}>
            <ScrollView
              contentContainerStyle={styles.modalContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <Text style={styles.modalTitle}>{record ? '編輯工時' : '補登工時'}</Text>
              <Text style={styles.modalDate}>{selectedDate}</Text>

              <View style={styles.formRow}>
                <View style={styles.formField}>
                  <Text style={styles.formLabel}>上班</Text>
                  <TextInput
                    style={styles.input}
                    value={startTime}
                    onChangeText={setStartTime}
                    placeholder="09:00"
                    placeholderTextColor="#50565C"
                    keyboardType="numbers-and-punctuation"
                  />
                </View>
                <View style={styles.formField}>
                  <Text style={styles.formLabel}>下班</Text>
                  <TextInput
                    style={styles.input}
                    value={endTime}
                    onChangeText={setEndTime}
                    placeholder="留空表示進行中"
                    placeholderTextColor="#50565C"
                    keyboardType="numbers-and-punctuation"
                  />
                </View>
              </View>
              <Text style={styles.overnightHint}>下班時間早於上班時間時，會自動視為隔天下班。</Text>

              <Text style={styles.formLabel}>當日標準工時</Text>
              <TextInput
                style={styles.input}
                value={targetTime}
                onChangeText={setTargetTime}
                placeholder="8:00"
                placeholderTextColor="#50565C"
                keyboardType="numbers-and-punctuation"
              />
              <Text style={styles.overnightHint}>
                只調整 {selectedDate}；其他日期仍使用工時設定。
              </Text>

              <TextInput
                style={[styles.input, styles.noteInput]}
                value={note}
                onChangeText={setNote}
                placeholder="備註，例如請假、忘記打卡（選填）"
                placeholderTextColor="#50565C"
                multiline
                textAlignVertical="top"
              />

              {!!formError && <Text style={styles.formError}>{formError}</Text>}

              <View style={styles.modalActions}>
                {record ? (
                  <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
                    <Text style={styles.deleteText}>刪除</Text>
                  </TouchableOpacity>
                ) : <View />}
                <View style={styles.modalRight}>
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={() => setModalVisible(false)}
                    disabled={busy}
                  >
                    <Text style={styles.cancelText}>取消</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.saveButton, busy && styles.disabled]}
                    onPress={() => void handleSave()}
                    disabled={busy}
                  >
                    <Text style={styles.saveText}>{busy ? '儲存中…' : '儲存'}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0F0F0F' },
  container: { padding: 18, paddingBottom: 40, backgroundColor: '#0F0F0F' },
  activeCard: {
    minHeight: 62,
    borderWidth: 1,
    borderColor: '#315C50',
    backgroundColor: '#13201C',
    borderRadius: 10,
    paddingHorizontal: 13,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  activePulse: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#55DDAA', marginRight: 10 },
  activeCopy: { flex: 1 },
  activeTitle: { color: '#D9F4E9', fontSize: 13 },
  activeTime: { color: '#718A7F', fontSize: 10, marginTop: 4 },
  clockOutSmall: {
    minWidth: 54,
    minHeight: 34,
    borderWidth: 1,
    borderColor: '#4A6B5F',
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clockOutSmallText: { color: '#8CCBB5', fontSize: 12 },
  heading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 11,
  },
  dayTitle: { color: '#F0F2F4', fontSize: 17, fontWeight: '400' },
  dayHint: { color: '#59616A', fontSize: 10, marginTop: 3 },
  headingActions: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  policyButton: {
    minHeight: 34,
    borderWidth: 1,
    borderColor: '#29343D',
    backgroundColor: '#13181C',
    borderRadius: 7,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  policyButtonText: { color: '#88AAFF', fontSize: 10 },
  editButton: {
    minHeight: 34,
    borderWidth: 1,
    borderColor: '#30353A',
    borderRadius: 7,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  editButtonText: { color: '#9BA3AB', fontSize: 11 },
  recordCard: {
    borderWidth: 1,
    borderColor: '#2A3035',
    backgroundColor: '#141719',
    borderRadius: 11,
    padding: 15,
    marginBottom: 20,
  },
  recordTimes: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  timeBlock: { flex: 1 },
  timeLine: { width: 25, height: 1, backgroundColor: '#3A4249', marginHorizontal: 10 },
  timeValue: { color: '#FFFFFF', fontSize: 22, fontWeight: '300', marginTop: 4 },
  metricLabel: { color: '#59616A', fontSize: 10, letterSpacing: 0.5 },
  progressTrack: { height: 3, borderRadius: 2, backgroundColor: '#252A2E', marginBottom: 16 },
  progressFill: { height: 3, borderRadius: 2, backgroundColor: '#55DDAA' },
  metricGrid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 15 },
  metric: { width: '50%' },
  metricValue: { color: '#D8DCE0', fontSize: 15, marginTop: 4 },
  positive: { color: '#55DDAA' },
  negative: { color: '#D58A60' },
  noteText: {
    color: '#737B83',
    fontSize: 11,
    lineHeight: 17,
    borderTopWidth: 1,
    borderTopColor: '#292E32',
    marginTop: 14,
    paddingTop: 12,
  },
  emptyCard: {
    minHeight: 178,
    borderWidth: 1,
    borderColor: '#292E33',
    backgroundColor: '#131517',
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
    marginBottom: 20,
  },
  emptyTitle: { color: '#AAB0B6', fontSize: 13, marginTop: 10 },
  emptyText: { color: '#555D64', fontSize: 11, marginTop: 5, textAlign: 'center' },
  retryText: { color: '#88AAFF', fontSize: 12, padding: 10 },
  clockInButton: {
    minWidth: 126,
    minHeight: 40,
    backgroundColor: '#E9ECEF',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  clockInText: { color: '#101214', fontSize: 13, fontWeight: '600' },
  sectionLabel: { color: '#59616A', fontSize: 10, letterSpacing: 1.2, marginBottom: 8 },
  monthCard: {
    minHeight: 82,
    borderWidth: 1,
    borderColor: '#292D31',
    backgroundColor: '#141618',
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  monthMetric: { flex: 1, alignItems: 'center' },
  monthValue: { color: '#E4E7EA', fontSize: 16, fontWeight: '400' },
  monthLabel: { color: '#555D64', fontSize: 9, marginTop: 5 },
  monthDivider: { width: 1, height: 34, backgroundColor: '#292D31' },
  disclaimer: { color: '#4F565D', fontSize: 10, lineHeight: 16 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.72)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#111315',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderWidth: 1,
    borderColor: '#30343A',
    maxHeight: '88%',
    overflow: 'hidden',
  },
  modalContent: {
    padding: 18,
    paddingBottom: 28,
  },
  settingsModalCard: {
    backgroundColor: '#111315',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderWidth: 1,
    borderColor: '#30343A',
    padding: 18,
    paddingBottom: 28,
  },
  modalTitle: { color: '#FFFFFF', fontSize: 16, fontWeight: '400' },
  modalDate: { color: '#65707A', fontSize: 11, marginTop: 4, marginBottom: 16 },
  settingsDescription: { color: '#626C75', fontSize: 11, lineHeight: 17, marginTop: 6, marginBottom: 16 },
  targetChoices: { flexDirection: 'row', gap: 6, marginBottom: 16 },
  targetChoice: {
    flex: 1,
    minHeight: 34,
    borderWidth: 1,
    borderColor: '#30363B',
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  targetChoiceActive: { borderColor: '#52749A', backgroundColor: '#172230' },
  targetChoiceText: { color: '#707880', fontSize: 10 },
  targetChoiceTextActive: { color: '#9DBFFF' },
  policyExplanation: { color: '#59636C', fontSize: 10, lineHeight: 16, marginBottom: 15 },
  formRow: { flexDirection: 'row', gap: 10 },
  formField: { flex: 1 },
  formLabel: { color: '#646C74', fontSize: 10, marginBottom: 6 },
  input: {
    minHeight: 43,
    borderWidth: 1,
    borderColor: '#34393E',
    backgroundColor: '#15181A',
    borderRadius: 7,
    paddingHorizontal: 11,
    color: '#FFFFFF',
    fontSize: 13,
    marginBottom: 11,
  },
  overnightHint: { color: '#4F565D', fontSize: 9, marginTop: -5, marginBottom: 12 },
  noteInput: { minHeight: 72, paddingTop: 10 },
  formError: { color: '#D66F66', fontSize: 11, marginBottom: 10 },
  modalActions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  settingsActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 4 },
  modalRight: { flexDirection: 'row', gap: 8 },
  deleteButton: { paddingHorizontal: 8, paddingVertical: 10 },
  deleteText: { color: '#C86A64', fontSize: 12 },
  cancelButton: {
    minWidth: 62,
    borderWidth: 1,
    borderColor: '#34393E',
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: { color: '#838A91', fontSize: 12 },
  saveButton: {
    minWidth: 70,
    minHeight: 40,
    backgroundColor: '#FFFFFF',
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveText: { color: '#111315', fontSize: 12, fontWeight: '600' },
  disabled: { opacity: 0.55 },
});
