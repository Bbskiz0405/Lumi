import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { withLayoutContext, useRouter, usePathname } from 'expo-router';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { useSafeAreaInsets, SafeAreaView, EdgeInsets } from 'react-native-safe-area-context';
import TechIcon, { TechIconName } from '../../components/ui/TechIcon';

const { Navigator } = createMaterialTopTabNavigator();
const MaterialTopTabs = withLayoutContext(Navigator);

function CustomTabBar({ insets }: { insets: EdgeInsets }) {
  const router = useRouter();
  const pathname = usePathname();
  const tabs: { name: string; label: string; icon: TechIconName; route: string }[] = [
    { name: 'index', label: '首頁', icon: 'grid', route: '/' },
    { name: 'calendar', label: '行事曆', icon: 'calendar', route: '/(calendar-finance)/calendar' },
    { name: 'finance', label: '財務', icon: 'wallet', route: '/(calendar-finance)/finance' },
    { name: 'tasks', label: '任務', icon: 'check-square', route: '/tasks' },
    { name: 'notes', label: '筆記', icon: 'file-text', route: '/notes' },
  ];

  return (
    <View style={[styles.tabBar, { height: 50 + insets.bottom, paddingBottom: insets.bottom }]}>
      {tabs.map((tab) => {
        const isActive =
          (tab.name === 'index' && pathname === '/') ||
          (tab.name === 'calendar' && (pathname.includes('/calendar') || pathname.includes('/work'))) ||
          (tab.name === 'finance' && pathname.includes('/finance')) ||
          (tab.name === 'tasks' && pathname.includes('/tasks')) ||
          (tab.name === 'notes' && pathname.includes('/notes'));

        const color = isActive ? '#F1F3F5' : '#555B62';

        return (
          <TouchableOpacity
            key={tab.name}
            onPress={() => router.navigate(tab.route as never)}
            style={styles.tabItem}
            activeOpacity={0.7}
            accessibilityRole="tab"
            accessibilityLabel={tab.label}
            accessibilityState={{ selected: isActive }}
          >
            <View style={[styles.iconContainer, isActive && styles.iconContainerActive]}>
              <TechIcon name={tab.icon} size={19} color={color} strokeWidth={isActive ? 1.9 : 1.6} />
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

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0F0F0F' }} edges={['top']}>
      <MaterialTopTabs
        tabBarPosition="bottom"
        tabBar={() => <CustomTabBar insets={insets} />}
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
    borderTopColor: '#23272C',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabItem: {
    flex: 1,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 3,
  },
  iconContainer: {
    width: 34,
    height: 25,
    justifyContent: 'center',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'transparent',
  },
  iconContainerActive: {
    borderTopColor: '#E8EAED',
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '400',
    marginTop: 2,
    lineHeight: 12,
    letterSpacing: 0.3,
  },
});
