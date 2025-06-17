
import { supabaseServiceClient } from './supabaseClient';

export const getSettings = async () => {
  try {
    const { data, error } = await supabaseServiceClient.from('settings').select('*');
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error getting settings:', error);
    return [];
  }
};

export const updateSettings = async (key: string, value: string) => {
  try {
    const { data, error } = await supabaseServiceClient.from('settings').update({ value }).eq('key', key).select().single();
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating settings:', error);
    return null;
  }
};
