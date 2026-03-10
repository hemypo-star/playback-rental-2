import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const { type, data } = await req.json();
    const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN');
    const chatIds = [
      Deno.env.get('TELEGRAM_CHAT_ID'),
      Deno.env.get('TELEGRAM_CHAT_ID_2'),
      Deno.env.get('TELEGRAM_CHAT_ID_3')
    ].filter(Boolean);

    let message = "";

    if (type === 'checkout') {
      // Форматирование дат
      const start = new Date(data.startDate);
      const end = new Date(data.endDate);
      const dateOpts = { day: '2-digit', month: '2-digit', year: 'numeric' } as const;
      
      const startDateStr = start.toLocaleDateString('ru-RU', dateOpts);
      const endDateStr = end.toLocaleDateString('ru-RU', dateOpts);
      const startTimeStr = data.startTime || "10:00";
      const endTimeStr = data.endTime || "20:00";

      message = `🛒 *Новый заказ*\n\n` +
                `👤 *Клиент:* ${data.name}\n` +
                `📱 *Телефон:* ${data.phone}\n` +
                `📧 *Email:* ${data.email}\n\n` +
                `📅 *Период аренды:*\n` +
                `С: ${startDateStr} в ${startTimeStr}\n` +
                `По: ${endDateStr} в ${endTimeStr}\n\n` +
                `📦 *Оборудование:*\n`;

      data.items.forEach((item: any, idx: number) => {
        message += `${idx + 1}. ${item.title} — ${item.price}₽\n`;
      });

      message += `\n💰 *Итого:* ${data.totalAmount.toLocaleString()}₽`;

    } else if (type === 'contact') {
      message = `🔔 *Новая заявка*\n\n` +
                `👤 *Имя:* ${data.name}\n` +
                `📧 *Email:* ${data.email}\n` +
                `📱 *Телефон:* ${data.phone || 'Не указан'}\n` +
                `💬 *Сообщение:* ${data.message}`;
    }

    // Рассылка
    await Promise.all(chatIds.map(chatId =>
      fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: message,
          parse_mode: 'Markdown',
        }),
      })
    ));

    return new Response(JSON.stringify({ success: true }), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }
});