"use client";

import { useState, useEffect } from "react";
import QRCode from "qrcode";
import {
  User,
  Phone,
  Droplet,
  QrCode,
  ShieldAlert,
  Clock,
  HeartHandshake,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Copy,
  Download,
  Calendar,
  Sparkles,
  Lock,
} from "lucide-react";
import { Profile, TrustedContact, BloodGroup, Sex } from "@/lib/types/database";
import { getLocalSession } from "@/lib/auth";

const BLOOD_GROUPS: BloodGroup[] = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const SEX_OPTIONS: { label: string; value: Sex }[] = [
  { label: "Male", value: "male" },
  { label: "Female", value: "female" },
  { label: "Other", value: "other" },
];

const EMERGENCY_FIELD_OPTIONS = [
  { id: "blood_group", label: "Blood Group" },
  { id: "allergies", label: "Allergies & Reactions" },
  { id: "conditions", label: "Chronic Conditions" },
  { id: "medications", label: "Current Medications" },
];

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [trustedContacts, setTrustedContacts] = useState<TrustedContact[]>([]);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Form states
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [dob, setDob] = useState("");
  const [sex, setSex] = useState<Sex>("male");
  const [bloodGroup, setBloodGroup] = useState<BloodGroup>("B+");
  const [emergencyEnabled, setEmergencyEnabled] = useState(true);
  const [emergencyFields, setEmergencyFields] = useState<string[]>([
    "blood_group",
    "allergies",
    "conditions",
    "medications",
  ]);
  const [emergencyHours, setEmergencyHours] = useState(24);

  // New trusted contact modal/form
  const [showAddContact, setShowAddContact] = useState(false);
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactRelation, setContactRelation] = useState("Spouse");

  const loadData = async () => {
    try {
      setLoading(true);
      const session = getLocalSession();
      const patientId = session?.user?.id || "demo-patient-001";

      const res = await fetch(`/api/profile?patient_id=${patientId}`);
      const data = await res.json();

      if (data.success && data.profile) {
        setProfile(data.profile);
        setFullName(data.profile.full_name || "");
        setPhone(data.profile.phone || "");
        setDob(data.profile.dob || "");
        setSex(data.profile.sex || "male");
        setBloodGroup(data.profile.blood_group || "B+");
        setEmergencyEnabled(data.profile.emergency_enabled ?? true);
        setEmergencyFields(data.profile.emergency_fields || ["blood_group", "allergies", "conditions", "medications"]);
        setEmergencyHours(data.profile.emergency_access_hours || 24);
        setTrustedContacts(data.trusted_contacts || []);

        // Generate QR code for ONLY Health ID
        if (data.profile.health_id) {
          const url = await QRCode.toDataURL(data.profile.health_id, {
            width: 240,
            margin: 2,
            color: {
              dark: "#051610",
              light: "#ffffff",
            },
          });
          setQrCodeUrl(url);
        }
      }
    } catch (err: any) {
      setStatusMessage({ type: "error", text: "Failed to load profile data." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCopyHealthId = () => {
    if (profile?.health_id) {
      navigator.clipboard.writeText(profile.health_id);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setStatusMessage(null);

    try {
      const session = getLocalSession();
      const patientId = session?.user?.id || "demo-patient-001";

      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patient_id: patientId,
          full_name: fullName,
          phone,
          dob,
          sex,
          blood_group: bloodGroup,
          emergency_enabled: emergencyEnabled,
          emergency_fields: emergencyFields,
          emergency_access_hours: Number(emergencyHours),
        }),
      });

      const data = await res.json();
      if (data.success) {
        setProfile(data.profile);
        setStatusMessage({ type: "success", text: "Profile & emergency settings saved successfully!" });
        setTimeout(() => setStatusMessage(null), 3500);
      } else {
        throw new Error(data.error || "Update failed");
      }
    } catch (err: any) {
      setStatusMessage({ type: "error", text: err.message || "Failed to update profile." });
    } finally {
      setSaving(false);
    }
  };

  const handleAddContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactName || !contactEmail) return;

    try {
      const session = getLocalSession();
      const patientId = session?.user?.id || "demo-patient-001";

      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "add_contact",
          patient_id: patientId,
          name: contactName,
          email: contactEmail,
          relation: contactRelation,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setTrustedContacts((prev) => [...prev, data.contact]);
        setContactName("");
        setContactEmail("");
        setShowAddContact(false);
        setStatusMessage({ type: "success", text: "Trusted contact added successfully." });
        setTimeout(() => setStatusMessage(null), 3000);
      }
    } catch {
      setStatusMessage({ type: "error", text: "Could not add trusted contact." });
    }
  };

  const handleDeleteContact = async (id: string) => {
    try {
      const res = await fetch(`/api/profile?contact_id=${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        setTrustedContacts((prev) => prev.filter((c) => c.id !== id));
        setStatusMessage({ type: "success", text: "Trusted contact removed." });
        setTimeout(() => setStatusMessage(null), 3000);
      }
    } catch {
      setStatusMessage({ type: "error", text: "Could not remove contact." });
    }
  };

  const toggleEmergencyField = (fieldId: string) => {
    setEmergencyFields((prev) =>
      prev.includes(fieldId) ? prev.filter((f) => f !== fieldId) : [...prev, fieldId]
    );
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto py-16 px-4 text-center">
        <div className="inline-block w-8 h-8 border-4 border-emerald-400 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-emerald-300/80 text-sm">Loading your MediCare profile...</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-8">
      {/* Top Header Banner */}
      <div className="relative rounded-2xl bg-gradient-to-r from-[#092219] via-[#0d2f23] to-[#071912] border border-emerald-500/30 p-6 sm:p-8 overflow-hidden shadow-xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-400/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-semibold border border-emerald-500/30">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              Patient Identity & Health Pass
            </div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">
              {profile?.full_name || "Patient Profile"}
            </h1>
            <p className="text-sm text-emerald-200/75 max-w-xl">
              Manage your personal medical identity, emergency ER disclosure settings, and trusted emergency contacts.
            </p>
          </div>

          {/* Quick Badges */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="bg-[#051711]/90 border border-emerald-500/40 rounded-xl px-4 py-2.5 text-center">
              <span className="block text-[10px] uppercase tracking-wider text-emerald-400/70 font-semibold">
                Blood Group
              </span>
              <span className="text-xl font-black text-rose-400 flex items-center justify-center gap-1">
                <Droplet className="w-4 h-4 fill-rose-400/30 text-rose-400" />
                {profile?.blood_group || "Not Set"}
              </span>
            </div>

            <div className="bg-[#051711]/90 border border-emerald-500/40 rounded-xl px-4 py-2.5 text-center">
              <span className="block text-[10px] uppercase tracking-wider text-emerald-400/70 font-semibold">
                Emergency Lookup
              </span>
              <span
                className={`text-sm font-bold flex items-center justify-center gap-1.5 ${
                  emergencyEnabled ? "text-emerald-300" : "text-amber-400"
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    emergencyEnabled ? "bg-emerald-400 animate-pulse" : "bg-amber-400"
                  }`}
                />
                {emergencyEnabled ? "Active (24h)" : "Disabled"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {statusMessage && (
        <div
          className={`p-4 rounded-xl flex items-center gap-3 text-sm font-medium border ${
            statusMessage.type === "success"
              ? "bg-emerald-950/60 text-emerald-200 border-emerald-500/40"
              : "bg-rose-950/60 text-rose-200 border-rose-500/40"
          }`}
        >
          {statusMessage.type === "success" ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0" />
          )}
          {statusMessage.text}
        </div>
      )}

      {/* Main Grid: Health ID & QR Card + Profile Edit Form */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Health ID & QR Card */}
        <div className="lg:col-span-5 space-y-6">
          <div className="rounded-2xl bg-[#091b15]/95 border border-emerald-500/30 p-6 shadow-xl backdrop-blur-xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-emerald-900/40">
              <div className="flex items-center gap-2">
                <QrCode className="w-5 h-5 text-emerald-400" />
                <h2 className="text-base font-bold text-white">Universal Health ID & QR</h2>
              </div>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                12-char base32
              </span>
            </div>

            {/* Visual Health Card */}
            <div className="bg-gradient-to-b from-[#0c2a1f] to-[#061811] rounded-2xl p-5 border border-emerald-500/40 text-center space-y-4 shadow-inner">
              <p className="text-xs text-emerald-200/80 font-medium">
                Emergency ER doctors can scan this QR code or enter your Health ID to access critical triage vitals.
              </p>

              {/* QR Image */}
              <div className="inline-block p-3 rounded-2xl bg-white shadow-xl shadow-black/40">
                {qrCodeUrl ? (
                  <img
                    src={qrCodeUrl}
                    alt={`Health ID QR Code for ${profile?.health_id}`}
                    className="w-48 h-48 rounded-lg"
                  />
                ) : (
                  <div className="w-48 h-48 bg-zinc-100 flex items-center justify-center text-zinc-400 text-xs">
                    Generating QR...
                  </div>
                )}
              </div>

              {/* Health ID Display & Copy */}
              <div className="space-y-2">
                <span className="text-[11px] uppercase tracking-wider text-emerald-400/80 font-semibold block">
                  Patient Health ID (Encodes Only Health ID)
                </span>
                <div className="inline-flex items-center gap-2 bg-[#05140e] border border-emerald-500/50 px-4 py-2 rounded-xl">
                  <span className="font-mono text-lg font-extrabold text-emerald-300 tracking-wider">
                    {profile?.health_id}
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyHealthId}
                    className="p-1 rounded hover:bg-emerald-500/20 text-emerald-400 transition-colors"
                    title="Copy Health ID"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
                {copied && (
                  <p className="text-xs text-emerald-400 font-medium animate-pulse">Copied to clipboard!</p>
                )}
              </div>
            </div>

            {/* Quick QR actions */}
            <div className="pt-2 flex items-center justify-center gap-3">
              {qrCodeUrl && (
                <a
                  href={qrCodeUrl}
                  download={`MediCare-HealthID-${profile?.health_id}.png`}
                  className="w-full inline-flex items-center justify-center gap-2 text-xs font-semibold py-2.5 px-4 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 transition-all hover:scale-[1.01]"
                >
                  <Download className="w-4 h-4" />
                  Download QR Health Card
                </a>
              )}
            </div>

            <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-500/20 text-xs text-emerald-200/80 leading-relaxed">
              <span className="font-semibold text-emerald-300">Privacy Guarantee:</span> The QR code encodes
              strictly your random base32 Health ID, never raw medical text or personal contact numbers.
            </div>
          </div>
        </div>

        {/* Right Column: Profile Edit Form & Emergency Disclosure Preferences */}
        <div className="lg:col-span-7 space-y-6">
          <form onSubmit={handleSaveProfile} className="space-y-6">
            {/* Personal Details Card */}
            <div className="rounded-2xl bg-[#091b15]/95 border border-emerald-500/30 p-6 shadow-xl space-y-5">
              <div className="flex items-center gap-2 pb-3 border-b border-emerald-900/40">
                <User className="w-5 h-5 text-emerald-400" />
                <h2 className="text-base font-bold text-white">Personal Information</h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-emerald-200 mb-1.5">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#06140f] border border-emerald-500/30 text-white text-sm focus:outline-none focus:border-emerald-400 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-emerald-200 mb-1.5">
                    Phone Number (E.164 format)
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 absolute left-3.5 top-3 text-emerald-400/60" />
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+919876543210"
                      required
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-[#06140f] border border-emerald-500/30 text-white text-sm focus:outline-none focus:border-emerald-400 transition-colors font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-emerald-200 mb-1.5">
                    Date of Birth
                  </label>
                  <div className="relative">
                    <Calendar className="w-4 h-4 absolute left-3.5 top-3 text-emerald-400/60" />
                    <input
                      type="date"
                      value={dob}
                      onChange={(e) => setDob(e.target.value)}
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-[#06140f] border border-emerald-500/30 text-white text-sm focus:outline-none focus:border-emerald-400 transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-emerald-200 mb-1.5">
                    Biological Sex
                  </label>
                  <select
                    value={sex}
                    onChange={(e) => setSex(e.target.value as Sex)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#06140f] border border-emerald-500/30 text-white text-sm focus:outline-none focus:border-emerald-400 transition-colors"
                  >
                    {SEX_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-emerald-200 mb-1.5">
                    Blood Group
                  </label>
                  <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                    {BLOOD_GROUPS.map((bg) => (
                      <button
                        type="button"
                        key={bg}
                        onClick={() => setBloodGroup(bg)}
                        className={`py-2 text-xs font-bold rounded-xl border transition-all ${
                          bloodGroup === bg
                            ? "bg-rose-500/20 text-rose-300 border-rose-400 shadow-md shadow-rose-500/10 scale-105"
                            : "bg-[#06140f] text-emerald-200/70 border-emerald-500/20 hover:border-emerald-400/40"
                        }`}
                      >
                        {bg}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Emergency ER Disclosure & Settings Card */}
            <div className="rounded-2xl bg-[#091b15]/95 border border-emerald-500/30 p-6 shadow-xl space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-emerald-900/40">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-rose-400" />
                  <h2 className="text-base font-bold text-white">Emergency ER Disclosure Preferences</h2>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={emergencyEnabled}
                    onChange={(e) => setEmergencyEnabled(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-[#06140f] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-400"></div>
                </label>
              </div>

              <p className="text-xs text-emerald-200/75 leading-relaxed">
                When enabled, verified ER emergency doctors can perform an immediate masked triage lookup when you
                are unable to consent. Select which specific categories are revealed in emergency basic mode.
              </p>

              {/* Emergency fields selector */}
              <div className="space-y-2">
                <span className="text-xs font-semibold text-emerald-300 block">
                  Included Fields in Emergency Basic View:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {EMERGENCY_FIELD_OPTIONS.map((field) => {
                    const isChecked = emergencyFields.includes(field.id);
                    return (
                      <button
                        type="button"
                        key={field.id}
                        onClick={() => toggleEmergencyField(field.id)}
                        className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border text-xs font-medium transition-all text-left ${
                          isChecked
                            ? "bg-emerald-500/15 border-emerald-400/60 text-emerald-200"
                            : "bg-[#06140f] border-emerald-500/20 text-emerald-400/50 hover:border-emerald-500/40"
                        }`}
                      >
                        <div
                          className={`w-4 h-4 rounded flex items-center justify-center border ${
                            isChecked
                              ? "bg-emerald-400 border-emerald-400 text-[#071410]"
                              : "border-emerald-500/40"
                          }`}
                        >
                          {isChecked && <CheckCircle2 className="w-3.5 h-3.5 stroke-[3]" />}
                        </div>
                        {field.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Emergency Access Hours */}
              <div className="pt-2">
                <label className="block text-xs font-semibold text-emerald-200 mb-1.5 flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-emerald-400" />
                  Full-Access Window Granted Upon Trusted Contact Approval
                </label>
                <select
                  value={emergencyHours}
                  onChange={(e) => setEmergencyHours(Number(e.target.value))}
                  className="w-full sm:w-64 px-3.5 py-2.5 rounded-xl bg-[#06140f] border border-emerald-500/30 text-white text-sm focus:outline-none focus:border-emerald-400"
                >
                  <option value={12}>12 Hours</option>
                  <option value={24}>24 Hours (Recommended)</option>
                  <option value={48}>48 Hours</option>
                  <option value={72}>72 Hours</option>
                </select>
              </div>
            </div>

            {/* Save Button */}
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-3 rounded-full bg-emerald-400 text-[#071410] font-bold text-sm hover:bg-emerald-300 transition-all shadow-lg shadow-emerald-400/20 hover:scale-[1.02] disabled:opacity-50"
              >
                {saving ? "Saving Changes..." : "Save Profile & Preferences"}
              </button>
            </div>
          </form>

          {/* Trusted Contacts Section */}
          <div className="rounded-2xl bg-[#091b15]/95 border border-emerald-500/30 p-6 shadow-xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-emerald-900/40">
              <div className="flex items-center gap-2">
                <HeartHandshake className="w-5 h-5 text-teal-400" />
                <h2 className="text-base font-bold text-white">Trusted Contacts ({trustedContacts.length})</h2>
              </div>
              <button
                type="button"
                onClick={() => setShowAddContact(!showAddContact)}
                className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30 hover:bg-teal-500/30 transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Contact
              </button>
            </div>

            <p className="text-xs text-emerald-200/75 leading-relaxed">
              If an ER physician requests full access to your clinical documents and timeline, an unguessable
              approval link is sent to these verified contacts. The first contact to approve unlocks access for{" "}
              {emergencyHours} hours.
            </p>

            {/* Add Contact Modal / Sub-form */}
            {showAddContact && (
              <form
                onSubmit={handleAddContact}
                className="p-4 rounded-xl bg-[#06140f] border border-teal-500/40 space-y-3"
              >
                <h3 className="text-xs font-bold text-teal-300 uppercase tracking-wider">
                  New Trusted Emergency Contact
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <input
                    type="text"
                    placeholder="Full Name"
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    required
                    className="px-3 py-2 rounded-lg bg-[#0a2018] border border-emerald-500/30 text-white text-xs focus:outline-none focus:border-teal-400"
                  />
                  <input
                    type="email"
                    placeholder="Email Address"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    required
                    className="px-3 py-2 rounded-lg bg-[#0a2018] border border-emerald-500/30 text-white text-xs focus:outline-none focus:border-teal-400"
                  />
                  <select
                    value={contactRelation}
                    onChange={(e) => setContactRelation(e.target.value)}
                    className="px-3 py-2 rounded-lg bg-[#0a2018] border border-emerald-500/30 text-white text-xs focus:outline-none focus:border-teal-400"
                  >
                    <option value="Spouse">Spouse</option>
                    <option value="Son">Son</option>
                    <option value="Daughter">Daughter</option>
                    <option value="Parent">Parent</option>
                    <option value="Sibling">Sibling</option>
                    <option value="Guardian">Guardian</option>
                    <option value="Friend">Friend</option>
                  </select>
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowAddContact(false)}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium text-emerald-300/70 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded-lg text-xs font-bold bg-teal-400 text-[#071410] hover:bg-teal-300 transition-colors"
                  >
                    Save Contact
                  </button>
                </div>
              </form>
            )}

            {/* Contacts List */}
            {trustedContacts.length === 0 ? (
              <div className="p-6 rounded-xl bg-[#06140f] border border-dashed border-emerald-500/20 text-center text-xs text-emerald-300/60">
                No trusted contacts configured. Add at least one contact so full emergency requests can be approved.
              </div>
            ) : (
              <div className="space-y-2.5">
                {trustedContacts.map((contact) => (
                  <div
                    key={contact.id}
                    className="flex items-center justify-between p-3.5 rounded-xl bg-[#06140f] border border-emerald-500/20 hover:border-emerald-500/40 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-300 font-bold text-xs">
                        {contact.name.charAt(0)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-white">{contact.name}</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 font-medium">
                            {contact.relation}
                          </span>
                        </div>
                        <span className="text-xs text-emerald-400/70 font-mono">{contact.email}</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDeleteContact(contact.id)}
                      className="p-1.5 rounded-lg text-emerald-500/60 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                      title="Remove contact"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
