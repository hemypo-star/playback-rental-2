
-- Update the existing backups bucket to allow application/json MIME type
UPDATE storage.buckets 
SET allowed_mime_types = ARRAY['application/gzip', 'application/zip', 'application/sql', 'text/plain', 'application/json']
WHERE id = 'backups';
