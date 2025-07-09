const path = require('path');

module.exports = {
  apps: [
    {
      name: 'playback-rental',
      script: './server/index.js',
      instances: 'max',
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: process.env.PORT || '3001',
        SUPABASE_URL: process.env.SUPABASE_URL,
        SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
        SUPABASE_ANON_KEY: process.env.VITE_SUPABASE_ANON_KEY,
        API_URL: process.env.API_URL,
        TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN,
        TELEGRAM_CHAT_ID: process.env.TELEGRAM_CHAT_ID,
        TELEGRAM_CHAT_ID_2: process.env.TELEGRAM_CHAT_ID_2,
        TELEGRAM_CHAT_ID_3: process.env.TELEGRAM_CHAT_ID_3
      },
      error_file: './logs/err.log',
      out_file: './logs/out.log',
      log_file: './logs/combined.log',
      time: true
    }
  ]
};