
const express = require('express');
const router = express.Router();

// Telegram notification handler
const sendTelegramMessage = async (message, chatId) => {
  const result = { chatId, success: false };
  
  try {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    
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

const getAllChatIds = () => {
  const chatIds = [];
  
  // Get all chat IDs from environment variables
  const primaryChatId = process.env.TELEGRAM_CHAT_ID;
  const chatId2 = process.env.TELEGRAM_CHAT_ID_2;
  const chatId3 = process.env.TELEGRAM_CHAT_ID_3;
  
  if (primaryChatId) chatIds.push(primaryChatId);
  if (chatId2) chatIds.push(chatId2);
  if (chatId3) chatIds.push(chatId3);
  
  // Check for additional chat IDs (4-10)
  for (let i = 4; i <= 10; i++) {
    const additionalChatId = process.env[`TELEGRAM_CHAT_ID_${i}`];
    if (additionalChatId) {
      chatIds.push(additionalChatId);
    }
  }
  
  return chatIds;
};

const sendToAllChats = async (message) => {
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
  
  return { success: overallSuccess, results };
};

const formatContactMessage = (data) => {
  return `🔔 *Новая заявка с сайта*\n\n` +
         `👤 *Имя:* ${data.name}\n` +
         `📧 *Email:* ${data.email}\n` +
         `📱 *Телефон:* ${data.phone || 'Не указан'}\n` +
         `📝 *Тема:* ${data.subject || 'Не указана'}\n` +
         `💬 *Сообщение:* ${data.message}`;
};

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

// Contact notification endpoint
router.post('/contact', async (req, res) => {
  try {
    const { name, email, phone, subject, message } = req.body;
    
    if (!name || !email || !message) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: name, email, message'
      });
    }
    
    const telegramMessage = formatContactMessage({ name, email, phone, subject, message });
    const { success, results } = await sendToAllChats(telegramMessage);
    
    const responseData = {
      success,
      message: success 
        ? `Contact notification sent successfully (${results.filter(r => r.success).length}/${results.length} chats)` 
        : 'Failed to send contact notification to any chat',
      details: results,
      timestamp: new Date().toISOString()
    };
    
    res.status(success ? 200 : 500).json(responseData);
  } catch (error) {
    console.error('Error in contact notification:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Checkout notification endpoint
router.post('/checkout', async (req, res) => {
  try {
    const { name, email, phone, items, totalAmount } = req.body;
    
    if (!name || !email || !phone) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: name, email, phone'
      });
    }
    
    const telegramMessage = formatCheckoutMessage({ name, email, phone, items, totalAmount });
    const { success, results } = await sendToAllChats(telegramMessage);
    
    const responseData = {
      success,
      message: success 
        ? `Checkout notification sent successfully (${results.filter(r => r.success).length}/${results.length} chats)` 
        : 'Failed to send checkout notification to any chat',
      details: results,
      timestamp: new Date().toISOString()
    };
    
    res.status(success ? 200 : 500).json(responseData);
  } catch (error) {
    console.error('Error in checkout notification:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Retry failed notifications endpoint
router.post('/retry-failed', async (req, res) => {
  try {
    // This would typically query a database for failed notifications
    // For now, return a placeholder response
    res.json({
      success: true,
      processed: 0,
      message: 'No failed notifications to retry'
    });
  } catch (error) {
    console.error('Error retrying failed notifications:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
