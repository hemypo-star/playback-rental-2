// Calculate rental price based on number of days (flat rate)
export const calculateRentalPrice = (
  basePrice: number,
  startDate: Date | undefined,
  endDate: Date | undefined
): number => {
  if (!startDate || !endDate || isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    return 0;
  }
  
  const hours = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60));
  if (hours <= 0) return 0;
  
  // Любое количество часов до 24 считается как 1 день.
  const days = Math.ceil(hours / 24) || 1; 
  return Math.round(basePrice * days);
};

// Calculate rental price details (simplified - strictly total only)
export const calculateRentalDetails = (
  basePrice: number,
  hours: number
): {
  total: number;
} => {
  if (hours <= 0) return { total: 0 };
  
  const days = Math.ceil(hours / 24) || 1;
  const total = Math.round(days * basePrice);
  
  return { total };
};

// Alias for backward compatibility
export const calculatePrice = calculateRentalPrice;

// Format currency to locale string
export const formatCurrency = (amount: number, currency: string = 'RUB'): string => {
  const roundedAmount = Math.round(amount);
  
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(roundedAmount);
};

// Format price specifically in rubles
export const formatPriceRub = (amount: number): string => {
  return formatCurrency(amount, 'RUB');
};

// Calculate hourly rates (kept strictly for backward compatibility if imported somewhere)
export const calculateHourlyRate = (dailyPrice: number): number => {
  return Math.round(dailyPrice / 24);
};