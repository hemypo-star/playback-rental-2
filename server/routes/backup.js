
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const archiver = require('archiver');
const router = express.Router();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      persistSession: false,
    }
  }
);

// Create backup endpoint
router.post('/create', async (req, res) => {
  try {
    const { type = 'full' } = req.body;
    
    if (!['database', 'storage', 'full'].includes(type)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid backup type. Must be "database", "storage", or "full"'
      });
    }
    
    console.log(`Creating ${type} backup...`);
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `backup-${type}-${timestamp}.zip`;
    const tempDir = path.join(__dirname, '../temp');
    const backupPath = path.join(tempDir, filename);
    
    // Ensure temp directory exists
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    // Create backup based on type
    const output = fs.createWriteStream(backupPath);
    const archive = archiver('zip', {
      zlib: { level: 9 }
    });
    
    output.on('close', () => {
      console.log(`Backup created: ${archive.pointer()} total bytes`);
      
      // Send the file as download
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      
      const fileStream = fs.createReadStream(backupPath);
      fileStream.pipe(res);
      
      // Clean up the file after sending
      fileStream.on('end', () => {
        fs.unlink(backupPath, (err) => {
          if (err) console.error('Error cleaning up backup file:', err);
        });
      });
    });
    
    archive.on('error', (err) => {
      console.error('Archive error:', err);
      res.status(500).json({
        success: false,
        error: 'Failed to create backup archive'
      });
    });
    
    archive.pipe(output);
    
    // Add backup metadata
    const metadata = {
      type,
      timestamp: new Date().toISOString(),
      supabase_url: process.env.SUPABASE_URL,
      created_by: 'playback-rental-backup-service'
    };
    
    archive.append(JSON.stringify(metadata, null, 2), { name: 'backup-metadata.json' });
    
    if (type === 'database' || type === 'full') {
      // For database backup, we'd typically dump the database
      // This is a placeholder - you'd implement actual database backup logic
      archive.append('Database backup placeholder', { name: 'database/placeholder.sql' });
    }
    
    if (type === 'storage' || type === 'full') {
      // For storage backup, we'd download and archive storage buckets
      // This is a placeholder - you'd implement actual storage backup logic
      archive.append('Storage backup placeholder', { name: 'storage/placeholder.txt' });
    }
    
    archive.finalize();
    
  } catch (error) {
    console.error('Error creating backup:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create backup'
    });
  }
});

module.exports = router;
