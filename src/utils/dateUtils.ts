
import { format, differenceInDays, isWithinInterval, addDays, isBefore, startOfDay } from 'date-fns';
import { ru } from 'date-fns/locale';

export interface DateRange {
  start: Date;
  end: Date;
}

/**
 * Format a date range as a string
 */
export const formatDateRange = (start: Date | undefined | null, end: Date | undefined | null, showTime: boolean = false): string => {
  // Check if dates are valid before processing
  if (!start || !end) {
    return 'Дата не указана';
  }

  const sameDay = start.getDate() === end.getDate() && 
                  start.getMonth() === end.getMonth() && 
                  start.getFullYear() === end.getFullYear();
  
  if (showTime) {
    // Format with times
    if (sameDay) {
      return `${format(start, 'dd.MM.yyyy')} ${format(start, 'HH:mm')} - ${format(end, 'HH:mm')}`;
    } else {
      return `${format(start, 'dd.MM.yyyy HH:mm')} - ${format(end, 'dd.MM.yyyy HH:mm')}`;
    }
  } else {
    // Format dates only
    if (sameDay) {
      return format(start, 'dd MMMM yyyy', { locale: ru });
    } else {
      const sameMonth = start.getMonth() === end.getMonth() && 
                         start.getFullYear() === end.getFullYear();
      
      if (sameMonth) {
        return `${format(start, 'dd')} - ${format(end, 'dd MMMM yyyy', { locale: ru })}`;
      } else {
        return `${format(start, 'dd.MM.yyyy')} - ${format(end, 'dd.MM.yyyy')}`;
      }
    }
  }
};

/**
 * Calculate the number of days between two dates
 */
export const calculateDaysDifference = (start: Date, end: Date): number => {
  return differenceInDays(end, start) + 1; // Include both start and end days
};

/**
 * Check if a date range is available (not conflicting with booked periods)
 */
export const isDateRangeAvailable = (
  start: Date, 
  end: Date, 
  bookedPeriods: { start: Date; end: Date }[]
): boolean => {
  // Check if start date is before today
  const today = startOfDay(new Date());
  if (isBefore(start, today) || isBefore(end, today)) {
    console.log("Date range unavailable: date is before today");
    return false;
  }

  // If there are no booked periods, the date range is available
  if (!bookedPeriods || bookedPeriods.length === 0) {
    return true;
  }
  
  // Check if the selected date range overlaps with any booked period
  for (const period of bookedPeriods) {
    // Check for overlap between the two date ranges
    const periodStart = new Date(period.start);
    const periodEnd = new Date(period.end);
    
    // Convert to milliseconds for easier comparison
    const startMs = start.getTime();
    const endMs = end.getTime();
    const bookedStartMs = periodStart.getTime();
    const bookedEndMs = periodEnd.getTime();
    
    // Check if date ranges overlap
    // An overlap occurs when start1 <= end2 AND start2 <= end1
    if (startMs <= bookedEndMs && bookedStartMs <= endMs) {
      console.log("Date range conflict found:", {
        requestedStart: start,
        requestedEnd: end,
        bookedStart: periodStart,
        bookedEnd: periodEnd
      });
      return false; // Not available due to overlap
    }
  }
  
  return true; // Available
};

/**
 * Formats a date in Russian locale
 */
export const formatDateRu = (date: Date, formatStr: string): string => {
  return format(date, formatStr, { locale: ru });
};

/**
 * Checks if a date is in the past
 */
export const isDateInPast = (date: Date): boolean => {
  const today = startOfDay(new Date());
  return isBefore(date, today);
};

/**
 * Generates available time slots for a given day and booked ranges
 */
export const getAvailableTimeSlots = (
  day: Date,
  bookedRanges: DateRange[],
  slotDurationHours: number = 1,
  businessHours: { open: number; close: number } = { open: 8, close: 22 }
): DateRange[] => {
  // Check if day is in the past
  if (isDateInPast(day)) {
    return []; // No slots available for past days
  }

  const slots: DateRange[] = [];
  const { open, close } = businessHours;
  
  // Create slots from opening to closing time
  for (let hour = open; hour < close; hour += slotDurationHours) {
    const start = new Date(day);
    start.setHours(hour, 0, 0, 0);
    
    const end = new Date(day);
    end.setHours(hour + slotDurationHours, 0, 0, 0);
    
    // Skip slots in the past
    if (isDateInPast(start)) {
      continue;
    }
    
    // Check if this slot is available
    if (isDateRangeAvailable(start, end, bookedRanges)) {
      slots.push({ start, end });
    }
  }
  
  return slots;
};

/**
 * Generates an array of dates for a date range
 */
export const getDatesInRange = (startDate: Date, endDate: Date): Date[] => {
  const dates: Date[] = [];
  let currentDate = new Date(startDate);
  
  while (currentDate <= endDate) {
    dates.push(new Date(currentDate));
    currentDate = addDays(currentDate, 1);
  }
  
  return dates;
};

/**
 * Generate business hours options for dropdowns
 */
export const getBusinessHoursOptions = (
  businessHours: { open: number; close: number } = { open: 8, close: 22 }
): { value: string; label: string }[] => {
  const options = [];
  const { open, close } = businessHours;
  
  for (let hour = open; hour <= close; hour++) {
    options.push({
      value: hour.toString(),
      label: `${hour}:00`
    });
  }
  
  return options;
};
