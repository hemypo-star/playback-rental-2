const express = require('express');
const router = express.Router();

const getWebhookUrl = () => {
  const webhookUrl = process.env.ORDER_WEBHOOK_URL;

  if (!webhookUrl) {
    throw new Error('ORDER_WEBHOOK_URL is not configured');
  }

  return webhookUrl;
};

const normalizeOrderPayload = (data) => ({
  event: 'order.created',
  source: 'playback-rental',
  orderId: data.orderId || data.order_id || null,
  createdAt: new Date().toISOString(),
  customer: {
    name: data.name || '',
    email: data.email || '',
    phone: data.phone || '',
  },
  items: Array.isArray(data.items)
    ? data.items.map((item) => ({
        productId: item.productId || item.product_id || null,
        title: item.title || '',
        price: Number(item.price || 0),
        quantity: Number(item.quantity || 1),
        startDate: item.startDate || null,
        endDate: item.endDate || null,
        startTime: item.startTime || null,
        endTime: item.endTime || null,
        totalPrice: Number(item.totalPrice || item.totalAmount || 0),
      }))
    : [],
  totalAmount: Number(data.totalAmount || 0),
  currency: data.currency || 'RUB',
});

const sendOrderToWebhook = async (orderPayload) => {
  const webhookUrl = getWebhookUrl();

  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(orderPayload),
  });

  const responseText = await response.text();
  let responseBody = null;

  if (responseText) {
    try {
      responseBody = JSON.parse(responseText);
    } catch {
      responseBody = responseText;
    }
  }

  if (!response.ok) {
    const error = new Error(`Webhook request failed: HTTP ${response.status}`);
    error.status = response.status;
    error.responseBody = responseBody;
    throw error;
  }

  return {
    status: response.status,
    response: responseBody,
  };
};

router.post('/checkout', async (req, res) => {
  try {
    const orderPayload = normalizeOrderPayload(req.body);
    const webhookResult = await sendOrderToWebhook(orderPayload);

    res.status(200).json({
      success: true,
      message: 'Order sent to webhook',
      orderId: orderPayload.orderId,
      webhookStatus: webhookResult.status,
      webhookResponse: webhookResult.response,
    });
  } catch (error) {
    console.error('Order webhook error:', error);

    res.status(error.status || 500).json({
      success: false,
      message: 'Failed to send order to webhook',
      error: error.message,
      details: error.responseBody,
    });
  }
});

router.post('/contact', (req, res) => {
  res.status(410).json({
    success: false,
    message: 'Messenger notifications are disabled. Configure a separate contact webhook if this endpoint is still needed.',
  });
});

module.exports = router;
