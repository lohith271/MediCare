import { NextRequest, NextResponse } from "next/server";
import {
  getPatientProfile,
  updatePatientProfile,
  getTrustedContacts,
  addTrustedContact,
  deleteTrustedContact,
} from "@/lib/data/store";
import type { Profile } from "@/lib/types/database";
import {
  errorResponse,
  requireSignedInPatient,
  resolvePatientAccess,
} from "@/lib/access/patient-access";

/** Profile and trusted contacts. Readable by the patient or an "all" share code. */
export async function GET(req: NextRequest) {
  try {
    const access = await resolvePatientAccess(req, "all");
    if (!access.ok) return NextResponse.json({ success: false, error: access.error }, { status: access.status });
    const patientId = access.patientId;

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
    return errorResponse(error, "Failed to load profile");
  }
}

/** Owner-only from here on. The patient id is always the signed-in patient. */
export async function PATCH(req: NextRequest) {
  try {
    const auth = await requireSignedInPatient();
    if (!auth.ok) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });

    const body = await req.json();
    const { patient_id: _ignored, action: _action, ...updates } = body;

    const updated = await updatePatientProfile(auth.user.id, updates as Partial<Profile>);

    return NextResponse.json({
      success: true,
      profile: updated,
      message: "Profile updated successfully",
    });
  } catch (error: any) {
    return errorResponse(error, "Failed to update profile");
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireSignedInPatient();
    if (!auth.ok) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    const patientId = auth.user.id;

    const body = await req.json();

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
    return errorResponse(error, "Failed to process request");
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const auth = await requireSignedInPatient();
    if (!auth.ok) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });

    const { searchParams } = new URL(req.url);
    const contactId = searchParams.get("contact_id");

    if (!contactId) {
      return NextResponse.json(
        { success: false, error: "Contact ID is required" },
        { status: 400 }
      );
    }

    await deleteTrustedContact(auth.user.id, contactId);
    return NextResponse.json({
      success: true,
      message: "Trusted contact removed successfully",
    });
  } catch (error: any) {
    return errorResponse(error, "Failed to delete contact");
  }
}
