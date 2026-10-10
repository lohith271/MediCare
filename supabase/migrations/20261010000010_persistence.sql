-- ============================================================
-- MediCare: persistence tables used by the app (run AFTER the
-- earlier migrations in the Supabase SQL Editor).
-- Adds: documents (extraction records), medical_documents (vault),
-- allergies, and the private storage bucket for uploaded files.
-- ============================================================

-- 1. Extraction documents (upload -> extract -> review -> confirm)
CREATE TABLE IF NOT EXISTS public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL CHECK (file_type IN ('pdf', 'jpg', 'png')),
  mime_type TEXT NOT NULL,
  size_bytes INT NOT NULL DEFAULT 0,
  page_count INT NOT NULL DEFAULT 1,
  doc_type TEXT,
  doc_date DATE,
  doctor TEXT,
  hospital TEXT,
  status TEXT NOT NULL DEFAULT 'uploaded'
    CHECK (status IN ('uploaded', 'extracting', 'needs_review', 'confirmed', 'failed')),
  confidence_score NUMERIC DEFAULT 0,
  draft_json JSONB,
  storage_path TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_documents_patient_id ON public.documents(patient_id);

-- 2. Medical vault entries (titled records shown in /documents)
CREATE TABLE IF NOT EXISTS public.medical_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'other'
    CHECK (category IN ('xray', 'mri_ct', 'ultrasound', 'lab_pdf', 'prescription_pdf', 'discharge_summary', 'clinical_photo', 'other')),
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size_bytes INT DEFAULT 0,
  storage_path TEXT,
  file_url TEXT,
  doc_date DATE DEFAULT CURRENT_DATE,
  doctor TEXT,
  hospital TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_medical_documents_patient_id ON public.medical_documents(patient_id);

-- 3. Allergies (from documents or entered by the patient)
CREATE TABLE IF NOT EXISTS public.allergies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL DEFAULT 'patient' CHECK (source_type IN ('document', 'patient')),
  document_id UUID,
  page_number INT,
  evidence_text TEXT,
  substance TEXT NOT NULL,
  reaction TEXT,
  created_on DATE DEFAULT CURRENT_DATE,
  confidence NUMERIC DEFAULT 1.0,
  confirmed BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_allergies_patient_id ON public.allergies(patient_id);

-- 4. Follow-up appointments (scheduled from consultations or added manually)
CREATE TABLE IF NOT EXISTS public.appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  encounter_id UUID REFERENCES public.encounters(id) ON DELETE SET NULL,
  patient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  doctor_name TEXT NOT NULL,
  hospital TEXT NOT NULL,
  scheduled_date DATE NOT NULL,
  scheduled_time TEXT,
  reason TEXT NOT NULL,
  instructions TEXT,
  status TEXT NOT NULL DEFAULT 'upcoming'
    CHECK (status IN ('upcoming', 'completed', 'cancelled', 'overdue')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_appointments_patient_id ON public.appointments(patient_id);
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Patients manage own appointments" ON public.appointments;
CREATE POLICY "Patients manage own appointments"
  ON public.appointments FOR ALL
  USING (auth.uid() = patient_id)
  WITH CHECK (auth.uid() = patient_id);

-- 5. Row Level Security. The app server uses the service role and checks
--    ownership itself; these policies protect direct client access.
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medical_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.allergies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Patients manage own documents" ON public.documents;
CREATE POLICY "Patients manage own documents"
  ON public.documents FOR ALL
  USING (auth.uid() = patient_id)
  WITH CHECK (auth.uid() = patient_id);

DROP POLICY IF EXISTS "Patients manage own medical_documents" ON public.medical_documents;
CREATE POLICY "Patients manage own medical_documents"
  ON public.medical_documents FOR ALL
  USING (auth.uid() = patient_id)
  WITH CHECK (auth.uid() = patient_id);

DROP POLICY IF EXISTS "Patients manage own allergies" ON public.allergies;
CREATE POLICY "Patients manage own allergies"
  ON public.allergies FOR ALL
  USING (auth.uid() = patient_id)
  WITH CHECK (auth.uid() = patient_id);

-- 6. Private storage bucket for uploaded medical files.
--    Files are stored under "<patient_id>/<file>" and served via signed URLs only.
INSERT INTO storage.buckets (id, name, public)
VALUES ('medical-files', 'medical-files', false)
ON CONFLICT (id) DO NOTHING;
