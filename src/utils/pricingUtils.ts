// Calculate rental price based on number of days
export const calculateRentalPrice = (
  basePrice: number,
  startDate: Date | undefined,
  endDate: Date | undefined
): number => {
  // Check if dates are valid before calculation
  if (!startDate || !endDate || isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    return 0;
  }
  
  // Calculate days between dates
  const millisPerDay = 1000 * 60 * 60 * 24;
  const days = Math.ceil((endDate.getTime() - startDate.getTime()) / millisPerDay);
  
  // Calculate hours for short-term rentals
  const hours = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60));
  
  // Short-term rental: 4 hours or less gets a fixed price (70% of daily rate)
  if (hours <= 4) {
    return Math.round(basePrice * 0.7);
  }
  
  // Apply discount based on duration
  let discount = 0;
  if (days >= 5) {
    discount = 0.3; // 30% off for 5+ days
  } else if (days >= 3) {
    discount = 0.1; // 10% off for 3+ days
  }
  
  const pricePerDay = basePrice * (1 - discount);
  return Math.round(pricePerDay * days);
};

// Calculate rental price details (expanded version)
export const calculateRentalDetails = (
  basePrice: number,
  hours: number
): {
  total: number;
  subtotal: number;
  discount: number;
  hourlyRate: number;
  dayDiscount: number;
} => {
  const days = Math.ceil(hours / 24);
  
  // Initialize variables
  let dayDiscount = 0;
  let subtotal = 0;
  let total = 0;
  let discountAmount = 0;
  let hourlyRate = 0;
  
  // Short-term rental: 4 hours or less
  if (hours <= 4) {
    // For 4 hours, charge 70% of daily rate
    total = Math.round(basePrice * 0.7);
    subtotal = basePrice; // Original daily price
    discountAmount = Math.round(basePrice * 0.3); // 30% discount
    hourlyRate = Math.round((total / 4) * 100) / 100; // Rate per hour, rounded to 2 decimals
    dayDiscount = 30; // 30% discount percentage
  } 
  // More than 4 hours - regular daily rate with possible multi-day discounts
  else {
    if (days >= 5) {
      dayDiscount = 30; // 30% discount for 5+ days
    } else if (days >= 3) {
      dayDiscount = 10; // 10% discount for 3-4 days
    }
    
    hourlyRate = Math.round((basePrice / 24) * 100) / 100; // Per hour for full day rental, rounded to 2 decimals
    subtotal = Math.round(days * basePrice);
    discountAmount = Math.round(subtotal * (dayDiscount / 100));
    total = subtotal - discountAmount;
  }
  
  return {
    total,
    subtotal,
    discount: discountAmount,
    hourlyRate,
    dayDiscount
  };
};

// Alias for backward compatibility
export const calculatePrice = calculateRentalPrice;

// Format currency to locale string
export const formatCurrency = (amount: number, currency: string = 'RUB'): string => {
  // Ensure the amount is properly rounded before formatting
  const roundedAmount = Math.round(amount);
  
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(roundedAmount);
};

// Format price specifically in rubles (common function used across the app)
export const formatPriceRub = (amount: number): string => {
  return formatCurrency(amount, 'RUB');
};

// Calculate hourly rates based on daily price
export const calculateHourlyRate = (dailyPrice: number, hours: number): number => {
  // For 4 hours, charge 70% of daily rate
  if (hours <= 4) {
    return Math.round(dailyPrice * 0.7);
  }
  // Otherwise, charge full daily rate
  return dailyPrice;
};
