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

  // 8. Medical documents & scans archival vault test
  const docs = await getMedicalDocuments("demo-patient-001");
  console.log("✓ Medical documents count:", docs.length);
  if (docs.length === 0) throw new Error("Medical documents store should not be empty");
  const xrays = docs.filter((d) => d.category === "xray");
  const pdfs = docs.filter((d) => d.category.includes("pdf") || d.file_type === "application/pdf");
  console.log(`✓ Archival breakdown: X-Rays=${xrays.length}, PDFs=${pdfs.length}`);

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
  console.log("✓ Stored new X-Ray scan in vault:", newScan.title, "ID:", newScan.id);

  const updatedDocs = await getMedicalDocuments("demo-patient-001");
  if (!updatedDocs.some((d) => d.id === newScan.id)) {
    throw new Error("Newly stored scan was not found in vault");
  }

  // 10. Clean up test scan
  await deleteMedicalDocument(newScan.id);
  console.log("✓ Deleted test scan from vault:", newScan.id);

  console.log("=== ALL PATIENT FEATURE VERIFICATIONS PASSED ===");
}

runVerification().catch((e) => {
  console.error("Test failed:", e);
  process.exit(1);
});
