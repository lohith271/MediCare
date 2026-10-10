# MediCare — Handoff Document (HANDOFF.md)

## 1. Feature Status Table (Phase A & B)

| Feature | Status | Evidence / Notes |
|---|---|---|
| A1 Auth + Profile (Landing, Login, Register, Profile, QR) | done | Patient profile management (`/profile`), E.164 phone, blood group, Base32 Health ID, dynamic QR code encoding ONLY Health ID, trusted contacts manager, and emergency disclosure controls. API: `app/api/profile/route.ts`. |
| A2 Upload + Extraction | done | Built by Member 2 on `feat/extraction-review`. Magic bytes validation (PDF, JPG, PNG), 10MB cap, structured Vision LLM via `lib/llm/adapter.ts`, pure generic & frequency normalizers (`lib/normalize/index.ts`), and extraction route (`app/api/documents/[id]/extract`) with `maxDuration = 60`. |
| A3 Review & Confirm Screen | done | Built by Member 2 on `feat/extraction-review`. Split-screen review screen (`app/documents/[id]/review/page.tsx`) with PDF canvas/Image viewer, visible yellow highlight ring on confidence < 0.7, low confidence warning banner (< 80), and `/api/documents/[id]/confirm` route syncing clinical records. Verified with `tsc` and `next build`. |
| A4 Timeline | not-started | Skeleton files in place |
| A5 Summaries & Post-Login Patient Overview | done | Post-login dashboard (`/summary`) fully functional, displaying active diagnoses, prescribed medicines, upcoming appointment alerts, recent lab vitals snapshot, and direct navigation shortcuts. |
| A6 Search | not-started | Skeleton files in place |
| A7 Clinical Flags Engine | not-started | Pure rules engine definitions in `lib/rules`. |
| A8 Share by Code | done | Doctor sharing, time-limited tokens, and scope filtering via `app/share/page.tsx`. |
| A9 Emergency Basic Lookup | done | Public emergency scan with PIN protection via `app/emergency/page.tsx`. |
| A10 Emergency Full Access | done | Emergency escalation with parent approval notifications via `app/emergency/approve/page.tsx`. |
| A11 Access Log Page | done | Audit log displaying clinical accesses via `app/access-log/page.tsx`. |
| A12 Trend Charts & Lab Analysis | done | Recharts line graphs for Fasting & Postprandial Blood Glucose, HbA1c trajectory, and Arterial Blood Pressure titration over time (`/trends`). API: `app/api/trends/route.ts`. |
| Consultation, Disease & Follow-up Tracker | done | Disease tracker, doctor consultation notes, multi-medicine prescription builder, and next doctor appointment scheduler with countdown reminders (`/consultations`). API: `app/api/encounters/route.ts`. |

## 2. Decisions Log
- **Integrated `revanth` into `main2`**: Merged all team contributions with zero feature loss.
- **Extraction & Review Engine (Member 2)**:
  - Phase 1: Pure functions in `lib/normalize/index.ts` mapping brand names (e.g. Glucophage -> metformin) and Latin frequency abbreviations (e.g. BID -> Twice a day).
  - LLM Adapter: `lib/llm/adapter.ts` with strict Zod schemas (`PrescriptionExtract`, `LabReportExtract`, `DischargeExtract`, `OtherExtract`). Every entity contains `evidence_text` and `confidence` (0.0-1.0). Direct Google Gemini REST integration (`gemini-3.5-flash-lite`) with multimodal support for prescriptions, lab panels, and physical medicine packaging/pill strips.
  - Phase 2: Document APIs in `app/api/documents`:
    - `POST /api/documents`: Validates magic bytes (`%PDF-`, `\xff\xd8\xff`, `\x89PNG`) and enforces 10MB file limit, syncing with both `documentsStore` and `lib/data/store`.
    - `POST /api/documents/[id]/extract`: `maxDuration = 60`, runs extraction and clinical normalization.
    - `POST /api/documents/[id]/confirm`: Commits human-reviewed data and updates status to `confirmed`.
  - Phase 3: Modern UI:
    - `/documents`: Medical Vault dashboard with categories, search, lightbox viewer, extraction status pills, and "+ Upload & AI Extract".
    - `/documents/upload`: Drag & drop, validation, instant sample buttons for judges (PDF, Pill Strip, Lab Photo), auto-routing to review screen, with optional manual vault entry.
    - `/documents/[id]/review`: Responsive split-screen (top/bottom on mobile, side-by-side on desktop), PDF rendering via `pdfjs-dist`, zoom/rotation controls, yellow ring border (`ring-2 ring-yellow-400 bg-amber-500/10`) on confidence < 0.7, and document-level warning banner on confidence < 80.
- **Patient Portal & Consultations**:
  - Profile management (`app/profile/page.tsx`) with QR Code rendering (using `qrcode`), E.164 phone formatting, blood group selector, emergency disclosure toggles.
  - Disease & Consultation Tracker (`app/consultations/page.tsx`) with follow-up visit countdowns.
  - Lab Analysis & Trend Charts (`app/trends/page.tsx`) with Recharts graphs.
  - Sharing & Emergency workflows with audit logs (`app/share/page.tsx`, `app/emergency/page.tsx`, `app/access-log/page.tsx`).

## 3. Environment
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `LLM_PROVIDER`, `LLM_API_KEY`, `LLM_MODEL`
- `SESSION_SECRET`
- Testing: Verified via `npm run build` passing with zero errors.
