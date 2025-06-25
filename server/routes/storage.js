
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
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

// Ensure storage bucket exists
router.post('/ensure-bucket', async (req, res) => {
  try {
    const { bucketName, createIfNotExists = true } = req.body;
    
    if (!bucketName) {
      return res.status(400).json({
        success: false,
        error: 'Bucket name is required'
      });
    }
    
    console.log(`Ensuring bucket ${bucketName} exists and is public...`);
    
    // Check if bucket exists
    const { data: existingBuckets, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) {
      console.error('Error listing buckets:', listError);
      throw listError;
    }
    
    const bucketExists = existingBuckets.some(bucket => bucket.name === bucketName);
    
    // Create bucket if it doesn't exist and createIfNotExists is true
    if (!bucketExists) {
      if (!createIfNotExists) {
        return res.status(404).json({
          success: false,
          error: "Bucket doesn't exist",
          message: `Bucket ${bucketName} doesn't exist and createIfNotExists is false`
        });
      }
      
      console.log(`Bucket ${bucketName} doesn't exist, creating...`);
      
      const { data: createData, error: createError } = await supabase.storage.createBucket(bucketName, {
        public: true,
        fileSizeLimit: 5242880 // 5MB
      });
      
      if (createError) {
        console.error(`Error creating bucket ${bucketName}:`, createError);
        throw createError;
      }
      
      console.log(`Bucket ${bucketName} created successfully`);
    } else {
      console.log(`Bucket ${bucketName} already exists.`);
    }
    
    // Ensure the bucket is public
    try {
      const { data: updateData, error: updateError } = await supabase.storage.updateBucket(bucketName, {
        public: true,
        fileSizeLimit: 5242880 // 5MB
      });
      
      if (updateError) {
        console.error(`Error updating bucket ${bucketName}:`, updateError);
        throw updateError;
      }
      
      console.log(`Bucket ${bucketName} is now public.`);
    } catch (updateError) {
      console.error(`Error updating bucket ${bucketName}:`, updateError);
      // Continue even if update fails
    }
    
    res.json({
      success: true,
      message: `Bucket ${bucketName} exists and is public`
    });
  } catch (error) {
    console.error('Error in ensure-bucket:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'An unknown error occurred'
    });
  }
});

module.exports = router;
