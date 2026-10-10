# MediCare — Handoff Document (HANDOFF.md)

## 1. Feature Status Table (Phase A & B)

| Feature | Status | Evidence / Notes |
|---|---|---|
| A1 Auth + Profile (Landing, Login, Register, Profile, QR) | in-progress | Login and registration now expose only Patient and Doctor roles. Supabase signup trigger fix is in migration `20261010000005_patient_doctor_signup.sql`; apply it to the Supabase project to resolve profile creation errors. |
| A2 Upload + Extraction | done | Built by Member 2 on `feat/extraction-review`. Magic bytes validation (PDF, JPG, PNG), 10MB cap, structured Vision LLM via `lib/llm/adapter.ts`, pure generic & frequency normalizers (`lib/normalize/index.ts`), and extraction route (`app/api/documents/[id]/extract`) with `maxDuration = 60`. |
| A3 Review & Confirm Screen | done | Built by Member 2 on `feat/extraction-review`. Split-screen review screen (`app/documents/[id]/review/page.tsx`) with PDF canvas/Image viewer, visible yellow highlight ring on confidence < 0.7, low confidence warning banner (< 80), and `/api/documents/[id]/confirm` route syncing clinical records. |
| A4 Timeline | done | Built by Member 3. Unified cross-provider Patient Journey mixing medications, lab results, visits, and diagnoses. Includes care continuity metrics, facility filters, search, and yellow-highlighted source citations (`app/timeline/page.tsx`, `app/api/timeline/route.ts`). |
| A5 Summaries & Adherence | done | Built by Member 3. Pure `buildSummary` engine with 90-day medication reconciliation, prominent allergies banner, "I stopped this" toggle, past bad reaction reporting, category views, printable hospital handoff report (`app/summary/page.tsx`, `app/api/summary/route.ts`), plus Today's Doses card with circular progress ring & monthly Adherence Streak Calendar (`components/adherence/`, `lib/adherence/`). |
| A6 Search | in-progress | Search capabilities integrated across Document Vault and Patient Journey Timeline. |
| A7 Clinical Flags Engine | done | Built by Member 3. Deterministic pure rules engine (`lib/rules/`) always worded "Needs doctor review": duplicate ingredients, dose conflicts, drug-drug interactions, medicine vs allergy/reaction, and lab retest intervals. Covered with passing Vitest tests. |
| A8 Share by Code | done | Built by Member 4. Doctor sharing, time-limited tokens, and scope filtering via `app/share/page.tsx`. |
| A9 Emergency Basic Lookup | done | Built by Member 4. Public emergency scan with PIN protection via `app/emergency/page.tsx`. |
| A10 Emergency Full Access | done | Built by Member 4. Emergency escalation with out-of-band contact approval notifications via `app/emergency/approve/page.tsx`. |
| A11 Access Log Page | done | Built by Member 4. Audit log displaying clinical accesses via `app/access-log/page.tsx`. |
| A12 Trend Charts & Lab Analysis | done | Built by Member 4. Interactive line graphs for Fasting & Postprandial Blood Glucose, HbA1c trajectory, and Arterial Blood Pressure titration over time (`/trends`). API: `app/api/trends/route.ts`. |
| Consultation, Disease & Follow-up Tracker | done | Built by Member 4. Disease tracker, doctor consultation notes, multi-medicine prescription builder, and next doctor appointment scheduler with countdown reminders (`/consultations`). API: `app/api/encounters/route.ts`. |

## 2. Decisions Log
- **Integrated Full Team Stack into `main2`**: Merged Member 1 (Auth & Profile), Member 2 (Extraction & Vault), Member 3 (Summary, Safety Rules, Adherence Streaks & Timeline), and Member 4 (ER Access, Sharing, Trends & Consultations) with zero feature loss.
- **Extraction & Review Engine (Member 2)**:
  - Pure functions in `lib/normalize/index.ts` mapping brand names (e.g. Glucophage -> metformin) and Latin frequency abbreviations.
  - LLM Adapter: `lib/llm/adapter.ts` with strict Zod schemas (`PrescriptionExtract`, `LabReportExtract`, `DischargeExtract`, `OtherExtract`). Every entity contains `evidence_text` and `confidence` (0.0-1.0). Direct Google Gemini REST integration with multimodal support.
  - Document APIs in `app/api/documents` with magic byte validation and confirmation sync.
  - Medical Vault (`/documents`), Upload (`/documents/upload`), and split-screen human review (`/documents/[id]/review`).
- **Clinical Summary, Safety Rules & Adherence (Member 3)**:
  - Pure Clinical Summary Engine (`lib/summary/builder.ts`): 100% deterministic, zero LLM hallucination, 90-day active medication window, brand-to-generic mapping, condition synonym resolution, and prominent allergies banner.
  - Deterministic Safety Rules Engine (`lib/rules/`): Always worded "Needs doctor review", covering duplicate active ingredients, dosage conflicts, drug interactions, allergy/reaction conflicts, and retest guidance.
  - Unified Cross-Facility Patient Journey Timeline (`app/timeline/page.tsx`): Care continuity metrics strip, facility filtering, search, and yellow-highlighted source citations.
  - Today's Doses Card & Adherence Streak Calendar (`lib/adherence/`, `components/adherence/`): Circular progress ring, slot cards (Morning/Afternoon/Evening/Night) with idempotent Taken/Skip actions, 30-day adherence rate %, CSS grid monthly calendar with icons & legend, day inspector modal, and gentle supportive messaging.
  - Interactive Patient Bad Reaction Reporting (`POST /api/summary`) and clean hospital ER-ready printable handoff report.
- **Patient Portal, Sharing & ER Workflows (Member 1 & 4)**:
  - Profile management (`app/profile/page.tsx`) with QR Code rendering, E.164 phone formatting, blood group selector, emergency disclosure toggles.
  - Disease & Consultation Tracker (`app/consultations/page.tsx`) with follow-up visit countdowns.
  - Lab Analysis & Trend Charts (`app/trends/page.tsx`) with graphs.
  - Sharing & Emergency workflows with audit logs (`app/share/page.tsx`, `app/emergency/page.tsx`, `app/access-log/page.tsx`).

## 3. Environment
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `LLM_PROVIDER`, `LLM_API_KEY`, `LLM_MODEL`
- `SESSION_SECRET`
- Testing: Verified via `npm run build` and `npx vitest run`.
