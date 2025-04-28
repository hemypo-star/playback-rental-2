
/**
 * Форматирует строку в формат телефона "+7 (XXX) XXX-XX-XX"
 * @param value чистое числовое значение
 */
export const formatPhone = (value: string) => {
  // Очищаем от всех символов кроме цифр
  const digits = value.replace(/\D/g, "");
  
  // Базовая маска
  let result = "+7";
  
  // Добавляем пробел и скобку после +7
  if (digits.length > 0) {
    result += " (";
  
    // Добавляем код (первые 3 цифры)
    result += digits.substring(0, Math.min(3, digits.length));
    
    // Добавляем закрывающую скобку и первую часть номера
    if (digits.length > 3) {
      result += ") " + digits.substring(3, Math.min(6, digits.length));
      
      // Добавляем первое тире и вторую часть номера
      if (digits.length > 6) {
        result += "-" + digits.substring(6, Math.min(8, digits.length));
        
        // Добавляем второе тире и последнюю часть номера
        if (digits.length > 8) {
          result += "-" + digits.substring(8, Math.min(10, digits.length));
        }
      }
    }
  } else {
    result += " (";
  }

  return result;
};

/**
 * Оставляет только разрешённые цифры для номера телефона
 * @param input исходный ввод
 */
export const cleanPhoneInput = (input: string) => {
  // Удаляем всё, кроме цифр
  let digits = input.replace(/\D/g, "");
  
  // Если первая цифра 7, удаляем её (так как +7 уже есть)
  if (digits.startsWith("7")) {
    digits = digits.substring(1);
  }
  
  // Оставляем максимум 10 цифр после +7
  return digits.substring(0, 10);
};

/**
 * Проверяет, является ли телефон полным (содержит 10 цифр после +7)
 * @param phone телефон в любом формате
 */
export const isPhoneComplete = (phone: string): boolean => {
  const digits = phone.replace(/\D/g, "");
  return digits.length >= 10;
};

/**
 * Возвращает сообщение о требованиях к номеру телефона
 */
export const getPhoneRequirements = (): string => {
  return "Телефон должен содержать 10 цифр в формате +7 (XXX) XXX-XX-XX";
};
