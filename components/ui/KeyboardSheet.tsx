import React, { useEffect, useRef, useState } from 'react';
import { Keyboard, LayoutChangeEvent, Platform, Pressable, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

/**
 * How far content must rise to clear the keyboard. With Android edge-to-edge the window is
 * no longer resized, so the full keyboard height applies; if a device still resizes the
 * window, that shrink is subtracted so the sheet is never lifted twice.
 */
export function keyboardLift(keyboardHeight: number, fullHeight: number, currentHeight: number): number {
  return Math.max(0, keyboardHeight - Math.max(0, fullHeight - currentHeight));
}

/** Bottom-sheet overlay that keeps its sheet above the software keyboard. */
export default function KeyboardSheet({ children, style, onBackdropPress }: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Tapping the dimmed area outside the sheet. */
  onBackdropPress?: () => void;
}) {
  const [keyboard, setKeyboard] = useState(0);
  const [height, setHeight] = useState(0);
  const fullHeight = useRef(0);

  useEffect(() => {
    const show = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      event => setKeyboard(event.endCoordinates.height));
    const hide = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', () => setKeyboard(0));
    return () => { show.remove(); hide.remove(); };
  }, []);

  function onLayout(event: LayoutChangeEvent) {
    const next = event.nativeEvent.layout.height;
    // Portrait-only app: the tallest layout seen is the unresized window, whatever order
    // the resize and keyboard events arrive in.
    fullHeight.current = Math.max(fullHeight.current, next);
    setHeight(next);
  }

  const lift = keyboardLift(keyboard, fullHeight.current, height);
  return <View style={[styles.overlay, style]} onLayout={onLayout}>
    {onBackdropPress && <Pressable style={StyleSheet.absoluteFill} onPress={onBackdropPress} accessibilityLabel="關閉" />}
    <View style={[styles.area, { marginBottom: lift }]} pointerEvents="box-none">{children}</View>
  </View>;
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)' },
  area: { flex: 1, justifyContent: 'flex-end' },
});
