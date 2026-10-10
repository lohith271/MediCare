# MediCare — Every Doctor. Every Report. One Record.

> **Notice:** MediCare is a patient health-records app. It is not insurance and is unrelated to any government Medicare scheme. It is decision support only, not a medical diagnosis. Every safety flag is worded "needs doctor review".

**Live app:** https://medi-care-blue-nine.vercel.app/

**Try it without setup** (judges):

| Role | Email | Password |
|---|---|---|
| Patient | `patient@medicare.demo` | `Password123!` |
| Doctor | `doctor@medicare.demo` | `Password123!` |

Sign in on the [login page](https://medi-care-blue-nine.vercel.app/login). The demo patient, Ramesh Sharma, has a prescription history, lab results, diagnoses, allergies, consultations, and follow-up appointments.

## The Problem

Patients with long-term conditions such as diabetes, hypertension, thyroid disorders, or asthma see several doctors, labs, and pharmacies over the years. Each keeps its own records, usually paper prescriptions, PDF reports, or photos sent over chat. When a patient changes doctors, moves city, or arrives at an emergency room, that history rarely goes with them. The result is repeated tests, overlapping medicines, and sensitive files forwarded insecurely.

## The Solution

MediCare turns scattered documents into one verified timeline for each patient:

1. **Upload** a prescription, lab report, or discharge summary (photo or PDF).
2. **Extract:** an AI model drafts structured medicines, labs, and diagnoses, each with a confidence score. Low-confidence items are highlighted.
3. **Review and confirm:** the patient checks the draft. Nothing enters the record without confirmation.
4. **Use it:** the timeline, the handoff summary, safety checks, adherence tracking, and trend charts all work from that one record.
5. **Share or revoke:** the patient decides who sees it, for how long, and in what sections.

## Key Features

### 1. Cross-provider timeline (Technical Implementation)
- One chronological view of medicines, labs, visits, and diagnoses from every provider.
- Each entry cites the source document and page.
- Filters by facility, search, and care-continuity metrics.

### 2. AI extraction with human review (Innovation)
- Gemini returns structured output checked against Zod schemas: prescriptions, lab reports, discharge summaries, and other documents.
- Brand names are mapped to generic names. Latin frequency abbreviations (OD, BD, TDS) are normalised.
- Confidence below 70% is flagged for review; the review screen shows the original document next to the draft.

### 3. Deterministic safety checks (Technical Implementation, Feasibility)
- Duplicate active ingredients, dose conflicts, drug–drug interactions, medicines that conflict with a recorded allergy, and lab retest intervals.
- Rules are pure functions with automated tests. The wording is always "needs doctor review".

### 4. Clinical handoff summary (Feasibility)
- A 90-day medication reconciliation, a prominent allergies banner, and a one-page printable report for a new doctor or emergency room.

### 5. Adherence and trends (Feasibility)
- Today's doses by time slot, a 30-day adherence rate, and a monthly streak calendar.
- Trend charts for fasting and post-meal glucose, HbA1c, and blood pressure over time.

### 6. Consent-based sharing and emergency access (Innovation, Feasibility)
- **Share codes:** an 8-character code that expires, has a use limit, can be revoked, and is limited to chosen sections.
- **Emergency access:** a doctor requests access, the patient is notified out of band, and access expires automatically.
- **Access log:** every view and share is recorded and visible to the patient.

### 7. Consultations and follow-ups (Feasibility)
- Disease tracker, consultation notes, a multi-medicine prescription builder, and a follow-up scheduler with countdowns.

## Architecture

| Layer | Technology |
|---|---|
| Web app | Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS |
| Database | Supabase Postgres with row-level security (RLS) |
| Authentication | Supabase Auth (email and password), cookie sessions |
| File storage | Supabase Storage, private bucket, short-lived signed links |
| AI extraction | Google Gemini (structured output, Zod-validated) |
| Tokens | Signed JWTs for share and emergency access, checked against the database |
| Hosting | Vercel |

Security design:
- The server takes the patient ID from the signed-in session. Request parameters cannot change it.
- Doctor access requires a valid, unexpired, unrevoked token that matches a database record.
- Uploaded files are never public. Each download uses a link that expires after five minutes.
- Sign-up and sharing endpoints are rate-limited.

## Tests

```bash
npm test
```

The unit tests cover the adherence parser and streaks, the clinical rules engine, the summary builder, and FHIR mapping. Database-dependent tests run only when Supabase environment variables are set.

## Setup (run locally)

**Requirements:** Node.js 22.18 or newer (the seed script runs TypeScript directly), and a Supabase project.

```bash
npm install
cp .env.example .env.local     # then fill in the values
```

1. In the Supabase SQL Editor, run each file in `supabase/migrations/` in filename order (skip the two empty files).
2. Load the demo accounts and records:
   ```bash
   npm run seed:demo
   ```
3. Start the app:
   ```bash
   npm run dev
   ```
   Open http://localhost:3000.

Environment variables are listed in [`.env.example`](.env.example). `SESSION_SECRET` is required. Generate it with `openssl rand -base64 32`.

## Known Limitations

We would rather state these openly than have a judge find them:

| Area | Status |
|---|---|
| **Confirming an extracted document** | Saves the document as confirmed, but its medicines, labs, diagnoses, and allergies are not yet written to the timeline. Those entries must be added by hand for now. *To fix.* |
| **Doctor view of a share code** | The doctor receives a valid token, but the doctor's pages do not yet send it when reading records, so patient data is not displayed to doctors yet. *To fix.* |
| **Vault upload metadata** | Title, category, doctor, and notes are not saved for files uploaded through the vault form. *To fix.* |
| **Emergency request** | The doctor's request still includes the patient ID in the request body. Server-side checks apply, but this should come from the lookup result. *To tighten.* |
| **Demo credentials** | The demo passwords are in this repository. Change them before any real use. |
| **Medical scope** | Not validated by clinicians. Not a diagnostic tool. Not certified for regulatory compliance. |
| **Hosting limits** | Long document extractions may hit the platform's function timeout on the free Vercel tier. |

## Roadmap

- Clinician validation of the safety rules with practising doctors.
- Mobile apps (installable Android build and iOS TestFlight).
- Integration with hospital record systems through FHIR (the app already exports FHIR for a patient).
- Stronger verification of doctor identity before access is granted.

## Repository Layout

```
app/            Pages (App Router) and API routes (app/api)
components/     Shared UI components
lib/            Data access, auth, extraction, rules, summary, adherence, tokens
seed/           Demo records and the seed script (npm run seed:demo)
supabase/       SQL migrations
tests/          Unit and integration tests
docs/           Specification, architecture, and feature notes
```

## Team and Track

- **Track:** HealthTech
- **Problem statement:** *"Lost in Transit: Fragmented Medical Records and Repeated Care Across Providers"*
- **Data note:** all records are simulated. The project does not connect to real hospital systems.
