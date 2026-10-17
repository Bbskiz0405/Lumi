import { Alert, Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { Task } from '../types/task';
import { WorkRecord } from '../types/workTime';
import { TrackerModuleDefinition } from '../types/trackerModule';
import { getTrackerReminderPlans } from './trackerModuleService';
import { TRACKER_REMINDER_PREFIX } from './trackerInsightService';

const TASK_CHANNEL_ID = 'lumi-task-reminders';
const WORK_CHANNEL_ID = 'lumi-work-reminders';
const TRACKER_CHANNEL_ID = 'lumi-tracker-reminders';

export class NotificationPermissionError extends Error {
  constructor() {
    super('通知權限未開啟，請允許通知後再設定提醒。');
    this.name = 'NotificationPermissionError';
  }
}

export function configureNotificationPresentation(): void {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

async function ensureAndroidChannels(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Promise.all([
    Notifications.setNotificationChannelAsync(TASK_CHANNEL_ID, {
      name: '任務提醒',
      description: 'Lumi 任務的到期提醒',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 180, 120, 180],
      lightColor: '#88AAFF',
      sound: 'default',
    }),
    Notifications.setNotificationChannelAsync(WORK_CHANNEL_ID, {
      name: '工時提醒',
      description: '提醒尚未完成下班打卡',
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 180],
      lightColor: '#55DDAA',
      sound: 'default',
    }),
    Notifications.setNotificationChannelAsync(TRACKER_CHANNEL_ID, {
      name: '自訂模組推算提醒',
      description: '依自訂模組紀錄推算的預測日期提醒',
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 180],
      lightColor: '#C9A0FF',
      sound: 'default',
      // Predictions (e.g. menstrual cycles) can be personal: hide the content on the lock screen.
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PRIVATE,
    }),
  ]);
}

export async function initializeNotifications(): Promise<void> {
  await ensureAndroidChannels();
}

async function ensurePermission(): Promise<boolean> {
  await ensureAndroidChannels();
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;
  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
}

/** Ask for permission when a module reminder is on; the module still saves if it is denied. */
export async function confirmTrackerReminderPermission(definition: TrackerModuleDefinition): Promise<void> {
  if (!definition.insights.some(insight => insight.type === 'cycle' && insight.remindDaysBefore !== undefined)) return;
  if (!(await ensurePermission().catch(() => false))) {
    Alert.alert('提醒未開啟', '通知權限未允許，推算照常顯示，但不會送出提醒。可到系統設定允許 Lumi 通知。');
  }
}

let trackerSync: Promise<void> = Promise.resolve();

/**
 * Replace every scheduled module reminder with the current plan. Never prompts for permission,
 * so it is safe to call on launch and after any module or record change. Calls are serialized.
 */
export function syncTrackerReminders(): Promise<void> {
  trackerSync = trackerSync.catch(() => undefined).then(async () => {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    await Promise.all(scheduled
      .filter(item => item.identifier.startsWith(TRACKER_REMINDER_PREFIX))
      .map(item => Notifications.cancelScheduledNotificationAsync(item.identifier)));
    const plans = await getTrackerReminderPlans();
    if (!plans.length || !(await Notifications.getPermissionsAsync()).granted) return;
    await ensureAndroidChannels();
    for (const plan of plans) {
      await Notifications.scheduleNotificationAsync({
        identifier: plan.id,
        content: {
          title: plan.title,
          body: plan.body,
          sound: 'default',
          data: { type: 'tracker', moduleId: plan.moduleId },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: plan.date,
          channelId: TRACKER_CHANNEL_ID,
        },
      });
    }
  });
  return trackerSync;
}

function taskNotificationId(taskId: string): string {
  return `lumi-task-${taskId}`;
}

function workNotificationId(recordId: string): string {
  return `lumi-work-${recordId}`;
}

function taskDueDate(task: Pick<Task, 'due_date' | 'due_time'>): Date | null {
  if (!task.due_date || !task.due_time) return null;
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(task.due_date);
  const timeMatch = /^(\d{2}):(\d{2})$/.exec(task.due_time);
  if (!dateMatch || !timeMatch) return null;
  const date = new Date(
    Number(dateMatch[1]),
    Number(dateMatch[2]) - 1,
    Number(dateMatch[3]),
    Number(timeMatch[1]),
    Number(timeMatch[2]),
    0,
    0
  );
  return Number.isFinite(date.getTime()) ? date : null;
}

export async function cancelTaskReminder(taskId: string): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(taskNotificationId(taskId));
}

export async function scheduleTaskReminder(task: Task): Promise<void> {
  await cancelTaskReminder(task.id);
  if (
    task.completed ||
    task.reminder_minutes === null ||
    !task.due_date ||
    !task.due_time
  ) {
    return;
  }

  const dueDate = taskDueDate(task);
  if (!dueDate) throw new Error('任務提醒日期或時間無效。');
  const triggerDate = new Date(dueDate.getTime() - task.reminder_minutes * 60000);
  if (triggerDate.getTime() <= Date.now()) return;
  if (!(await ensurePermission())) throw new NotificationPermissionError();

  await Notifications.scheduleNotificationAsync({
    identifier: taskNotificationId(task.id),
    content: {
      title: task.reminder_minutes === 0 ? '任務時間到了' : '即將到期',
      body: task.title,
      sound: 'default',
      data: { type: 'task', taskId: task.id },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: triggerDate,
      channelId: TASK_CHANNEL_ID,
    },
  });
}

export async function cancelWorkClockOutReminder(recordId: string): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(workNotificationId(recordId));
}

export async function scheduleWorkClockOutReminder(record: WorkRecord): Promise<boolean> {
  await cancelWorkClockOutReminder(record.id);
  if (record.clock_out) return true;
  const triggerDate = new Date(
    new Date(record.clock_in).getTime() +
      (record.target_minutes + record.break_minutes) * 60000
  );
  if (triggerDate.getTime() <= Date.now()) return false;
  if (!(await ensurePermission())) return false;

  await Notifications.scheduleNotificationAsync({
    identifier: workNotificationId(record.id),
    content: {
      title: '還在上班嗎？',
      body: '如果已經下班，記得回 Lumi 完成下班打卡。',
      sound: 'default',
      data: { type: 'work', recordId: record.id },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: triggerDate,
      channelId: WORK_CHANNEL_ID,
    },
  });
  return true;
}
