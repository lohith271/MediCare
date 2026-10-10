import { BRAND_GENERIC_MAP, CONDITION_SYNONYMS } from "@/seed/reference_data";

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

/**
 * Strips dosage form prefixes (tab, cap, syp, inj, etc.), strengths (e.g. 500mg, 10ml, 5mg/500mg),
 * and special punctuation, returning a cleaned lowercase drug name.
 */
export function cleanMedicineName(raw: string): string {
  if (!raw) return "";

  let cleaned = raw.toLowerCase().trim();

  // Strip prefixes like tab, cap, syp, inj, susp, drop, oint, cream, etc.
  cleaned = cleaned.replace(/^(tab\b|tablet\b|cap\b|capsule\b|syp\b|syrup\b|inj\b|injection\b|susp\b|drops?\b|oint\b|ointment\b|cream\b)[\s.:,-]*/i, "");

  // Strip dosage forms like 'mg', 'mcg', 'g', 'ml', 'iu', ratios like '5/500'
  cleaned = cleaned.replace(/\b\d+(\.\d+)?\s*(mg|mcg|g|ml|iu|meq|%)\b/gi, "");
  cleaned = cleaned.replace(/\b\d+\/\d+(\s*mg)?\b/gi, "");

  // Strip standalone strength numbers (e.g. 500, 650, 10, 2.5)
  cleaned = cleaned.replace(/\b\d+(\.\d+)?\b/g, "");

  // Remove trailing/leading special characters and extra spaces
  cleaned = cleaned.replace(/[^a-z0-9\s+-]/gi, " ");
  cleaned = cleaned.replace(/\s+/g, " ").trim();

  return cleaned;
}

/**
 * Normalises an allergy substance by trimming, collapsing spaces, and lowercasing.
 */
export function normalizeSubstance(substance: string): string {
  if (!substance) return "";
  return substance.toLowerCase().replace(/\s+/g, " ").trim();
}

/**
 * Resolves a condition string to its canonical medical name via condition_synonyms,
 * falling back to a clean Title Cased version of the written name.
 */
export function canonicalizeCondition(name: string): string {
  if (!name) return "";
  const key = name.toLowerCase().replace(/\s+/g, " ").trim();
  if (CONDITION_SYNONYMS[key]) {
    return CONDITION_SYNONYMS[key];
  }

  // Fallback to title case
  return name
    .trim()
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

/**
 * Resolves ingredients for a medication:
 * 1. If explicit non-empty ingredients are supplied, returns sorted lowercase unique list.
 * 2. If empty, checks BRAND_GENERIC_MAP using cleaned name.
 * 3. Falls back to single cleaned name as the ingredient.
 */
export function resolveIngredients(
  nameAsWritten: string,
  providedIngredients: string[] = []
): string[] {
  if (providedIngredients && providedIngredients.length > 0) {
    const valid = providedIngredients
      .map((i) => i.toLowerCase().trim())
      .filter(Boolean);
    if (valid.length > 0) {
      return Array.from(new Set(valid)).sort();
    }
  }

  const cleaned = cleanMedicineName(nameAsWritten);
  if (BRAND_GENERIC_MAP[cleaned]) {
    return [...BRAND_GENERIC_MAP[cleaned].ingredients].sort();
  }

  return cleaned ? [cleaned] : [];
}
