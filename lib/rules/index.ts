import type {
  MedicationRecord,
  DiagnosisRecord,
  AllergyRecord,
  LabResultRecord,
} from "@/lib/types/database";
import { DuplicateFlag, checkDuplicatesAndDoseConflicts } from "./duplicates";
import { InteractionFlag, checkInteractionsAndAllergies } from "./interactions";
import { RetestFlag, checkRetestIntervals } from "./retest";

export * from "./duplicates";
export * from "./interactions";
export * from "./retest";

export type SafetyFlagItem = DuplicateFlag | InteractionFlag | RetestFlag;

export interface AllSafetyFlagsResult {
  flags: SafetyFlagItem[];
  counts: {
    high: number;
    moderate: number;
    warning: number;
    total: number;
  };
  disclaimer: string;
}

export interface RuleOptions {
  today?: Date | string;
}

/**
 * Pure evaluation function for all deterministic clinical safety rules.
 * No database or web imports. Deterministic.
 * "Demo rules, not clinical advice."
 */
export function evaluateSafetyRules(
  meds: MedicationRecord[] = [],
  _diagnoses: DiagnosisRecord[] = [],
  allergies: AllergyRecord[] = [],
  labs: LabResultRecord[] = [],
  options: RuleOptions = {}
): AllSafetyFlagsResult {
  const today: Date = options.today
    ? typeof options.today === "string"
      ? new Date(options.today)
      : options.today
    : new Date();

  const dupFlags = checkDuplicatesAndDoseConflicts(meds, today);
  const interactionFlags = checkInteractionsAndAllergies(meds, allergies, today);
  const retestFlags = checkRetestIntervals(labs, today);

  const combined = [...dupFlags, ...interactionFlags, ...retestFlags];

  let high = 0;
  let moderate = 0;
  let warning = 0;

  for (const f of combined) {
    if (f.severity === "high") high++;
    else if (f.severity === "moderate") moderate++;
    else warning++;
  }

  return {
    flags: combined,
    counts: {
      high,
      moderate,
      warning,
      total: combined.length,
    },
    disclaimer: "Demo rules, not clinical advice. Decision support only, not a diagnosis.",
  };
}
