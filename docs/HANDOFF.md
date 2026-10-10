# MediCare — Handoff Document (HANDOFF.md)

## 1. Feature Status Table (Phase A & B)

| Feature | Status | Evidence / Notes |
|---|---|---|
| A1 Auth + Profile (Landing, Login, Register) | done | Landing page, multi-role Login (Patient, Doctor, Admin with 1-click quick-fill demo credentials), and Register (Patient with E.164 phone + Base32 Health ID & Doctor with license verification policy) built and verified with `next build` |
| A2 Upload + Extraction | not-started | Skeleton files in place |
| A3 Review & Confirm Screen | not-started | Skeleton files in place |
| A4 Timeline | not-started | Skeleton files in place |
| A5 Summaries | not-started | Skeleton files in place |
| A6 Search | not-started | Skeleton files in place |
| A7 Clinical Flags Engine | not-started | Skeleton files in place |
| A8 Share by Code | not-started | Skeleton files in place |
| A9 Emergency Basic Lookup | not-started | Skeleton files in place |
| A10 Emergency Full Access | not-started | Skeleton files in place |
| A11 Access Log Page | not-started | Skeleton files in place |
| A12 Trend Charts | not-started | Skeleton files in place |

## 2. Decisions Log
- Built Landing Page (`app/page.tsx`), Login Page (`app/login/page.tsx`), and Registration Page (`app/register/page.tsx`) on branch `main2`.
- Styling mirrors the screenshot's dark emerald/teal glowing gradients, terminal/code snippet cards, floating badges, and high-contrast clinical UI.
- Integrated Zod validation schemas (`lib/types/auth.ts`) for Patient and Doctor data models.
- Added instant 1-click Demo Fill credentials on the login page for rapid hackathon judge evaluation with zero configuration friction.
- Set up Supabase SSR browser and server client utilities with fallback support for offline/demo simulations.

## 3. Environment
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `LLM_PROVIDER`, `LLM_API_KEY`, `LLM_MODEL`
- `SESSION_SECRET`
- Local testing: `npm run dev` at `http://localhost:3000`.

## 4. Known Bugs & Limitations
- Full upload/extract pipeline (A2-A3) and clinical summaries (A5) are staged for subsequent slices.

## 5. Next 3 Actions
1. Deploy slice to Vercel and verify live public URL.
2. Connect Supabase database migrations for `profiles` and `doctor_profiles`.
3. Proceed to Slice A2 (Document upload & LLM extraction adapter).
