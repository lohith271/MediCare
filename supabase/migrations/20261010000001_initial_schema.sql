-- ============================================================
-- MediCare Initial Database Schema
-- Run this in the Supabase Dashboard -> SQL Editor
-- ============================================================

-- 1. Profiles Table (Patients and Doctors)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('patient', 'doctor')),
  full_name TEXT NOT NULL,
  dob DATE,
  sex TEXT CHECK (sex IN ('male', 'female', 'other')),
  phone TEXT UNIQUE,
  blood_group TEXT CHECK (blood_group IN ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-')),
  health_id TEXT UNIQUE NOT NULL,
  emergency_enabled BOOLEAN DEFAULT true,
  emergency_fields TEXT[] DEFAULT ARRAY['blood_group', 'allergies', 'conditions', 'medications'],
  emergency_access_hours INT DEFAULT 24,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for emergency lookups
CREATE INDEX IF NOT EXISTS idx_profiles_health_id ON public.profiles(health_id);
CREATE INDEX IF NOT EXISTS idx_profiles_phone ON public.profiles(phone);

-- 2. Doctor Profiles Table
CREATE TABLE IF NOT EXISTS public.doctor_profiles (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  license_no TEXT NOT NULL,
  hospital TEXT NOT NULL,
  verified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Automatic Trigger to insert into public.profiles on Signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert into profiles
  INSERT INTO public.profiles (
    id,
    role,
    full_name,
    dob,
    sex,
    phone,
    blood_group,
    health_id
  ) VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'role', 'patient'),
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Unnamed User'),
    (NEW.raw_user_meta_data->>'dob')::DATE,
    NEW.raw_user_meta_data->>'sex',
    NEW.raw_user_meta_data->>'phone',
    NEW.raw_user_meta_data->>'blood_group',
    COALESCE(NEW.raw_user_meta_data->>'health_id', SUBSTRING(MD5(RANDOM()::TEXT), 1, 12))
  );

  -- If doctor, insert into doctor_profiles
  IF (NEW.raw_user_meta_data->>'role' = 'doctor') THEN
    INSERT INTO public.doctor_profiles (
      user_id,
      license_no,
      hospital,
      verified
    ) VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'license_no', 'PENDING'),
      COALESCE(NEW.raw_user_meta_data->>'hospital', 'Pending Verification'),
      false
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach trigger to auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Enable Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctor_profiles ENABLE ROW LEVEL SECURITY;

-- Patients can view and update their own profile
CREATE POLICY "Users can read own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Doctors can read their own doctor profile
CREATE POLICY "Doctors can read own doctor profile"
  ON public.doctor_profiles FOR SELECT
  USING (auth.uid() = user_id);
