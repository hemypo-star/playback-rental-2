
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TelegramNotificationRequest {
  type: 'contact' | 'checkout';
  data: {
    name: string;
    email: string;
    phone?: string;
    subject?: string;
    message?: string;
    // Checkout specific fields
    items?: Array<{
      title: string;
      price: number;
      startDate: string;
      endDate: string;
    }>;
    totalAmount?: number;
  };
}

const formatContactMessage = (data: any): string => {
  return `🔔 *Новая заявка с сайта*\n\n` +
         `👤 *Имя:* ${data.name}\n` +
         `📧 *Email:* ${data.email}\n` +
         `📱 *Телефон:* ${data.phone || 'Не указан'}\n` +
         `📝 *Тема:* ${data.subject || 'Не указана'}\n` +
         `💬 *Сообщение:* ${data.message}`;
};

const formatCheckoutMessage = (data: any): string => {
  let message = `🛒 *Новый заказ*\n\n` +
                `👤 *Клиент:* ${data.name}\n` +
                `📧 *Email:* ${data.email}\n` +
                `📱 *Телефон:* ${data.phone}\n\n`;
  
  if (data.items && data.items.length > 0) {
    message += `📦 *Товары:*\n`;
    data.items.forEach((item: any, index: number) => {
      const startDate = new Date(item.startDate).toLocaleDateString('ru-RU');
      const endDate = new Date(item.endDate).toLocaleDateString('ru-RU');
      message += `${index + 1}. ${item.title}\n`;
      message += `   💰 ${item.price}₽\n`;
      message += `   📅 ${startDate} - ${endDate}\n\n`;
    });
  }
  
  if (data.totalAmount) {
    message += `💰 *Общая сумма:* ${data.totalAmount}₽`;
  }
  
  return message;
};

const sendTelegramMessage = async (message: string): Promise<boolean> => {
  try {
    const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN');
    const chatId = Deno.env.get('TELEGRAM_CHAT_ID');
    
    if (!botToken || !chatId) {
      console.error('Telegram credentials not found');
      return false;
    }
    
    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'Markdown',
      }),
    });
    
    if (!response.ok) {
      const errorData = await response.text();
      console.error('Telegram API error:', errorData);
      return false;
    }
    
    console.log('Telegram message sent successfully');
    return true;
  } catch (error) {
    console.error('Error sending Telegram message:', error);
    return false;
  }
};

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { type, data }: TelegramNotificationRequest = await req.json();
    
    console.log('Received notification request:', { type, data });
    
    let message: string;
    
    if (type === 'contact') {
      message = formatContactMessage(data);
    } else if (type === 'checkout') {
      message = formatCheckoutMessage(data);
    } else {
      throw new Error('Invalid notification type');
    }
    
    const success = await sendTelegramMessage(message);
    
    return new Response(
      JSON.stringify({ 
        success,
        message: success ? 'Notification sent successfully' : 'Failed to send notification'
      }),
      {
        status: success ? 200 : 500,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    );
  } catch (error) {
    console.error('Error in send-telegram-notification function:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message 
      }),
      {
        status: 500,
        headers: { 
          'Content-Type': 'application/json', 
          ...corsHeaders 
        },
      }
    );
  }
};

serve(handler);
