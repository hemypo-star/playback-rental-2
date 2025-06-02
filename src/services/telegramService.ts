
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

interface NotificationResponse {
  success: boolean;
  message: string;
  details?: {
    chatId: string;
    success: boolean;
    error?: string;
  }[];
  attemptedChats?: number;
  successfulChats?: number;
}

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const sendNotificationWithRetry = async (
  type: 'contact' | 'checkout',
  data: ContactNotificationData | CheckoutNotificationData,
  attempt: number = 1
): Promise<NotificationResponse> => {
  try {
    console.log(`Telegram notification attempt ${attempt}/${MAX_RETRIES} for ${type}:`, data);
    
    const { data: response, error } = await supabase.functions.invoke('send-telegram-notification', {
      body: {
        type,
        data,
        attempt
      }
    });

    if (error) {
      console.error(`Telegram function error on attempt ${attempt}:`, error);
      throw new Error(`Function call failed: ${error.message}`);
    }

    if (!response) {
      throw new Error('No response received from function');
    }

    console.log(`Telegram notification response (attempt ${attempt}):`, response);

    // If we got a response but it wasn't fully successful, and we have retries left
    if (!response.success && attempt < MAX_RETRIES) {
      console.warn(`Partial failure on attempt ${attempt}, retrying...`);
      await sleep(RETRY_DELAY * attempt); // Exponential backoff
      return sendNotificationWithRetry(type, data, attempt + 1);
    }

    return {
      success: response.success || false,
      message: response.message || 'Unknown response',
      details: response.details || [],
      attemptedChats: response.details?.length || 0,
      successfulChats: response.details?.filter((d: any) => d.success).length || 0
    };
  } catch (error) {
    console.error(`Error on attempt ${attempt}:`, error);
    
    if (attempt < MAX_RETRIES) {
      console.log(`Retrying in ${RETRY_DELAY * attempt}ms...`);
      await sleep(RETRY_DELAY * attempt);
      return sendNotificationWithRetry(type, data, attempt + 1);
    }
    
    // Store failed notification for later retry
    await storeFailedNotification(type, data, error);
    
    return {
      success: false,
      message: `Failed after ${MAX_RETRIES} attempts: ${error instanceof Error ? error.message : 'Unknown error'}`,
      details: [],
      attemptedChats: 0,
      successfulChats: 0
    };
  }
};

const storeFailedNotification = async (
  type: 'contact' | 'checkout',
  data: ContactNotificationData | CheckoutNotificationData,
  error: any
) => {
  try {
    console.log('Storing failed notification for later retry...');
    
    // Use the store-failed-notification edge function
    const { error: storageError } = await supabase.functions.invoke('store-failed-notification', {
      body: {
        type,
        data,
        error_message: error instanceof Error ? error.message : 'Unknown error',
        attempts: MAX_RETRIES
      }
    });
    
    if (storageError) {
      console.error('Failed to store notification for retry:', storageError);
    } else {
      console.log('Failed notification stored successfully');
    }
  } catch (err) {
    console.error('Error storing failed notification:', err);
  }
};

export const sendContactNotification = async (data: ContactNotificationData): Promise<NotificationResponse> => {
  console.log('Starting contact notification process...');
  return sendNotificationWithRetry('contact', data);
};

export const sendCheckoutNotification = async (data: CheckoutNotificationData): Promise<NotificationResponse> => {
  console.log('Starting checkout notification process...');
  return sendNotificationWithRetry('checkout', data);
};
