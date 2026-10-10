import { describe, it, expect } from "vitest";
import {
  checkDuplicatesAndDoseConflicts,
  checkInteractionsAndAllergies,
  checkRetestIntervals,
  evaluateSafetyRules,
} from "@/lib/rules";
import type {
  MedicationRecord,
  AllergyRecord,
  LabResultRecord,
} from "@/lib/types/database";

const TODAY = new Date("2026-10-10");

describe("Deterministic Safety Rules Engine", () => {
  it("detects duplicate active ingredient across brand-name prescriptions", () => {
    const meds: MedicationRecord[] = [
      {
        id: "m1",
        patient_id: "p1",
        name_as_written: "Glucophage 500mg",
        ingredients: ["metformin"],
        patient_marked_stopped: false,
        confidence: 0.95,
        confirmed: true,
        doc_date: "2026-09-15",
        evidence_text: "Glucophage 500mg BD",
      },
      {
        id: "m2",
        patient_id: "p1",
        name_as_written: "Tab Glycomet 500",
        ingredients: ["metformin"],
        patient_marked_stopped: false,
        confidence: 0.95,
        confirmed: true,
        doc_date: "2026-09-20",
        evidence_text: "Tab Glycomet 500 BD",
      },
    ];

    const flags = checkDuplicatesAndDoseConflicts(meds, TODAY);
    const dup = flags.find((f) => f.category === "duplicate_ingredient");

    expect(dup).toBeDefined();
    expect(dup?.title).toContain("Needs doctor review: Duplicate active ingredient");
    expect(dup?.description).toContain("metformin");
  });

  it("detects dose conflicts for the same drug across recent visits within 90 days", () => {
    const meds: MedicationRecord[] = [
      {
        id: "m1",
        patient_id: "p1",
        name_as_written: "Metformin 500mg",
        strength: "500mg",
        dose: "1 tab",
        frequency: "twice daily",
        ingredients: ["metformin"],
        patient_marked_stopped: false,
        confidence: 0.95,
        confirmed: true,
        doc_date: "2026-08-10",
        evidence_text: "Metformin 500mg BD",
      },
      {
        id: "m2",
        patient_id: "p1",
        name_as_written: "Metformin 1000mg",
        strength: "1000mg",
        dose: "1 tab",
        frequency: "once daily",
        ingredients: ["metformin"],
        patient_marked_stopped: false,
        confidence: 0.95,
        confirmed: true,
        doc_date: "2026-09-15",
        evidence_text: "Metformin 1000mg OD",
      },
    ];

    const flags = checkDuplicatesAndDoseConflicts(meds, TODAY);
    const doseFlag = flags.find((f) => f.category === "dose_conflict");

    expect(doseFlag).toBeDefined();
    expect(doseFlag?.title).toContain("Needs doctor review: Conflicting dosage");
  });

  it("detects documented drug-drug interactions (e.g. Lisinopril + Spironolactone)", () => {
    const meds: MedicationRecord[] = [
      {
        id: "m1",
        patient_id: "p1",
        name_as_written: "Zestril 10mg",
        ingredients: ["lisinopril"],
        patient_marked_stopped: false,
        confidence: 0.95,
        confirmed: true,
        doc_date: "2026-09-01",
        evidence_text: "Zestril 10mg",
      },
      {
        id: "m2",
        patient_id: "p1",
        name_as_written: "Aldactone 25mg",
        ingredients: ["spironolactone"],
        patient_marked_stopped: false,
        confidence: 0.95,
        confirmed: true,
        doc_date: "2026-09-10",
        evidence_text: "Aldactone 25mg",
      },
    ];

    const flags = checkInteractionsAndAllergies(meds, [], TODAY);
    const ddi = flags.find((f) => f.category === "drug_interaction");

    expect(ddi).toBeDefined();
    expect(ddi?.severity).toBe("high");
    expect(ddi?.title).toContain("Needs doctor review: Drug interaction detected");
    expect(ddi?.description).toContain("Hyperkalemia risk");
  });

  it("detects active medicine vs documented allergy", () => {
    const meds: MedicationRecord[] = [
      {
        id: "m1",
        patient_id: "p1",
        name_as_written: "Amoxil 500mg",
        ingredients: ["amoxicillin"],
        patient_marked_stopped: false,
        confidence: 0.95,
        confirmed: true,
        doc_date: "2026-09-20",
        evidence_text: "Amoxil 500mg",
      },
    ];

    const allergies: AllergyRecord[] = [
      {
        id: "a1",
        patient_id: "p1",
        source_type: "document",
        substance: "Amoxicillin",
        reaction: "Urticaria / Angioedema",
        confidence: 0.9,
        confirmed: true,
        evidence_text: "Allergy: Amoxicillin (Urticaria)",
      },
    ];

    const flags = checkInteractionsAndAllergies(meds, allergies, TODAY);
    const allergyFlag = flags.find((f) => f.category === "allergy_conflict");

    expect(allergyFlag).toBeDefined();
    expect(allergyFlag?.title).toContain("Needs doctor review: Active medication conflicts with recorded allergy");
  });

  it("detects active medicine vs patient-reported bad reaction", () => {
    const meds: MedicationRecord[] = [
      {
        id: "m1",
        patient_id: "p1",
        name_as_written: "Aspirin 81mg",
        ingredients: ["aspirin"],
        patient_marked_stopped: false,
        confidence: 0.95,
        confirmed: true,
        doc_date: "2026-09-20",
        evidence_text: "Aspirin 81mg",
      },
    ];

    const allergies: AllergyRecord[] = [
      {
        id: "a2",
        patient_id: "p1",
        source_type: "patient",
        substance: "aspirin",
        reaction: "Severe gastric bleeding",
        confidence: 1.0,
        confirmed: true,
        evidence_text: "Patient reported severe gastric bleeding with aspirin",
      },
    ];

    const flags = checkInteractionsAndAllergies(meds, allergies, TODAY);
    const pastRxn = flags.find((f) => f.category === "past_reaction_conflict");

    expect(pastRxn).toBeDefined();
    expect(pastRxn?.title).toContain("Needs doctor review: Active medication conflicts with patient-reported past reaction");
    expect(pastRxn?.description).toContain("Severe gastric bleeding");
  });

  it("detects retest intervals for tests completed too recently", () => {
    const labs: LabResultRecord[] = [
      {
        id: "l1",
        patient_id: "p1",
        test_name: "HbA1c Glycated Hemoglobin",
        value_num: 7.2,
        unit: "%",
        taken_on: "2026-09-28", // 12 days ago relative to 2026-10-10
        lab_name: "Metro PathLabs",
        confidence: 0.95,
        confirmed: true,
        evidence_text: "HbA1c 7.2%",
      },
    ];

    const flags = checkRetestIntervals(labs, TODAY);
    expect(flags).toHaveLength(1);
    expect(flags[0].title).toBe("Needs doctor review: Test done recently (potential duplicate test)");
    expect(flags[0].description).toContain("done 12 days ago at Metro PathLabs; typical repeat interval 90 days (general guidance)");
  });

  it("evaluates all rules collectively with evaluateSafetyRules", () => {
    const meds: MedicationRecord[] = [
      {
        id: "m1",
        patient_id: "p1",
        name_as_written: "Lisinopril 10mg",
        ingredients: ["lisinopril"],
        patient_marked_stopped: false,
        confidence: 0.95,
        confirmed: true,
        doc_date: "2026-09-15",
        evidence_text: "Lisinopril 10mg",
      },
      {
        id: "m2",
        patient_id: "p1",
        name_as_written: "Spironolactone 25mg",
        ingredients: ["spironolactone"],
        patient_marked_stopped: false,
        confidence: 0.95,
        confirmed: true,
        doc_date: "2026-09-20",
        evidence_text: "Spironolactone 25mg",
      },
    ];

    const res = evaluateSafetyRules(meds, [], [], [], { today: TODAY });
    expect(res.flags.length).toBeGreaterThan(0);
    expect(res.counts.high).toBe(1);
    expect(res.disclaimer).toContain("Demo rules, not clinical advice");
  });
});
