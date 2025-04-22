
import { useCallback } from "react";
import { formatPhone, cleanPhoneInput } from "@/utils/phoneMask";

/**
 * Возвращает onChange обработчик с маской и только цифрами для поля телефона
 * @param onMaskedChange колбэк для передачи форматированного значения в родителя
 */
export const usePhoneInputMask = (onMaskedChange: (value: string) => void) => {
  const handlePhoneChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      // Удаляем все нецифры кроме +7
      let input = e.target.value;
      // очистим так, чтобы +7 не пропало, но цифры дальше шли без мусора
      const cleanInput = cleanPhoneInput(input);
      const masked = formatPhone(cleanInput);
      onMaskedChange(masked);
    },
    [onMaskedChange]
  );
  // Запрет на удаление +7
  const handlePhonePaste = useCallback(
    (e: React.ClipboardEvent<HTMLInputElement>) => {
      let pasted = e.clipboardData.getData("Text");
      // Чистим вставленное
      const clean = cleanPhoneInput(pasted);
      const masked = formatPhone(clean);
      onMaskedChange(masked);
      e.preventDefault();
    },
    [onMaskedChange]
  );
  return { handlePhoneChange, handlePhonePaste };
};
