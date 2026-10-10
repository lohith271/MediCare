import { describe, it, expect } from "vitest";
import {
  getPatientProfile,
  updatePatientProfile,
  getTrustedContacts,
  addTrustedContact,
  deleteTrustedContact,
  getEncounters,
  createEncounter,
  getDiagnoses,
  addDiagnosis,
  getAppointments,
  updateAppointmentStatus,
  getLabResults,
  addLabResult,
  getMedicalDocuments,
  addMedicalDocument,
  deleteMedicalDocument,
} from "@/lib/data/store";

const dbReady = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
describe("Patient Features Verification", () => {
  it.skipIf(!dbReady)("verifies profile, encounters, diagnoses, labs, and document storage", async () => {
    // 1. Profile test
    const profile = await getPatientProfile("demo-patient-001");
    expect(profile.health_id).toBeDefined();
    expect(profile.full_name).toBeDefined();

    // 2. Encounters test
    const encounters = await getEncounters("demo-patient-001");
    expect(encounters.length).toBeGreaterThan(0);

    // 3. Create consultation encounter with doctor notes and prescriptions
    const newEnc = await createEncounter("demo-patient-001", {
      doctor_name: "Dr. Ananya Sen",
      hospital: "City Heart Center",
      kind: "consultation",
      reason: "BP Follow-up",
      notes: "Patient feeling well. Advised regular walks.",
      diagnoses: ["Borderline Hypertension"],
      prescriptions: [
        {
          name: "Amlodipine",
          dosage: "5 mg",
          frequency: "1-0-0 Morning",
          duration: "30 days",
        },
      ],
      next_visit_date: "2026-11-20",
      next_visit_notes: "Repeat BP check",
    });
    expect(newEnc.doctor_name).toBe("Dr. Ananya Sen");
    expect(newEnc.next_visit_date).toBe("2026-11-20");

    // 4. Diagnoses test
    const diagnoses = await getDiagnoses("demo-patient-001");
    expect(diagnoses.length).toBeGreaterThan(0);

    // 5. Follow-up appointments test
    const appts = await getAppointments("demo-patient-001");
    expect(appts.length).toBeGreaterThan(0);

    // 6. Lab results and trends test
    const labs = await getLabResults("demo-patient-001");
    expect(labs.length).toBeGreaterThan(0);

    // 7. Add new lab vital
    const newLab = await addLabResult("demo-patient-001", {
      test_name: "Fasting Blood Glucose",
      value_num: 108,
      unit: "mg/dL",
      ref_range: "70 - 99 mg/dL",
      flag: "high",
      taken_on: "2026-10-10",
    });
    expect(newLab.test_name).toBe("Fasting Blood Glucose");
    expect(newLab.value_num).toBe(108);

    // 8. Medical documents & scans archival vault test
    const docs = await getMedicalDocuments("demo-patient-001");
    expect(docs.length).toBeGreaterThan(0);

    // 9. Store new X-Ray scan photo
    const newScan = await addMedicalDocument("demo-patient-001", {
      title: "Pelvic & Hip Radiograph (AP View)",
      category: "xray",
      file_name: "Pelvis_Hip_XRay_Oct2026.jpg",
      file_type: "image/jpeg",
      file_size_bytes: 2800000,
      file_url: "https://images.unsplash.com/photo-1516549655169-df83a0774514?auto=format&fit=crop&w=1200&q=80",
      doc_date: "2026-10-10",
      doctor: "Dr. Anil Mehta",
      hospital: "Apex Diagnostic Imaging",
      notes: "Normal joint space bilaterally. No cortical interruption or fracture line.",
    });
    expect(newScan.id).toBeDefined();

    const updatedDocs = await getMedicalDocuments("demo-patient-001");
    expect(updatedDocs.some((d) => d.id === newScan.id)).toBe(true);

    // 10. Clean up test scan
    await deleteMedicalDocument("demo-patient-001", newScan.id);
  }, 20000);
});
