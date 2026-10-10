import { NextRequest, NextResponse } from "next/server";
import {
  getPatientProfile,
  updatePatientProfile,
  getTrustedContacts,
  addTrustedContact,
  deleteTrustedContact,
} from "@/lib/data/store";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const patientId = searchParams.get("patient_id") || "demo-patient-001";

    const [profile, trustedContacts] = await Promise.all([
      getPatientProfile(patientId),
      getTrustedContacts(patientId),
    ]);

    return NextResponse.json({
      success: true,
      profile,
      trusted_contacts: trustedContacts,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to load profile" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const patientId = body.patient_id || "demo-patient-001";

    const updated = await updatePatientProfile(patientId, body);

    return NextResponse.json({
      success: true,
      profile: updated,
      message: "Profile updated successfully",
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to update profile" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const patientId = body.patient_id || "demo-patient-001";

    if (body.action === "add_contact") {
      const { name, email, relation } = body;
      if (!name || !email || !relation) {
        return NextResponse.json(
          { success: false, error: "Name, email and relationship are required" },
          { status: 400 }
        );
      }

      const contact = await addTrustedContact(patientId, { name, email, relation });
      return NextResponse.json({
        success: true,
        contact,
        message: "Trusted contact added successfully",
      });
    }

    return NextResponse.json({ success: false, error: "Unknown action" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to process request" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const contactId = searchParams.get("contact_id");

    if (!contactId) {
      return NextResponse.json(
        { success: false, error: "Contact ID is required" },
        { status: 400 }
      );
    }

    await deleteTrustedContact(contactId);
    return NextResponse.json({
      success: true,
      message: "Trusted contact removed successfully",
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to delete contact" },
      { status: 500 }
    );
  }
}
