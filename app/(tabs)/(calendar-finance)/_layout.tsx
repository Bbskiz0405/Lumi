import React, { useState, useCallback, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { withLayoutContext, useRouter, usePathname } from 'expo-router';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { useCalendar } from '../../../contexts/CalendarContext';
import CalendarGrid from '../../../components/shared/CalendarGrid';
import { getDatesWithTasks, getTaskDatesByPriority } from '../../../services/taskService';
import { getTransactionsForMonth } from '../../../services/financeService';

const { Navigator } = createMaterialTopTabNavigator();
const MaterialTopTabs = withLayoutContext<any, any, any, any>(Navigator);

function PersistentCalendar() {
  const [taskDates, setTaskDates] = useState<Set<string>>(new Set());
  const [financeDates, setFinanceDates] = useState<Set<string>>(new Set());
  const [taskPriorityMap, setTaskPriorityMap] = useState<Map<string, 'high' | 'medium' | 'low'>>(new Map());
  const { year, month, refreshKey } = useCalendar();

  const loadDates = useCallback(async () => {
    const taskList = await getDatesWithTasks();
    setTaskDates(new Set(taskList));
    const priorityMap = await getTaskDatesByPriority();
    setTaskPriorityMap(priorityMap);
    const m = `${year}-${String(month + 1).padStart(2, '0')}`;
    const txs = await getTransactionsForMonth(m);
    setFinanceDates(new Set(txs.map(t => t.created_at.split('T')[0])));
  }, [year, month, refreshKey]);

  useEffect(() => {
    loadDates();
  }, [loadDates]);

  return (
    <View style={{ backgroundColor: '#0F0F0F' }}>
      <View style={{ paddingTop: 8 }}>
        <CalendarGrid
          taskDates={taskDates}
          financeDates={financeDates}
          taskPriorityMap={taskPriorityMap}
        />
      </View>
      <View style={{ height: 1, backgroundColor: '#252525', marginTop: 4 }} />
    </View>
  );
}

function SubTabBar({ state, descriptors, navigation }: any) {
  return (
    <View style={styles.subTabBar}>
      {state.routes.map((route: any, index: number) => {
        const { options } = descriptors[route.key];
        const label = options.title || route.name;
        const isFocused = state.index === index;
        const color = isFocused ? '#FFFFFF' : '#666666';

        const onPress = () => {
          const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!isFocused && !event.defaultPrevented) navigation.navigate(route.name);
        };

        return (
          <TouchableOpacity
            key={route.key}
            onPress={onPress}
            style={[styles.subTabItem, isFocused && styles.subTabItemActive]}
          >
            <Text style={[styles.subTabLabel, { color }]}>{label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export default function CalendarFinanceLayout() {
  return (
    <View style={{ flex: 1, backgroundColor: '#0F0F0F' }}>
      <PersistentCalendar />
      <MaterialTopTabs
        tabBar={(props) => <SubTabBar {...props} />}
        screenOptions={{
          swipeEnabled: true,
          animationEnabled: true,
          lazy: true,
          sceneStyle: { backgroundColor: '#0F0F0F' },
        }}
      >
        <MaterialTopTabs.Screen name="calendar" options={{ title: '行事曆' }} />
        <MaterialTopTabs.Screen name="finance" options={{ title: '財務' }} />
      </MaterialTopTabs>
    </View>
  );
}

const styles = StyleSheet.create({
  subTabBar: {
    flexDirection: 'row',
    backgroundColor: '#0F0F0F',
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 40,
    borderBottomWidth: 1,
    borderBottomColor: '#252525',
  },
  subTabItem: {
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
    paddingHorizontal: 4,
  },
  subTabItemActive: {
    borderBottomColor: '#55DDAA',
  },
  subTabLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
});
