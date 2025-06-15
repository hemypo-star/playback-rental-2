
export const getSettings = async () => {
  try {
    const res = await fetch('/api/settings');
    if (!res.ok) throw new Error('Ошибка загрузки настроек');
    return await res.json();
  } catch (error) {
    console.error('Error getting settings:', error);
    return [];
  }
};

export const updateSettings = async (key: string, value: string) => {
  try {
    const res = await fetch(`/api/settings/${encodeURIComponent(key)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value })
    });
    if (!res.ok) throw new Error('Ошибка при обновлении настроек');
    return await res.json();
  } catch (error) {
    console.error('Error updating settings:', error);
    return null;
  }
};
