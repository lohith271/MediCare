-- ============================================================
-- MediCare Member 4 Database Schema
-- Migration for Sharing, Emergency Access, Approvals, Access Log, Inbox, Rate Limits
-- ============================================================

-- 1. Trusted Contacts Table
CREATE TABLE IF NOT EXISTS public.trusted_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  relation TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_trusted_contacts_patient_id ON public.trusted_contacts(patient_id);

-- 2. Shares Table
CREATE TABLE IF NOT EXISTS public.shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  code_hash TEXT NOT NULL,
  scope TEXT[] NOT NULL DEFAULT ARRAY['all'],
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  max_uses INT NOT NULL DEFAULT 3,
  use_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_shares_patient_id ON public.shares(patient_id);
CREATE INDEX IF NOT EXISTS idx_shares_code_hash ON public.shares(code_hash);

-- 3. Emergency Requests Table
CREATE TABLE IF NOT EXISTS public.emergency_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'declined', 'expired')) DEFAULT 'pending',
  request_expires_at TIMESTAMPTZ NOT NULL,
  access_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_emergency_requests_patient_id ON public.emergency_requests(patient_id);
CREATE INDEX IF NOT EXISTS idx_emergency_requests_doctor_id ON public.emergency_requests(doctor_id);

-- 4. Approval Tokens Table
CREATE TABLE IF NOT EXISTS public.approval_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES public.emergency_requests(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES public.trusted_contacts(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_approval_tokens_hash ON public.approval_tokens(token_hash);

-- 5. Access Log Table
CREATE TABLE IF NOT EXISTS public.access_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  actor_type TEXT NOT NULL,
  actor_id TEXT NOT NULL,
  action TEXT NOT NULL,
  detail JSONB DEFAULT '{}'::jsonb,
  ip TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_access_log_patient_id ON public.access_log(patient_id);

-- 6. Demo Inbox Table
CREATE TABLE IF NOT EXISTS public.inbox (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  to_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  link TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_inbox_to_email ON public.inbox(to_email);

-- 7. Rate Limits Table
CREATE TABLE IF NOT EXISTS public.rate_limits (
  key TEXT PRIMARY KEY,
  window_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  count INT NOT NULL DEFAULT 1
);

-- RLS Policies
ALTER TABLE public.trusted_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emergency_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approval_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.access_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inbox ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Trusted Contacts: Owner RLS
DROP POLICY IF EXISTS "Patients can view own trusted contacts" ON public.trusted_contacts;
CREATE POLICY "Patients can view own trusted contacts"
  ON public.trusted_contacts FOR SELECT USING (auth.uid() = patient_id);
DROP POLICY IF EXISTS "Patients can insert own trusted contacts" ON public.trusted_contacts;
CREATE POLICY "Patients can insert own trusted contacts"
  ON public.trusted_contacts FOR INSERT WITH CHECK (auth.uid() = patient_id);
DROP POLICY IF EXISTS "Patients can update own trusted contacts" ON public.trusted_contacts;
CREATE POLICY "Patients can update own trusted contacts"
  ON public.trusted_contacts FOR UPDATE USING (auth.uid() = patient_id);
DROP POLICY IF EXISTS "Patients can delete own trusted contacts" ON public.trusted_contacts;
CREATE POLICY "Patients can delete own trusted contacts"
  ON public.trusted_contacts FOR DELETE USING (auth.uid() = patient_id);

-- Shares: Patient RLS
DROP POLICY IF EXISTS "Patients can view own shares" ON public.shares;
CREATE POLICY "Patients can view own shares"
  ON public.shares FOR SELECT USING (auth.uid() = patient_id);
DROP POLICY IF EXISTS "Patients can insert own shares" ON public.shares;
CREATE POLICY "Patients can insert own shares"
  ON public.shares FOR INSERT WITH CHECK (auth.uid() = patient_id);
DROP POLICY IF EXISTS "Patients can update own shares" ON public.shares;
CREATE POLICY "Patients can update own shares"
  ON public.shares FOR UPDATE USING (auth.uid() = patient_id);

-- Access Log: Patient RLS
DROP POLICY IF EXISTS "Patients can view own access log" ON public.access_log;
CREATE POLICY "Patients can view own access log"
  ON public.access_log FOR SELECT USING (auth.uid() = patient_id);
