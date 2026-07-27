import React, { createContext, useContext, useState } from 'react';
import { toLocalDateString } from '../utils/date';

interface CalendarState {
  year: number;
  month: number;
  selectedDate: string;
  refreshKey: number;
  setYear: (y: number | ((prev: number) => number)) => void;
  setMonth: (m: number | ((prev: number) => number)) => void;
  setSelectedDate: (d: string) => void;
  prevMonth: () => void;
  nextMonth: () => void;
  bumpRefresh: () => void;
}

const today = new Date();
const todayStr = toLocalDateString(today);

const CalendarContext = createContext<CalendarState | null>(null);

export function CalendarProvider({ children }: { children: React.ReactNode }) {
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [refreshKey, setRefreshKey] = useState(0);

  function prevMonth() {
    if (month === 0) { setYear(y => y - 1); setMonth(11); }
    else setMonth(m => m - 1);
  }

  function nextMonth() {
    if (month === 11) { setYear(y => y + 1); setMonth(0); }
    else setMonth(m => m + 1);
  }

  function bumpRefresh() {
    setRefreshKey(k => k + 1);
  }

  return (
    <CalendarContext.Provider value={{ year, month, selectedDate, refreshKey, setYear, setMonth, setSelectedDate, prevMonth, nextMonth, bumpRefresh }}>
      {children}
    </CalendarContext.Provider>
  );
}

export function useCalendar(): CalendarState {
  const ctx = useContext(CalendarContext);
  if (!ctx) throw new Error('useCalendar must be inside CalendarProvider');
  return ctx;
}
