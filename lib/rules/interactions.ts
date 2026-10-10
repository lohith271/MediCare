import type { MedicationRecord, AllergyRecord } from "@/lib/types/database";
import { INTERACTION_RULES } from "@/seed/reference_data";
import { cleanMedicineName, normalizeSubstance, resolveIngredients } from "@/lib/normalize";

export interface InteractionFlag {
  id: string;
  category: "drug_interaction" | "allergy_conflict" | "past_reaction_conflict";
  severity: "high" | "moderate" | "warning";
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
 * Checks for drug-drug interactions, active medicine vs confirmed allergy,
 * and active medicine vs patient-reported past bad reactions.
 * Deterministic pure function.
 */
export function checkInteractionsAndAllergies(
  meds: MedicationRecord[] = [],
  allergies: AllergyRecord[] = [],
  today: Date = new Date()
): InteractionFlag[] {
  const flags: InteractionFlag[] = [];
  const todayTime = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();

  // Filter confirmed active medications (not marked stopped)
  const activeMeds = meds
    .filter((m) => m.confirmed !== false && !m.patient_marked_stopped)
    .filter((m) => {
      const d = parseDate(m.doc_date || m.created_at);
      if (!d) return true;
      const daysSince = Math.floor((todayTime - d.getTime()) / MS_PER_DAY);
      if (m.duration_days && m.duration_days > 0) {
        return d.getTime() + m.duration_days * MS_PER_DAY >= todayTime;
      }
      return daysSince <= RECENT_DAYS;
    });

  // Extract ingredients for each active med
  const medIngredientList = activeMeds.map((med) => ({
    med,
    name: med.name_as_written,
    cleanedName: cleanMedicineName(med.name_as_written),
    ingredients: resolveIngredients(med.name_as_written, med.ingredients),
  }));

  // -------------------------------------------------------------
  // 1. Drug-Drug Interactions (Pairwise check against INTERACTION_RULES)
  // -------------------------------------------------------------
  const flaggedPairs = new Set<string>();

  for (let i = 0; i < medIngredientList.length; i++) {
    for (let j = i + 1; j < medIngredientList.length; j++) {
      const itemA = medIngredientList[i];
      const itemB = medIngredientList[j];

      // Check all ingredient combinations between the two medications
      for (const ingA of itemA.ingredients) {
        for (const ingB of itemB.ingredients) {
          for (const rule of INTERACTION_RULES) {
            const ruleDrugA = rule.drug_a.toLowerCase();
            const ruleDrugB = rule.drug_b.toLowerCase();

            const isMatch =
              (ingA === ruleDrugA && ingB === ruleDrugB) ||
              (ingA === ruleDrugB && ingB === ruleDrugA);

            if (isMatch) {
              const pairKey = [itemA.name, itemB.name].sort().join("::");
              if (!flaggedPairs.has(pairKey)) {
                flaggedPairs.add(pairKey);
                const flagSeverity: "high" | "moderate" | "warning" =
                  rule.severity === "high" ? "high" : rule.severity === "moderate" ? "moderate" : "warning";
                flags.push({
                  id: `ddi-${ingA}-${ingB}`,
                  category: "drug_interaction",
                  severity: flagSeverity,
                  title: `Needs doctor review: Drug interaction detected (${rule.severity.toUpperCase()})`,
                  description: `"${itemA.name}" (${ingA}) and "${itemB.name}" (${ingB}): ${rule.note}`,
                  involved_items: [itemA.name, itemB.name],
                });
              }
            }
          }
        }
      }
    }
  }

  // -------------------------------------------------------------
  // 2. Active Medicine vs Confirmed Allergies & Past Reactions
  // -------------------------------------------------------------
  const confirmedAllergies = allergies.filter((a) => a.confirmed !== false);

  for (const item of medIngredientList) {
    for (const allergy of confirmedAllergies) {
      const normAllergy = normalizeSubstance(allergy.substance);
      if (!normAllergy) continue;

      // Check if allergy substance matches drug name or any ingredient
      const matches =
        item.cleanedName.includes(normAllergy) ||
        normAllergy.includes(item.cleanedName) ||
        item.ingredients.some(
          (ing) => ing.includes(normAllergy) || normAllergy.includes(ing)
        );

      if (matches) {
        const isPatientReport = allergy.source_type === "patient";
        const reactionText = allergy.reaction ? ` (${allergy.reaction})` : "";

        if (isPatientReport) {
          flags.push({
            id: `past-reaction-${item.cleanedName}-${normAllergy}`,
            category: "past_reaction_conflict",
            severity: "high",
            title: "Needs doctor review: Active medication conflicts with patient-reported past reaction",
            description: `Prescribed "${item.name}" conflicts with patient-reported past bad reaction to "${allergy.substance}"${reactionText}. Please verify tolerability.`,
            involved_items: [item.name, allergy.substance],
          });
        } else {
          flags.push({
            id: `allergy-conflict-${item.cleanedName}-${normAllergy}`,
            category: "allergy_conflict",
            severity: "high",
            title: "Needs doctor review: Active medication conflicts with recorded allergy",
            description: `Prescribed "${item.name}" conflicts with confirmed clinical allergy to "${allergy.substance}"${reactionText}. Risk of hypersensitivity reaction.`,
            involved_items: [item.name, allergy.substance],
          });
        }
      }
    }
  }

  return flags;
}
