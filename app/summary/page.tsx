"use client";

import { useState, useEffect } from "react";
import QRCode from "qrcode";
import {
  User,
  HeartPulse,
  Stethoscope,
  Pill,
  Activity,
  TrendingUp,
  CalendarCheck,
  ShieldCheck,
  Droplet,
  Heart,
  QrCode,
  Copy,
  ChevronRight,
  Plus,
  AlertCircle,
  CheckCircle2,
  Calendar,
  Building,
  Bell,
  Sparkles,
  ArrowRight,
  FileText,
} from "lucide-react";
import { getLocalSession } from "@/lib/auth";
import {
  Profile,
  Encounter,
  Diagnosis,
  Medication,
  LabResult,
  FollowUpAppointment,
} from "@/lib/types/database";

export default function SummaryDashboardPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [encounters, setEncounters] = useState<Encounter[]>([]);
  const [diagnoses, setDiagnoses] = useState<Diagnosis[]>([]);
  const [appointments, setAppointments] = useState<FollowUpAppointment[]>([]);
  const [labResults, setLabResults] = useState<LabResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");

  useEffect(() => {
    async function loadAll() {
      try {
        setLoading(true);
        const session = getLocalSession();
        const patientId = session?.user?.id || "demo-patient-001";

        const [profRes, encRes, trendsRes] = await Promise.all([
          fetch(`/api/profile?patient_id=${patientId}`),
          fetch(`/api/encounters?patient_id=${patientId}`),
          fetch(`/api/trends?patient_id=${patientId}`),
        ]);

        const profData = await profRes.json();
        const encData = await encRes.json();
        const trendsData = await trendsRes.json();

        if (profData.success && profData.profile) {
          setProfile(profData.profile);
          if (profData.profile.health_id) {
            const qr = await QRCode.toDataURL(profData.profile.health_id, {
              width: 260,
              margin: 2,
              color: { dark: "#061811", light: "#ffffff" },
            });
            setQrDataUrl(qr);
          }
        }

        if (encData.success) {
          setEncounters(encData.encounters || []);
          setDiagnoses(encData.diagnoses || []);
          setAppointments(encData.appointments || []);
        }

        if (trendsData.success) {
          setLabResults(trendsData.lab_results || []);
        }
      } catch (err) {
        console.error("Dashboard error:", err);
      } finally {
        setLoading(false);
      }
    }

    loadAll();
  }, []);

  const handleCopyHealthId = () => {
    if (profile?.health_id) {
      navigator.clipboard.writeText(profile.health_id);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const nextUpcomingAppt = appointments.find((a) => a.status === "upcoming");

  // Calculate days until
  const getDaysUntil = (dateStr?: string) => {
    if (!dateStr) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(dateStr);
    target.setHours(0, 0, 0, 0);
    return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  };

  const daysToNext = nextUpcomingAppt ? getDaysUntil(nextUpcomingAppt.scheduled_date) : null;

  // Extract all prescribed medications from encounters
  const allMeds: Array<{
    name: string;
    dosage: string;
    frequency: string;
    doctor?: string;
    hospital?: string;
  }> = [];

  for (const enc of encounters) {
    if (enc.prescriptions && enc.prescriptions.length > 0) {
      for (const rx of enc.prescriptions) {
        if (!allMeds.some((m) => m.name.toLowerCase() === rx.name.toLowerCase())) {
          allMeds.push({
            name: rx.name,
            dosage: rx.dosage,
            frequency: rx.frequency,
            doctor: enc.doctor_name || undefined,
            hospital: enc.hospital || undefined,
          });
        }
      }
    }
  }

  // Latest vitals
  const latestFasting = [...labResults]
    .filter((r) => r.test_name.toLowerCase().includes("fasting"))
    .pop();
  const latestHbA1c = [...labResults]
    .filter((r) => r.test_name.toLowerCase().includes("hba1c"))
    .pop();
  const latestSystolic = [...labResults]
    .filter((r) => r.test_name.toLowerCase().includes("systolic"))
    .pop();
  const latestDiastolic = [...labResults]
    .filter((r) => r.test_name.toLowerCase().includes("diastolic"))
    .pop();

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto py-20 px-4 text-center">
        <div className="inline-block w-8 h-8 border-4 border-emerald-400 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-emerald-300/80 text-sm">Loading your MediCare medical overview...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-8">
      {/* Welcome Header Card */}
      <div className="relative rounded-3xl bg-gradient-to-r from-[#092219] via-[#0d2f23] to-[#071912] border border-emerald-500/30 p-6 sm:p-8 overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-400/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2.5">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-semibold border border-emerald-500/30">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              Patient Health Portal • Verified Record
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              Welcome back, {profile?.full_name || "Patient"}
            </h1>
            <p className="text-sm text-emerald-200/75 max-w-2xl leading-relaxed">
              Every doctor, report and prescription organised into one unified longitudinal timeline. Your
              confirmed health history is ready and securely accessible.
            </p>
          </div>

          {/* Quick Health Pass Card */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Health ID Pill */}
            <div className="bg-[#051711]/90 border border-emerald-500/40 rounded-2xl p-4 shadow-lg space-y-1.5 min-w-[200px]">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold text-emerald-400/70 tracking-wider">
                  Health ID
                </span>
                <button
                  onClick={handleCopyHealthId}
                  className="text-emerald-400/70 hover:text-emerald-300 p-0.5 rounded"
                  title="Copy Health ID"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="font-mono text-base font-extrabold text-emerald-300 tracking-wider">
                {profile?.health_id}
              </div>
              {copied && (
                <span className="text-[10px] text-emerald-400 font-semibold block animate-pulse">
                  Copied!
                </span>
              )}
            </div>

            {/* Blood Group Pill */}
            <div className="bg-[#051711]/90 border border-emerald-500/40 rounded-2xl p-4 shadow-lg text-center min-w-[100px]">
              <span className="block text-[10px] uppercase font-bold text-emerald-400/70 tracking-wider">
                Blood Group
              </span>
              <span className="text-xl font-black text-rose-400 flex items-center justify-center gap-1 mt-0.5">
                <Droplet className="w-4 h-4 fill-rose-400/30 text-rose-400" />
                {profile?.blood_group || "B+"}
              </span>
            </div>

            {/* View QR Code Button */}
            <button
              onClick={() => setQrModalOpen(true)}
              className="bg-[#051711]/90 hover:bg-[#082219] border border-emerald-500/40 hover:border-emerald-400 rounded-2xl p-3.5 shadow-lg flex flex-col items-center justify-center gap-1 text-emerald-300 transition-all hover:scale-105"
              title="Show QR Code"
            >
              <QrCode className="w-6 h-6 text-emerald-400" />
              <span className="text-[10px] font-bold">QR Pass</span>
            </button>
          </div>
        </div>

        {/* Core KPI metrics row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 pt-6 border-t border-emerald-900/40 mt-6">
          <div className="bg-[#051610]/80 rounded-2xl p-4 border border-emerald-500/30">
            <span className="block text-[11px] uppercase tracking-wider text-emerald-400/70 font-semibold">
              Active Diagnoses
            </span>
            <span className="text-2xl font-black text-white">{diagnoses.length}</span>
            <span className="text-[11px] text-emerald-300/70 block mt-0.5">Chronic conditions</span>
          </div>

          <div className="bg-[#051610]/80 rounded-2xl p-4 border border-emerald-500/30">
            <span className="block text-[11px] uppercase tracking-wider text-emerald-400/70 font-semibold">
              Prescribed Medicines
            </span>
            <span className="text-2xl font-black text-teal-300">{allMeds.length}</span>
            <span className="text-[11px] text-emerald-300/70 block mt-0.5">Active regimens</span>
          </div>

          <div className="bg-[#051610]/80 rounded-2xl p-4 border border-emerald-500/30">
            <span className="block text-[11px] uppercase tracking-wider text-emerald-400/70 font-semibold">
              Consultations
            </span>
            <span className="text-2xl font-black text-white">{encounters.length}</span>
            <span className="text-[11px] text-emerald-300/70 block mt-0.5">Cross-provider visits</span>
          </div>

          <div className="bg-[#051610]/80 rounded-2xl p-4 border border-emerald-500/30">
            <span className="block text-[11px] uppercase tracking-wider text-emerald-400/70 font-semibold">
              Emergency ER Mode
            </span>
            <span className="text-base font-bold text-emerald-300 flex items-center gap-1.5 mt-1">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              Active (24h)
            </span>
            <span className="text-[11px] text-emerald-400/70 block">Masked triage enabled</span>
          </div>
        </div>
      </div>

      {/* UPCOMING DOCTOR VISIT BANNER */}
      {nextUpcomingAppt && (
        <div className="rounded-2xl bg-gradient-to-r from-[#0c2a1f] to-[#081e16] border border-teal-500/40 p-5 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-teal-400/20 border border-teal-400/40 flex items-center justify-center text-teal-300 flex-shrink-0">
              <CalendarCheck className="w-6 h-6 stroke-[2.2]" />
            </div>
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs uppercase font-bold text-teal-400 tracking-wider">
                  Upcoming Follow-up Appointment
                </span>
                {daysToNext !== null && (
                  <span
                    className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                      daysToNext <= 3
                        ? "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                        : "bg-teal-500/20 text-teal-300 border border-teal-500/40"
                    }`}
                  >
                    {daysToNext === 0
                      ? "Today!"
                      : daysToNext === 1
                      ? "Tomorrow"
                      : `In ${daysToNext} days (${nextUpcomingAppt.scheduled_date})`}
                  </span>
                )}
              </div>
              <h3 className="text-base font-bold text-white">
                {nextUpcomingAppt.doctor_name} • {nextUpcomingAppt.hospital}
              </h3>
              <p className="text-xs text-emerald-200/80 font-medium">
                Reason: {nextUpcomingAppt.reason}
                {nextUpcomingAppt.instructions && ` — ${nextUpcomingAppt.instructions}`}
              </p>
            </div>
          </div>

          <a
            href="/consultations"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-400 text-[#071410] font-bold text-xs hover:bg-teal-300 transition-colors whitespace-nowrap self-end sm:self-center"
          >
            Manage Appointments
            <ChevronRight className="w-4 h-4" />
          </a>
        </div>
      )}

      {/* QUICK SHORTCUT ACTION BUTTONS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <a
          href="/consultations"
          className="p-4 rounded-2xl bg-[#091b15]/90 border border-emerald-500/30 hover:border-emerald-400/60 p-4 flex items-center gap-3 transition-all hover:scale-[1.02] group"
        >
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 group-hover:bg-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Stethoscope className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs font-bold text-white block">Consultations</span>
            <span className="text-[11px] text-emerald-400/70">Doctor visits & notes</span>
          </div>
        </a>

        <a
          href="/trends"
          className="p-4 rounded-2xl bg-[#091b15]/90 border border-emerald-500/30 hover:border-emerald-400/60 p-4 flex items-center gap-3 transition-all hover:scale-[1.02] group"
        >
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 group-hover:bg-emerald-500/20 flex items-center justify-center text-emerald-400">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs font-bold text-white block">Lab Trends</span>
            <span className="text-[11px] text-emerald-400/70">Glucose, HbA1c, BP</span>
          </div>
        </a>

        <a
          href="/profile"
          className="p-4 rounded-2xl bg-[#091b15]/90 border border-emerald-500/30 hover:border-emerald-400/60 p-4 flex items-center gap-3 transition-all hover:scale-[1.02] group"
        >
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 group-hover:bg-emerald-500/20 flex items-center justify-center text-emerald-400">
            <User className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs font-bold text-white block">Health Profile</span>
            <span className="text-[11px] text-emerald-400/70">Health ID, QR & Contacts</span>
          </div>
        </a>

        <a
          href="/documents/upload"
          className="p-4 rounded-2xl bg-[#091b15]/90 border border-emerald-500/30 hover:border-emerald-400/60 p-4 flex items-center gap-3 transition-all hover:scale-[1.02] group"
        >
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 group-hover:bg-emerald-500/20 flex items-center justify-center text-emerald-400">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs font-bold text-white block">Upload Records</span>
            <span className="text-[11px] text-emerald-400/70">Prescriptions & labs</span>
          </div>
        </a>
      </div>

      {/* TWO COLUMN SECTION: ACTIVE MEDICINES + RECENT VITALS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left: Active Prescribed Medicines */}
        <div className="lg:col-span-7 space-y-6">
          <div className="rounded-2xl bg-[#091b15]/95 border border-emerald-500/30 p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-emerald-900/40">
              <div className="flex items-center gap-2">
                <Pill className="w-5 h-5 text-teal-400" />
                <h2 className="text-base font-bold text-white">Active Prescriptions ({allMeds.length})</h2>
              </div>
              <a
                href="/consultations"
                className="text-xs font-semibold text-teal-300 hover:text-white flex items-center gap-1"
              >
                View all in consultations <ChevronRight className="w-3.5 h-3.5" />
              </a>
            </div>

            <div className="space-y-3">
              {allMeds.map((med, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-xl bg-[#06140f] border border-emerald-500/20 hover:border-emerald-500/40 flex items-start justify-between gap-4 transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-white">{med.name}</span>
                      {med.dosage && (
                        <span className="text-xs font-mono px-2 py-0.5 rounded bg-teal-500/20 text-teal-300 font-semibold">
                          {med.dosage}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-emerald-300/80 font-medium">
                      Schedule: <span className="text-white font-semibold">{med.frequency}</span>
                    </div>
                    {med.doctor && (
                      <span className="text-[11px] text-emerald-400/70 block">
                        Prescribed by {med.doctor} {med.hospital && `(${med.hospital})`}
                      </span>
                    )}
                  </div>

                  <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 self-start">
                    Active
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Chronic Diagnosed Conditions Card */}
          <div className="rounded-2xl bg-[#091b15]/95 border border-emerald-500/30 p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-emerald-900/40">
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-emerald-400" />
                <h2 className="text-base font-bold text-white">Diagnosed Conditions ({diagnoses.length})</h2>
              </div>
              <a
                href="/consultations"
                className="text-xs font-semibold text-emerald-300 hover:text-white flex items-center gap-1"
              >
                Manage conditions <ChevronRight className="w-3.5 h-3.5" />
              </a>
            </div>

            <div className="space-y-2.5">
              {diagnoses.map((diag) => (
                <div
                  key={diag.id}
                  className="p-3.5 rounded-xl bg-[#06140f] border border-emerald-500/20 flex items-center justify-between gap-3"
                >
                  <div>
                    <h3 className="text-xs sm:text-sm font-bold text-white">{diag.name_as_written}</h3>
                    <div className="flex items-center gap-2 text-[11px] text-emerald-400/70 mt-0.5">
                      <span>Canonical: {diag.name_canonical}</span>
                      {diag.diagnosed_date && <span>• {diag.diagnosed_date}</span>}
                    </div>
                  </div>

                  <span className="text-[10px] uppercase font-bold px-2.5 py-0.5 rounded-full bg-rose-500/15 text-rose-300 border border-rose-500/30">
                    {diag.status || "active"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Recent Lab Vitals & Doctor Consultation Notes */}
        <div className="lg:col-span-5 space-y-6">
          {/* Recent Vitals Snapshot Card */}
          <div className="rounded-2xl bg-[#091b15]/95 border border-emerald-500/30 p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-emerald-900/40">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-emerald-400" />
                <h2 className="text-base font-bold text-white">Latest Lab Vitals</h2>
              </div>
              <a
                href="/trends"
                className="text-xs font-semibold text-emerald-300 hover:text-white flex items-center gap-1"
              >
                View Recharts trends <ChevronRight className="w-3.5 h-3.5" />
              </a>
            </div>

            <div className="space-y-3">
              {/* Fasting Glucose */}
              <div className="p-3 rounded-xl bg-[#06140f] border border-emerald-500/20 flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-emerald-200 block">Fasting Blood Glucose</span>
                  <span className="text-[11px] text-emerald-400/70">{latestFasting?.taken_on || "Recent"}</span>
                </div>
                <div className="text-right">
                  <span className="text-lg font-black text-white">{latestFasting?.value_num || 114}</span>
                  <span className="text-xs text-emerald-400/70 ml-1">mg/dL</span>
                </div>
              </div>

              {/* HbA1c */}
              <div className="p-3 rounded-xl bg-[#06140f] border border-emerald-500/20 flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-emerald-200 block">HbA1c Glycated Hb</span>
                  <span className="text-[11px] text-emerald-400/70">{latestHbA1c?.taken_on || "Recent"}</span>
                </div>
                <div className="text-right">
                  <span className="text-lg font-black text-emerald-300">{latestHbA1c?.value_num || 6.9}</span>
                  <span className="text-xs text-emerald-400/70 ml-1">%</span>
                </div>
              </div>

              {/* Blood Pressure */}
              <div className="p-3 rounded-xl bg-[#06140f] border border-emerald-500/20 flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-emerald-200 block">Arterial Blood Pressure</span>
                  <span className="text-[11px] text-emerald-400/70">
                    {latestSystolic?.taken_on || "Recent"}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-lg font-black text-white">
                    {latestSystolic?.value_num || 124}/{latestDiastolic?.value_num || 80}
                  </span>
                  <span className="text-xs text-emerald-400/70 ml-1">mmHg</span>
                </div>
              </div>
            </div>
          </div>

          {/* Latest Doctor Consultation Preview */}
          {encounters.length > 0 && (
            <div className="rounded-2xl bg-[#091b15]/95 border border-emerald-500/30 p-6 shadow-xl space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-emerald-900/40">
                <span className="text-xs font-bold text-white flex items-center gap-1.5 uppercase tracking-wider">
                  <Stethoscope className="w-4 h-4 text-emerald-400" />
                  Latest Doctor Consultation Note
                </span>
                <span className="text-[11px] font-mono text-emerald-400/70">
                  {new Date(encounters[0].start_date).toLocaleDateString()}
                </span>
              </div>

              <div className="space-y-1">
                <h3 className="text-sm font-bold text-white">{encounters[0].doctor_name}</h3>
                <span className="text-xs text-emerald-300/70">{encounters[0].hospital}</span>
              </div>

              {encounters[0].reason && (
                <div className="text-xs text-emerald-200 font-semibold">
                  Reason: {encounters[0].reason}
                </div>
              )}

              {encounters[0].notes && (
                <p className="p-3 rounded-xl bg-[#06140f] border border-emerald-500/20 text-xs text-emerald-100/90 leading-relaxed">
                  "{encounters[0].notes}"
                </p>
              )}

              <a
                href="/consultations"
                className="inline-flex items-center gap-1 text-xs font-bold text-teal-300 hover:text-white pt-1"
              >
                Read full consultation timeline <ArrowRight className="w-3.5 h-3.5" />
              </a>
            </div>
          )}
        </div>
      </div>

      {/* QR MODAL */}
      {qrModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#091b15] border border-emerald-500/40 rounded-2xl max-w-sm w-full p-6 text-center space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-emerald-900/40">
              <h3 className="text-sm font-bold text-white">Your MediCare Health ID Pass</h3>
              <button
                onClick={() => setQrModalOpen(false)}
                className="text-emerald-400/60 hover:text-white text-xs"
              >
                ✕
              </button>
            </div>

            <div className="p-3 bg-white rounded-2xl inline-block shadow-inner">
              {qrDataUrl && (
                <img
                  src={qrDataUrl}
                  alt={`Health ID QR Code for ${profile?.health_id}`}
                  className="w-52 h-52 mx-auto rounded-lg"
                />
              )}
            </div>

            <div className="space-y-1">
              <span className="text-[10px] uppercase font-bold text-emerald-400/70 tracking-wider">
                Universal Health ID
              </span>
              <div className="font-mono text-lg font-black text-emerald-300 tracking-wider">
                {profile?.health_id}
              </div>
            </div>

            <p className="text-[11px] text-emerald-200/70">
              Doctors and ER triage can scan this pass or search this Health ID to view your emergency records.
            </p>

            <button
              onClick={() => setQrModalOpen(false)}
              className="w-full py-2.5 rounded-xl bg-emerald-400 text-[#071410] font-bold text-xs"
            >
              Close Pass
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
