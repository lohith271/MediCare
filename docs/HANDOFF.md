# MediCare — Handoff Document (HANDOFF.md)

## 1. Feature Status Table (Phase A & B)

| Feature | Status | Evidence / Notes |
|---|---|---|
| A1 Auth + Profile (Landing, Login, Register, Profile, QR) | done | Patient profile management (`/profile`), E.164 phone, blood group, Base32 Health ID, dynamic QR code encoding ONLY Health ID, trusted contacts manager, and emergency disclosure controls. API: `app/api/profile/route.ts`. |
| A2 Upload + Extraction | in-progress | Upload pipeline & route handlers scaffolded. |
| A3 Review & Confirm Screen | not-started | Skeleton files in place. |
| A4 Timeline | not-started | Skeleton files in place. |
| A5 Summaries & Post-Login Patient Overview | done | Post-login dashboard (`/summary`) fully functional, displaying active diagnoses, prescribed medicines, upcoming appointment alerts, recent lab vitals snapshot, and direct navigation shortcuts. |
| A6 Search | not-started | Skeleton files in place. |
| A7 Clinical Flags Engine | not-started | Pure rules engine definitions in `lib/rules`. |
| A8 Share by Code | not-started | Skeleton files in place. |
| A9 Emergency Basic Lookup | not-started | Skeleton files in place. |
| A10 Emergency Full Access | not-started | Skeleton files in place. |
| A11 Access Log Page | not-started | Skeleton files in place. |
| A12 Trend Charts & Lab Analysis | done | Recharts line graphs for Fasting & Postprandial Blood Glucose, HbA1c trajectory, and Arterial Blood Pressure titration over time (`/trends`). API: `app/api/trends/route.ts`. |
| Consultation, Disease & Follow-up Tracker | done | Disease tracker, doctor consultation notes, multi-medicine prescription builder, and next doctor appointment scheduler with countdown reminders (`/consultations`). API: `app/api/encounters/route.ts`. |

## 2. Decisions Log
- Built dedicated Patient Profile Management (`app/profile/page.tsx`) with QR Code rendering (using `qrcode`), E.164 phone formatting, blood group selector, emergency disclosure toggles, emergency field checkboxes, and trusted contacts CRUD.
- Built Disease & Consultation Tracker (`app/consultations/page.tsx`):
  - Tracks diagnoses with canonical medical nomenclature and clinical status tags.
  - Logs doctor consultation encounters across providers with clinical observations and chief complaints.
  - Multi-drug prescription builder (dose, frequency, duration, instructions).
  - Integrated next doctor visit scheduler and visual countdown reminders ("In 5 days", "Tomorrow", "Past due").
- Built Lab Analysis & Trend Charts (`app/trends/page.tsx`):
  - Interactive Recharts line charts for Fasting & Postprandial Glucose, HbA1c (%), and Blood Pressure (Systolic/Diastolic).
  - Reference lines for normal ranges and clinical thresholds.
  - Longitudinal vitals logging modal and full chronological history table.
- Replaced placeholder `/summary` with a comprehensive post-login Patient Overview Dashboard connecting profile, active conditions, prescribed regimens, upcoming visits, and latest vitals.
- Created `app/components/Navbar.tsx` for seamless navigation across all patient modules and one-click logout.
- Created robust clinical store in `lib/data/store.ts` providing simulated clinical data for `demo-patient-001` with seamless fallback for zero-configuration hackathon evaluation.
- Added database migration `supabase/migrations/20261010000002_encounters_diagnoses_trends.sql`.

## 3. Environment
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `LLM_PROVIDER`, `LLM_API_KEY`, `LLM_MODEL`
- `SESSION_SECRET`
- Testing: `npm run build` passing with zero errors; verified via `tests/unit/patient_features.test.ts`.

## 4. Known Bugs & Limitations
- Live Supabase instance needs `20261010000002_encounters_diagnoses_trends.sql` migration executed in Supabase SQL editor for remote database persistence; in the meantime, the app runs flawlessly on the zero-setup data layer.

## 5. Next 3 Actions
1. Run upload and extraction pipeline (A2-A3).
2. Wire up cross-provider Timeline (A4) and full-text search (A6).
3. Connect Share-by-code and Emergency ER access flows (A8-A10).
