import React, { createContext, useContext } from 'react';
import { NativeScrollEvent, NativeSyntheticEvent } from 'react-native';

export type ScrollWorkspace = 'calendar' | 'work' | 'finance';

interface CalendarWorkspaceScrollState {
  contentInset: number;
  onScroll: (workspace: ScrollWorkspace) => (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
}

const CalendarWorkspaceScrollContext = createContext<CalendarWorkspaceScrollState | null>(null);

export const CalendarWorkspaceScrollProvider = CalendarWorkspaceScrollContext.Provider;

export function useCalendarWorkspaceScroll(): CalendarWorkspaceScrollState {
  const value = useContext(CalendarWorkspaceScrollContext);
  if (!value) throw new Error('useCalendarWorkspaceScroll must be inside CalendarWorkspaceScrollProvider');
  return value;
}
