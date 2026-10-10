import type {
  MedicationRecord,
  DiagnosisRecord,
  AllergyRecord,
} from "@/lib/types/database";
import type {
  ClinicalSummary,
  SummaryMedication,
  SummaryCondition,
  SummaryAllergy,
  SourceReference,
  BuildSummaryOptions,
  MedicationStatus,
} from "@/lib/types/summary";
import {
  cleanMedicineName,
  normalizeSubstance,
  canonicalizeCondition,
  resolveIngredients,
} from "@/lib/normalize";

const RECENT_DAYS = 90;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

function parseDate(d?: string | null): Date | null {
  if (!d) return null;
  const parsed = new Date(d);
  return isNaN(parsed.getTime()) ? null : parsed;
}

function formatDateISO(d: Date): string {
  return d.toISOString().split("T")[0];
}

/**
 * Pure function to build the one-page clinical summary from confirmed records.
 * Deterministic, no network or database dependencies.
 */
export function buildSummary(
  meds: MedicationRecord[] = [],
  diagnoses: DiagnosisRecord[] = [],
  allergies: AllergyRecord[] = [],
  options: BuildSummaryOptions = {}
): ClinicalSummary {
  const includeSources = options.includeSources ?? true;
  const today: Date = options.today
    ? typeof options.today === "string"
      ? new Date(options.today)
      : options.today
    : new Date();

  // Normalize today to start of day for clean comparison
  const todayTime = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();

  // Filter confirmed items only
  const confirmedMeds = meds.filter((m) => m.confirmed !== false);
  const confirmedDiagnoses = diagnoses.filter((d) => d.confirmed !== false);
  const confirmedAllergies = allergies.filter((a) => a.confirmed !== false);

  // -------------------------------------------------------------
  // 1. ALLERGIES
  // Group by normalised substance (trim, collapse spaces, lowercase)
  // -------------------------------------------------------------
  const allergyGroups = new Map<
    string,
    {
      substance: string;
      reactions: Set<string>;
      isPatientReported: boolean;
      sources: (SourceReference & { _date?: Date | null })[];
    }
  >();

  for (const item of confirmedAllergies) {
    const normSubstance = normalizeSubstance(item.substance);
    if (!normSubstance) continue;

    if (!allergyGroups.has(normSubstance)) {
      allergyGroups.set(normSubstance, {
        substance: item.substance.trim(),
        reactions: new Set<string>(),
        isPatientReported: false,
        sources: [],
      });
    }

    const grp = allergyGroups.get(normSubstance)!;
    if (item.reaction && item.reaction.trim()) {
      grp.reactions.add(item.reaction.trim());
    }

    const isPatient = item.source_type === "patient";
    if (isPatient) {
      grp.isPatientReported = true;
    }

    const itemDate = parseDate(item.created_on || item.doc_date || item.created_at);

    // Format patient-entered evidence text if not set
    let evidence = item.evidence_text || "";
    if (isPatient && (!evidence || !evidence.trim())) {
      const dateStr = itemDate ? formatDateISO(itemDate) : "recent";
      evidence = `Added by you on ${dateStr}`;
    }

    grp.sources.push({
      record_id: item.id,
      document_id: item.document_id || undefined,
      page_number: isPatient ? null : (item.page_number ?? null),
      evidence_text: evidence,
      doc_date: item.doc_date || (itemDate ? formatDateISO(itemDate) : null),
      doc_type: item.doc_type || (isPatient ? "patient_report" : "document"),
      doctor: item.doctor ?? null,
      hospital: item.hospital ?? null,
      _date: itemDate,
    });
  }

  const summaryAllergies: SummaryAllergy[] = [];
  for (const [, grp] of allergyGroups) {
    // Sort sources newest first (null dates last)
    grp.sources.sort((a, b) => {
      if (!a._date && !b._date) return 0;
      if (!a._date) return 1;
      if (!b._date) return -1;
      return b._date.getTime() - a._date.getTime();
    });

    summaryAllergies.push({
      substance: grp.substance,
      reactions: Array.from(grp.reactions),
      is_patient_reported: grp.isPatientReported,
      sources: includeSources
        ? grp.sources.map(({ _date, ...src }) => src)
        : [],
    });
  }

  // Sort allergies alphabetically by substance
  summaryAllergies.sort((a, b) => a.substance.localeCompare(b.substance));

  // -------------------------------------------------------------
  // 2. MEDICATIONS
  // Group by sorted unique ingredients joined with "+" (fallback to cleaned name)
  // -------------------------------------------------------------
  const medGroups = new Map<
    string,
    {
      groupKey: string;
      displayName: string;
      ingredients: string[];
      records: (MedicationRecord & { _date: Date | null })[];
    }
  >();

  for (const med of confirmedMeds) {
    const ingredients = resolveIngredients(med.name_as_written, med.ingredients);
    const cleaned = cleanMedicineName(med.name_as_written);
    const groupKey =
      ingredients.length > 0
        ? [...ingredients].sort().join("+")
        : cleaned || "unspecified";

    if (!medGroups.has(groupKey)) {
      medGroups.set(groupKey, {
        groupKey,
        displayName: med.name_as_written.trim(),
        ingredients,
        records: [],
      });
    }

    const grp = medGroups.get(groupKey)!;
    const d = parseDate(med.doc_date || med.created_at);
    grp.records.push({
      ...med,
      _date: d,
    });
  }

  const currentMedicines: SummaryMedication[] = [];
  const otherMedicines: SummaryMedication[] = [];

  for (const [, grp] of medGroups) {
    // Sort records newest first (null dates last)
    grp.records.sort((a, b) => {
      if (!a._date && !b._date) return 0;
      if (!a._date) return 1;
      if (!b._date) return -1;
      return b._date.getTime() - a._date.getTime();
    });

    const latest = grp.records[0];
    const latestDate = latest._date;
    const warnings: string[] = [];

    // Check future date
    if (latestDate && latestDate.getTime() > todayTime) {
      warnings.push("date_in_future");
    }

    // Determine Status
    let status: MedicationStatus;
    if (latest.patient_marked_stopped) {
      status = "stopped";
    } else if (!latestDate) {
      status = "unknown_date";
    } else if (typeof latest.duration_days === "number" && latest.duration_days > 0) {
      const courseEnd = latestDate.getTime() + latest.duration_days * MS_PER_DAY;
      if (courseEnd >= todayTime) {
        status = "current";
      } else {
        status = "course_ended";
      }
    } else {
      const daysSince = Math.floor((todayTime - latestDate.getTime()) / MS_PER_DAY);
      if (daysSince <= RECENT_DAYS) {
        status = "current";
      } else {
        status = "not_recent";
      }
    }

    // Dose Conflict Detection:
    // Records of the same group within 90 days before the latest record (inclusive)
    // have more than one distinct (strength, dose, frequency) tuple (ignore all-empty).
    let doseConflict = false;
    if (latestDate) {
      const windowStart = latestDate.getTime() - RECENT_DAYS * MS_PER_DAY;
      const recentTuples = new Set<string>();

      for (const rec of grp.records) {
        if (!rec._date) continue;
        const recTime = rec._date.getTime();
        if (recTime >= windowStart && recTime <= latestDate.getTime()) {
          const str = (rec.strength || "").trim().toLowerCase();
          const dos = (rec.dose || "").trim().toLowerCase();
          const freq = (rec.frequency || "").trim().toLowerCase();

          // Ignore all-empty tuples
          if (str || dos || freq) {
            recentTuples.add(`${str}|${dos}|${freq}`);
          }
        }
      }

      if (recentTuples.size > 1) {
        doseConflict = true;
      }
    }

    // Sources for this medication group
    const sources: SourceReference[] = includeSources
      ? grp.records.map((rec) => ({
          record_id: rec.id,
          document_id: rec.document_id || undefined,
          page_number: rec.page_number ?? null,
          evidence_text: rec.evidence_text || "",
          doc_date: rec.doc_date || (rec._date ? formatDateISO(rec._date) : null),
          doc_type: rec.doc_type || "prescription",
          doctor: rec.doctor ?? null,
          hospital: rec.hospital ?? null,
        }))
      : [];

    const prescriber = latest.doctor
      ? latest.hospital
        ? `Dr. ${latest.doctor} (${latest.hospital})`
        : `Dr. ${latest.doctor}`
      : latest.hospital || null;

    const medSummary: SummaryMedication = {
      group_key: grp.groupKey,
      display_name: grp.displayName,
      ingredients: grp.ingredients,
      status,
      dose_conflict: doseConflict,
      warnings: warnings.length > 0 ? warnings : undefined,
      strength: latest.strength || null,
      dose: latest.dose || null,
      frequency: latest.frequency || null,
      duration_days: latest.duration_days ?? null,
      prescribed_date: latest.doc_date || (latestDate ? formatDateISO(latestDate) : null),
      prescriber: includeSources ? prescriber : null,
      latest_record_id: includeSources ? latest.id : undefined,
      patient_marked_stopped: latest.patient_marked_stopped,
      stopped_on: latest.stopped_on || null,
      sources,
    };

    if (status === "current") {
      currentMedicines.push(medSummary);
    } else {
      otherMedicines.push(medSummary);
    }
  }

  // current_medicines sorted alphabetically by display_name
  currentMedicines.sort((a, b) => a.display_name.localeCompare(b.display_name));

  // other_medicines sorted newest first (using prescribed_date)
  otherMedicines.sort((a, b) => {
    if (!a.prescribed_date && !b.prescribed_date) return 0;
    if (!a.prescribed_date) return 1;
    if (!b.prescribed_date) return -1;
    return new Date(b.prescribed_date).getTime() - new Date(a.prescribed_date).getTime();
  });

  // -------------------------------------------------------------
  // 3. CONDITIONS
  // Group by name_canonical (canonicalizeCondition)
  // NEVER label active/resolved/chronic
  // -------------------------------------------------------------
  const conditionGroups = new Map<
    string,
    {
      nameCanonical: string;
      namesAsWritten: Set<string>;
      dates: Date[];
      sources: (SourceReference & { _date?: Date | null })[];
    }
  >();

  for (const diag of confirmedDiagnoses) {
    const canonical = canonicalizeCondition(diag.name_canonical || diag.name_as_written);
    if (!canonical) continue;

    if (!conditionGroups.has(canonical)) {
      conditionGroups.set(canonical, {
        nameCanonical: canonical,
        namesAsWritten: new Set<string>(),
        dates: [],
        sources: [],
      });
    }

    const grp = conditionGroups.get(canonical)!;
    if (diag.name_as_written) {
      grp.namesAsWritten.add(diag.name_as_written.trim());
    }

    const d = parseDate(diag.doc_date || diag.created_at);
    if (d) {
      grp.dates.push(d);
    }

    grp.sources.push({
      record_id: diag.id,
      document_id: diag.document_id || undefined,
      page_number: diag.page_number ?? null,
      evidence_text: diag.evidence_text || "",
      doc_date: diag.doc_date || (d ? formatDateISO(d) : null),
      doc_type: diag.doc_type || "prescription",
      doctor: diag.doctor ?? null,
      hospital: diag.hospital ?? null,
      _date: d,
    });
  }

  const conditions: SummaryCondition[] = [];
  for (const [, grp] of conditionGroups) {
    grp.dates.sort((a, b) => a.getTime() - b.getTime());
    const firstRecorded = grp.dates.length > 0 ? formatDateISO(grp.dates[0]) : null;
    const lastMentioned =
      grp.dates.length > 0 ? formatDateISO(grp.dates[grp.dates.length - 1]) : null;

    // Sort sources newest first
    grp.sources.sort((a, b) => {
      if (!a._date && !b._date) return 0;
      if (!a._date) return 1;
      if (!b._date) return -1;
      return b._date.getTime() - a._date.getTime();
    });

    conditions.push({
      name_canonical: grp.nameCanonical,
      names_as_written: Array.from(grp.namesAsWritten),
      first_recorded: firstRecorded,
      last_mentioned: lastMentioned,
      mention_count: grp.sources.length,
      sources: includeSources
        ? grp.sources.map(({ _date, ...s }) => s)
        : [],
    });
  }

  // Sort conditions alphabetically
  conditions.sort((a, b) => a.name_canonical.localeCompare(b.name_canonical));

  return {
    generated_at: today.toISOString(),
    counts: {
      allergies: summaryAllergies.length,
      current_medicines: currentMedicines.length,
      other_medicines: otherMedicines.length,
      conditions: conditions.length,
    },
    allergies: summaryAllergies,
    current_medicines: currentMedicines,
    other_medicines: otherMedicines,
    conditions,
    disclaimer: "Generated from your uploaded records. Supports doctors, not a diagnosis.",
  };
}
