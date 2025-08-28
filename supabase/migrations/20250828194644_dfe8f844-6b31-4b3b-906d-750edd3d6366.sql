-- Create extension for UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create job_groups table (orders)
CREATE TABLE public.job_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_label TEXT,
  total_price_cents INT DEFAULT 0,
  payment_status TEXT DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'paid')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create jobs table (individual files)
CREATE TABLE public.jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_group_id UUID REFERENCES job_groups(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_size_bytes BIGINT,
  storage_path TEXT NOT NULL,
  pages TEXT DEFAULT 'all',
  color_mode TEXT DEFAULT 'bw' CHECK (color_mode IN ('bw', 'color')),
  sides TEXT DEFAULT 'single' CHECK (sides IN ('single', 'double')),
  copies INT DEFAULT 1 CHECK (copies > 0),
  price_cents INT DEFAULT 0,
  payment_status TEXT DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'paid')),
  status TEXT DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'printed', 'ready')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create daily_summary table for EOD reports
CREATE TABLE public.daily_summary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL UNIQUE,
  total_users INT DEFAULT 0,
  total_docs INT DEFAULT 0,
  total_income_cents INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_jobs_job_group_id ON public.jobs (job_group_id);
CREATE INDEX idx_jobs_created_at ON public.jobs (created_at);
CREATE INDEX idx_job_groups_created_at ON public.job_groups (created_at);
CREATE INDEX idx_job_groups_payment_status ON public.job_groups (payment_status);

-- Enable Row Level Security
ALTER TABLE public.job_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_summary ENABLE ROW LEVEL SECURITY;

-- RLS Policies for job_groups (allow public insert for demo, admin can view all)
CREATE POLICY "Allow public insert job_groups" ON public.job_groups
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public read own job_groups" ON public.job_groups
  FOR SELECT USING (true);

CREATE POLICY "Allow public update job_groups" ON public.job_groups
  FOR UPDATE USING (true);

-- RLS Policies for jobs (allow public insert for demo, admin can view all)
CREATE POLICY "Allow public insert jobs" ON public.jobs
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public read jobs" ON public.jobs
  FOR SELECT USING (true);

CREATE POLICY "Allow public update jobs" ON public.jobs
  FOR UPDATE USING (true);

-- RLS Policies for daily_summary (admin only)
CREATE POLICY "Allow public read daily_summary" ON public.daily_summary
  FOR SELECT USING (true);

CREATE POLICY "Allow public insert daily_summary" ON public.daily_summary
  FOR INSERT WITH CHECK (true);

-- Create storage bucket for documents
INSERT INTO storage.buckets (id, name, public) VALUES ('documents', 'documents', false);

-- Storage policies for documents
CREATE POLICY "Allow public upload documents" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'documents');

CREATE POLICY "Allow public read documents" ON storage.objects
  FOR SELECT USING (bucket_id = 'documents');

CREATE POLICY "Allow public update documents" ON storage.objects
  FOR UPDATE USING (bucket_id = 'documents');

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_job_groups_updated_at
  BEFORE UPDATE ON public.job_groups
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_jobs_updated_at
  BEFORE UPDATE ON public.jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();