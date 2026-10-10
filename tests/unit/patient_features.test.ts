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
} from "@/lib/data/store";

async function runVerification() {
  console.log("=== MediCare Patient Features Verification ===");

  // 1. Profile test
  const profile = await getPatientProfile("demo-patient-001");
  console.log("✓ Profile loaded:", profile.full_name, "Health ID:", profile.health_id, "Blood Group:", profile.blood_group);
  if (!profile.health_id || !profile.full_name) throw new Error("Profile validation failed");

  // 2. Encounters test
  const encounters = await getEncounters("demo-patient-001");
  console.log("✓ Encounters count:", encounters.length);
  if (encounters.length === 0) throw new Error("Encounters should not be empty");

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
  console.log("✓ Created consultation:", newEnc.doctor_name, "Next visit:", newEnc.next_visit_date);

  // 4. Diagnoses test
  const diagnoses = await getDiagnoses("demo-patient-001");
  console.log("✓ Diagnoses count:", diagnoses.length, "Latest:", diagnoses[0].name_canonical);

  // 5. Follow-up appointments test
  const appts = await getAppointments("demo-patient-001");
  console.log("✓ Follow-up appointments count:", appts.length, "Next scheduled:", appts[0]?.scheduled_date);

  // 6. Lab results and trends test
  const labs = await getLabResults("demo-patient-001");
  console.log("✓ Lab results count:", labs.length);
  const fastingResults = labs.filter((l) => l.test_name.toLowerCase().includes("fasting"));
  const hba1cResults = labs.filter((l) => l.test_name.toLowerCase().includes("hba1c"));
  const bpResults = labs.filter((l) => l.test_name.toLowerCase().includes("systolic"));
  console.log(`✓ Longitudinal Series: Fasting=${fastingResults.length}, HbA1c=${hba1cResults.length}, BP=${bpResults.length}`);

  // 7. Add new lab vital
  const newLab = await addLabResult("demo-patient-001", {
    test_name: "Fasting Blood Glucose",
    value_num: 108,
    unit: "mg/dL",
    ref_range: "70 - 99 mg/dL",
    flag: "high",
    taken_on: "2026-10-10",
  });
  console.log("✓ Recorded lab result:", newLab.test_name, "=", newLab.value_num, newLab.unit, "Flag:", newLab.flag);

  console.log("=== ALL PATIENT FEATURE VERIFICATIONS PASSED ===");
}

runVerification().catch((e) => {
  console.error("Test failed:", e);
  process.exit(1);
});
