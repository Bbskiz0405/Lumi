import React, { createContext, useContext, useState } from 'react';

interface CalendarState {
  year: number;
  month: number;
  selectedDate: string;
  setYear: (y: number | ((prev: number) => number)) => void;
  setMonth: (m: number | ((prev: number) => number)) => void;
  setSelectedDate: (d: string) => void;
  prevMonth: () => void;
  nextMonth: () => void;
}

const today = new Date();
const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

const CalendarContext = createContext<CalendarState | null>(null);

export function CalendarProvider({ children }: { children: React.ReactNode }) {
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState(todayStr);

  function prevMonth() {
    if (month === 0) { setYear(y => y - 1); setMonth(11); }
    else setMonth(m => m - 1);
  }

  function nextMonth() {
    if (month === 11) { setYear(y => y + 1); setMonth(0); }
    else setMonth(m => m + 1);
  }

  return (
    <CalendarContext.Provider value={{ year, month, selectedDate, setYear, setMonth, setSelectedDate, prevMonth, nextMonth }}>
      {children}
    </CalendarContext.Provider>
  );
}

export function useCalendar(): CalendarState {
  const ctx = useContext(CalendarContext);
  if (!ctx) throw new Error('useCalendar must be inside CalendarProvider');
  return ctx;
}
