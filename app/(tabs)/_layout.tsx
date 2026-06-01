import React, { useEffect, useState } from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { withLayoutContext, useRouter, usePathname } from 'expo-router';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';
import * as Font from 'expo-font';

const { Navigator } = createMaterialTopTabNavigator();
const MaterialTopTabs = withLayoutContext<any, any, any, any>(Navigator);

function CustomTabBar({ insets }: any) {
  const router = useRouter();
  const pathname = usePathname();
const tabs = [
  { name: 'index', label: '首頁', icon: '✎', route: '/' },
  { name: 'calendar', label: '行事曆', icon: '[ ]', route: '/(calendar-finance)/calendar' },
  { name: 'finance', label: '財務', icon: '$', route: '/(calendar-finance)/finance' },
  { name: 'tasks', label: '任務', icon: '[v]', route: '/tasks' },
  { name: 'notes', label: '筆記', icon: '!', route: '/notes' },
];

return (
  <View style={[styles.tabBar, { height: 50 + insets.bottom, paddingBottom: insets.bottom }]}>
    {tabs.map((tab) => {
      const isActive = 
        (tab.name === 'index' && pathname === '/') ||
        (tab.name === 'calendar' && pathname.includes('/calendar')) ||
        (tab.name === 'finance' && pathname.includes('/finance')) ||
        (tab.name === 'tasks' && pathname.includes('/tasks')) ||
        (tab.name === 'notes' && pathname.includes('/notes'));

      const color = isActive ? '#FFFFFF' : '#666666';

      return (
        <TouchableOpacity
          key={tab.name}
          onPress={() => router.push(tab.route as any)}
          style={styles.tabItem}
          activeOpacity={0.7}
        >
          <View style={styles.iconContainer}>
            <Text style={{ fontSize: 18, color, fontWeight: '400' }}>{tab.icon}</Text>
          </View>
          <Text style={[styles.tabLabel, { color }]}>{tab.label}</Text>
        </TouchableOpacity>
      );
    })}
  </View>
  );
}

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  
  useEffect(() => {
    async function load() {
      try {
        await Font.loadAsync(MaterialCommunityIcons.font);
      } catch (e) {
        console.warn('Font load error:', e);
      }
    }
    load();
  }, []);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0F0F0F' }} edges={['top']}>
      <MaterialTopTabs
        tabBarPosition="bottom"
        tabBar={(props) => <CustomTabBar {...props} insets={insets} />}
        screenOptions={{
          swipeEnabled: true,
          animationEnabled: true,
          lazy: true,
          sceneStyle: { backgroundColor: '#0F0F0F' },
        }}
      >
        <MaterialTopTabs.Screen name="index" />
        <MaterialTopTabs.Screen name="(calendar-finance)" />
        <MaterialTopTabs.Screen name="tasks" />
        <MaterialTopTabs.Screen name="notes" />
      </MaterialTopTabs>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#0F0F0F',
    borderTopWidth: 1,
    borderTopColor: '#252525',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabItem: {
    flex: 1,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '500',
    marginTop: 2,
    lineHeight: 12,
  },
});
