import React from 'react';
import { Stack } from 'expo-router';
import { PaperProvider, MD3DarkTheme } from 'react-native-paper';
import { StatusBar } from 'expo-status-bar';

const theme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: '#FFFFFF',
    primaryContainer: '#1A1A1A',
    secondary: '#888888',
    surface: '#111111',
    surfaceVariant: '#1A1A1A',
    background: '#0F0F0F',
    onBackground: '#FFFFFF',
    onSurface: '#FFFFFF',
    outline: '#2A2A2A',
  },
};

export default function RootLayout() {
  return (
    <PaperProvider theme={theme}>
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
      </Stack>
    </PaperProvider>
  );
}
