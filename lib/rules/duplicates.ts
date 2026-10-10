import type { MedicationRecord } from "@/lib/types/database";
import { cleanMedicineName, resolveIngredients } from "@/lib/normalize";

export interface DuplicateFlag {
  id: string;
  category: "duplicate_ingredient" | "dose_conflict";
  severity: "high" | "warning";
  title: string;
  description: string;
  involved_items: string[];
}

const RECENT_DAYS = 90;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

function parseDate(d?: string | null): Date | null {
  if (!d) return null;
  const parsed = new Date(d);
  return isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * Checks for duplicate active ingredients across active prescriptions
 * and dose conflicts for the same drug across recent visits.
 * Deterministic pure function.
 */
export function checkDuplicatesAndDoseConflicts(
  meds: MedicationRecord[] = [],
  today: Date = new Date()
): DuplicateFlag[] {
  const flags: DuplicateFlag[] = [];
  const confirmedMeds = meds.filter((m) => m.confirmed !== false && !m.patient_marked_stopped);

  const todayTime = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();

  // Filter only active medications (within 90 days or valid course)
  const activeMeds = confirmedMeds.filter((m) => {
    const d = parseDate(m.doc_date || m.created_at);
    if (!d) return true; // Keep unknown date meds in safety checks
    const daysSince = Math.floor((todayTime - d.getTime()) / MS_PER_DAY);
    if (m.duration_days && m.duration_days > 0) {
      return d.getTime() + m.duration_days * MS_PER_DAY >= todayTime;
    }
    return daysSince <= RECENT_DAYS;
  });

  // -------------------------------------------------------------
  // 1. Duplicate Active Ingredients
  // -------------------------------------------------------------
  const ingredientToMeds = new Map<string, MedicationRecord[]>();

  for (const med of activeMeds) {
    const ingredients = resolveIngredients(med.name_as_written, med.ingredients);
    for (const ing of ingredients) {
      if (!ingredientToMeds.has(ing)) {
        ingredientToMeds.set(ing, []);
      }
      ingredientToMeds.get(ing)!.push(med);
    }
  }

  for (const [ingredient, medList] of ingredientToMeds) {
    // Only flag if there are at least two distinct prescriptions
    if (medList.length > 1) {
      // Check if they are distinct prescriptions (different record id or distinct names)
      const distinctNames = Array.from(new Set(medList.map((m) => m.name_as_written.trim())));
      if (distinctNames.length > 1 || medList.length > 1) {
        flags.push({
          id: `dup-${ingredient}`,
          category: "duplicate_ingredient",
          severity: "high",
          title: "Needs doctor review: Duplicate active ingredient across prescriptions",
          description: `Multiple active prescriptions contain "${ingredient}" (${distinctNames.join(
            " & "
          )}). Simultaneous intake may result in unintended overdose.`,
          involved_items: distinctNames,
        });
      }
    }
  }

  // -------------------------------------------------------------
  // 2. Same Drug, Different Dose across recent visits
  // -------------------------------------------------------------
  const drugGroupMap = new Map<string, MedicationRecord[]>();
  for (const med of confirmedMeds) {
    const cleaned = cleanMedicineName(med.name_as_written);
    if (!cleaned) continue;
    if (!drugGroupMap.has(cleaned)) {
      drugGroupMap.set(cleaned, []);
    }
    drugGroupMap.get(cleaned)!.push(med);
  }

  for (const [drugName, records] of drugGroupMap) {
    if (records.length < 2) continue;

    // Filter to those within 90 days
    const recent = records.filter((r) => {
      const d = parseDate(r.doc_date || r.created_at);
      if (!d) return false;
      const daysSince = Math.floor((todayTime - d.getTime()) / MS_PER_DAY);
      return daysSince <= RECENT_DAYS;
    });

    if (recent.length < 2) continue;

    const doseTuples = new Set<string>();
    const details: string[] = [];

    for (const r of recent) {
      const str = (r.strength || "").trim();
      const dose = (r.dose || "").trim();
      const freq = (r.frequency || "").trim();
      if (str || dose || freq) {
        const key = `${str}|${dose}|${freq}`;
        if (!doseTuples.has(key)) {
          doseTuples.add(key);
          details.push(`${[str, dose, freq].filter(Boolean).join(" ")} (${r.doc_date || "recent"})`);
        }
      }
    }

    if (doseTuples.size > 1) {
      flags.push({
        id: `dose-conflict-${drugName}`,
        category: "dose_conflict",
        severity: "warning",
        title: "Needs doctor review: Conflicting dosage across recent visits",
        description: `Prescriptions for "${drugName}" specify different dosage regimens in recent visits: ${details.join(
          " vs "
        )}. Please verify intended dosage.`,
        involved_items: [drugName],
      });
    }
  }

  return flags;
}
