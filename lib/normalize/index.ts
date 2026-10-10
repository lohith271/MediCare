import { BRAND_GENERIC_MAP, CONDITION_SYNONYMS } from "@/seed/reference_data";

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
