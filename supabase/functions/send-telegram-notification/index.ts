
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
  attempt?: number;
}

interface ChatResult {
  chatId: string;
  success: boolean;
  error?: string;
  statusCode?: number;
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

const getAllChatIds = (): string[] => {
  const chatIds: string[] = [];
  
  // Get all chat IDs from environment variables
  const primaryChatId = Deno.env.get('TELEGRAM_CHAT_ID');
  const chatId2 = Deno.env.get('TELEGRAM_CHAT_ID_2');
  const chatId3 = Deno.env.get('TELEGRAM_CHAT_ID_3');
  
  if (primaryChatId) chatIds.push(primaryChatId);
  if (chatId2) chatIds.push(chatId2);
  if (chatId3) chatIds.push(chatId3);
  
  // Check for additional chat IDs (4-10)
  for (let i = 4; i <= 10; i++) {
    const additionalChatId = Deno.env.get(`TELEGRAM_CHAT_ID_${i}`);
    if (additionalChatId) {
      chatIds.push(additionalChatId);
    }
  }
  
  return chatIds;
};

const sendTelegramMessage = async (message: string, chatId: string): Promise<ChatResult> => {
  const result: ChatResult = { chatId, success: false };
  
  try {
    const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN');
    
    if (!botToken) {
      result.error = 'Bot token not configured';
      console.error('Telegram bot token not found');
      return result;
    }
    
    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
    
    console.log(`Attempting to send message to chat ${chatId}...`);
    
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
    
    result.statusCode = response.status;
    
    if (!response.ok) {
      const errorData = await response.text();
      result.error = `HTTP ${response.status}: ${errorData}`;
      console.error(`Telegram API error for chat ${chatId}:`, result.error);
      return result;
    }
    
    const responseData = await response.json();
    
    if (!responseData.ok) {
      result.error = `API Error: ${responseData.description || 'Unknown error'}`;
      console.error(`Telegram API returned error for chat ${chatId}:`, result.error);
      return result;
    }
    
    result.success = true;
    console.log(`Message sent successfully to chat ${chatId}`);
    return result;
    
  } catch (error) {
    result.error = `Network error: ${error.message}`;
    console.error(`Network error sending to chat ${chatId}:`, error);
    return result;
  }
};

const sendToAllChats = async (message: string): Promise<{ success: boolean; results: ChatResult[] }> => {
  const chatIds = getAllChatIds();
  
  if (chatIds.length === 0) {
    console.error('No chat IDs configured');
    return { 
      success: false, 
      results: [{ 
        chatId: 'none', 
        success: false, 
        error: 'No chat IDs configured' 
      }] 
    };
  }
  
  console.log(`Sending message to ${chatIds.length} chat(s): ${chatIds.join(', ')}`);
  
  // Send to all chats in parallel
  const results = await Promise.all(
    chatIds.map(chatId => sendTelegramMessage(message, chatId))
  );
  
  const successCount = results.filter(r => r.success).length;
  const overallSuccess = successCount > 0;
  
  console.log(`Message delivery results: ${successCount}/${chatIds.length} successful`);
  
  // Log detailed results
  results.forEach(result => {
    if (result.success) {
      console.log(`✅ Chat ${result.chatId}: Success`);
    } else {
      console.log(`❌ Chat ${result.chatId}: Failed - ${result.error}`);
    }
  });
  
  return { success: overallSuccess, results };
};

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { type, data, attempt = 1 }: TelegramNotificationRequest = await req.json();
    
    console.log(`[Attempt ${attempt}] Received notification request:`, { type, data });
    
    if (!type || !data) {
      throw new Error('Missing required fields: type and data');
    }
    
    let message: string;
    
    if (type === 'contact') {
      if (!data.name || !data.email) {
        throw new Error('Contact notification missing required fields: name, email');
      }
      message = formatContactMessage(data);
    } else if (type === 'checkout') {
      if (!data.name || !data.email || !data.phone) {
        throw new Error('Checkout notification missing required fields: name, email, phone');
      }
      message = formatCheckoutMessage(data);
    } else {
      throw new Error(`Invalid notification type: ${type}`);
    }
    
    console.log(`[Attempt ${attempt}] Formatted message for ${type} notification`);
    
    const { success, results } = await sendToAllChats(message);
    
    const responseData = {
      success,
      message: success 
        ? `Notifications sent successfully (${results.filter(r => r.success).length}/${results.length} chats)` 
        : 'Failed to send notifications to any chat',
      details: results,
      attempt,
      timestamp: new Date().toISOString()
    };
    
    console.log(`[Attempt ${attempt}] Final result:`, responseData);
    
    return new Response(
      JSON.stringify(responseData),
      {
        status: success ? 200 : 500,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in send-telegram-notification function:', errorMessage);
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: errorMessage,
        timestamp: new Date().toISOString()
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
