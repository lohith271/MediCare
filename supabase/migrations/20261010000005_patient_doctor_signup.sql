-- Keep signup profiles in sync with Supabase Auth and allow only patient/doctor roles.
-- Existing admin rows are left untouched; the NOT VALID constraint still applies
-- to all new or updated rows without requiring an unreviewed role conversion.
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('patient', 'doctor')) NOT VALID;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  signup_role TEXT;
  metadata JSONB;
BEGIN
  metadata := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);
  signup_role := COALESCE(NULLIF(metadata->>'role', ''), 'patient');

  IF signup_role NOT IN ('patient', 'doctor') THEN
    RAISE EXCEPTION 'Unsupported account role';
  END IF;

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
    signup_role,
    COALESCE(NULLIF(BTRIM(metadata->>'full_name'), ''), 'Unnamed User'),
    CASE WHEN signup_role = 'patient' AND NULLIF(metadata->>'dob', '') IS NOT NULL
      THEN (metadata->>'dob')::date ELSE NULL END,
    CASE WHEN signup_role = 'patient' THEN NULLIF(metadata->>'sex', '') ELSE NULL END,
    NULLIF(BTRIM(metadata->>'phone'), ''),
    CASE WHEN signup_role = 'patient' THEN NULLIF(metadata->>'blood_group', '') ELSE NULL END,
    COALESCE(NULLIF(UPPER(BTRIM(metadata->>'health_id')), ''),
      UPPER(SUBSTRING(REPLACE(gen_random_uuid()::text, '-', ''), 1, 12)))
  );

  IF signup_role = 'doctor' THEN
    INSERT INTO public.doctor_profiles (user_id, license_no, hospital, verified)
    VALUES (
      NEW.id,
      COALESCE(NULLIF(BTRIM(metadata->>'license_no'), ''), 'PENDING'),
      COALESCE(NULLIF(BTRIM(metadata->>'hospital'), ''), 'Pending Verification'),
      false
    );
  END IF;

  RETURN NEW;
END;
$$;
