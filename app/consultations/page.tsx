"use client";

import { useState, useEffect } from "react";
import {
  Stethoscope,
  Calendar,
  Clock,
  Plus,
  Pill,
  Activity,
  FileText,
  Building,
  UserCheck,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  Filter,
  Search,
  Bell,
  CalendarCheck,
  CalendarPlus,
  Trash2,
  Tag,
  Sparkles,
} from "lucide-react";
import {
  Encounter,
  Diagnosis,
  FollowUpAppointment,
  PrescribedMedicine,
} from "@/lib/types/database";
import { getLocalSession } from "@/lib/auth";

export default function ConsultationsPage() {
  const [encounters, setEncounters] = useState<Encounter[]>([]);
  const [diagnoses, setDiagnoses] = useState<Diagnosis[]>([]);
  const [appointments, setAppointments] = useState<FollowUpAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"consultations" | "diseases" | "followups">("consultations");
  const [statusMsg, setStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Modal controls
  const [showConsultModal, setShowConsultModal] = useState(false);
  const [showDiseaseModal, setShowDiseaseModal] = useState(false);
  const [showFollowupModal, setShowFollowupModal] = useState(false);

  // Consultation Form
  const [docName, setDocName] = useState("");
  const [hospital, setHospital] = useState("");
  const [visitDate, setVisitDate] = useState(new Date().toISOString().split("T")[0]);
  const [visitKind, setVisitKind] = useState<"consultation" | "visit" | "follow_up" | "admission">("consultation");
  const [visitReason, setVisitReason] = useState("");
  const [visitNotes, setVisitNotes] = useState("");
  const [diagInput, setDiagInput] = useState("");
  const [prescriptions, setPrescriptions] = useState<PrescribedMedicine[]>([
    { name: "", dosage: "", frequency: "1-0-1 After food", duration: "30 days", instructions: "" },
  ]);
  const [nextVisitDate, setNextVisitDate] = useState("");
  const [nextVisitNotes, setNextVisitNotes] = useState("");

  // Disease Form
  const [diseaseName, setDiseaseName] = useState("");
  const [diseaseCanonical, setDiseaseCanonical] = useState("");
  const [diseaseDoctor, setDiseaseDoctor] = useState("");
  const [diseaseHospital, setDiseaseHospital] = useState("");
  const [diseaseDate, setDiseaseDate] = useState(new Date().toISOString().split("T")[0]);
  const [diseaseStatus, setDiseaseStatus] = useState<"active" | "monitored" | "resolved">("active");
  const [diseaseNotes, setDiseaseNotes] = useState("");

  // Follow-up Appointment Form
  const [apptDoc, setApptDoc] = useState("");
  const [apptHospital, setApptHospital] = useState("");
  const [apptDate, setApptDate] = useState("");
  const [apptTime, setApptTime] = useState("10:00 AM");
  const [apptReason, setApptReason] = useState("");
  const [apptInstructions, setApptInstructions] = useState("");

  const fetchData = async () => {
    try {
      setLoading(true);
      const session = getLocalSession();
      const patientId = session?.user?.id || "demo-patient-001";

      const res = await fetch(`/api/encounters?patient_id=${patientId}`);
      const data = await res.json();

      if (data.success) {
        setEncounters(data.encounters || []);
        setDiagnoses(data.diagnoses || []);
        setAppointments(data.appointments || []);
      }
    } catch {
      setStatusMsg({ type: "error", text: "Failed to load consultations and clinical records." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAddPrescriptionRow = () => {
    setPrescriptions((prev) => [
      ...prev,
      { name: "", dosage: "", frequency: "1-0-1 After food", duration: "30 days", instructions: "" },
    ]);
  };

  const handleRemovePrescriptionRow = (index: number) => {
    setPrescriptions((prev) => prev.filter((_, i) => i !== index));
  };

  const handlePrescriptionChange = (index: number, field: keyof PrescribedMedicine, val: string) => {
    setPrescriptions((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: val };
      return copy;
    });
  };

  // Submit Consultation & Prescriptions & Next Visit
  const handleSaveConsultation = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const session = getLocalSession();
      const patientId = session?.user?.id || "demo-patient-001";

      const validMeds = prescriptions.filter((p) => p.name.trim().length > 0);
      const parsedDiags = diagInput
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

      const res = await fetch("/api/encounters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patient_id: patientId,
          doctor_name: docName,
          hospital,
          kind: visitKind,
          start_date: new Date(visitDate).toISOString(),
          reason: visitReason,
          notes: visitNotes,
          diagnoses: parsedDiags,
          prescriptions: validMeds,
          next_visit_date: nextVisitDate || null,
          next_visit_notes: nextVisitNotes || null,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setStatusMsg({ type: "success", text: "Doctor consultation and prescriptions recorded successfully!" });
        setShowConsultModal(false);
        // Reset form
        setDocName("");
        setHospital("");
        setVisitReason("");
        setVisitNotes("");
        setDiagInput("");
        setNextVisitDate("");
        setNextVisitNotes("");
        setPrescriptions([
          { name: "", dosage: "", frequency: "1-0-1 After food", duration: "30 days", instructions: "" },
        ]);
        fetchData();
        setTimeout(() => setStatusMsg(null), 3500);
      }
    } catch {
      setStatusMsg({ type: "error", text: "Failed to save consultation." });
    }
  };

  // Submit Disease / Diagnosis
  const handleSaveDisease = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!diseaseName) return;

    try {
      const session = getLocalSession();
      const patientId = session?.user?.id || "demo-patient-001";

      const res = await fetch("/api/encounters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "add_diagnosis",
          patient_id: patientId,
          diagnosis: {
            name_as_written: diseaseName,
            name_canonical: diseaseCanonical || diseaseName,
            diagnosed_date: diseaseDate,
            doctor_name: diseaseDoctor,
            hospital: diseaseHospital,
            status: diseaseStatus,
            notes: diseaseNotes,
          },
        }),
      });

      const data = await res.json();
      if (data.success) {
        setStatusMsg({ type: "success", text: `Disease "${diseaseName}" added to medical history!` });
        setShowDiseaseModal(false);
        setDiseaseName("");
        setDiseaseCanonical("");
        setDiseaseDoctor("");
        setDiseaseHospital("");
        setDiseaseNotes("");
        fetchData();
        setTimeout(() => setStatusMsg(null), 3500);
      }
    } catch {
      setStatusMsg({ type: "error", text: "Failed to add diagnosis." });
    }
  };

  // Submit Standalone Follow-up Appointment
  const handleSaveFollowup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apptDoc || !apptDate) return;

    try {
      const session = getLocalSession();
      const patientId = session?.user?.id || "demo-patient-001";

      const res = await fetch("/api/encounters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "add_appointment",
          patient_id: patientId,
          appointment: {
            doctor_name: apptDoc,
            hospital: apptHospital,
            scheduled_date: apptDate,
            scheduled_time: apptTime,
            reason: apptReason,
            instructions: apptInstructions,
          },
        }),
      });

      const data = await res.json();
      if (data.success) {
        setStatusMsg({ type: "success", text: "Doctor follow-up appointment scheduled!" });
        setShowFollowupModal(false);
        setApptDoc("");
        setApptHospital("");
        setApptDate("");
        setApptReason("");
        setApptInstructions("");
        fetchData();
        setTimeout(() => setStatusMsg(null), 3500);
      }
    } catch {
      setStatusMsg({ type: "error", text: "Failed to schedule follow-up." });
    }
  };

  // Mark appointment status
  const handleUpdateApptStatus = async (
    apptId: string,
    status: "upcoming" | "completed" | "cancelled"
  ) => {
    try {
      const res = await fetch("/api/encounters", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appointment_id: apptId, status }),
      });
      const data = await res.json();
      if (data.success) {
        fetchData();
      }
    } catch {
      // silent
    }
  };

  const calculateDaysUntil = (dateStr: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(dateStr);
    target.setHours(0, 0, 0, 0);
    const diffTime = target.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // Filtered items based on search query
  const filteredEncounters = encounters.filter(
    (e) =>
      (e.doctor_name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (e.hospital || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (e.reason || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (e.diagnoses || []).some((d) => d.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const filteredDiagnoses = diagnoses.filter(
    (d) =>
      d.name_as_written.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.name_canonical.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (d.doctor_name || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-8">
      {/* Top Banner */}
      <div className="relative rounded-2xl bg-gradient-to-r from-[#0a271c] via-[#0e3527] to-[#071912] border border-emerald-500/30 p-6 sm:p-8 overflow-hidden shadow-xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-400/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-semibold border border-emerald-500/30">
              <Stethoscope className="w-3.5 h-3.5 text-emerald-400" />
              Clinical Consultation & Disease Tracker
            </div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">
              Consultations, Diagnoses & Doctor Follow-ups
            </h1>
            <p className="text-sm text-emerald-200/75 max-w-2xl">
              Track doctor consultation notes, active chronic conditions, prescribed medications, and upcoming
              appointment reminders across all your healthcare providers.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setShowConsultModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-emerald-400 text-[#071410] font-bold text-xs sm:text-sm hover:bg-emerald-300 transition-all shadow-md shadow-emerald-400/20 hover:scale-[1.02]"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              Add Consultation & Prescriptions
            </button>
            <button
              onClick={() => setShowDiseaseModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-[#0d2a20] text-emerald-200 border border-emerald-500/30 font-semibold text-xs sm:text-sm hover:bg-[#12382b] transition-all"
            >
              <Activity className="w-4 h-4 text-emerald-400" />
              Add Disease
            </button>
            <button
              onClick={() => setShowFollowupModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-[#0d2a20] text-emerald-200 border border-emerald-500/30 font-semibold text-xs sm:text-sm hover:bg-[#12382b] transition-all"
            >
              <CalendarPlus className="w-4 h-4 text-emerald-400" />
              Schedule Next Visit
            </button>
          </div>
        </div>

        {/* Quick KPI stats row */}
        <div className="grid grid-cols-3 gap-4 pt-6 border-t border-emerald-900/40 mt-6">
          <div className="bg-[#051610]/80 rounded-xl p-3 border border-emerald-500/30 text-center">
            <span className="block text-[11px] uppercase tracking-wider text-emerald-400/70 font-semibold">
              Total Consultations
            </span>
            <span className="text-2xl font-black text-white">{encounters.length}</span>
          </div>
          <div className="bg-[#051610]/80 rounded-xl p-3 border border-emerald-500/30 text-center">
            <span className="block text-[11px] uppercase tracking-wider text-emerald-400/70 font-semibold">
              Diagnosed Conditions
            </span>
            <span className="text-2xl font-black text-emerald-300">{diagnoses.length}</span>
          </div>
          <div className="bg-[#051610]/80 rounded-xl p-3 border border-emerald-500/30 text-center">
            <span className="block text-[11px] uppercase tracking-wider text-emerald-400/70 font-semibold">
              Upcoming Follow-ups
            </span>
            <span className="text-2xl font-black text-teal-300">
              {appointments.filter((a) => a.status === "upcoming").length}
            </span>
          </div>
        </div>
      </div>

      {statusMsg && (
        <div
          className={`p-4 rounded-xl flex items-center gap-3 text-sm font-medium border ${
            statusMsg.type === "success"
              ? "bg-emerald-950/60 text-emerald-200 border-emerald-500/40"
              : "bg-rose-950/60 text-rose-200 border-rose-500/40"
          }`}
        >
          {statusMsg.type === "success" ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0" />
          )}
          {statusMsg.text}
        </div>
      )}

      {/* Navigation Tabs & Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-2 border-b border-emerald-900/40">
        <div className="flex items-center gap-2 p-1 bg-[#061711] rounded-xl border border-emerald-500/30 w-full sm:w-auto">
          <button
            onClick={() => setActiveTab("consultations")}
            className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all flex items-center gap-2 flex-1 sm:flex-initial justify-center ${
              activeTab === "consultations"
                ? "bg-emerald-400 text-[#071410] shadow-md shadow-emerald-400/20"
                : "text-emerald-300/70 hover:text-white"
            }`}
          >
            <Stethoscope className="w-4 h-4" />
            Doctor Consultations ({encounters.length})
          </button>
          <button
            onClick={() => setActiveTab("diseases")}
            className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all flex items-center gap-2 flex-1 sm:flex-initial justify-center ${
              activeTab === "diseases"
                ? "bg-emerald-400 text-[#071410] shadow-md shadow-emerald-400/20"
                : "text-emerald-300/70 hover:text-white"
            }`}
          >
            <Activity className="w-4 h-4" />
            Diagnoses & Diseases ({diagnoses.length})
          </button>
          <button
            onClick={() => setActiveTab("followups")}
            className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all flex items-center gap-2 flex-1 sm:flex-initial justify-center ${
              activeTab === "followups"
                ? "bg-emerald-400 text-[#071410] shadow-md shadow-emerald-400/20"
                : "text-emerald-300/70 hover:text-white"
            }`}
          >
            <CalendarCheck className="w-4 h-4" />
            Next Visits & Reminders ({appointments.filter((a) => a.status === "upcoming").length})
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-emerald-400/60" />
          <input
            type="text"
            placeholder="Search doctor, disease, clinic..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-[#06140f] border border-emerald-500/30 text-white text-xs sm:text-sm focus:outline-none focus:border-emerald-400"
          />
        </div>
      </div>

      {/* TAB 1: Doctor Consultations */}
      {activeTab === "consultations" && (
        <div className="space-y-6">
          {filteredEncounters.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-[#091b15]/70 border border-dashed border-emerald-500/30 space-y-3">
              <Stethoscope className="w-10 h-10 text-emerald-400/40 mx-auto" />
              <p className="text-emerald-300/80 font-medium text-sm">No consultation records match your filter.</p>
              <button
                onClick={() => setShowConsultModal(true)}
                className="px-4 py-2 rounded-lg bg-emerald-400 text-[#071410] font-bold text-xs"
              >
                Record Your First Doctor Consultation
              </button>
            </div>
          ) : (
            filteredEncounters.map((enc) => (
              <div
                key={enc.id}
                className="rounded-2xl bg-[#091b15]/95 border border-emerald-500/30 p-6 shadow-xl space-y-5 transition-all hover:border-emerald-400/50"
              >
                {/* Consultation Card Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-emerald-900/40">
                  <div className="flex items-start gap-3.5">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-400/20 to-teal-600/30 border border-emerald-400/40 flex items-center justify-center text-emerald-300 flex-shrink-0">
                      <Stethoscope className="w-6 h-6 stroke-[2.2]" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-white flex items-center gap-2">
                        {enc.doctor_name || "Doctor Consultation"}
                        <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                          {enc.kind}
                        </span>
                      </h2>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-emerald-300/70 mt-1">
                        <span className="flex items-center gap-1 font-medium">
                          <Building className="w-3.5 h-3.5 text-emerald-400" />
                          {enc.hospital || "Medical Center"}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1 font-mono text-emerald-400">
                          <Calendar className="w-3.5 h-3.5" />
                          {new Date(enc.start_date).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Next Visit Pill */}
                  {enc.next_visit_date && (
                    <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-teal-500/15 border border-teal-400/40 text-teal-200 text-xs font-semibold self-start sm:self-center">
                      <CalendarCheck className="w-4 h-4 text-teal-400" />
                      Next Visit: {enc.next_visit_date}
                    </div>
                  )}
                </div>

                {/* Reason & Diagnoses */}
                <div className="space-y-3">
                  <div>
                    <span className="text-[11px] uppercase tracking-wider text-emerald-400/70 font-bold block mb-1">
                      Reason for Consultation / Chief Complaint
                    </span>
                    <p className="text-sm font-semibold text-emerald-100">{enc.reason || "General review"}</p>
                  </div>

                  {/* Diagnoses chips */}
                  {enc.diagnoses && enc.diagnoses.length > 0 && (
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <span className="text-xs text-emerald-400/70 font-semibold mr-1 flex items-center gap-1">
                        <Tag className="w-3.5 h-3.5" />
                        Diagnoses:
                      </span>
                      {enc.diagnoses.map((d, i) => (
                        <span
                          key={i}
                          className="px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-xs font-bold"
                        >
                          {d}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Clinical Notes */}
                  {enc.notes && (
                    <div className="p-4 rounded-xl bg-[#06140f] border border-emerald-500/20 text-xs sm:text-sm text-emerald-100/90 leading-relaxed">
                      <span className="block text-[11px] uppercase tracking-wider text-emerald-400/70 font-bold mb-1">
                        Doctor's Clinical Notes & Observations
                      </span>
                      {enc.notes}
                    </div>
                  )}
                </div>

                {/* Prescribed Medicines Section */}
                {enc.prescriptions && enc.prescriptions.length > 0 && (
                  <div className="pt-2 space-y-3">
                    <span className="text-[11px] uppercase tracking-wider text-teal-400/80 font-bold flex items-center gap-1.5">
                      <Pill className="w-4 h-4 text-teal-400" />
                      Medicines Prescribed in this Visit ({enc.prescriptions.length})
                    </span>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {enc.prescriptions.map((rx, idx) => (
                        <div
                          key={idx}
                          className="p-3.5 rounded-xl bg-[#071913] border border-teal-500/30 flex items-start justify-between gap-3 shadow-sm"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold text-white">{rx.name}</span>
                              {rx.dosage && (
                                <span className="text-xs font-mono px-2 py-0.5 rounded bg-teal-500/20 text-teal-300 font-semibold">
                                  {rx.dosage}
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-emerald-300/80 font-medium">
                              Schedule: <span className="font-semibold text-white">{rx.frequency}</span>
                              {rx.duration && ` • Duration: ${rx.duration}`}
                            </div>
                            {rx.instructions && (
                              <p className="text-[11px] text-emerald-400/70 italic mt-0.5">
                                Instructions: {rx.instructions}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* TAB 2: Diagnoses & Diseases */}
      {activeTab === "diseases" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between pb-2">
            <div>
              <h2 className="text-lg font-bold text-white">Chronic Conditions & Diagnoses</h2>
              <p className="text-xs text-emerald-300/70">
                Structured clinical conditions mapped to canonical medical nomenclature.
              </p>
            </div>
            <button
              onClick={() => setShowDiseaseModal(true)}
              className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl bg-emerald-400 text-[#071410] hover:bg-emerald-300 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Condition
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredDiagnoses.map((diag) => (
              <div
                key={diag.id}
                className="rounded-2xl bg-[#091b15]/95 border border-emerald-500/30 p-5 shadow-xl space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-base font-bold text-white">{diag.name_as_written}</h3>
                    <span className="text-xs font-mono text-emerald-400/80 block mt-0.5">
                      Canonical: {diag.name_canonical}
                    </span>
                  </div>
                  <span
                    className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-full border ${
                      diag.status === "active"
                        ? "bg-rose-500/15 text-rose-300 border-rose-500/30"
                        : diag.status === "monitored"
                        ? "bg-amber-500/15 text-amber-300 border-amber-500/30"
                        : "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                    }`}
                  >
                    {diag.status || "active"}
                  </span>
                </div>

                <div className="text-xs text-emerald-300/70 space-y-1">
                  {diag.diagnosed_date && (
                    <div className="flex items-center gap-1.5 font-mono">
                      <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                      Diagnosed Date: {diag.diagnosed_date}
                    </div>
                  )}
                  {diag.doctor_name && (
                    <div className="flex items-center gap-1.5">
                      <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                      Diagnosing Doctor: {diag.doctor_name} {diag.hospital && `(${diag.hospital})`}
                    </div>
                  )}
                </div>

                {diag.notes && (
                  <p className="p-3 rounded-xl bg-[#06140f] border border-emerald-500/20 text-xs text-emerald-200/90 leading-relaxed">
                    {diag.notes}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: Next Visits & Reminders */}
      {activeTab === "followups" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between pb-2">
            <div>
              <h2 className="text-lg font-bold text-white">Upcoming Doctor Appointments & Reminders</h2>
              <p className="text-xs text-emerald-300/70">
                Never miss a crucial routine checkup, titration review, or repeat lab test.
              </p>
            </div>
            <button
              onClick={() => setShowFollowupModal(true)}
              className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl bg-emerald-400 text-[#071410] hover:bg-emerald-300 transition-colors"
            >
              <CalendarPlus className="w-3.5 h-3.5" />
              Schedule Next Visit
            </button>
          </div>

          <div className="space-y-4">
            {appointments.length === 0 ? (
              <div className="p-12 text-center rounded-2xl bg-[#091b15]/70 border border-dashed border-emerald-500/30">
                <CalendarCheck className="w-10 h-10 text-emerald-400/40 mx-auto mb-2" />
                <p className="text-emerald-300/80 font-medium text-sm">
                  No upcoming appointments scheduled at this time.
                </p>
              </div>
            ) : (
              appointments.map((appt) => {
                const days = calculateDaysUntil(appt.scheduled_date);
                const isUpcoming = appt.status === "upcoming";

                return (
                  <div
                    key={appt.id}
                    className={`rounded-2xl border p-5 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all ${
                      isUpcoming
                        ? "bg-[#091b15]/95 border-emerald-500/40 hover:border-emerald-400/60"
                        : "bg-[#06140f]/80 border-emerald-900/30 opacity-70"
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      {/* Big Calendar Date Box */}
                      <div className="w-16 h-16 rounded-xl bg-[#061811] border border-teal-500/40 flex flex-col items-center justify-center text-center flex-shrink-0 shadow-inner">
                        <span className="text-[10px] uppercase font-bold text-teal-400">
                          {new Date(appt.scheduled_date).toLocaleString("en-US", { month: "short" })}
                        </span>
                        <span className="text-2xl font-black text-white leading-none">
                          {new Date(appt.scheduled_date).getDate()}
                        </span>
                      </div>

                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-base font-bold text-white">{appt.doctor_name}</h3>
                          <span className="text-xs text-emerald-400/70 font-medium">({appt.hospital})</span>
                          {/* Countdown badge */}
                          {isUpcoming && (
                            <span
                              className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                                days <= 3
                                  ? "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                                  : days <= 14
                                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                                  : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                              }`}
                            >
                              {days === 0
                                ? "Today!"
                                : days === 1
                                ? "Tomorrow"
                                : days > 0
                                ? `In ${days} days`
                                : "Past due"}
                            </span>
                          )}
                        </div>

                        <div className="text-xs text-emerald-200 font-semibold">{appt.reason}</div>

                        {appt.instructions && (
                          <p className="text-xs text-emerald-300/70 flex items-center gap-1.5 mt-1">
                            <Bell className="w-3.5 h-3.5 text-teal-400" />
                            Reminder instructions: {appt.instructions}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Status / Quick Action button */}
                    <div className="flex items-center gap-2 self-end sm:self-center">
                      {isUpcoming ? (
                        <button
                          onClick={() => handleUpdateApptStatus(appt.id, "completed")}
                          className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 transition-colors"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          Mark Completed
                        </button>
                      ) : (
                        <span className="text-xs font-medium text-emerald-400/60 uppercase">Completed</span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 1: ADD CONSULTATION & MEDICINES & NEXT VISIT */}
      {/* ======================================================== */}
      {showConsultModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#091b15] border border-emerald-500/40 rounded-2xl max-w-2xl w-full p-6 space-y-6 my-8 max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-emerald-900/40">
              <div className="flex items-center gap-2">
                <Stethoscope className="w-5 h-5 text-emerald-400" />
                <h3 className="text-lg font-bold text-white">Record Doctor Consultation</h3>
              </div>
              <button
                onClick={() => setShowConsultModal(false)}
                className="text-emerald-400/60 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveConsultation} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-emerald-200 mb-1">Doctor Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Dr. Priya Patel"
                    value={docName}
                    onChange={(e) => setDocName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#06140f] border border-emerald-500/30 text-white text-xs focus:outline-none focus:border-emerald-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-emerald-200 mb-1">Hospital / Clinic</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Metro General Hospital"
                    value={hospital}
                    onChange={(e) => setHospital(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#06140f] border border-emerald-500/30 text-white text-xs focus:outline-none focus:border-emerald-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-emerald-200 mb-1">Consultation Date</label>
                  <input
                    type="date"
                    required
                    value={visitDate}
                    onChange={(e) => setVisitDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#06140f] border border-emerald-500/30 text-white text-xs focus:outline-none focus:border-emerald-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-emerald-200 mb-1">Visit Type</label>
                  <select
                    value={visitKind}
                    onChange={(e: any) => setVisitKind(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#06140f] border border-emerald-500/30 text-white text-xs focus:outline-none focus:border-emerald-400"
                  >
                    <option value="consultation">Consultation</option>
                    <option value="visit">Outpatient Visit</option>
                    <option value="follow_up">Routine Follow-up</option>
                    <option value="admission">Inpatient Admission</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-emerald-200 mb-1">
                  Reason for Visit / Chief Complaint
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Quarterly Diabetes & BP titration review"
                  value={visitReason}
                  onChange={(e) => setVisitReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#06140f] border border-emerald-500/30 text-white text-xs focus:outline-none focus:border-emerald-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-emerald-200 mb-1">
                  Diagnoses (Comma-separated)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Type 2 Diabetes Mellitus, Essential Hypertension"
                  value={diagInput}
                  onChange={(e) => setDiagInput(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#06140f] border border-emerald-500/30 text-white text-xs focus:outline-none focus:border-emerald-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-emerald-200 mb-1">
                  Doctor's Consultation Notes & Advice
                </label>
                <textarea
                  rows={3}
                  placeholder="Clinical observations, dosage titration advice, diet and exercise instructions..."
                  value={visitNotes}
                  onChange={(e) => setVisitNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#06140f] border border-emerald-500/30 text-white text-xs focus:outline-none focus:border-emerald-400"
                />
              </div>

              {/* Multi-Prescription Builder */}
              <div className="p-4 rounded-xl bg-[#06140f] border border-teal-500/30 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-teal-300 flex items-center gap-1.5 uppercase tracking-wider">
                    <Pill className="w-4 h-4 text-teal-400" />
                    Prescribed Medicines
                  </span>
                  <button
                    type="button"
                    onClick={handleAddPrescriptionRow}
                    className="text-xs font-semibold text-teal-300 hover:text-white flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Another Medicine
                  </button>
                </div>

                {prescriptions.map((rx, idx) => (
                  <div key={idx} className="p-3 rounded-lg bg-[#081e15] border border-emerald-500/20 space-y-2">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <input
                        type="text"
                        placeholder="Medicine name (e.g. Metformin)"
                        value={rx.name}
                        onChange={(e) => handlePrescriptionChange(idx, "name", e.target.value)}
                        className="px-2.5 py-1.5 rounded-lg bg-[#05140e] border border-emerald-500/30 text-white text-xs"
                      />
                      <input
                        type="text"
                        placeholder="Dosage (e.g. 500 mg)"
                        value={rx.dosage}
                        onChange={(e) => handlePrescriptionChange(idx, "dosage", e.target.value)}
                        className="px-2.5 py-1.5 rounded-lg bg-[#05140e] border border-emerald-500/30 text-white text-xs"
                      />
                      <div className="flex items-center gap-1">
                        <input
                          type="text"
                          placeholder="Frequency (e.g. 1-0-1 After food)"
                          value={rx.frequency}
                          onChange={(e) => handlePrescriptionChange(idx, "frequency", e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-lg bg-[#05140e] border border-emerald-500/30 text-white text-xs"
                        />
                        {prescriptions.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemovePrescriptionRow(idx)}
                            className="p-1 text-rose-400 hover:bg-rose-500/20 rounded"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Next Doctor Visit Scheduler Inside Consultation */}
              <div className="p-4 rounded-xl bg-[#06140f] border border-emerald-500/30 space-y-3">
                <span className="text-xs font-bold text-emerald-300 flex items-center gap-1.5 uppercase tracking-wider">
                  <CalendarPlus className="w-4 h-4 text-emerald-400" />
                  Next Doctor Visit / Follow-up Scheduler
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] text-emerald-300 mb-1 font-medium">
                      Next Follow-up Date
                    </label>
                    <input
                      type="date"
                      value={nextVisitDate}
                      onChange={(e) => setNextVisitDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-[#081e15] border border-emerald-500/30 text-white text-xs focus:outline-none focus:border-emerald-400"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-emerald-300 mb-1 font-medium">
                      Follow-up Agenda / Instructions
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Repeat Fasting blood glucose & HbA1c"
                      value={nextVisitNotes}
                      onChange={(e) => setNextVisitNotes(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-[#081e15] border border-emerald-500/30 text-white text-xs focus:outline-none focus:border-emerald-400"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowConsultModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-emerald-300/70 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-emerald-400 text-[#071410] font-bold text-xs hover:bg-emerald-300 shadow-lg shadow-emerald-400/20"
                >
                  Save Consultation Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 2: ADD DISEASE / DIAGNOSIS */}
      {/* ======================================================== */}
      {showDiseaseModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#091b15] border border-emerald-500/40 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-emerald-900/40">
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-bold text-white">Add Condition / Diagnosis</h3>
              </div>
              <button
                onClick={() => setShowDiseaseModal(false)}
                className="text-emerald-400/60 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveDisease} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-emerald-200 mb-1">
                  Disease Name (As written)
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Type 2 Diabetes Mellitus"
                  value={diseaseName}
                  onChange={(e) => setDiseaseName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#06140f] border border-emerald-500/30 text-white text-xs focus:outline-none focus:border-emerald-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-emerald-200 mb-1">Canonical Standard Name</label>
                <input
                  type="text"
                  placeholder="e.g. Type 2 Diabetes Mellitus"
                  value={diseaseCanonical}
                  onChange={(e) => setDiseaseCanonical(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#06140f] border border-emerald-500/30 text-white text-xs focus:outline-none focus:border-emerald-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-emerald-200 mb-1">Date Diagnosed</label>
                  <input
                    type="date"
                    value={diseaseDate}
                    onChange={(e) => setDiseaseDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#06140f] border border-emerald-500/30 text-white text-xs focus:outline-none focus:border-emerald-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-emerald-200 mb-1">Status</label>
                  <select
                    value={diseaseStatus}
                    onChange={(e: any) => setDiseaseStatus(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#06140f] border border-emerald-500/30 text-white text-xs focus:outline-none focus:border-emerald-400"
                  >
                    <option value="active">Active</option>
                    <option value="monitored">Monitored</option>
                    <option value="resolved">Resolved</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-emerald-200 mb-1">Diagnosing Doctor</label>
                <input
                  type="text"
                  placeholder="Dr. Priya Patel"
                  value={diseaseDoctor}
                  onChange={(e) => setDiseaseDoctor(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#06140f] border border-emerald-500/30 text-white text-xs focus:outline-none focus:border-emerald-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-emerald-200 mb-1">Clinical Notes</label>
                <textarea
                  rows={2}
                  placeholder="Severity, staging, or monitoring notes..."
                  value={diseaseNotes}
                  onChange={(e) => setDiseaseNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#06140f] border border-emerald-500/30 text-white text-xs focus:outline-none focus:border-emerald-400"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowDiseaseModal(false)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-emerald-300/70 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-400 text-[#071410] font-bold text-xs hover:bg-emerald-300"
                >
                  Save Diagnosis
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 3: SCHEDULE NEXT VISIT / FOLLOW-UP */}
      {/* ======================================================== */}
      {showFollowupModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#091b15] border border-emerald-500/40 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-emerald-900/40">
              <div className="flex items-center gap-2">
                <CalendarPlus className="w-5 h-5 text-teal-400" />
                <h3 className="text-base font-bold text-white">Schedule Next Doctor Visit</h3>
              </div>
              <button
                onClick={() => setShowFollowupModal(false)}
                className="text-emerald-400/60 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveFollowup} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-emerald-200 mb-1">Doctor Name</label>
                <input
                  type="text"
                  required
                  placeholder="Dr. Priya Patel"
                  value={apptDoc}
                  onChange={(e) => setApptDoc(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#06140f] border border-emerald-500/30 text-white text-xs focus:outline-none focus:border-teal-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-emerald-200 mb-1">Hospital / Clinic</label>
                <input
                  type="text"
                  placeholder="Metro General Hospital"
                  value={apptHospital}
                  onChange={(e) => setApptHospital(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#06140f] border border-emerald-500/30 text-white text-xs focus:outline-none focus:border-teal-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-emerald-200 mb-1">Date</label>
                  <input
                    type="date"
                    required
                    value={apptDate}
                    onChange={(e) => setApptDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#06140f] border border-emerald-500/30 text-white text-xs focus:outline-none focus:border-teal-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-emerald-200 mb-1">Time</label>
                  <input
                    type="text"
                    placeholder="10:30 AM"
                    value={apptTime}
                    onChange={(e) => setApptTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#06140f] border border-emerald-500/30 text-white text-xs focus:outline-none focus:border-teal-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-emerald-200 mb-1">Reason / Purpose</label>
                <input
                  type="text"
                  placeholder="Follow-up HbA1c review & BP check"
                  value={apptReason}
                  onChange={(e) => setApptReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#06140f] border border-emerald-500/30 text-white text-xs focus:outline-none focus:border-teal-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-emerald-200 mb-1">
                  Preparation / Lab Reminders
                </label>
                <input
                  type="text"
                  placeholder="e.g. 12-hour fasting prior to blood draw"
                  value={apptInstructions}
                  onChange={(e) => setApptInstructions(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#06140f] border border-emerald-500/30 text-white text-xs focus:outline-none focus:border-teal-400"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowFollowupModal(false)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-emerald-300/70 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-teal-400 text-[#071410] font-bold text-xs hover:bg-teal-300"
                >
                  Schedule Appointment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
