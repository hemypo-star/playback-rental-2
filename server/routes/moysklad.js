const express = require('express');
const { supabaseAdmin } = require('../utils/supabaseAdmin');

const router = express.Router();

// Маршрут: POST /api/moysklad/sync-stock
router.post('/sync-stock', async (req, res) => {
  try {
    const FOLDER_UUID = process.env.MS_CATEGORY_UUID;
    const MS_AUTH = process.env.MOYSKLAD_AUTH;

    const response = await fetch(`https://api.moysklad.ru/api/remap/1.2/report/stock/all?filter=productFolder=https://api.moysklad.ru/api/remap/1.2/entity/productfolder/${FOLDER_UUID}`, {
      method: 'GET',
      headers: {
        'Authorization': MS_AUTH,
        'Accept': 'application/json;charset=utf-8',
        'Accept-Encoding': 'gzip'
      }
    });

    if (!response.ok) {
      const errText = await response.text();
      return res.status(response.status).json({ success: false, error: errText });
    }

    const data = await response.json();
    const updates = data.rows.map(item => ({
      ms_id: item.meta.href.split('/').pop(),
      quantity: Math.max(0, Math.floor(item.stock - item.reserve)),
      available: (item.stock - item.reserve) > 0
    }));

    let updatedCount = 0;
    for (const item of updates) {
      const { error } = await supabaseAdmin
        .from('products')
        .update({ quantity: item.quantity, available: item.available })
        .eq('ms_id', item.ms_id);
      if (!error) updatedCount++;
    }

    res.json({ success: true, updated: updatedCount });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;