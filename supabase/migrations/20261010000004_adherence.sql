-- ============================================================
-- MediCare Adherence Schema Migration (dose_logs & schedule_overrides)
-- ============================================================

-- 1. Dose Logs Table (Idempotent tracking of scheduled medication intake)
CREATE TABLE IF NOT EXISTS public.dose_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  medication_id TEXT NOT NULL,
  slot_key TEXT NOT NULL,
  scheduled_date DATE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('taken', 'skipped')),
  logged_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_med_slot_date UNIQUE (medication_id, slot_key, scheduled_date)
);

CREATE INDEX IF NOT EXISTS idx_dose_logs_patient_id ON public.dose_logs(patient_id);
CREATE INDEX IF NOT EXISTS idx_dose_logs_date ON public.dose_logs(scheduled_date);

-- 2. Medication Schedule Overrides Table (Custom time overrides for unrecognized prescriptions)
CREATE TABLE IF NOT EXISTS public.medication_schedule_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  medication_id TEXT UNIQUE NOT NULL,
  times JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sched_overrides_patient_id ON public.medication_schedule_overrides(patient_id);

-- 3. Row Level Security (RLS) - Owner-only access
ALTER TABLE public.dose_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medication_schedule_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Patients manage their own dose logs"
  ON public.dose_logs
  FOR ALL
  USING (auth.uid() = patient_id)
  WITH CHECK (auth.uid() = patient_id);

CREATE POLICY "Patients manage their own schedule overrides"
  ON public.medication_schedule_overrides
  FOR ALL
  USING (auth.uid() = patient_id)
  WITH CHECK (auth.uid() = patient_id);
