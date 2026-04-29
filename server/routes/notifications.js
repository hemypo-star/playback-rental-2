const express = require('express');
const router = express.Router();

// ==========================================
// 1. TELEGRAM LOGIC
// ==========================================
const sendTelegramMessage = async (message, chatId) => {
  const result = { chatId, platform: 'Telegram', success: false };
  
  try {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) {
      result.error = 'Telegram bot token not configured';
      return result;
    }
    
    const url = `https://tg-proxy.hemypo.workers.dev/bot${botToken}/sendMessage`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'Markdown',
      }),
    });
    
    if (!response.ok) {
      const errorData = await response.text();
      result.error = `HTTP ${response.status}: ${errorData}`;
      return result;
    }
    
    result.success = true;
    return result;
  } catch (error) {
    result.error = error.message;
    return result;
  }
};

const getTelegramChatIds = () => {
  const chatIds = [];
  if (process.env.TELEGRAM_CHAT_ID) chatIds.push(process.env.TELEGRAM_CHAT_ID);
  // Поддержка дополнительных ID из .env (TELEGRAM_CHAT_ID_2...10)
  for (let i = 2; i <= 10; i++) {
    const additionalId = process.env[`TELEGRAM_CHAT_ID_${i}`];
    if (additionalId) chatIds.push(additionalId);
  }
  return chatIds;
};

// ==========================================
// 2. MAX LOGIC (Финальная рабочая версия)
// ==========================================
const sendMaxMessage = async (message, targetId) => {
  const result = { targetId, platform: 'MAX', success: false };
  try {
    const botToken = process.env.MAX_BOT_TOKEN;
    if (!botToken) {
      result.error = 'MAX bot token not configured';
      return result;
    }

    const numericId = parseInt(targetId, 10);
    // Передаем user_id в URL, так как это Protobuf API
    const url = `https://platform-api.max.ru/messages?user_id=${numericId}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': botToken // Без Bearer
      },
      body: JSON.stringify({
        text: message
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      result.error = `HTTP ${response.status}: ${errorText}`;
      return result;
    }

    result.success = true;
    return result;
  } catch (error) {
    result.error = error.message;
    return result;
  }
};

const getMaxUserIds = () => {
  const ids = [];
  if (process.env.MAX_USER_ID) ids.push(process.env.MAX_USER_ID);
  if (process.env.MAX_CHAT_ID) ids.push(process.env.MAX_CHAT_ID); // Совместимость имен
  
  for (let i = 2; i <= 10; i++) {
    const additionalId = process.env[`MAX_USER_ID_${i}`] || process.env[`MAX_CHAT_ID_${i}`];
    if (additionalId) ids.push(additionalId);
  }
  return ids;
};

// ==========================================
// 3. ORCHESTRATION
// ==========================================
const sendToAllPlatforms = async (message) => {
  const tgIds = getTelegramChatIds();
  const maxIds = getMaxUserIds();
  
  const tasks = [
    ...tgIds.map(id => sendTelegramMessage(message, id)),
    ...maxIds.map(id => sendMaxMessage(message, id))
  ];
  
  if (tasks.length === 0) {
    return { success: false, error: 'No recipients configured' };
  }
  
  const results = await Promise.all(tasks);
  const successCount = results.filter(r => r.success).length;
  
  return { 
    success: successCount > 0, 
    total: tasks.length,
    successCount,
    details: results 
  };
};

// ==========================================
// 4. FORMATTERS
// ==========================================
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

// ==========================================
// 5. API ROUTES
// ==========================================

router.post('/checkout', async (req, res) => {
  try {
    const message = formatCheckoutMessage(req.body);
    const result = await sendToAllPlatforms(message);
    res.status(result.success ? 200 : 500).json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/contact', async (req, res) => {
  try {
    const message = formatContactMessage(req.body);
    const result = await sendToAllPlatforms(message);
    res.status(result.success ? 200 : 500).json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;