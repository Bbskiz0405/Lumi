import React, { useState, useCallback, useEffect } from 'react';
import { View } from 'react-native';
import { Tabs, usePathname } from 'expo-router';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { CalendarProvider } from '../../contexts/CalendarContext';
import CalendarGrid from '../../components/shared/CalendarGrid';
import { getDatesWithTasks } from '../../services/taskService';
import { getTransactionsForMonth } from '../../services/financeService';
import { useCalendar } from '../../contexts/CalendarContext';

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

function TabIcon({ name, color, size }: { name: IconName; color: string; size: number }) {
  return <MaterialCommunityIcons name={name} size={size} color={color} />;
}

function PersistentCalendar() {
  const pathname = usePathname();
  const isCalendarOrFinance = pathname.includes('/calendar') || pathname.includes('/finance');
  const [taskDates, setTaskDates] = useState<Set<string>>(new Set());
  const [financeDates, setFinanceDates] = useState<Set<string>>(new Set());
  const { year, month } = useCalendar();

  const loadDates = useCallback(async () => {
    if (!isCalendarOrFinance) return;
    const taskList = await getDatesWithTasks();
    setTaskDates(new Set(taskList));
    const m = `${year}-${String(month + 1).padStart(2, '0')}`;
    const txs = await getTransactionsForMonth(m);
    setFinanceDates(new Set(txs.map(t => t.created_at.split('T')[0])));
  }, [isCalendarOrFinance, year, month]);

  useEffect(() => {
    loadDates();
  }, [loadDates, pathname]);

  if (!isCalendarOrFinance) return null;

  return (
    <View style={{ backgroundColor: '#0F0F0F', paddingTop: 32 }}>
      <CalendarGrid taskDates={taskDates} financeDates={financeDates} />
      <View style={{ height: 1, backgroundColor: '#252525', marginTop: 4 }} />
    </View>
  );
}

export default function TabsLayout() {
  return (
    <CalendarProvider>
      <View style={{ flex: 1, backgroundColor: '#0F0F0F' }}>
        <PersistentCalendar />
        <Tabs
          screenOptions={{
            headerShown: false,
            tabBarActiveTintColor: '#FFFFFF',
            tabBarInactiveTintColor: '#666666',
            tabBarStyle: {
              backgroundColor: '#0F0F0F',
              borderTopColor: '#252525',
              elevation: 0,
              height: 88,
              paddingBottom: 30,
              paddingTop: 8,
            },
            tabBarLabelStyle: { fontSize: 11 },
            animation: 'shift',
            sceneStyle: { backgroundColor: '#0F0F0F' },
          }}
        >
          <Tabs.Screen
            name="index"
            options={{
              title: '首頁',
              tabBarIcon: ({ color, size }) => <TabIcon name="pencil-outline" color={color} size={size} />,
            }}
          />
          <Tabs.Screen
            name="calendar"
            options={{
              title: '行事曆',
              tabBarIcon: ({ color, size }) => <TabIcon name="calendar-month-outline" color={color} size={size} />,
            }}
          />
          <Tabs.Screen
            name="finance/index"
            options={{
              title: '財務',
              tabBarIcon: ({ color, size }) => <TabIcon name="wallet-outline" color={color} size={size} />,
            }}
          />
          <Tabs.Screen
            name="tasks"
            options={{
              title: '任務',
              tabBarIcon: ({ color, size }) => <TabIcon name="checkbox-marked-outline" color={color} size={size} />,
            }}
          />
          <Tabs.Screen
            name="notes"
            options={{
              title: '筆記',
              tabBarIcon: ({ color, size }) => <TabIcon name="lightbulb-outline" color={color} size={size} />,
            }}
          />
          <Tabs.Screen name="dashboard" options={{ href: null }} />
          <Tabs.Screen name="goals/index" options={{ href: null }} />
        </Tabs>
      </View>
    </CalendarProvider>
  );
}
