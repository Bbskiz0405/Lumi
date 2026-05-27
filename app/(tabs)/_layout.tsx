import React from 'react';
import { Tabs } from 'expo-router';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

function TabIcon({ name, color, size }: { name: IconName; color: string; size: number }) {
  return <MaterialCommunityIcons name={name} size={size} color={color} />;
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#FFFFFF',
        tabBarInactiveTintColor: '#666666',
        tabBarStyle: {
          backgroundColor: '#0F0F0F',
          borderTopColor: '#252525',
          elevation: 0,
        },
        tabBarLabelStyle: {
          fontSize: 11,
        },
        animation: 'shift',
        sceneStyle: { backgroundColor: '#0F0F0F' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: '首頁',
          tabBarIcon: ({ color, size }) => (
            <TabIcon name="pencil-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          title: '行事曆',
          tabBarIcon: ({ color, size }) => (
            <TabIcon name="calendar-month-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="finance/index"
        options={{
          title: '財務',
          tabBarIcon: ({ color, size }) => (
            <TabIcon name="wallet-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="tasks"
        options={{
          title: '任務',
          tabBarIcon: ({ color, size }) => (
            <TabIcon name="checkbox-marked-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="notes"
        options={{
          title: '筆記',
          tabBarIcon: ({ color, size }) => (
            <TabIcon name="lightbulb-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="dashboard"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="goals/index"
        options={{ href: null }}
      />
    </Tabs>
  );
}
