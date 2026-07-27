import React from 'react';
import Svg, {
  Circle,
  Line,
  Path,
  Polyline,
  Rect,
} from 'react-native-svg';

export type TechIconName =
  | 'activity'
  | 'calendar'
  | 'calculator'
  | 'check-square'
  | 'chevron-down'
  | 'chevron-left'
  | 'chevron-right'
  | 'close'
  | 'command'
  | 'database'
  | 'file-text'
  | 'grid'
  | 'info'
  | 'menu'
  | 'note'
  | 'plus'
  | 'rotate-ccw'
  | 'send'
  | 'settings'
  | 'trash'
  | 'wallet';

interface Props {
  name: TechIconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
}

export default function TechIcon({
  name,
  size = 20,
  color = '#E8EAED',
  strokeWidth = 1.7,
}: Props) {
  const common = {
    fill: 'none',
    stroke: color,
    strokeWidth,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };

  function paths() {
    switch (name) {
      case 'grid':
        return (
          <>
            <Rect {...common} x="3.5" y="3.5" width="6.5" height="6.5" rx="1" />
            <Rect {...common} x="14" y="3.5" width="6.5" height="6.5" rx="1" />
            <Rect {...common} x="3.5" y="14" width="6.5" height="6.5" rx="1" />
            <Rect {...common} x="14" y="14" width="6.5" height="6.5" rx="1" />
          </>
        );
      case 'calendar':
        return (
          <>
            <Rect {...common} x="3" y="5" width="18" height="16" rx="2" />
            <Line {...common} x1="8" y1="3" x2="8" y2="7" />
            <Line {...common} x1="16" y1="3" x2="16" y2="7" />
            <Line {...common} x1="3" y1="10" x2="21" y2="10" />
            <Line {...common} x1="8" y1="14" x2="8.01" y2="14" />
            <Line {...common} x1="12" y1="14" x2="12.01" y2="14" />
            <Line {...common} x1="16" y1="14" x2="16.01" y2="14" />
            <Line {...common} x1="8" y1="18" x2="8.01" y2="18" />
            <Line {...common} x1="12" y1="18" x2="12.01" y2="18" />
          </>
        );
      case 'wallet':
        return (
          <>
            <Path {...common} d="M4 6.5h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a3 3 0 0 1-3-3v-12a3 3 0 0 1 3-3h12v4" />
            <Path {...common} d="M15 11h6v5h-6a2.5 2.5 0 0 1 0-5Z" />
            <Line {...common} x1="16" y1="13.5" x2="16.01" y2="13.5" />
          </>
        );
      case 'check-square':
        return (
          <>
            <Rect {...common} x="3.5" y="3.5" width="17" height="17" rx="2" />
            <Polyline {...common} points="7.5 12.5 10.5 15.5 17 8.5" />
          </>
        );
      case 'file-text':
      case 'note':
        return (
          <>
            <Path {...common} d="M6 2.5h8l4 4v15H6a2 2 0 0 1-2-2v-15a2 2 0 0 1 2-2Z" />
            <Polyline {...common} points="14 2.5 14 7 18 7" />
            <Line {...common} x1="8" y1="11" x2="14" y2="11" />
            <Line {...common} x1="8" y1="15" x2="14" y2="15" />
          </>
        );
      case 'activity':
        return <Polyline {...common} points="3 12 7 12 9.5 6 14 18 16.5 12 21 12" />;
      case 'command':
        return (
          <>
            <Polyline {...common} points="5 7 10 12 5 17" />
            <Line {...common} x1="13" y1="17" x2="19" y2="17" />
          </>
        );
      case 'menu':
        return (
          <>
            <Line {...common} x1="4" y1="7" x2="20" y2="7" />
            <Line {...common} x1="4" y1="12" x2="20" y2="12" />
            <Line {...common} x1="4" y1="17" x2="20" y2="17" />
          </>
        );
      case 'send':
        return (
          <>
            <Path {...common} d="M12 20V5" />
            <Polyline {...common} points="6.5 10.5 12 5 17.5 10.5" />
          </>
        );
      case 'plus':
        return (
          <>
            <Line {...common} x1="12" y1="5" x2="12" y2="19" />
            <Line {...common} x1="5" y1="12" x2="19" y2="12" />
          </>
        );
      case 'calculator':
        return (
          <>
            <Rect {...common} x="4" y="2.5" width="16" height="19" rx="2" />
            <Rect {...common} x="7" y="5.5" width="10" height="4" rx="0.5" />
            <Line {...common} x1="8" y1="13" x2="8.01" y2="13" />
            <Line {...common} x1="12" y1="13" x2="12.01" y2="13" />
            <Line {...common} x1="16" y1="13" x2="16.01" y2="13" />
            <Line {...common} x1="8" y1="17" x2="8.01" y2="17" />
            <Line {...common} x1="12" y1="17" x2="12.01" y2="17" />
            <Line {...common} x1="16" y1="17" x2="16.01" y2="17" />
          </>
        );
      case 'rotate-ccw':
        return (
          <>
            <Path {...common} d="M4 9V4m0 0h5" />
            <Path {...common} d="M5.7 6.2A8 8 0 1 1 4.5 15" />
          </>
        );
      case 'trash':
        return (
          <>
            <Polyline {...common} points="4 7 20 7" />
            <Path {...common} d="M9 7V4h6v3m3 0-1 14H7L6 7" />
            <Line {...common} x1="10" y1="11" x2="10" y2="17" />
            <Line {...common} x1="14" y1="11" x2="14" y2="17" />
          </>
        );
      case 'settings':
        return (
          <>
            <Line {...common} x1="4" y1="6" x2="20" y2="6" />
            <Circle {...common} cx="9" cy="6" r="2" />
            <Line {...common} x1="4" y1="12" x2="20" y2="12" />
            <Circle {...common} cx="15" cy="12" r="2" />
            <Line {...common} x1="4" y1="18" x2="20" y2="18" />
            <Circle {...common} cx="8" cy="18" r="2" />
          </>
        );
      case 'database':
        return (
          <>
            <Path {...common} d="M20 7c0 1.7-3.6 3-8 3S4 8.7 4 7s3.6-3 8-3 8 1.3 8 3Z" />
            <Path {...common} d="M4 7v5c0 1.7 3.6 3 8 3s8-1.3 8-3V7" />
            <Path {...common} d="M4 12v5c0 1.7 3.6 3 8 3s8-1.3 8-3v-5" />
          </>
        );
      case 'info':
        return (
          <>
            <Circle {...common} cx="12" cy="12" r="9" />
            <Line {...common} x1="12" y1="11" x2="12" y2="17" />
            <Line {...common} x1="12" y1="7" x2="12.01" y2="7" />
          </>
        );
      case 'close':
        return (
          <>
            <Line {...common} x1="6" y1="6" x2="18" y2="18" />
            <Line {...common} x1="18" y1="6" x2="6" y2="18" />
          </>
        );
      case 'chevron-left':
        return <Polyline {...common} points="15 18 9 12 15 6" />;
      case 'chevron-right':
        return <Polyline {...common} points="9 18 15 12 9 6" />;
      case 'chevron-down':
        return <Polyline {...common} points="6 9 12 15 18 9" />;
      default:
        return null;
    }
  }

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" accessibilityElementsHidden>
      {paths()}
    </Svg>
  );
}
