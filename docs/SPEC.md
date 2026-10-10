# MediCare — Project Specification (SPEC.md)

## Role & Project
- **Name**: MediCare
- **Tagline**: "Your care, in one place."
- **Hero line**: "Every doctor. Every report. One record."
- **Sub-line**: "Prescriptions, labs and allergies from every provider, organised into one timeline you control."
- **Track**: HealthTech
- **Problem**: "Lost in Transit: Fragmented Medical Records and Repeated Care Across Providers"
- **Nature of App**: MediCare is a patient health-records app. It is NOT insurance and is unrelated to any government Medicare scheme. State this in one line on the homepage, in the README intro and in the first sentence of the demo script.
- **Decision Support**: Use ONLY simulated data. MediCare is decision support for doctors, never diagnosis.

## Stack
- Next.js (App Router) + TypeScript, Tailwind CSS, Supabase (Postgres, email+password Auth, private Storage bucket), Vercel hosting.
- Libraries: zod, @supabase/supabase-js, @supabase/ssr, jose (signed sessions), Vercel AI SDK, pdfjs-dist, recharts, qrcode, vitest, resend.
- LLM access only through a server-side adapter in /lib/llm: env LLM_PROVIDER, LLM_API_KEY, LLM_MODEL.
- Email through /lib/email: Resend if RESEND_API_KEY is set, otherwise write to `inbox` table.

## Data Model
- `profiles(id = auth uid, role patient|doctor|admin, full_name, dob, sex, phone unique E.164, blood_group, health_id unique random 12-char base32, emergency_enabled default true, emergency_fields text[], emergency_access_hours default 24)`
- `doctor_profiles(user_id, license_no, hospital, verified default false)`
- `trusted_contacts(id, patient_id, name, email, relation)`
- `documents(id, patient_id, storage_path, file_type, page_count, doc_type, doc_date, doctor, hospital, status, confidence_score, draft_json, created_at)`
- `medications(...)`, `diagnoses(...)`, `allergies(...)`, `lab_results(...)`, `encounters(...)`
- `shares(...)`, `emergency_requests(...)`, `approval_tokens(...)`, `access_log(...)`, `inbox(...)`, `rate_limits(...)`

## Security Rules
1. Patients read and write their own rows through Supabase RLS (patient_id = auth.uid()).
2. Doctors NEVER read patient tables directly. All doctor access goes through server route handlers validating a grant, applying scope filtering, writing access_log, and returning data.
3. No secrets in client bundles.
4. Persistent footer on every page: "MediCare is a patient records app, not insurance. Demo with simulated data. Decision support only, not a diagnosis."
