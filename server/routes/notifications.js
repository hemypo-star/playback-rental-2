const express = require('express');
const router = express.Router();

// Хелпер для отправки с таймаутом (защита от 504)
const fetchWithTimeout = async (url, options, timeout = 5000) => {
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

// Функция отправки сообщения в Telegram
const sendTelegramMessage = async (message, chatId) => {
  const result = { chatId, success: false };
  try {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) throw new Error('Bot token missing');

    const url = `https://tg-proxy.hemypo.workers.dev/bot${botToken}/sendMessage`;
    const response = await fetchWithTimeout(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'Markdown',
      }),
    }, 5000);

    const data = await response.json();
    result.success = data.ok;
    if (!data.ok) result.error = data.description;
    return result;
  } catch (error) {
    result.error = error.name === 'AbortError' ? 'Timeout' : error.message;
    return result;
  }
};

// Форматирование сообщения для контактной формы
const formatContactMessage = (data) => {
  return `🔔 *Новая заявка с сайта*\n\n` +
         `👤 *Имя:* ${data.name}\n` +
         `📧 *Email:* ${data.email}\n` +
         `📱 *Телефон:* ${data.phone || 'Не указан'}\n` +
         `📝 *Тема:* ${data.subject || 'Не указана'}\n` +
         `💬 *Сообщение:* ${data.message}`;
};

// Форматирование сообщения для заказа (чекаута)
const formatCheckoutMessage = (data) => {
  let message = `🛒 *Новый заказ*\n\n` +
                `👤 *Клиент:* ${data.name}\n` +
                `📧 *Email:* ${data.email}\n` +
                `📱 *Телефон:* ${data.phone}\n\n`;
  
  if (data.items && data.items.length > 0) {
    message += `📦 *Товары:*\n`;
    data.items.forEach((item, index) => {
      const startDate = new Date(item.startDate).toLocaleDateString('ru-RU');
      const endDate = new Date(item.endDate).toLocaleDateString('ru-RU');
      const startTime = item.startTime ? item.startTime.padStart(2, '0') + ':00' : '';
      const endTime = item.endTime ? item.endTime.padStart(2, '0') + ':00' : '';
      
      message += `${index + 1}. ${item.title}\n`;
      
      // Format date and time display
      if (startDate === endDate) {
        message += `\n📅 ${startDate} с ${startTime} до ${endTime}\n\n`;
      } else {
        message += `\n📅\nДата начала: ${startDate} в ${startTime}\nДата окончания: ${endDate} в ${endTime}\n\n`;
      }
    });
  }
  
  if (data.totalAmount) {
    message += `💰 *Общая сумма:* ${data.totalAmount}₽`;
  }
  
  return message;
};

// Роут для уведомлений из формы контактов
router.post('/contact', async (req, res) => {
  try {
    const telegramMessage = formatContactMessage(req.body);
    
    // Собираем все чаты из ENV
    const chatIds = [
      process.env.TELEGRAM_CHAT_ID,
      process.env.TELEGRAM_CHAT_ID_2,
      process.env.TELEGRAM_CHAT_ID_3
    ].filter(Boolean);

    if (chatIds.length === 0) {
      throw new Error("No Telegram Chat IDs configured on server");
    }

    const results = await Promise.all(chatIds.map(id => sendTelegramMessage(telegramMessage, id)));
    const success = results.some(r => r.success);

    res.status(success ? 200 : 500).json({ success, details: results });
  } catch (error) {
    console.error('Contact error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Роут для уведомлений о заказах
router.post('/checkout', async (req, res) => {
  try {
    const { name, email, phone, items, totalAmount } = req.body;
    
    // Вызываем нашу функцию форматирования
    const telegramMessage = formatCheckoutMessage({ name, email, phone, items, totalAmount });
    
    // Собираем все чаты из ENV
    const chatIds = [
      process.env.TELEGRAM_CHAT_ID,
      process.env.TELEGRAM_CHAT_ID_2,
      process.env.TELEGRAM_CHAT_ID_3
    ].filter(Boolean);

    if (chatIds.length === 0) {
      throw new Error("No Telegram Chat IDs configured on server");
    }

    const results = await Promise.all(chatIds.map(id => sendTelegramMessage(telegramMessage, id)));
    const success = results.some(r => r.success);

    res.status(success ? 200 : 500).json({ success, details: results });
  } catch (error) {
    console.error('Checkout error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Роут для повторной отправки (заглушка из старого кода)
router.post('/retry-failed', async (req, res) => {
  res.json({ success: true, processed: 0, message: 'No failed notifications to retry' });
});

module.exports = router;