"use client";

import { useState } from "react";
import { AlertOctagon, Search, ShieldAlert, CheckCircle, Clock, Send, AlertTriangle, FileText, UserCheck, Stethoscope, Lock, Mail } from "lucide-react";

export default function EmergencyPage() {
  const [identifier, setIdentifier] = useState("");
  const [unableToConsent, setUnableToConsent] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [basicRecord, setBasicRecord] = useState<any | null>(null);

  // Full Access Request state
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestReason, setRequestReason] = useState("Unconscious patient presenting in ER requiring emergency intervention.");
  const [isSubmittingRequest, setIsSubmittingRequest] = useState(false);
  const [requestStatus, setRequestStatus] = useState<any | null>(null);
  const [requestError, setRequestError] = useState<string | null>(null);

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSearching(true);
    setError(null);
    setBasicRecord(null);
    setRequestStatus(null);

    if (!unableToConsent) {
      setError("You MUST verify that the patient is unable to provide consent before proceeding with an emergency lookup.");
      setIsSearching(false);
      return;
    }

    try {
      const res = await fetch("/api/emergency/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier: identifier.trim(),
          unable_to_consent: unableToConsent,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "No emergency record available");
      }

      setBasicRecord(data.data);
    } catch (err: any) {
      setError(err.message || "No emergency record available");
    } finally {
      setIsSearching(false);
    }
  };

  const handleRequestFullAccess = async () => {
    if (!basicRecord?.patient?.patient_id) return;
    setIsSubmittingRequest(true);
    setRequestError(null);

    try {
      const res = await fetch("/api/emergency/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patient_id: basicRecord.patient.patient_id,
          reason: requestReason,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to submit request");
      }

      setRequestStatus(data);
      setShowRequestModal(false);
    } catch (err: any) {
      setRequestError(err.message);
    } finally {
      setIsSubmittingRequest(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 pb-16">
      {/* Header */}
      <header className="bg-gradient-to-r from-red-900 via-rose-950 to-slate-950 text-white py-10 px-4 sm:px-6 border-b border-red-800/40">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/20 text-red-300 text-xs font-bold mb-3 border border-red-500/30 uppercase tracking-wider">
              <AlertOctagon className="w-4 h-4 text-red-400" /> ER Clinical Emergency Portal
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Emergency Doctor Lookup
            </h1>
            <p className="text-slate-300 text-sm mt-1">
              Authorized emergency medical access for unconsented patients. All lookups are strictly audited and logged.
            </p>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 mt-8 space-y-8">
        {/* Search Form */}
        <div className="bg-slate-800/80 rounded-2xl p-6 sm:p-8 border border-slate-700/60 shadow-xl backdrop-blur-md">
          <form onSubmit={handleLookup} className="space-y-6">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                Patient Health ID or Phone Number
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="Enter 12-char Health ID (e.g. MED987654321) or Phone (+91...)"
                  className="w-full pl-12 pr-4 py-3.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none font-mono"
                  required
                />
                <Search className="w-5 h-5 text-slate-400 absolute left-4 top-4" />
              </div>
            </div>

            {/* Mandatory Consent Checkbox */}
            <div className="p-4 rounded-xl bg-red-950/40 border border-red-800/50 flex items-start gap-3">
              <input
                type="checkbox"
                id="unableToConsent"
                checked={unableToConsent}
                onChange={(e) => setUnableToConsent(e.target.checked)}
                className="mt-1 w-4 h-4 text-red-600 rounded border-red-800 bg-slate-900 focus:ring-red-500"
              />
              <label htmlFor="unableToConsent" className="text-xs text-red-200 cursor-pointer leading-relaxed">
                <strong className="text-white block font-semibold mb-0.5">
                  I confirm the patient is unable to provide consent (Mandatory Legal Attestation)
                </strong>
                By checking this box, I attest under medical regulatory policy that this patient is physically or mentally incapacitated and requires urgent medical access.
              </label>
            </div>

            {error && (
              <div className="p-4 bg-red-950/80 border border-red-500/50 rounded-xl text-red-200 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isSearching || !unableToConsent}
              className="w-full py-3.5 px-6 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-sm shadow-lg shadow-red-600/30 transition-all flex items-center justify-center gap-2 disabled:opacity-40"
            >
              {isSearching ? (
                <>Lookup Emergency Record...</>
              ) : (
                <>
                  <ShieldAlert className="w-4 h-4" /> Perform Emergency Basic Lookup
                </>
              )}
            </button>
          </form>
        </div>

        {/* Basic Emergency Result Display */}
        {basicRecord && (
          <div className="bg-slate-800 rounded-2xl p-6 sm:p-8 border border-slate-700 shadow-2xl space-y-6 animate-in fade-in slide-in-from-bottom-4">
            {/* Masked Profile Header */}
            <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-slate-700">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-red-950 text-red-400 font-extrabold text-2xl rounded-2xl flex items-center justify-center border border-red-800">
                  {basicRecord.patient.initials}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    Patient Initials: {basicRecord.patient.initials}
                    <span className="text-xs px-2.5 py-0.5 bg-slate-700 text-slate-300 rounded-full font-mono font-normal">
                      Masked Identity
                    </span>
                  </h3>
                  <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
                    <span>Age: <strong className="text-white">{basicRecord.patient.age} yrs</strong></span>
                    <span>•</span>
                    <span>Sex: <strong className="text-white capitalize">{basicRecord.patient.sex}</strong></span>
                    <span>•</span>
                    <span>Health ID: <strong className="font-mono text-slate-300">{basicRecord.patient.health_id}</strong></span>
                  </div>
                </div>
              </div>

              {/* Request Full Access Button */}
              <button
                onClick={() => setShowRequestModal(true)}
                className="px-5 py-3 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-slate-950 font-bold text-xs shadow-lg shadow-amber-600/20 transition-all flex items-center gap-2"
              >
                <Lock className="w-4 h-4" /> Request Full Record Access
              </button>
            </div>

            {/* Request Status Banner if submitted */}
            {requestStatus && (
              <div className="bg-amber-950/80 border border-amber-500/40 rounded-xl p-4 text-amber-200 text-xs flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <Clock className="w-5 h-5 text-amber-400 shrink-0 animate-pulse" />
                  <div>
                    <strong className="text-white block font-semibold">Out-of-Band Approval Request Sent</strong>
                    <span>Single-use approval links dispatched to patient & trusted contacts. Waiting for Accept/Decline...</span>
                  </div>
                </div>
                <a
                  href="/demo-inbox"
                  className="px-3 py-1.5 bg-amber-500 text-slate-950 font-bold rounded-lg hover:bg-amber-400 transition-all shrink-0"
                >
                  View Demo Inbox →
                </a>
              </div>
            )}

            {/* Basic Info Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Blood Group */}
              {basicRecord.blood_group && (
                <div className="bg-slate-900/80 p-5 rounded-xl border border-slate-700/80">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">
                    Blood Group
                  </span>
                  <span className="text-3xl font-extrabold text-red-500">
                    {basicRecord.blood_group}
                  </span>
                </div>
              )}

              {/* Allergies */}
              {basicRecord.allergies && (
                <div className="bg-slate-900/80 p-5 rounded-xl border border-slate-700/80">
                  <span className="text-xs font-semibold text-red-400 uppercase tracking-wider block mb-2 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" /> Emergency Allergies
                  </span>
                  <ul className="space-y-2">
                    {basicRecord.allergies.map((a: any, idx: number) => (
                      <li key={idx} className="text-xs bg-red-950/40 border border-red-900/60 p-2.5 rounded-lg">
                        <strong className="text-white">{a.substance}</strong>
                        <span className="block text-red-300 text-[11px] mt-0.5">{a.reaction}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Conditions */}
              {basicRecord.conditions && (
                <div className="bg-slate-900/80 p-5 rounded-xl border border-slate-700/80">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">
                    Recorded Chronic Conditions
                  </span>
                  <ul className="space-y-2 text-xs">
                    {basicRecord.conditions.map((c: any, idx: number) => (
                      <li key={idx} className="p-2.5 bg-slate-800 rounded-lg text-slate-200">
                        {c.name}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Medications */}
              {basicRecord.medications && (
                <div className="bg-slate-900/80 p-5 rounded-xl border border-slate-700/80">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">
                    Current Active Medicines
                  </span>
                  <ul className="space-y-2 text-xs">
                    {basicRecord.medications.map((m: any, idx: number) => (
                      <li key={idx} className="p-2.5 bg-slate-800 rounded-lg text-slate-200">
                        <strong>{m.name} {m.strength}</strong> - {m.dose} ({m.frequency})
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="text-center text-xs text-slate-500 pt-2 border-t border-slate-800">
              Basic Emergency Lookup hides source prescribers, document IDs, and full details for patient privacy.
            </div>
          </div>
        )}

        {/* Modal: Request Full Access */}
        {showRequestModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in">
            <div className="bg-slate-800 border border-slate-700 rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl">
              <div className="flex justify-between items-center pb-3 border-b border-slate-700">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Lock className="w-5 h-5 text-amber-400" /> Request Full Access
                </h3>
                <button
                  onClick={() => setShowRequestModal(false)}
                  className="text-slate-400 hover:text-white"
                >
                  ✕
                </button>
              </div>

              {requestError && (
                <div className="p-3 bg-red-950 border border-red-700 text-red-200 text-xs rounded-xl">
                  {requestError}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-400 mb-2">
                  Medical Reason for Full Access Request
                </label>
                <textarea
                  rows={3}
                  value={requestReason}
                  onChange={(e) => setRequestReason(e.target.value)}
                  className="w-full p-3 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:ring-2 focus:ring-amber-500 outline-none"
                  required
                />
              </div>

              <div className="p-3 bg-slate-900 border border-slate-700/80 rounded-xl text-xs text-slate-300">
                <p>
                  This will dispatch single-use out-of-band approval links to the patient's email AND all configured trusted contacts.
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowRequestModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-600 text-slate-300 text-xs font-semibold hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRequestFullAccess}
                  disabled={isSubmittingRequest}
                  className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isSubmittingRequest ? "Sending Requests..." : "Send Out-of-Band Request"}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-16 text-center text-xs text-slate-500 px-4">
        MediCare is a patient records app, not insurance. Demo with simulated data. Decision support only, not a diagnosis.
      </footer>
    </div>
  );
}
