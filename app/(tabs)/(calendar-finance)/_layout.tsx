import React, { useState, useCallback, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { withLayoutContext } from 'expo-router';
import {
  createMaterialTopTabNavigator,
  MaterialTopTabBarProps,
} from '@react-navigation/material-top-tabs';
import { useCalendar } from '../../../contexts/CalendarContext';
import CalendarGrid from '../../../components/shared/CalendarGrid';
import {
  getDatesWithTasks,
  getTaskDatesByPriority,
  getTaskDatesByTag,
} from '../../../services/taskService';
import { getTransactionsForMonth } from '../../../services/financeService';
import { getCalendarEventsForRange } from '../../../services/calendarIntegrationService';

const { Navigator } = createMaterialTopTabNavigator();
const MaterialTopTabs = withLayoutContext(Navigator);

function PersistentCalendar() {
  const [taskDates, setTaskDates] = useState<Set<string>>(new Set());
  const [financeDates, setFinanceDates] = useState<Set<string>>(new Set());
  const [externalDates, setExternalDates] = useState<Set<string>>(new Set());
  const [taskPriorityMap, setTaskPriorityMap] = useState<Map<string, 'high' | 'medium' | 'low'>>(new Map());
  const [taskTagMap, setTaskTagMap] = useState<Map<string, string>>(new Map());
  const { year, month, refreshKey } = useCalendar();

  const loadDates = useCallback(async () => {
    const m = `${year}-${String(month + 1).padStart(2, '0')}`;
    try {
      const rangeStart = new Date(year, month, 1);
      const rangeEnd = new Date(year, month + 1, 1);
      const [taskList, priorityMap, tagMap, txs, externalEvents] = await Promise.all([
        getDatesWithTasks(),
        getTaskDatesByPriority(),
        getTaskDatesByTag(),
        getTransactionsForMonth(m),
        getCalendarEventsForRange(rangeStart, rangeEnd).catch(() => []),
      ]);
      setTaskDates(new Set(taskList));
      setTaskPriorityMap(priorityMap);
      setTaskTagMap(tagMap);
      setFinanceDates(new Set(txs.map(t => t.created_at.split('T')[0])));
      setExternalDates(getExternalEventDates(
        externalEvents.filter(event => !event.isLinkedToLumi),
        rangeStart,
        rangeEnd
      ));
    } catch (err) {
      console.error('[PersistentCalendar] load failed:', err);
    }
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
          externalDates={externalDates}
          taskPriorityMap={taskPriorityMap}
          taskTagMap={taskTagMap}
        />
      </View>
      <View style={{ height: 1, backgroundColor: '#252525', marginTop: 4 }} />
    </View>
  );
}

function toCalendarDateString(isoDate: string): string {
  const date = new Date(isoDate);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function getExternalEventDates(
  events: Awaited<ReturnType<typeof getCalendarEventsForRange>>,
  rangeStart: Date,
  rangeEnd: Date
): Set<string> {
  const dates = new Set<string>();
  for (const event of events) {
    const eventStart = new Date(event.startDate);
    const rawEventEnd = new Date(event.endDate);
    const eventEnd = rawEventEnd > eventStart
      ? rawEventEnd
      : new Date(eventStart.getTime() + 1);
    const cursor = new Date(Math.max(eventStart.getTime(), rangeStart.getTime()));
    cursor.setHours(0, 0, 0, 0);
    const effectiveEnd = Math.min(eventEnd.getTime(), rangeEnd.getTime());

    while (cursor.getTime() < effectiveEnd) {
      dates.add(toCalendarDateString(cursor.toISOString()));
      cursor.setDate(cursor.getDate() + 1);
    }
  }
  return dates;
}

function SubTabBar({ state, descriptors, navigation }: MaterialTopTabBarProps) {
  return (
    <View style={styles.subTabBar}>
      {state.routes.map((route, index) => {
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
        tabBar={(props: MaterialTopTabBarProps) => <SubTabBar {...props} />}
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
