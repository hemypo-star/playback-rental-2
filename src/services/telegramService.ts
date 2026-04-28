import { sendContactNotification as serverSendContact, sendCheckoutNotification as serverSendCheckout } from './serverApi';

export const sendContactNotification = async (data: any) => {
  console.log('Sending contact notification via Node.js Backend...');
  return serverSendContact(data);
};

export const sendCheckoutNotification = async (data: any) => {
  console.log('Sending checkout notification via Node.js Backend...');
  return serverSendCheckout(data);
};