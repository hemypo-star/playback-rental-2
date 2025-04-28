
import { useCallback } from "react";
import { formatPhone, cleanPhoneInput } from "@/utils/phoneMask";

/**
 * Возвращает onChange обработчик с маской и только цифрами для поля телефона
 * @param onMaskedChange колбэк для передачи форматированного значения в родителя
 */
export const usePhoneInputMask = (onMaskedChange: (value: string) => void) => {
  const handlePhoneChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      // Получаем текущее значение из поля
      const input = e.target.value;
      
      // Очищаем так, чтобы +7 не пропало, но цифры дальше шли без мусора
      const cleanInput = cleanPhoneInput(input);
      
      // Форматируем согласно маске "+7 (XXX) XXX-XX-XX"
      const masked = formatPhone(cleanInput);
      
      // Передаем отформатированное значение в родительский компонент
      onMaskedChange(masked);
    },
    [onMaskedChange]
  );
  
  // Обработка вставки из буфера обмена
  const handlePhonePaste = useCallback(
    (e: React.ClipboardEvent<HTMLInputElement>) => {
      // Получаем вставленный текст
      const pasted = e.clipboardData.getData("Text");
      
      // Очищаем вставленный текст
      const clean = cleanPhoneInput(pasted);
      
      // Форматируем согласно маске
      const masked = formatPhone(clean);
      
      // Передаем отформатированное значение
      onMaskedChange(masked);
      
      // Предотвращаем стандартную вставку
      e.preventDefault();
    },
    [onMaskedChange]
  );
  
  return { handlePhoneChange, handlePhonePaste };
};
