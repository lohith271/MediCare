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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const patientId = searchParams.get("patient_id") || "demo-patient-001";

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
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to load consultations" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const patientId = body.patient_id || "demo-patient-001";

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

    // Default: Create new consultation encounter
    const encounter = await createEncounter(patientId, body);
    return NextResponse.json({
      success: true,
      encounter,
      message: "Consultation and prescriptions saved successfully",
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to save consultation" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { appointment_id, status } = body;

    if (!appointment_id || !status) {
      return NextResponse.json(
        { success: false, error: "Appointment ID and status are required" },
        { status: 400 }
      );
    }

    const updated = await updateAppointmentStatus(appointment_id, status);
    return NextResponse.json({
      success: updated,
      message: `Appointment marked as ${status}`,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to update appointment" },
      { status: 500 }
    );
  }
}
