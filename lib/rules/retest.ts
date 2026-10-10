import type { LabResultRecord } from "@/lib/types/database";
import { RETEST_RULES } from "@/seed/reference_data";

export interface RetestFlag {
  id: string;
  category: "retest_interval";
  severity: "warning";
  title: string;
  description: string;
  involved_items: string[];
  days_since: number;
  min_days: number;
  lab_name: string;
  test_name: string;
  taken_on: string;
  previous_result?: string;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function parseDate(d?: string | null): Date | null {
  if (!d) return null;
  const parsed = new Date(d);
  return isNaN(parsed.getTime()) ? null : parsed;
}

function getDayDifference(past: Date, current: Date): number {
  const utcPast = Date.UTC(past.getFullYear(), past.getMonth(), past.getDate());
  const utcCurrent = Date.UTC(current.getFullYear(), current.getMonth(), current.getDate());
  return Math.round((utcCurrent - utcPast) / MS_PER_DAY);
}

/**
 * Checks if lab tests were conducted recently within the minimum recommended retest window.
 * "done N days ago at <lab>; typical repeat interval X days (general guidance)"
 * Deterministic pure function.
 */
export function checkRetestIntervals(
  labs: LabResultRecord[] = [],
  today: Date = new Date()
): RetestFlag[] {
  const flags: RetestFlag[] = [];
  const confirmedLabs = labs.filter((l) => l.confirmed !== false);

  for (const lab of confirmedLabs) {
    const takenDate = parseDate(lab.taken_on || lab.doc_date || lab.created_at);
    if (!takenDate) continue;

    const daysSince = getDayDifference(takenDate, today);
    if (daysSince < 0) continue; // Future date handled separately

    const testNameNorm = lab.test_name.toLowerCase().trim();

    for (const rule of RETEST_RULES) {
      const pattern = new RegExp(rule.test_pattern, "i");
      if (pattern.test(testNameNorm)) {
        // If the test was completed within the minimum repeat interval
        if (daysSince < rule.min_days) {
          const labName = lab.lab_name || lab.hospital || "Laboratory";
          const formattedDate = takenDate.toISOString().split("T")[0];

          let resultString = "";
          if (lab.value_num !== undefined && lab.value_num !== null) {
            resultString = `${lab.value_num} ${lab.unit || ""}`.trim();
          } else if (lab.value_text) {
            resultString = lab.value_text;
          }

          const resultNote = resultString ? ` (Prior result: ${resultString})` : "";

          flags.push({
            id: `retest-${lab.id || testNameNorm}-${formattedDate}`,
            category: "retest_interval",
            severity: "warning",
            title: "Needs doctor review: Test done recently (potential duplicate test)",
            description: `done ${daysSince} days ago at ${labName}; typical repeat interval ${rule.min_days} days (general guidance).${resultNote}`,
            involved_items: [lab.test_name],
            days_since: daysSince,
            min_days: rule.min_days,
            lab_name: labName,
            test_name: lab.test_name,
            taken_on: formattedDate,
            previous_result: resultString || undefined,
          });
        }
        break; // Match first applicable rule
      }
    }
  }

  // Sort by most recent tests first
  flags.sort((a, b) => a.days_since - b.days_since);

  return flags;
}
