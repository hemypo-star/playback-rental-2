const express = require('express');
const cors = require('cors');
const path = require('path');

// Загрузка .env
const envPath = path.join(__dirname, '..', '.env');
console.log('Loading .env from:', envPath);
require('dotenv').config({ path: envPath });

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('FATAL ERROR: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not loaded.');
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 3001;

/* ----------------------- CORS --------------------- */
const allowed = [
  'https://playbackrental.ru',
  'https://api.playbackrental.ru',
  'http://localhost:3001', // Для curl/postman
  'http://localhost:5173', // Для Vite dev
];

app.use(cors({
  origin        : allowed,
  credentials   : true,
  methods       : ['GET','POST','PUT','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization','X-Api-Key'],
}));

app.use(express.json());

/* ----------------------- API ROUTES ---------------------------------- */
// ВАЖНО: API маршруты должны идти ПЕРЕД статикой
const notificationRoutes = require('./routes/notifications');
const storageRoutes      = require('./routes/storage');
const backupRoutes       = require('./routes/backup');
const moyskladRoutes     = require('./routes/moysklad');

app.use('/api/notifications', notificationRoutes);
app.use('/api/storage',       storageRoutes);
app.use('/api/backup',        backupRoutes);
app.use('/api/moysklad',      moyskladRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

/* ----------------------- STATIC & SPA --------------------------- */
// Эти маршруты перехватывают всё, что не подошло под API выше
app.use(express.static(path.join(__dirname, '../dist')));

app.get('*', (req, res) => {
  // Если это запрос к API, который не был найден выше, не отдаем HTML
  if (req.url.startsWith('/api/')) {
    return res.status(404).json({ success: false, error: 'API endpoint not found' });
  }
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

/* ----------------------- Error Handling --------------------------- */
app.use((error, req, res, next) => {
  console.error('Server Error:', error);
  res.status(500).json({ success: false, error: 'Internal Server Error' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🚀 Server is running on http://localhost:${PORT}`);
  console.log(`📡 API Moysklad: http://localhost:${PORT}/api/moysklad/sync-stock`);
});