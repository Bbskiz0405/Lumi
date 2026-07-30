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
  deleteWorkRecord,
  getActiveWorkRecord,
  getWorkRecordForDate,
  getWorkRecordsForMonth,
  saveWorkRecord,
} from '../../../services/workTimeService';
import { WorkRecord } from '../../../types/workTime';
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
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('18:00');
  const [breakMinutes, setBreakMinutes] = useState('0');
  const [targetTime, setTargetTime] = useState('8:00');
  const [note, setNote] = useState('');
  const [formError, setFormError] = useState('');

  const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`;
  const today = toLocalDateString();

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setLoadError(false);
    try {
      const [dayRecord, active, records] = await Promise.all([
        getWorkRecordForDate(selectedDate),
        getActiveWorkRecord(),
        getWorkRecordsForMonth(monthKey),
      ]);
      setRecord(dayRecord);
      setActiveRecord(active);
      setMonthRecords(records);
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
      workedMinutes += metrics.workedMinutes;
      if (!metrics.active) {
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
    setBreakMinutes(String(record?.break_minutes ?? 0));
    setTargetTime(formatMinutes(record?.target_minutes ?? 480));
    setNote(record?.note ?? '');
    setFormError('');
    setModalVisible(true);
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

    const breakValue = Number(breakMinutes);
    const targetMinutes = parseDuration(targetTime);
    if (!Number.isFinite(breakValue) || breakValue < 0 || targetMinutes === null || targetMinutes <= 0) {
      setFormError('休息分鐘與標準工時無效');
      return;
    }

    const start = localDateTime(selectedDate, startTime);
    let end: Date | null = null;
    if (endTime) {
      end = localDateTime(selectedDate, endTime);
      if (end.getTime() <= start.getTime()) {
        end.setDate(end.getDate() + 1);
      }
      const grossMinutes = Math.floor((end.getTime() - start.getTime()) / 60000);
      if (breakValue > grossMinutes) {
        setFormError('休息時間不可超過整段上班時間');
        return;
      }
    }

    setBusy(true);
    setFormError('');
    try {
      await saveWorkRecord({
        work_date: selectedDate,
        clock_in: start.toISOString(),
        clock_out: end?.toISOString() ?? null,
        break_minutes: Math.round(breakValue),
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
    ? Math.min(100, (selectedMetrics.workedMinutes / record.target_minutes) * 100)
    : 0;

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
              已工作 {formatMinutes(calculateWorkMetrics(activeRecord).workedMinutes)}
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
        <TouchableOpacity style={styles.editButton} onPress={openForm}>
          <TechIcon name={record ? 'settings' : 'plus'} size={15} color="#9BA3AB" />
          <Text style={styles.editButtonText}>{record ? '編輯' : '補登'}</Text>
        </TouchableOpacity>
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
              <Text style={styles.metricValue}>{formatMinutes(selectedMetrics.workedMinutes)}</Text>
            </View>
            <View style={styles.metric}>
              <Text style={styles.metricLabel}>休息</Text>
              <Text style={styles.metricValue}>{record.break_minutes} 分</Text>
            </View>
            <View style={styles.metric}>
              <Text style={styles.metricLabel}>標準</Text>
              <Text style={styles.metricValue}>{formatMinutes(record.target_minutes)}</Text>
            </View>
            <View style={styles.metric}>
              <Text style={styles.metricLabel}>差額</Text>
              <Text style={[
                styles.metricValue,
                selectedMetrics.balanceMinutes < 0 ? styles.negative : styles.positive,
              ]}>
                {selectedMetrics.active ? '計算中' : formatMinutes(selectedMetrics.balanceMinutes, true)}
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
          <Text style={styles.monthValue}>{formatMinutes(monthSummary.workedMinutes)}</Text>
          <Text style={styles.monthLabel}>累計工時</Text>
        </View>
        <View style={styles.monthDivider} />
        <View style={styles.monthMetric}>
          <Text style={[
            styles.monthValue,
            monthSummary.balanceMinutes < 0 ? styles.negative : styles.positive,
          ]}>
            {formatMinutes(monthSummary.balanceMinutes, true)}
          </Text>
          <Text style={styles.monthLabel}>累計差額</Text>
        </View>
      </View>

      <Text style={styles.disclaimer}>
        工時差額依每筆設定的標準工時計算；薪資與法定加班費尚未納入。
      </Text>

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

            <View style={styles.formRow}>
              <View style={styles.formField}>
                <Text style={styles.formLabel}>休息分鐘</Text>
                <TextInput
                  style={styles.input}
                  value={breakMinutes}
                  onChangeText={setBreakMinutes}
                  placeholder="0"
                  placeholderTextColor="#50565C"
                  keyboardType="number-pad"
                />
              </View>
              <View style={styles.formField}>
                <Text style={styles.formLabel}>標準工時</Text>
                <TextInput
                  style={styles.input}
                  value={targetTime}
                  onChangeText={setTargetTime}
                  placeholder="8:00"
                  placeholderTextColor="#50565C"
                  keyboardType="numbers-and-punctuation"
                />
              </View>
            </View>

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
    padding: 18,
    paddingBottom: 28,
  },
  modalTitle: { color: '#FFFFFF', fontSize: 16, fontWeight: '400' },
  modalDate: { color: '#65707A', fontSize: 11, marginTop: 4, marginBottom: 16 },
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
