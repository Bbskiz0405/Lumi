import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Animated, Easing, View, StyleSheet, TouchableOpacity, Text } from 'react-native';
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
import { getLumiEventsForMonth } from '../../../services/calendarEventService';
import { getWorkDateStatusMap } from '../../../services/workTimeService';
import { WorkDateStatus } from '../../../types/workTime';
import { useForegroundRefresh } from '../../../hooks/useForegroundRefresh';

const { Navigator } = createMaterialTopTabNavigator();
const MaterialTopTabs = withLayoutContext(Navigator);

type CalendarWorkspace = 'calendar' | 'work' | 'finance';

interface WorkspaceTransition {
  id: number;
  from: CalendarWorkspace | null;
  to: CalendarWorkspace;
  progress: Animated.Value;
}

function PersistentCalendar({
  workspace,
  previousWorkspace,
  markerTransition,
}: {
  workspace: CalendarWorkspace;
  previousWorkspace: CalendarWorkspace | null;
  markerTransition: Animated.Value;
}) {
  const [taskDates, setTaskDates] = useState<Set<string>>(new Set());
  const [financeDates, setFinanceDates] = useState<Set<string>>(new Set());
  const [externalDates, setExternalDates] = useState<Set<string>>(new Set());
  const [lumiEventDates, setLumiEventDates] = useState<Set<string>>(new Set());
  const [workDateStatusMap, setWorkDateStatusMap] = useState<Map<string, WorkDateStatus>>(new Map());
  const [taskPriorityMap, setTaskPriorityMap] = useState<Map<string, 'high' | 'medium' | 'low'>>(new Map());
  const [taskTagMap, setTaskTagMap] = useState<Map<string, string>>(new Map());
  const { year, month, refreshKey } = useCalendar();
  const dateLoadRequestId = useRef(0);

  const loadDates = useCallback(async () => {
    const requestId = ++dateLoadRequestId.current;
    const m = `${year}-${String(month + 1).padStart(2, '0')}`;
    try {
      const rangeStart = new Date(year, month, 1);
      const rangeEnd = new Date(year, month + 1, 1);
      const [taskList, priorityMap, tagMap, txs, externalEvents, lumiEvents, workStatuses] = await Promise.all([
        getDatesWithTasks(),
        getTaskDatesByPriority(),
        getTaskDatesByTag(),
        getTransactionsForMonth(m),
        getCalendarEventsForRange(rangeStart, rangeEnd).catch(() => []),
        getLumiEventsForMonth(year, month),
        getWorkDateStatusMap(m),
      ]);
      if (requestId !== dateLoadRequestId.current) return;
      setTaskDates(new Set(taskList));
      setTaskPriorityMap(priorityMap);
      setTaskTagMap(tagMap);
      setFinanceDates(new Set(txs.map(t => t.created_at.split('T')[0])));
      setExternalDates(getExternalEventDates(
        externalEvents.filter(event => !event.isLinkedToLumi),
        rangeStart,
        rangeEnd
      ));
      setLumiEventDates(getLumiEventDates(lumiEvents, rangeStart, rangeEnd));
      setWorkDateStatusMap(workStatuses);
    } catch (err) {
      console.error('[PersistentCalendar] load failed:', err);
    }
  }, [year, month, refreshKey]);

  useEffect(() => {
    loadDates();
  }, [loadDates]);

  useForegroundRefresh(() => {
    void loadDates();
  });

  return (
    <View style={{ backgroundColor: '#0F0F0F' }}>
      <View style={{ paddingTop: 8 }}>
        <CalendarGrid
          mode={workspace}
          previousMode={previousWorkspace ?? undefined}
          markerTransition={markerTransition}
          taskDates={taskDates}
          financeDates={financeDates}
          externalDates={externalDates}
          eventDates={lumiEventDates}
          workDateStatusMap={workDateStatusMap}
          taskPriorityMap={taskPriorityMap}
          taskTagMap={taskTagMap}
        />
      </View>
      <View style={{ height: 1, backgroundColor: '#252525', marginTop: 4 }} />
    </View>
  );
}

