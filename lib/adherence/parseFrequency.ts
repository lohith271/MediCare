export type MealRelation = "before_food" | "after_food" | "with_food" | null;

export type FrequencyType =
  | "daily"
  | "weekly"
  | "alternate_day"
  | "as_needed"
  | "unrecognized";

export interface ParsedFrequency {
  times: string[]; // "HH:MM" e.g. ["08:00", "21:00"]
  frequencyType: FrequencyType;
  mealRelation: MealRelation;
  mealRelationLabel: string | null; // e.g. "before food", "after food", "with food"
  asNeeded: boolean;
  unrecognized: boolean;
  rawText: string;
}

/**
 * Deterministic parser for medication frequencies and meal relations.
 * Never uses an LLM. Rule-based clinical mapping.
 */
export function parseFrequency(frequencyText?: string | null): ParsedFrequency {
  if (!frequencyText || !frequencyText.trim()) {
    return {
      times: [],
      frequencyType: "unrecognized",
      mealRelation: null,
      mealRelationLabel: null,
      asNeeded: false,
      unrecognized: true,
      rawText: "",
    };
  }

  const raw = frequencyText.trim();
  const lower = raw.toLowerCase();

  // 1. Parse Meal Relation
  let mealRelation: MealRelation = null;
  let mealRelationLabel: string | null = null;

  if (
    /\b(before food|before meals?|empty stomach|\bac\b)\b/i.test(lower) ||
    lower.includes("before food") ||
    lower.includes("empty stomach")
  ) {
    mealRelation = "before_food";
    mealRelationLabel = "before food";
  } else if (
    /\b(after food|after meals?|\bpc\b)\b/i.test(lower) ||
    lower.includes("after food")
  ) {
    mealRelation = "after_food";
    mealRelationLabel = "after food";
  } else if (
    /\b(with food|with meals?)\b/i.test(lower) ||
    lower.includes("with food")
  ) {
    mealRelation = "with_food";
    mealRelationLabel = "with food";
  }

  // 2. Parse Frequency & Times
  // As needed / PRN / SOS
  if (/\b(sos|prn|as needed|when required|as directed)\b/i.test(lower)) {
    return {
      times: [],
      frequencyType: "as_needed",
      mealRelation,
      mealRelationLabel,
      asNeeded: true,
      unrecognized: false,
      rawText: raw,
    };
  }

  // Four times a day: QID / four times
  if (/\b(qid|4 times|four times|4x)\b/i.test(lower) || lower.includes("1-1-1-1")) {
    return {
      times: ["06:00", "12:00", "18:00", "22:00"],
      frequencyType: "daily",
      mealRelation,
      mealRelationLabel,
      asNeeded: false,
      unrecognized: false,
      rawText: raw,
    };
  }

  // Three times a day: TDS / TID / three times / 1-1-1
  if (
    /\b(tds|tid|3 times|three times|thrice daily|3x|1-1-1)\b/i.test(lower) ||
    lower.includes("1-1-1")
  ) {
    return {
      times: ["08:00", "14:00", "21:00"],
      frequencyType: "daily",
      mealRelation,
      mealRelationLabel,
      asNeeded: false,
      unrecognized: false,
      rawText: raw,
    };
  }

  // Twice daily: BD / BID / twice daily / 1-0-1 / 1-1-0 / 0-1-1
  if (
    /\b(bd|bid|twice daily|twice a day|2 times|2x|1-0-1)\b/i.test(lower) ||
    lower.includes("1-0-1")
  ) {
    return {
      times: ["08:00", "21:00"],
      frequencyType: "daily",
      mealRelation,
      mealRelationLabel,
      asNeeded: false,
      unrecognized: false,
      rawText: raw,
    };
  }

  // Bedtime: HS / at bedtime / 0-0-1
  if (
    /\b(hs|at bedtime|bedtime|nocte|night only|0-0-1)\b/i.test(lower) ||
    lower.includes("0-0-1")
  ) {
    return {
      times: ["22:00"],
      frequencyType: "daily",
      mealRelation,
      mealRelationLabel,
      asNeeded: false,
      unrecognized: false,
      rawText: raw,
    };
  }

  // Afternoon: 0-1-0
  if (lower.includes("0-1-0")) {
    return {
      times: ["14:00"],
      frequencyType: "daily",
      mealRelation,
      mealRelationLabel,
      asNeeded: false,
      unrecognized: false,
      rawText: raw,
    };
  }

  // Once daily Morning: OD / once daily / 1-0-0 / morning
  if (
    /\b(od|once daily|once a day|1x daily|morning|1-0-0)\b/i.test(lower) ||
    lower.includes("1-0-0")
  ) {
    return {
      times: ["08:00"],
      frequencyType: "daily",
      mealRelation,
      mealRelationLabel,
      asNeeded: false,
      unrecognized: false,
      rawText: raw,
    };
  }

  // Alternate day: alternate day / QOD / every other day
  if (/\b(alternate day|qod|every other day)\b/i.test(lower)) {
    return {
      times: ["08:00"],
      frequencyType: "alternate_day",
      mealRelation,
      mealRelationLabel,
      asNeeded: false,
      unrecognized: false,
      rawText: raw,
    };
  }

  // Weekly: weekly / once weekly / OW
  if (/\b(weekly|once weekly|ow)\b/i.test(lower)) {
    return {
      times: ["08:00"],
      frequencyType: "weekly",
      mealRelation,
      mealRelationLabel,
      asNeeded: false,
      unrecognized: false,
      rawText: raw,
    };
  }

  // Fallback unrecognized
  return {
    times: [],
    frequencyType: "unrecognized",
    mealRelation,
    mealRelationLabel,
    asNeeded: false,
    unrecognized: true,
    rawText: raw,
  };
}
