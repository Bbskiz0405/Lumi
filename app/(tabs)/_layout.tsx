import React, { useState, useCallback, useEffect } from 'react';
import { View } from 'react-native';
import { withLayoutContext, usePathname } from 'expo-router';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CalendarProvider, useCalendar } from '../../contexts/CalendarContext';
import CalendarGrid from '../../components/shared/CalendarGrid';
import { getDatesWithTasks, getTaskDatesByPriority } from '../../services/taskService';
import { getTransactionsForMonth } from '../../services/financeService';

const { Navigator } = createMaterialTopTabNavigator();
const MaterialTopTabs = withLayoutContext<any, any, any, any>(Navigator);

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

function TabIcon({ name, color, size }: { name: IconName; color: string; size: number }) {
  return <MaterialCommunityIcons name={name} size={size} color={color} />;
}

function PersistentCalendar() {
  const pathname = usePathname();
  const isCalendarOrFinance = pathname.includes('/calendar') || pathname.includes('/finance');
  const [taskDates, setTaskDates] = useState<Set<string>>(new Set());
  const [financeDates, setFinanceDates] = useState<Set<string>>(new Set());
  const [taskPriorityMap, setTaskPriorityMap] = useState<Map<string, 'high' | 'medium' | 'low'>>(new Map());
  const { year, month } = useCalendar();

  const loadDates = useCallback(async () => {
    if (!isCalendarOrFinance) return;
    const taskList = await getDatesWithTasks();
    setTaskDates(new Set(taskList));
    const priorityMap = await getTaskDatesByPriority();
    setTaskPriorityMap(priorityMap);
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
      <CalendarGrid
        taskDates={taskDates}
        financeDates={financeDates}
        taskPriorityMap={taskPriorityMap}
      />
      <View style={{ height: 1, backgroundColor: '#252525', marginTop: 4 }} />
    </View>
  );
}

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  return (
    <CalendarProvider>
      <View style={{ flex: 1, backgroundColor: '#0F0F0F' }}>
        <PersistentCalendar />
        <MaterialTopTabs
          tabBarPosition="bottom"
          screenOptions={{
            tabBarActiveTintColor: '#FFFFFF',
            tabBarInactiveTintColor: '#666666',
            tabBarStyle: {
              backgroundColor: '#0F0F0F',
              borderTopWidth: 1,
              borderTopColor: '#252525',
              elevation: 0,
              height: 70 + insets.bottom,
              paddingBottom: insets.bottom + 16,
              paddingTop: 6,
            },
            tabBarLabelStyle: { fontSize: 11, textTransform: 'none', marginTop: 0 },
            tabBarIconStyle: { width: 22, height: 22 },
            tabBarIndicatorStyle: { backgroundColor: '#FFFFFF', height: 0 },
            tabBarShowIcon: true,
            tabBarPressColor: 'transparent',
            sceneStyle: { backgroundColor: '#0F0F0F' },
            swipeEnabled: true,
            animationEnabled: true,
            lazy: false,
          }}
        >
          <MaterialTopTabs.Screen
            name="index"
            options={{
              title: '首頁',
              tabBarIcon: ({ color }: any) => <TabIcon name="pencil-outline" color={color} size={22} />,
            }}
          />
          <MaterialTopTabs.Screen
            name="calendar"
            options={{
              title: '行事曆',
              tabBarIcon: ({ color }: any) => <TabIcon name="calendar-month-outline" color={color} size={22} />,
            }}
          />
          <MaterialTopTabs.Screen
            name="finance/index"
            options={{
              title: '財務',
              tabBarIcon: ({ color }: any) => <TabIcon name="wallet-outline" color={color} size={22} />,
            }}
          />
          <MaterialTopTabs.Screen
            name="tasks"
            options={{
              title: '任務',
              tabBarIcon: ({ color }: any) => <TabIcon name="checkbox-marked-outline" color={color} size={22} />,
            }}
          />
          <MaterialTopTabs.Screen
            name="notes"
            options={{
              title: '筆記',
              tabBarIcon: ({ color }: any) => <TabIcon name="lightbulb-outline" color={color} size={22} />,
            }}
          />
        </MaterialTopTabs>
      </View>
    </CalendarProvider>
  );
}
