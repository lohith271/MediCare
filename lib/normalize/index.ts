/**
 * MediCare Clinical Normalization Utilities (Pure functions, no DB dependencies)
 */

// Common Brand to Generic name dictionary for clinical standardization
const BRAND_TO_GENERIC_MAP: Record<string, string> = {
  glucophage: "metformin",
  fortamet: "metformin",
  lipitor: "atorvastatin",
  crestor: "rosuvastatin",
  zocor: "simvastatin",
  tylenol: "acetaminophen",
  paracetamol: "acetaminophen",
  advil: "ibuprofen",
  motrin: "ibuprofen",
  aleve: "naproxen",
  amoxil: "amoxicillin",
  augmentin: "amoxicillin-clavulanate",
  zithromax: "azithromycin",
  cipro: "ciprofloxacin",
  keflex: "cephalexin",
  zestril: "lisinopril",
  prinivil: "lisinopril",
  norvasc: "amlodipine",
  cozaar: "losartan",
  diovan: "valsartan",
  toprol: "metoprolol succinate",
  lopressor: "metoprolol tartrate",
  lasix: "furosemide",
  microzide: "hydrochlorothiazide",
  hctz: "hydrochlorothiazide",
  prilosec: "omeprazole",
  nexium: "esomeprazole",
  prevacid: "lansoprazole",
  pantoloc: "pantoprazole",
  synthroid: "levothyroxine",
  ventolin: "albuterol",
  proair: "albuterol",
  provil: "albuterol",
  prozac: "fluoxetine",
  zoloft: "sertraline",
  lexapro: "escitalopram",
  xanax: "alprazolam",
  valium: "diazepam",
  ativan: "lorazepam",
  neurontin: "gabapentin",
  lyrica: "pregabalin",
  plavix: "clopidogrel",
  eliquis: "apixaban",
  xarelto: "rivaroxaban",
  coumadin: "warfarin",
};

// Common Medical Latin Abbreviations to Standard Clinical English
const FREQUENCY_MAP: Record<string, string> = {
  qd: "Once a day",
  qday: "Once a day",
  od: "Once a day",
  "once daily": "Once a day",
  "1x daily": "Once a day",
  "once a day": "Once a day",
  bid: "Twice a day",
  "b.i.d.": "Twice a day",
  "twice daily": "Twice a day",
  "2x daily": "Twice a day",
  "twice a day": "Twice a day",
  tid: "Three times a day",
  "t.i.d.": "Three times a day",
  "3x daily": "Three times a day",
  "three times a day": "Three times a day",
  qid: "Four times a day",
  "q.i.d.": "Four times a day",
  "4x daily": "Four times a day",
  "four times a day": "Four times a day",
  prn: "As needed",
  "p.r.n.": "As needed",
  "as needed": "As needed",
  qhs: "At bedtime",
  "q.h.s.": "At bedtime",
  hs: "At bedtime",
  "at bedtime": "At bedtime",
  qam: "Every morning",
  "q.a.m.": "Every morning",
  qpm: "Every evening",
  "q.p.m.": "Every evening",
  q4h: "Every 4 hours",
  "q.4.h.": "Every 4 hours",
  q6h: "Every 6 hours",
  "q.6.h.": "Every 6 hours",
  q8h: "Every 8 hours",
  "q.8.h.": "Every 8 hours",
  q12h: "Every 12 hours",
  "q.12.h.": "Every 12 hours",
  qw: "Once a week",
  qweek: "Once a week",
  stat: "Immediately",
};

/**
 * Normalizes medicine names by mapping common brand names to generic names
 * and stripping unnecessary prefixes, formulation indicators, and punctuation.
 * e.g., "Tab Glucophage 500mg" -> "metformin"
 *       "Cap. Amoxil" -> "amoxicillin"
 */
export function normalizeMedicineName(name: string): string {
  if (!name || typeof name !== "string") return "";

  // 1. Clean extra spaces, lowercase
  let cleaned = name.trim().toLowerCase();

  // 2. Strip formulation prefixes (Tab., Cap., Inj., Syr., Oint., Drp., etc.)
  cleaned = cleaned.replace(/^(tab(\.|let)?|cap(\.|sule)?|inj(\.|ection)?|syr(\.|up)?|oint(\.|ment)?|drp(\.|s)?|sol(\.|ution)?|crm|cream)\s+/i, "");

  // 3. Strip trailing dosage info if attached directly (e.g. "Glucophage 500mg" -> "Glucophage")
  const brandCandidate = cleaned.replace(/\s+\d+(\.\d+)?\s*(mg|mcg|g|ml|iu|units|%)?.*$/i, "").trim();

  // 4. Strip non-alphanumeric punctuation (except hyphens for combination drugs)
  const normalizedCandidate = brandCandidate.replace(/[^\w\s-]/g, "").trim();

  // 5. Look up in brand-to-generic dictionary
  if (BRAND_TO_GENERIC_MAP[normalizedCandidate]) {
    return BRAND_TO_GENERIC_MAP[normalizedCandidate];
  }

  // 6. Check single tokens in case words are reversed (e.g. "Glucophage XR")
  const words = normalizedCandidate.split(/\s+/);
  for (const word of words) {
    if (BRAND_TO_GENERIC_MAP[word]) {
      return BRAND_TO_GENERIC_MAP[word];
    }
  }

  // Fallback: return cleaned lowercase candidate
  return normalizedCandidate || cleaned;
}

/**
 * Standardizes frequency prescriptions from Latin abbreviations and shorthand
 * into patient-friendly, clinically precise instructions.
 * e.g., "BID" -> "Twice a day", "PRN" -> "As needed"
 */
export function normalizeFrequency(freq: string): string {
  if (!freq || typeof freq !== "string") return "As directed";

  const cleaned = freq.trim().toLowerCase().replace(/[.,]/g, "");

  if (FREQUENCY_MAP[cleaned]) {
    return FREQUENCY_MAP[cleaned];
  }

  // Match key patterns like "every 8 hours" or "q8h"
  const qHourMatch = cleaned.match(/q(\d{1,2})h/);
  if (qHourMatch) {
    return `Every ${qHourMatch[1]} hours`;
  }

  // Return original capitalized string if not matched
  return freq.trim();
}
