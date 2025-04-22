
/**
 * Форматирует строку в формат телефона "+7 (999) 999-99-99"
 * @param value чистое числовое значение (только цифры, начиная после "7")
 */
export const formatPhone = (value: string) => {
  // value без +7
  const digits = value.replace(/\D/g, "");
  let result = "+7";
  if (!digits.startsWith("7")) {
    if (digits.length === 0) return result + " (";
    result += " (";
    if (digits.length >= 1) result += digits.substring(0, 3);
    if (digits.length >= 4) result += ") " + digits.substring(3, 6);
    if (digits.length >= 7) result += "-" + digits.substring(6, 8);
    if (digits.length >= 9) result += "-" + digits.substring(8, 10);
  } else {
    // если вставили полный номер с 7, убираем лидер 7
    let phoneNum = digits.substring(1);
    result += " (";
    if (phoneNum.length >= 1) result += phoneNum.substring(0, 3);
    if (phoneNum.length >= 4) result += ") " + phoneNum.substring(3, 6);
    if (phoneNum.length >= 7) result += "-" + phoneNum.substring(6, 8);
    if (phoneNum.length >= 9) result += "-" + phoneNum.substring(8, 10);
  }
  return result;
};

/**
 * Оставляет только разрешённые цифры - не дает убрать "+7", запрещает нецифры
 * @param input исходный ввод
 */
export const cleanPhoneInput = (input: string) => {
  // Удаляем всё, кроме цифр
  let digits = input.replace(/\D/g, "");
  // +7 должен быть всегда, поэтому удаляем первую 7 если есть в начале
  if (digits.startsWith("7")) digits = digits.slice(1);
  // Оставляем только 10 цифр далее
  return digits.substring(0, 10);
};
