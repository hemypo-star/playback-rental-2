
export const slugify = (text: string): string => {
  const cyrillicToLatinMap: Record<string, string> = {
    а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'yo', ж: 'zh',
    з: 'z', и: 'i', й: 'j', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o',
    п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'h', ц: 'ts',
    ч: 'ch', ш: 'sh', щ: 'sch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya',
    ' ': '-', _: '-',
  };

  return text
    .toLowerCase()
    .split('')
    .map(char => cyrillicToLatinMap[char] || char)
    .join('')
    .replace(/[^a-z0-9-]/g, '') // удаляем все кроме букв, цифр и дефиса
    .replace(/-+/g, '-')       // заменяем множественные дефисы на один
    .replace(/^-|-$/g, '');    // убираем дефисы в начале и конце
};