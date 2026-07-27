import { sendOrderWebhook } from './serverApi';

export const sendCheckoutNotification = async (data: any) => {
  console.warn('sendCheckoutNotification is deprecated. Use sendOrderWebhook instead.');
  return sendOrderWebhook(data);
};

export const sendContactNotification = async () => {
  throw new Error('Messenger contact notifications are disabled.');
};
