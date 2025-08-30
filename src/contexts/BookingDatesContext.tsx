import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';

export interface BookingDatesState {
  startDate?: Date;
  endDate?: Date;
}

export interface BookingDatesContextType {
  startDate?: Date;
  endDate?: Date;
  setBookingDates: (startDate?: Date, endDate?: Date) => void;
  clearBookingDates: () => void;
  hasBookingDates: boolean;
}

const BookingDatesContext = createContext<BookingDatesContextType | undefined>(undefined);

const STORAGE_KEY = 'booking-dates';

export const BookingDatesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();

  // Load dates from localStorage on initialization
  useEffect(() => {
    try {
      const savedDates = localStorage.getItem(STORAGE_KEY);
      if (savedDates) {
        const parsed = JSON.parse(savedDates);
        if (parsed.startDate) setStartDate(new Date(parsed.startDate));
        if (parsed.endDate) setEndDate(new Date(parsed.endDate));
      }
    } catch (error) {
      console.error('Error loading booking dates from localStorage:', error);
    }
  }, []);

  // Save dates to localStorage whenever they change
  useEffect(() => {
    if (startDate && endDate) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      }));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [startDate, endDate]);

  const setBookingDates = useCallback((newStartDate?: Date, newEndDate?: Date) => {
    setStartDate(newStartDate);
    setEndDate(newEndDate);
  }, []);

  const clearBookingDates = useCallback(() => {
    setStartDate(undefined);
    setEndDate(undefined);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const hasBookingDates = useMemo(() => {
    return Boolean(startDate && endDate);
  }, [startDate, endDate]);

  const contextValue = useMemo(() => ({
    startDate,
    endDate,
    setBookingDates,
    clearBookingDates,
    hasBookingDates
  }), [startDate, endDate, setBookingDates, clearBookingDates, hasBookingDates]);

  return (
    <BookingDatesContext.Provider value={contextValue}>
      {children}
    </BookingDatesContext.Provider>
  );
};

export const useBookingDates = () => {
  const context = useContext(BookingDatesContext);
  if (context === undefined) {
    throw new Error('useBookingDates must be used within a BookingDatesProvider');
  }
  return context;
};