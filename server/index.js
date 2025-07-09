const express = require('express');
const cors = require('cors');
const path = require('path');

// Correctly load the .env file from the project root
const envPath = path.join(__dirname, '..', '.env');
console.log('Loading .env from:', envPath);
require('dotenv').config({ path: envPath });

// Verify that environment variables are loaded correctly
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('FATAL ERROR: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not loaded from .env file.');
  process.exit(1); // Exit if critical variables are missing
}

const app = express();
const PORT = process.env.PORT || 3001;

/* ----------------------- CORS (multiple origins) --------------------- */
const allowed = [
  'https://playbackrental.ru',           // prod SPA
  'https://api.playbackrental.ru',       // same-origin calls from SPA
  'https://supabase.playbackrental.ru',  // Studio; optional
];
app.use(cors({
  origin        : allowed,
  credentials   : true,
  methods       : ['GET','POST','PUT','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization','X-Api-Key'],
}));                                                          // :contentReference[oaicite:6]{index=6}

app.use(express.json());

/* ----------------------- static SPA bundle --------------------------- */
app.use(express.static(path.join(__dirname, '../dist')));

/* ----------------------- routes -------------------------------------- */
const notificationRoutes = require('./routes/notifications');
const storageRoutes      = require('./routes/storage');
const backupRoutes       = require('./routes/backup');

app.use('/api/notifications', notificationRoutes);
app.use('/api/storage',       storageRoutes);
app.use('/api/backup',        backupRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Serve the React application for any route not handled by the API
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

// Generic error handling middleware
app.use((error, req, res, next) => {
  console.error('Server Error:', error);
  res.status(500).json({
    success: false,
    error: 'Internal Server Error'
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on http://0.0.0.0:${PORT}`);
  console.log(`Accepting requests from: https://playbackrental.ru`);
  console.log(`Supabase URL for server: ${process.env.SUPABASE_URL}`);
});