import React, { useRef } from 'react';
import { View, PanResponder, StyleSheet } from 'react-native';
import { useRouter, usePathname } from 'expo-router';

const TAB_ORDER = ['/(tabs)', '/(tabs)/calendar', '/(tabs)/finance', '/(tabs)/tasks', '/(tabs)/notes'];
const TAB_ROUTES = ['/(tabs)/', '/(tabs)/calendar', '/(tabs)/finance/', '/(tabs)/tasks', '/(tabs)/notes'];

interface Props {
  children: React.ReactNode;
}

export default function SwipeableTab({ children }: Props) {
  const router = useRouter();
  const pathname = usePathname();

  const currentIndex = useRef(0);
  currentIndex.current = TAB_ORDER.findIndex(t => {
    if (t === '/(tabs)') return pathname === '/' || pathname === '/index';
    return pathname.startsWith(t.replace('/(tabs)', ''));
  });
  if (currentIndex.current === -1) currentIndex.current = 0;

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gs) =>
        Math.abs(gs.dx) > 20 && Math.abs(gs.dx) > Math.abs(gs.dy) * 1.5,
      onPanResponderRelease: (_, gs) => {
        const threshold = 60;
        if (gs.dx < -threshold && currentIndex.current < TAB_ORDER.length - 1) {
          router.push(TAB_ROUTES[currentIndex.current + 1] as any);
        } else if (gs.dx > threshold && currentIndex.current > 0) {
          router.push(TAB_ROUTES[currentIndex.current - 1] as any);
        }
      },
    })
  ).current;

  return (
    <View style={styles.container} {...panResponder.panHandlers}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
