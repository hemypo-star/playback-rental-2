// supabase/functions/send-telegram-notification/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Функция обертка с таймаутом, чтобы предотвратить ошибку 504
const fetchWithTimeout = async (url: string, options: any, timeout = 5000) => {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(id);
    return response;
  } catch (e) {
    clearTimeout(id);
    throw e;
  }
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const { type, data } = await req.json();
    const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN');
    
    // Получаем список ID чатов и отбрасываем пустые значения
    const chatIds = [
      Deno.env.get('TELEGRAM_CHAT_ID'),
      Deno.env.get('TELEGRAM_CHAT_ID_2'),
      Deno.env.get('TELEGRAM_CHAT_ID_3')
    ].filter(Boolean) as string[];

    if (!botToken || chatIds.length === 0) {
      throw new Error("Telegram configuration missing (Bot token or Chat IDs)");
    }

    let message = "";

    if (type === 'checkout') {
      if (!data.items || data.items.length === 0) {
         throw new Error("No items found in checkout data");
      }

      // Берем даты из первого элемента массива (они общие для всей корзины)
      const firstItem = data.items[0];
      const start = new Date(firstItem.startDate);
      const end = new Date(firstItem.endDate);
      const dateOpts = { day: '2-digit', month: '2-digit', year: 'numeric' } as const;
      
      const startDateStr = start.toLocaleDateString('ru-RU', dateOpts);
      const endDateStr = end.toLocaleDateString('ru-RU', dateOpts);
      const startTimeStr = firstItem.startTime || "10:00";
      const endTimeStr = firstItem.endTime || "20:00";

      message = `🛒 *Новый заказ*\n\n` +
                `👤 *Клиент:* ${data.name}\n` +
                `📱 *Телефон:* ${data.phone}\n` +
                `📧 *Email:* ${data.email}\n\n` +
                `📅 *Период аренды:*\n` +
                `С: ${startDateStr} в ${startTimeStr}\n` +
                `По: ${endDateStr} в ${endTimeStr}\n\n` +
                `📦 *Оборудование:*\n`;

      data.items.forEach((item: any, idx: number) => {
        const qty = item.quantity || 1;
        message += `${idx + 1}. ${item.title} x${qty} — ${item.price}₽\n`;
      });

      message += `\n💰 *Итого:* ${data.totalAmount.toLocaleString('ru-RU')}₽`;

    } else if (type === 'contact') {
      message = `🔔 *Новая заявка*\n\n` +
                `👤 *Имя:* ${data.name}\n` +
                `📧 *Email:* ${data.email}\n` +
                `📱 *Телефон:* ${data.phone || 'Не указан'}\n` +
                `💬 *Сообщение:* ${data.message}`;
    } else {
      throw new Error(`Unknown notification type: ${type}`);
    }

    // Рассылаем всем с ограничением по времени (5 секунд на каждый запрос)
    const sendPromises = chatIds.map(async (chatId) => {
      try {
        const res = await fetchWithTimeout(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: message,
            parse_mode: 'Markdown',
          }),
        }, 5000);
        
        if (!res.ok) {
          console.error(`Failed to send to ${chatId}: HTTP ${res.status}`);
          return false;
        }
        return true;
      } catch (e) {
        console.error(`Timeout/Network error for ${chatId}:`, e);
        return false;
      }
    });

    const results = await Promise.all(sendPromises);
    const hasSuccess = results.some(r => r === true);

    return new Response(JSON.stringify({ 
      success: hasSuccess, 
      message: hasSuccess ? "Notification sent" : "Failed to send to any chat"
    }), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });

  } catch (error) {
    console.error('Edge Function Error:', error.message);
    // Возвращаем status 200, чтобы не ронять Promise.all на фронтенде, но с success: false
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), { 
      status: 200, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }
});