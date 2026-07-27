import React from 'react';
import {
  StyleProp,
  StyleSheet,
  TouchableOpacity,
  ViewStyle,
} from 'react-native';
import TechIcon, { TechIconName } from './TechIcon';

interface Props {
  icon: TechIconName;
  label: string;
  onPress: () => void;
  color?: string;
  size?: number;
  iconSize?: number;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

export default function IconButton({
  icon,
  label,
  onPress,
  color = '#D9DDE2',
  size = 36,
  iconSize = 18,
  disabled = false,
  style,
}: Props) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.62}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
      style={[
        styles.button,
        { width: size, height: size },
        disabled && styles.disabled,
        style,
      ]}
    >
      <TechIcon name={icon} size={iconSize} color={color} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2B2F34',
    backgroundColor: '#121417',
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: {
    opacity: 0.4,
  },
});
