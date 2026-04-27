const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Используем SERVICE_ROLE_KEY! Ни в коем случае не отдаем на фронт.
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

module.exports = { supabaseAdmin };