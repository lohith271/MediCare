# MediCare — Your Care, in One Place

> **Notice**: MediCare is a patient health-records app, not insurance and unrelated to any government Medicare scheme. Decision support only, not a medical diagnosis.

## Overview
- **Track**: HealthTech
- **Problem**: *"Lost in Transit: Fragmented Medical Records and Repeated Care Across Providers"*
- **Hero**: Every doctor. Every report. One record.
- **Sub-line**: Prescriptions, labs and allergies from every provider, organised into one timeline you control.

## Built-In Features
- **Dark Glowing Medical UI**: High contrast, accessible mobile-first responsive design matching modern developer & clinical ergonomics.
- **Multi-Role Authentication**:
  - **Patient Portal**: Register with Phone (E.164), Date of Birth, Sex, Blood Group, and auto-generated 12-char Crockford Base32 Health ID.
  - **Doctor Clinical Access**: Register with Medical License No and Hospital Affiliation (starts unverified under clinical safety protocols).
  - **1-Click Demo Logins**: Instant testing for Hackathon judges (Demo Patient and Demo Doctor).
- **Architecture**: Next.js 15 (App Router), TypeScript, Tailwind CSS, Supabase SSR Auth, Zod schema validation.

## Environment Variables
See `.env.example`:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `LLM_PROVIDER`, `LLM_API_KEY`, `LLM_MODEL`
- `SESSION_SECRET`

## Getting Started
```bash
# Install dependencies
npm install

# Run development server
npm run dev
# App will run at http://localhost:3000
```
