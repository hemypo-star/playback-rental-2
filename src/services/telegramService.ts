
import { sendContactNotification as serverSendContact, sendCheckoutNotification as serverSendCheckout } from './serverApi';

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

export const sendContactNotification = async (data: ContactNotificationData): Promise<NotificationResponse> => {
  console.log('Starting contact notification process via server API...');
  return serverSendContact(data);
};

export const sendCheckoutNotification = async (data: CheckoutNotificationData): Promise<NotificationResponse> => {
  console.log('Starting checkout notification process via server API...');
  return serverSendCheckout(data);
};
