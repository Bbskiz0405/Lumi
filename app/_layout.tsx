import React, { useEffect } from 'react';
import { Stack, useRouter } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { StatusBar } from 'expo-status-bar';
import { CalendarProvider } from '../contexts/CalendarContext';
import {
  configureNotificationPresentation,
  initializeNotifications,
} from '../services/notificationService';

configureNotificationPresentation();

export default function RootLayout() {
  const router = useRouter();
  const notificationResponse = Notifications.useLastNotificationResponse();

  useEffect(() => {
    initializeNotifications().catch(error => {
      console.error('[notifications] initialization failed:', error);
    });
  }, []);

  useEffect(() => {
    if (!notificationResponse) return;
    const data = notificationResponse.notification.request.content.data ?? {};
    if (data.type === 'task' && typeof data.taskId === 'string') {
      router.push(`/task/${data.taskId}`);
    } else if (data.type === 'work') {
      router.push('/work');
    }
    Notifications.clearLastNotificationResponse();
  }, [notificationResponse, router]);

  return (
    <CalendarProvider>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="task/[id]"
          options={{
            headerShown: true,
            headerTitle: '任務詳情',
            headerStyle: { backgroundColor: '#0F0F0F' },
            headerTintColor: '#FFFFFF',
            presentation: 'card',
          }}
        />
        <Stack.Screen
          name="ask"
          options={{
            headerShown: true,
            headerTitle: '問 Lumi',
            headerStyle: { backgroundColor: '#0F0F0F' },
            headerTintColor: '#FFFFFF',
            presentation: 'card',
          }}
        />
        <Stack.Screen
          name="timeline"
          options={{
            headerShown: true,
            headerTitle: '時間軸',
            headerStyle: { backgroundColor: '#0F0F0F' },
            headerTintColor: '#FFFFFF',
            presentation: 'card',
          }}
        />
        <Stack.Screen
          name="settings"
          options={{
            headerShown: true,
            headerTitle: 'AI 設定',
            headerStyle: { backgroundColor: '#0F0F0F' },
            headerTintColor: '#FFFFFF',
            presentation: 'card',
          }}
        />
        <Stack.Screen
          name="calendar-settings"
          options={{
            headerShown: true,
            headerTitle: '日曆連動',
            headerStyle: { backgroundColor: '#0F0F0F' },
            headerTintColor: '#FFFFFF',
            presentation: 'card',
          }}
        />
      </Stack>
    </CalendarProvider>
  );
}
