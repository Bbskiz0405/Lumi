import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { CalendarProvider } from '../contexts/CalendarContext';

export default function RootLayout() {
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
