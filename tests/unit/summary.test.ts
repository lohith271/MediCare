import { describe, it, expect } from "vitest";
import { buildSummary } from "@/lib/summary";
import type {
  MedicationRecord,
  DiagnosisRecord,
  AllergyRecord,
} from "@/lib/types/database";

const TODAY = "2026-10-10";

describe("Clinical Summary Builder (buildSummary)", () => {
  it("handles empty input correctly", () => {
    const res = buildSummary([], [], [], { today: TODAY });

    expect(res.allergies).toHaveLength(0);
    expect(res.current_medicines).toHaveLength(0);
    expect(res.other_medicines).toHaveLength(0);
    expect(res.conditions).toHaveLength(0);
    expect(res.counts).toEqual({
      allergies: 0,
      current_medicines: 0,
      other_medicines: 0,
      conditions: 0,
    });
    expect(res.disclaimer).toBe(
      "Generated from your uploaded records. Supports doctors, not a diagnosis."
    );
  });

  it("merges brand name to generic ingredients (brand/generic merge)", () => {
    const meds: MedicationRecord[] = [
      {
        id: "m1",
        patient_id: "p1",
        name_as_written: "Glucophage 500mg",
        ingredients: [],
        strength: "500mg",
        dose: "1 tab",
        frequency: "twice daily",
        patient_marked_stopped: false,
        confidence: 0.95,
        confirmed: true,
        doc_date: "2026-09-01",
        evidence_text: "Tab Glucophage 500mg BD",
      },
      {
        id: "m2",
        patient_id: "p1",
        name_as_written: "Tab Glycomet 500",
        ingredients: [],
        strength: "500mg",
        dose: "1 tab",
        frequency: "twice daily",
        patient_marked_stopped: false,
        confidence: 0.92,
        confirmed: true,
        doc_date: "2026-09-15",
        evidence_text: "Tab Glycomet 500 BD",
      },
    ];

    const res = buildSummary(meds, [], [], { today: TODAY });

    // Both Glucophage and Glycomet map to metformin and should merge under "metformin"
    expect(res.current_medicines).toHaveLength(1);
    expect(res.current_medicines[0].group_key).toBe("metformin");
    expect(res.current_medicines[0].sources).toHaveLength(2);
  });

  it("keeps combination drug separate from single-ingredient drug", () => {
    const meds: MedicationRecord[] = [
      {
        id: "m1",
        patient_id: "p1",
        name_as_written: "Amoxil 500mg",
        ingredients: ["amoxicillin"],
        patient_marked_stopped: false,
        confidence: 0.95,
        confirmed: true,
        doc_date: "2026-09-01",
        evidence_text: "Amoxil 500mg",
      },
      {
        id: "m2",
        patient_id: "p1",
        name_as_written: "Augmentin 625mg",
        ingredients: ["amoxicillin", "clavulanic acid"],
        patient_marked_stopped: false,
        confidence: 0.95,
        confirmed: true,
        doc_date: "2026-09-05",
        evidence_text: "Augmentin 625mg",
      },
    ];

    const res = buildSummary(meds, [], [], { today: TODAY });

    // Should NOT merge because one is single-ingredient and the other is combination
    expect(res.current_medicines).toHaveLength(2);
    const keys = res.current_medicines.map((m) => m.group_key);
    expect(keys).toContain("amoxicillin");
    expect(keys).toContain("amoxicillin+clavulanic acid");
  });

  it("determines current vs not_recent vs course_ended correctly", () => {
    const meds: MedicationRecord[] = [
      // Within 90 days, no duration -> current
      {
        id: "m1",
        patient_id: "p1",
        name_as_written: "Lisinopril 10mg",
        ingredients: ["lisinopril"],
        patient_marked_stopped: false,
        confidence: 0.9,
        confirmed: true,
        doc_date: "2026-08-01", // ~70 days before 2026-10-10
        evidence_text: "Lisinopril 10mg OD",
      },
      // More than 90 days ago, no duration -> not_recent
      {
        id: "m2",
        patient_id: "p1",
        name_as_written: "Atorvastatin 20mg",
        ingredients: ["atorvastatin"],
        patient_marked_stopped: false,
        confidence: 0.9,
        confirmed: true,
        doc_date: "2026-06-01", // > 120 days ago
        evidence_text: "Atorvastatin 20mg",
      },
      // Prescribed 15 days ago with 5 days duration -> course_ended
      {
        id: "m3",
        patient_id: "p1",
        name_as_written: "Azithromycin 500mg",
        ingredients: ["azithromycin"],
        duration_days: 5,
        patient_marked_stopped: false,
        confidence: 0.9,
        confirmed: true,
        doc_date: "2026-09-20", // ended around 2026-09-25
        evidence_text: "Azithromycin 500mg for 5 days",
      },
      // Prescribed 5 days ago with 14 days duration -> current
      {
        id: "m4",
        patient_id: "p1",
        name_as_written: "Amoxicillin 500mg",
        ingredients: ["amoxicillin"],
        duration_days: 14,
        patient_marked_stopped: false,
        confidence: 0.9,
        confirmed: true,
        doc_date: "2026-10-05", // ends around 2026-10-19
        evidence_text: "Amoxicillin for 14 days",
      },
    ];

    const res = buildSummary(meds, [], [], { today: TODAY });

    const currentNames = res.current_medicines.map((m) => m.group_key);
    expect(currentNames).toContain("lisinopril");
    expect(currentNames).toContain("amoxicillin");

    const otherStatuses = new Map(res.other_medicines.map((m) => [m.group_key, m.status]));
    expect(otherStatuses.get("atorvastatin")).toBe("not_recent");
    expect(otherStatuses.get("azithromycin")).toBe("course_ended");
  });

  it("handles stopped, then re-prescribed (newer prescription makes it current again)", () => {
    const meds: MedicationRecord[] = [
      // Older record was stopped
      {
        id: "m1",
        patient_id: "p1",
        name_as_written: "Metformin 500mg",
        ingredients: ["metformin"],
        patient_marked_stopped: true,
        stopped_on: "2026-07-15",
        confidence: 0.9,
        confirmed: true,
        doc_date: "2026-07-01",
        evidence_text: "Metformin 500mg",
      },
      // Newer prescription restarted it
      {
        id: "m2",
        patient_id: "p1",
        name_as_written: "Metformin 850mg",
        ingredients: ["metformin"],
        patient_marked_stopped: false,
        confidence: 0.9,
        confirmed: true,
        doc_date: "2026-09-10",
        evidence_text: "Restart Metformin 850mg",
      },
    ];

    const res = buildSummary(meds, [], [], { today: TODAY });

    expect(res.current_medicines).toHaveLength(1);
    expect(res.current_medicines[0].group_key).toBe("metformin");
    expect(res.current_medicines[0].status).toBe("current");
    expect(res.other_medicines).toHaveLength(0);
  });

  it("flags dose conflict inside 90 days, but NOT outside 90 days", () => {
    // Inside 90 days: two prescriptions 30 days apart with different doses
    const insideMeds: MedicationRecord[] = [
      {
        id: "m1",
        patient_id: "p1",
        name_as_written: "Metformin 500mg",
        ingredients: ["metformin"],
        strength: "500mg",
        dose: "1 tab",
        frequency: "twice daily",
        patient_marked_stopped: false,
        confidence: 0.9,
        confirmed: true,
        doc_date: "2026-09-01",
        evidence_text: "Metformin 500mg BD",
      },
      {
        id: "m2",
        patient_id: "p1",
        name_as_written: "Metformin 1000mg",
        ingredients: ["metformin"],
        strength: "1000mg",
        dose: "1 tab",
        frequency: "once daily",
        patient_marked_stopped: false,
        confidence: 0.9,
        confirmed: true,
        doc_date: "2026-09-20",
        evidence_text: "Metformin 1000mg OD",
      },
    ];

    const resInside = buildSummary(insideMeds, [], [], { today: TODAY });
    expect(resInside.current_medicines[0].dose_conflict).toBe(true);

    // Outside 90 days: older prescription was 150 days before the latest
    const outsideMeds: MedicationRecord[] = [
      {
        id: "m3",
        patient_id: "p1",
        name_as_written: "Metformin 500mg",
        ingredients: ["metformin"],
        strength: "500mg",
        dose: "1 tab",
        frequency: "twice daily",
        patient_marked_stopped: false,
        confidence: 0.9,
        confirmed: true,
        doc_date: "2026-04-01", // 170+ days earlier
        evidence_text: "Metformin 500mg BD",
      },
      {
        id: "m4",
        patient_id: "p1",
        name_as_written: "Metformin 1000mg",
        ingredients: ["metformin"],
        strength: "1000mg",
        dose: "1 tab",
        frequency: "once daily",
        patient_marked_stopped: false,
        confidence: 0.9,
        confirmed: true,
        doc_date: "2026-09-20",
        evidence_text: "Metformin 1000mg OD",
      },
    ];

    const resOutside = buildSummary(outsideMeds, [], [], { today: TODAY });
    expect(resOutside.current_medicines[0].dose_conflict).toBe(false);
  });

  it("handles null date and future date gracefully", () => {
    const meds: MedicationRecord[] = [
      // Null date
      {
        id: "m1",
        patient_id: "p1",
        name_as_written: "Aspirin 75mg",
        ingredients: ["aspirin"],
        patient_marked_stopped: false,
        confidence: 0.9,
        confirmed: true,
        doc_date: null,
        evidence_text: "Aspirin 75mg",
      },
      // Future date
      {
        id: "m2",
        patient_id: "p1",
        name_as_written: "Pantoprazole 40mg",
        ingredients: ["pantoprazole"],
        patient_marked_stopped: false,
        confidence: 0.9,
        confirmed: true,
        doc_date: "2026-11-01", // After 2026-10-10
        evidence_text: "Pantoprazole 40mg",
      },
    ];

    const res = buildSummary(meds, [], [], { today: TODAY });

    const nullDateMed = res.other_medicines.find((m) => m.group_key === "aspirin");
    expect(nullDateMed?.status).toBe("unknown_date");

    const futureMed = res.current_medicines.find((m) => m.group_key === "pantoprazole");
    expect(futureMed?.warnings).toContain("date_in_future");
  });

  it("computes condition first_recorded, last_mentioned, count and handles all-null dates", () => {
    const diags: DiagnosisRecord[] = [
      {
        id: "d1",
        patient_id: "p1",
        name_as_written: "T2DM",
        name_canonical: "Type 2 Diabetes Mellitus",
        confidence: 0.9,
        confirmed: true,
        doc_date: "2024-03-10",
        evidence_text: "T2DM diagnosed",
      },
      {
        id: "d2",
        patient_id: "p1",
        name_as_written: "Diabetes Mellitus Type 2",
        name_canonical: "Type 2 Diabetes Mellitus",
        confidence: 0.95,
        confirmed: true,
        doc_date: "2026-08-15",
        evidence_text: "Follow-up T2DM",
      },
      {
        id: "d3",
        patient_id: "p1",
        name_as_written: "Essential HTN",
        name_canonical: "Essential Hypertension",
        confidence: 0.85,
        confirmed: true,
        doc_date: null,
        evidence_text: "History of HTN",
      },
    ];

    const res = buildSummary([], diags, [], { today: TODAY });

    const diabetes = res.conditions.find((c) => c.name_canonical === "Type 2 Diabetes Mellitus");
    expect(diabetes).toBeDefined();
    expect(diabetes?.first_recorded).toBe("2024-03-10");
    expect(diabetes?.last_mentioned).toBe("2026-08-15");
    expect(diabetes?.mention_count).toBe(2);

    const htn = res.conditions.find((c) => c.name_canonical === "Essential Hypertension");
    expect(htn).toBeDefined();
    expect(htn?.first_recorded).toBeNull();
    expect(htn?.last_mentioned).toBeNull();
    expect(htn?.mention_count).toBe(1);
  });

  it("merges allergies across document and patient sources, newest first", () => {
    const allergies: AllergyRecord[] = [
      {
        id: "a1",
        patient_id: "p1",
        source_type: "document",
        substance: "Penicillin",
        reaction: "Severe hives",
        doc_date: "2025-01-10",
        page_number: 2,
        evidence_text: "Penicillin allergy: hives",
        confidence: 0.9,
        confirmed: true,
      },
      {
        id: "a2",
        patient_id: "p1",
        source_type: "patient",
        substance: "penicillin",
        reaction: "Anaphylaxis",
        created_on: "2026-05-12",
        evidence_text: "Added by you on 2026-05-12",
        confidence: 1.0,
        confirmed: true,
      },
    ];

    const res = buildSummary([], [], allergies, { today: TODAY });

    expect(res.allergies).toHaveLength(1);
    const penicillin = res.allergies[0];
    expect(penicillin.reactions).toContain("Severe hives");
    expect(penicillin.reactions).toContain("Anaphylaxis");
    expect(penicillin.is_patient_reported).toBe(true);

    // Newest source first (patient entry from 2026 is before document from 2025)
    expect(penicillin.sources[0].doc_type).toBe("patient_report");
    expect(penicillin.sources[0].page_number).toBeNull();
  });

  it("omits source references and sensitive fields when includeSources=false (emergency mode)", () => {
    const meds: MedicationRecord[] = [
      {
        id: "m1",
        patient_id: "p1",
        name_as_written: "Amlodipine 5mg",
        ingredients: ["amlodipine"],
        patient_marked_stopped: false,
        confidence: 0.9,
        confirmed: true,
        doc_date: "2026-09-01",
        doctor: "Sarah Jenkins",
        hospital: "City Hospital",
        evidence_text: "Amlodipine 5mg OD",
      },
    ];

    const res = buildSummary(meds, [], [], { today: TODAY, includeSources: false });

    expect(res.current_medicines[0].sources).toHaveLength(0);
    expect(res.current_medicines[0].latest_record_id).toBeUndefined();
    expect(res.current_medicines[0].prescriber).toBeNull();
  });
});
