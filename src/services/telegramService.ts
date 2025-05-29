
import { supabase } from '@/integrations/supabase/client';

interface ContactNotificationData {
  name: string;
  email: string;
  phone?: string;
  subject?: string;
  message: string;
}

interface CheckoutNotificationData {
  name: string;
  email: string;
  phone: string;
  items: Array<{
    title: string;
    price: number;
    startDate: string;
    endDate: string;
  }>;
  totalAmount: number;
}

export const sendContactNotification = async (data: ContactNotificationData): Promise<boolean> => {
  try {
    console.log('Sending contact notification to Telegram:', data);
    
    const { data: response, error } = await supabase.functions.invoke('send-telegram-notification', {
      body: {
        type: 'contact',
        data
      }
    });

    if (error) {
      console.error('Error calling Telegram function:', error);
      return false;
    }

    console.log('Telegram notification response:', response);
    return response?.success || false;
  } catch (error) {
    console.error('Error sending contact notification:', error);
    return false;
  }
};

export const sendCheckoutNotification = async (data: CheckoutNotificationData): Promise<boolean> => {
  try {
    console.log('Sending checkout notification to Telegram:', data);
    
    const { data: response, error } = await supabase.functions.invoke('send-telegram-notification', {
      body: {
        type: 'checkout',
        data
      }
    });

    if (error) {
      console.error('Error calling Telegram function:', error);
      return false;
    }

    console.log('Telegram notification response:', response);
    return response?.success || false;
  } catch (error) {
    console.error('Error sending checkout notification:', error);
    return false;
  }
};