function getLumiEventDates(
  events: Awaited<ReturnType<typeof getLumiEventsForMonth>>,
  rangeStart: Date,
  rangeEnd: Date
): Set<string> {
  const dates = new Set<string>();
  const rangeStartDate = toCalendarDateString(rangeStart.toISOString());
  const rangeEndDate = toCalendarDateString(rangeEnd.toISOString());
  for (const event of events) {
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(event.start_date) ||
      !/^\d{4}-\d{2}-\d{2}$/.test(event.end_date)
    ) {
      continue;
    }
    let cursor = event.start_date > rangeStartDate ? event.start_date : rangeStartDate;
    while (cursor <= event.end_date && cursor < rangeEndDate) {
      dates.add(cursor);
      cursor = addUtcCalendarDays(cursor, 1);
    }
  }
  return dates;
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
  const rangeStartDate = toCalendarDateString(rangeStart.toISOString());
  const rangeEndDate = toCalendarDateString(rangeEnd.toISOString());
  for (const event of events) {
    if (event.allDay) {
      const eventStartDate = toUtcCalendarDateString(event.startDate);
      const rawEventEndDate = toUtcCalendarDateString(event.endDate);
      const eventEndDate = rawEventEndDate > eventStartDate
        ? rawEventEndDate
        : addUtcCalendarDays(eventStartDate, 1);
      let cursorDate = eventStartDate > rangeStartDate ? eventStartDate : rangeStartDate;
      const effectiveEndDate = eventEndDate < rangeEndDate ? eventEndDate : rangeEndDate;

      while (cursorDate < effectiveEndDate) {
        dates.add(cursorDate);
        cursorDate = addUtcCalendarDays(cursorDate, 1);
      }
      continue;
    }

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

function toUtcCalendarDateString(isoDate: string): string {
  const date = new Date(isoDate);
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
}

function addUtcCalendarDays(dateString: string, days: number): string {
  const [year, month, day] = dateString.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  return toUtcCalendarDateString(date.toISOString());
}

function SubTabBar({
  state,
  descriptors,
  navigation,
  onWorkspaceChange,
}: MaterialTopTabBarProps & {
  onWorkspaceChange: (workspace: CalendarWorkspace) => void;
}) {
  useEffect(() => {
    const routeName = state.routes[state.index]?.name;
    if (routeName === 'calendar' || routeName === 'work' || routeName === 'finance') {
      onWorkspaceChange(routeName);
    }
  }, [state.index, state.routes, onWorkspaceChange]);

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
          <WorkspaceTab
            key={route.key}
            label={String(label)}
            color={color}
            isFocused={isFocused}
            onPress={onPress}
          />
        );
      })}
    </View>
  );
}

function WorkspaceTab({
  label,
  color,
  isFocused,
  onPress,
}: {
  label: string;
  color: string;
  isFocused: boolean;
  onPress: () => void;
}) {
  const indicatorProgress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    indicatorProgress.stopAnimation();
    if (!isFocused) {
      indicatorProgress.setValue(0);
      return;
    }
    Animated.timing(indicatorProgress, {
      toValue: 1,
      duration: 160,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [indicatorProgress, isFocused]);

  return (
    <TouchableOpacity onPress={onPress} style={styles.subTabItem}>
      <Text style={[styles.subTabLabel, { color }]}>{label}</Text>
      {isFocused && (
        <Animated.View
          style={[
            styles.subTabIndicator,
            {
              opacity: indicatorProgress,
              transform: [{
                scaleX: indicatorProgress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.45, 1],
                }),
              }],
            },
          ]}
        />
      )}
    </TouchableOpacity>
  );
}

export default function CalendarFinanceLayout() {
  const [workspaceTransition, setWorkspaceTransition] = useState<WorkspaceTransition>(() => ({
    id: 0,
    from: null,
    to: 'calendar',
    progress: new Animated.Value(1),
  }));
  const currentWorkspace = useRef<CalendarWorkspace>('calendar');
  const nextTransitionId = useRef(0);
  const activeMarkerAnimation = useRef<Animated.CompositeAnimation | null>(null);

  const handleWorkspaceChange = useCallback((workspace: CalendarWorkspace) => {
    if (currentWorkspace.current === workspace) return;
    activeMarkerAnimation.current?.stop();
    const from = currentWorkspace.current;
    currentWorkspace.current = workspace;
    nextTransitionId.current += 1;
    setWorkspaceTransition({
      id: nextTransitionId.current,
      from,
      to: workspace,
      progress: new Animated.Value(0),
    });
  }, []);

  const transitionId = workspaceTransition.id;
  const transitionProgress = workspaceTransition.progress;

  useEffect(() => {
    if (transitionId === 0) return;
    const animation = Animated.timing(transitionProgress, {
      toValue: 1,
      duration: 180,
      easing: Easing.inOut(Easing.quad),
      useNativeDriver: true,
    });
    activeMarkerAnimation.current = animation;
    animation.start(({ finished }) => {
      if (!finished) return;
      setWorkspaceTransition(current => (
        current.id === transitionId
          ? { ...current, from: null }
          : current
      ));
    });
    return () => animation.stop();
  }, [transitionId, transitionProgress]);

  return (
    <View style={{ flex: 1, backgroundColor: '#0F0F0F' }}>
      <PersistentCalendar
        workspace={workspaceTransition.to}
        previousWorkspace={workspaceTransition.from}
        markerTransition={workspaceTransition.progress}
      />
      <MaterialTopTabs
        tabBar={(props: MaterialTopTabBarProps) => (
          <SubTabBar {...props} onWorkspaceChange={handleWorkspaceChange} />
        )}
        screenOptions={{
          swipeEnabled: true,
          animationEnabled: true,
          lazy: true,
          sceneStyle: { backgroundColor: '#0F0F0F' },
        }}
      >
        <MaterialTopTabs.Screen name="calendar" options={{ title: '行事曆' }} />
        <MaterialTopTabs.Screen name="work" options={{ title: '工時' }} />
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
    borderBottomWidth: 1,
    borderBottomColor: '#252525',
  },
  subTabItem: {
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    flex: 1,
  },
  subTabIndicator: {
    position: 'absolute',
    bottom: 0,
    width: 28,
    height: 2,
    borderRadius: 1,
    backgroundColor: '#55DDAA',
  },
  subTabLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
});
