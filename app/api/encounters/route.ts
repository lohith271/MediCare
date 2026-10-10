import { NextRequest, NextResponse } from "next/server";
import {
  getEncounters,
  createEncounter,
  getDiagnoses,
  addDiagnosis,
  getAppointments,
  addAppointment,
  updateAppointmentStatus,
} from "@/lib/data/store";
import {
  errorResponse,
  requireSignedInPatient,
  resolvePatientAccess,
} from "@/lib/access/patient-access";

/** Consultations, diagnoses and appointments. Readable by the patient or a "conditions" share. */
export async function GET(req: NextRequest) {
  try {
    const access = await resolvePatientAccess(req, "conditions");
    if (!access.ok) return NextResponse.json({ success: false, error: access.error }, { status: access.status });
    const patientId = access.patientId;

    const [encounters, diagnoses, appointments] = await Promise.all([
      getEncounters(patientId),
      getDiagnoses(patientId),
      getAppointments(patientId),
    ]);

    return NextResponse.json({
      success: true,
      encounters,
      diagnoses,
      appointments,
    });
  } catch (error: any) {
    return errorResponse(error, "Failed to load consultations");
  }
}

/** Writes are owner-only. The patient id is the signed-in patient, never the body. */
export async function POST(req: NextRequest) {
  try {
    const auth = await requireSignedInPatient();
    if (!auth.ok) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    const patientId = auth.user.id;

    const body = await req.json();

    if (body.action === "add_diagnosis") {
      const diag = await addDiagnosis(patientId, body.diagnosis);
      return NextResponse.json({
        success: true,
        diagnosis: diag,
        message: "Diagnosis added successfully",
      });
    }

    if (body.action === "add_appointment") {
      const appt = await addAppointment(patientId, body.appointment);
      return NextResponse.json({
        success: true,
        appointment: appt,
        message: "Follow-up appointment scheduled successfully",
      });
    }

    const encounter = await createEncounter(patientId, body);
    return NextResponse.json({
      success: true,
      encounter,
      message: "Consultation and prescriptions saved successfully",
    });
  } catch (error: any) {
    return errorResponse(error, "Failed to save consultation");
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const auth = await requireSignedInPatient();
    if (!auth.ok) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });

    const body = await req.json();
    const { appointment_id, status } = body;

    if (!appointment_id || !status) {
      return NextResponse.json(
        { success: false, error: "Appointment ID and status are required" },
        { status: 400 }
      );
    }

    const updated = await updateAppointmentStatus(auth.user.id, appointment_id, status);
    return NextResponse.json({
      success: updated,
      message: `Appointment marked as ${status}`,
    });
  } catch (error: any) {
    return errorResponse(error, "Failed to update appointment");
  }
}
