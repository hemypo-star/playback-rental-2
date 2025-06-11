
-- Create table to track backup operations
CREATE TABLE public.backup_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  backup_type TEXT NOT NULL CHECK (backup_type IN ('database', 'storage', 'full')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'failed')),
  file_path TEXT,
  file_size BIGINT,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.backup_logs ENABLE ROW LEVEL SECURITY;

-- Create policies for backup_logs
CREATE POLICY "Only authenticated users can view backup logs"
  ON public.backup_logs FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Only authenticated users can insert backup logs"
  ON public.backup_logs FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = user_id);

CREATE POLICY "Only authenticated users can update backup logs"
  ON public.backup_logs FOR UPDATE
  USING (auth.role() = 'authenticated' AND auth.uid() = user_id);

-- Create storage bucket for backups
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'backups',
  'backups', 
  false,
  1073741824, -- 1GB limit
  ARRAY['application/gzip', 'application/zip', 'application/sql', 'text/plain', 'application/json']
);

-- Create storage policies for backups bucket
CREATE POLICY "Authenticated users can upload backups"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'backups' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can view their backups"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'backups' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete their backups"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'backups' AND auth.role() = 'authenticated');
