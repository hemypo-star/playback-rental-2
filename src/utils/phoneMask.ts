
/**
 * Форматирует строку в формат телефона "+7 (XXX) XXX-XX-XX"
 * @param value чистое числовое значение
 */
export const formatPhone = (value: string) => {
  // Очищаем от всех символов кроме цифр
  const digits = value.replace(/\D/g, "");
  let result = "+7";

  // Добавляем пробел и скобку после +7
  result += " (";

  // Форматируем ровно 10 цифр после +7
  if (digits.length >= 1) result += digits.substring(0, 3);
  if (digits.length >= 4) result += ") " + digits.substring(3, 6);
  if (digits.length >= 7) result += "-" + digits.substring(6, 8);
  if (digits.length >= 9) result += "-" + digits.substring(8, 10);

  return result;
};

/**
 * Оставляет только разрешённые цифры - сохраняет "+7", запрещает нецифры
 * @param input исходный ввод
 */
export const cleanPhoneInput = (input: string) => {
  // Удаляем всё, кроме цифр
  let digits = input.replace(/\D/g, "");
  
  // Если первая цифра 7, удаляем её (так как +7 уже есть)
  if (digits.startsWith("7")) {
    digits = digits.substring(1);
  }
  
  // Оставляем ровно 10 цифр после +7
  return digits.substring(0, 10);
};

