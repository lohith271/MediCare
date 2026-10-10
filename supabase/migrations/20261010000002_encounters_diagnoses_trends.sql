-- ============================================================
-- MediCare: Diagnoses, Medications, Encounters & Lab Results Schema
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

-- 2. Diagnoses Table
CREATE TABLE IF NOT EXISTS public.diagnoses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  document_id UUID,
  page_number INT,
  evidence_text TEXT,
  name_as_written TEXT NOT NULL,
  name_canonical TEXT NOT NULL,
  diagnosed_date DATE DEFAULT CURRENT_DATE,
  doctor_name TEXT,
  hospital TEXT,
  notes TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'monitored', 'resolved')),
  confidence NUMERIC DEFAULT 1.0,
  confirmed BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_diagnoses_patient_id ON public.diagnoses(patient_id);

-- 3. Medications Table
CREATE TABLE IF NOT EXISTS public.medications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  document_id UUID,
  page_number INT,
  evidence_text TEXT,
  name_as_written TEXT NOT NULL,
  ingredients TEXT[] DEFAULT ARRAY[]::TEXT[],
  strength TEXT,
  dose TEXT,
  frequency TEXT,
  duration_days INT,
  prescribed_by TEXT,
  hospital TEXT,
  start_date DATE DEFAULT CURRENT_DATE,
  patient_marked_stopped BOOLEAN DEFAULT false,
  stopped_on DATE,
  confidence NUMERIC DEFAULT 1.0,
  confirmed BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_medications_patient_id ON public.medications(patient_id);

-- 4. Encounters (Doctor Consultations & Follow-up Scheduler) Table
CREATE TABLE IF NOT EXISTS public.encounters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  document_id UUID,
  kind TEXT NOT NULL DEFAULT 'visit' CHECK (kind IN ('visit', 'admission', 'follow_up', 'consultation')),
  start_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  end_date TIMESTAMPTZ,
  doctor_name TEXT,
  hospital TEXT,
  reason TEXT,
  notes TEXT,
  diagnoses TEXT[] DEFAULT ARRAY[]::TEXT[],
  procedures TEXT[] DEFAULT ARRAY[]::TEXT[],
  prescriptions JSONB DEFAULT '[]'::JSONB,
  next_visit_date DATE,
  next_visit_notes TEXT,
  next_visit_status TEXT DEFAULT 'upcoming' CHECK (next_visit_status IN ('upcoming', 'completed', 'cancelled', 'overdue')),
  confirmed BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_encounters_patient_id ON public.encounters(patient_id);
CREATE INDEX IF NOT EXISTS idx_encounters_start_date ON public.encounters(start_date DESC);

-- 5. Lab Results Table (Glucose, HbA1c, Blood Pressure, etc.)
CREATE TABLE IF NOT EXISTS public.lab_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  document_id UUID,
  page_number INT,
  evidence_text TEXT,
  test_name TEXT NOT NULL,
  value_num NUMERIC NOT NULL,
  value_text TEXT,
  unit TEXT NOT NULL,
  ref_range TEXT,
  flag TEXT DEFAULT 'normal' CHECK (flag IN ('normal', 'high', 'low', 'critical')),
  taken_on DATE NOT NULL DEFAULT CURRENT_DATE,
  lab_name TEXT,
  confidence NUMERIC DEFAULT 1.0,
  confirmed BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_lab_results_patient_id ON public.lab_results(patient_id);
CREATE INDEX IF NOT EXISTS idx_lab_results_test_name ON public.lab_results(test_name);
CREATE INDEX IF NOT EXISTS idx_lab_results_taken_on ON public.lab_results(taken_on DESC);

-- 6. Enable RLS
ALTER TABLE public.trusted_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.diagnoses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.encounters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lab_results ENABLE ROW LEVEL SECURITY;

-- Owner-only policies
DROP POLICY IF EXISTS "Patients manage own trusted_contacts" ON public.trusted_contacts;
CREATE POLICY "Patients manage own trusted_contacts"
  ON public.trusted_contacts FOR ALL
  USING (auth.uid() = patient_id)
  WITH CHECK (auth.uid() = patient_id);

DROP POLICY IF EXISTS "Patients manage own diagnoses" ON public.diagnoses;
CREATE POLICY "Patients manage own diagnoses"
  ON public.diagnoses FOR ALL
  USING (auth.uid() = patient_id)
  WITH CHECK (auth.uid() = patient_id);

DROP POLICY IF EXISTS "Patients manage own medications" ON public.medications;
CREATE POLICY "Patients manage own medications"
  ON public.medications FOR ALL
  USING (auth.uid() = patient_id)
  WITH CHECK (auth.uid() = patient_id);

DROP POLICY IF EXISTS "Patients manage own encounters" ON public.encounters;
CREATE POLICY "Patients manage own encounters"
  ON public.encounters FOR ALL
  USING (auth.uid() = patient_id)
  WITH CHECK (auth.uid() = patient_id);

DROP POLICY IF EXISTS "Patients manage own lab_results" ON public.lab_results;
CREATE POLICY "Patients manage own lab_results"
  ON public.lab_results FOR ALL
  USING (auth.uid() = patient_id)
  WITH CHECK (auth.uid() = patient_id);
