import React, { createContext, useContext, useRef, useState } from 'react';
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
  const viewMonthRef = useRef({ year: today.getFullYear(), month: today.getMonth() });

  function moveMonth(offset: number) {
    const current = viewMonthRef.current;
    const target = new Date(current.year, current.month + offset, 1);
    const targetYear = target.getFullYear();
    const targetMonth = target.getMonth();
    const selectedDay = Number(selectedDate.split('-')[2]) || 1;
    const lastDay = new Date(targetYear, targetMonth + 1, 0).getDate();
    const nextDay = Math.min(selectedDay, lastDay);

    viewMonthRef.current = { year: targetYear, month: targetMonth };
    setYear(targetYear);
    setMonth(targetMonth);
    setSelectedDate(
      `${targetYear}-${String(targetMonth + 1).padStart(2, '0')}-${String(nextDay).padStart(2, '0')}`
    );
  }

  function prevMonth() { moveMonth(-1); }

  function nextMonth() { moveMonth(1); }

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
