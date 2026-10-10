"use strict";
"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ShieldAlert,
  Pill,
  HeartPulse,
  Clock,
  CheckCircle2,
  FileText,
  Printer,
  ChevronDown,
  ChevronUp,
  X,
  Plus,
  ExternalLink,
  Info,
  Calendar,
  Building2,
  User,
  FlaskConical,
  BadgeAlert,
} from "lucide-react";
import { TodayCard } from "@/components/adherence/TodayCard";
import { StreakCalendar } from "@/components/adherence/StreakCalendar";
import type {
  ClinicalSummary,
  SummaryMedication,
  SummaryAllergy,
  SummaryCondition,
  SourceReference,
} from "@/lib/types/summary";

interface SafetyFlag {
  id: string;
  category: string;
  severity: "high" | "moderate" | "warning";
  title: string;
  description: string;
  involved_items: string[];
}

interface LabItem {
  id: string;
  test_name: string;
  value_num?: number | null;
  value_text?: string | null;
  unit?: string | null;
  ref_range?: string | null;
  flag?: string | null;
  taken_on?: string | null;
  lab_name?: string | null;
  evidence_text: string;
}

export default function ClinicalSummaryPage() {
  const [summary, setSummary] = useState<ClinicalSummary | null>(null);
  const [labs, setLabs] = useState<LabItem[]>([]);
  const [flags, setFlags] = useState<SafetyFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<
    "all" | "allergies" | "reactions" | "medications" | "conditions" | "labs"
  >("all");
  const [showOtherMeds, setShowOtherMeds] = useState(false);
  const [selectedSource, setSelectedSource] = useState<{
    title: string;
    sources: SourceReference[];
  } | null>(null);

  // Modal for reporting past bad reaction
  const [showAddReactionModal, setShowAddReactionModal] = useState(false);
  const [newSubstance, setNewSubstance] = useState("");
  const [newReaction, setNewReaction] = useState("");
  const [submittingReaction, setSubmittingReaction] = useState(false);
  const [adherenceRefreshKey, setAdherenceRefreshKey] = useState(0);

  const [isPending, startTransition] = useTransition();

  // Load summary and safety rules on mount
  async function loadData() {
    try {
      setLoading(true);
      const [sumRes, rulesRes] = await Promise.all([
        fetch("/api/summary"),
        fetch("/api/rules"),
      ]);

      if (!sumRes.ok) throw new Error("Failed to load clinical summary");
      const sumData = await sumRes.json();
      setSummary(sumData.summary);
      if (sumData.labs) {
        setLabs(sumData.labs);
      }

      if (rulesRes.ok) {
        const rulesData = await rulesRes.json();
        setFlags(rulesData.flags || []);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load clinical data");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  // Handle "I stopped this" / "Undo" toggle
  async function toggleStopped(med: SummaryMedication, stopped: boolean) {
    if (!summary) return;

    // Optimistic UI update
    startTransition(() => {
      setSummary((prev) => {
        if (!prev) return prev;

        const updatedCurrent = [...prev.current_medicines];
        const updatedOther = [...prev.other_medicines];

        if (stopped) {
          const idx = updatedCurrent.findIndex((m) => m.group_key === med.group_key);
          if (idx !== -1) {
            const [item] = updatedCurrent.splice(idx, 1);
            updatedOther.unshift({
              ...item,
              status: "stopped",
              patient_marked_stopped: true,
              stopped_on: new Date().toISOString().split("T")[0],
            });
          }
        } else {
          const idx = updatedOther.findIndex((m) => m.group_key === med.group_key);
          if (idx !== -1) {
            const [item] = updatedOther.splice(idx, 1);
            updatedCurrent.push({
              ...item,
              status: "current",
              patient_marked_stopped: false,
              stopped_on: null,
            });
            updatedCurrent.sort((a, b) => a.display_name.localeCompare(b.display_name));
          }
        }

        return {
          ...prev,
          counts: {
            ...prev.counts,
            current_medicines: updatedCurrent.length,
            other_medicines: updatedOther.length,
          },
          current_medicines: updatedCurrent,
          other_medicines: updatedOther,
        };
      });
    });

    try {
      await fetch("/api/summary", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          medication_id: med.latest_record_id || med.sources[0]?.record_id,
          stopped,
        }),
      });

      // Refresh safety rules to recalculate drug interactions & duplicates
      const rulesRes = await fetch("/api/rules");
      if (rulesRes.ok) {
        const rulesData = await rulesRes.json();
        setFlags(rulesData.flags || []);
      }
    } catch (err) {
      console.error("Failed to persist stop action:", err);
    }
  }

  // Handle reporting a past bad reaction
  async function handleReportReaction(e: React.FormEvent) {
    e.preventDefault();
    if (!newSubstance.trim()) return;

    setSubmittingReaction(true);
    try {
      const res = await fetch("/api/summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          substance: newSubstance,
          reaction: newReaction,
        }),
      });

      if (res.ok) {
        setNewSubstance("");
        setNewReaction("");
        setShowAddReactionModal(false);
        // Refresh full summary and safety rules
        await loadData();
      }
    } catch (err) {
      console.error("Failed to report past bad reaction:", err);
    } finally {
      setSubmittingReaction(false);
    }
  }

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-16 text-center">
        <div className="inline-block w-8 h-8 border-4 border-emerald-400 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-emerald-300 font-medium">Reconciling clinical summary...</p>
        <p className="text-xs text-emerald-400/60 mt-1">Cross-referencing confirmed records across all care facilities</p>
      </div>
    );
  }

  if (error || !summary) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <div className="p-6 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-200">
          <AlertTriangle className="w-10 h-10 text-rose-400 mx-auto mb-3" />
          <h2 className="text-lg font-bold mb-1">Unable to Load Summary</h2>
          <p className="text-sm text-rose-300/80 mb-4">{error || "No data available."}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 rounded-xl bg-rose-500/20 text-rose-200 hover:bg-rose-500/30 text-xs font-semibold"
          >
            Retry Loading
          </button>
        </div>
      </div>
    );
  }

  const patientReactions = summary.allergies.filter((a) => a.is_patient_reported);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Printable Clinical Handoff Header (Visible during Print only) */}
      <div className="hidden print:block border-b-2 border-black pb-4 mb-6 text-black">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-black uppercase tracking-tight">MediCare — Clinical Handoff Record</h1>
            <p className="text-xs font-semibold text-gray-700">One Continuous Medical Summary Across All Facilities</p>
          </div>
          <div className="text-right text-xs">
            <p className="font-bold">Patient: Ramesh Sharma</p>
            <p>Health ID: MED987654321 · Blood Group: B+</p>
            <p>Generated: {new Date().toLocaleDateString("en-US", { dateStyle: "long" })}</p>
          </div>
        </div>
        <div className="mt-2 p-2 bg-gray-100 border border-gray-300 text-[11px] font-mono">
          <strong>Decision Support Notice:</strong> This summary reconciles records across multiple providers. Supports clinical judgment, not a diagnosis.
        </div>
      </div>

      {/* Screen Header Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-emerald-900/40 pb-6 print:hidden">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              One-Page Clinical Summary
            </span>
            <span className="text-xs text-emerald-400/60">
              Updated: {new Date(summary.generated_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Comprehensive Medical Summary
          </h1>
          <p className="text-sm text-emerald-300/70 mt-1">
            Reconciled timeline of allergies, current medicines, and conditions across all care facilities.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setShowAddReactionModal(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 text-xs font-semibold border border-amber-500/30 transition-all shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            Report Bad Reaction
          </button>
          <Link
            href="/timeline"
            className="px-3.5 py-2 rounded-xl border border-emerald-800/60 text-emerald-200 hover:text-white hover:border-emerald-700 text-xs font-medium transition-all"
          >
            Timeline View
          </Link>
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 text-xs font-medium transition-all border border-emerald-500/30"
          >
            <Printer className="w-3.5 h-3.5" />
            Print Handoff
          </button>
        </div>
      </div>

      {/* TODAY'S DOSES (First thing on the patient home page, above the fold) */}
      <div className="print:hidden">
        <TodayCard
          key={`today-card-${adherenceRefreshKey}`}
          onRefreshCalendar={() => setAdherenceRefreshKey((k) => k + 1)}
        />
      </div>

      {/* STREAK CALENDAR (Below the Today card, reached by scrolling) */}
      <div className="print:hidden">
        <StreakCalendar
          key={`streak-calendar-${adherenceRefreshKey}`}
          onRefreshToday={() => setAdherenceRefreshKey((k) => k + 1)}
        />
      </div>

      {/* Safety Alerts Banner (Always worded 'Needs doctor review') */}
      {flags.length > 0 && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5 space-y-3 print:border-black print:bg-white print:p-3">
          <div className="flex items-center gap-2 text-amber-300 font-semibold text-sm print:text-black">
            <ShieldAlert className="w-5 h-5 text-amber-400 print:text-black" />
            <span>Safety Alerts & Cross-Facility Conflicts ({flags.length})</span>
            <span className="text-[11px] font-normal text-amber-400/70 ml-auto print:text-gray-600">
              Deterministic Rules · Needs Doctor Review
            </span>
          </div>
          <div className="grid gap-2.5">
            {flags.map((flag) => (
              <div
                key={flag.id}
                className="p-3.5 rounded-xl bg-[#091813]/80 border border-amber-500/20 text-xs text-amber-200/90 flex flex-col sm:flex-row sm:items-center justify-between gap-2 print:border-gray-400 print:bg-gray-50 print:text-black"
              >
                <div>
                  <span className="font-bold text-amber-300 print:text-black">{flag.title}:</span>{" "}
                  <span>{flag.description}</span>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30 print:border-gray-500 print:text-black">
                    {flag.severity}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Category Tabs (Screen Only) */}
      <div className="flex items-center gap-2 border-b border-emerald-900/40 pb-2 overflow-x-auto print:hidden">
        <button
          onClick={() => setSelectedCategory("all")}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
            selectedCategory === "all"
              ? "bg-emerald-400 text-[#071410] font-semibold"
              : "text-emerald-300/70 hover:text-white hover:bg-emerald-950/40"
          }`}
        >
          Overview (All)
        </button>
        <button
          onClick={() => setSelectedCategory("allergies")}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
            selectedCategory === "allergies"
              ? "bg-emerald-400 text-[#071410] font-semibold"
              : "text-emerald-300/70 hover:text-white hover:bg-emerald-950/40"
          }`}
        >
          Allergies ({summary.counts.allergies})
        </button>
        <button
          onClick={() => setSelectedCategory("reactions")}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
            selectedCategory === "reactions"
              ? "bg-emerald-400 text-[#071410] font-semibold"
              : "text-emerald-300/70 hover:text-white hover:bg-emerald-950/40"
          }`}
        >
          Patient Reactions ({patientReactions.length})
        </button>
        <button
          onClick={() => setSelectedCategory("medications")}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
            selectedCategory === "medications"
              ? "bg-emerald-400 text-[#071410] font-semibold"
              : "text-emerald-300/70 hover:text-white hover:bg-emerald-950/40"
          }`}
        >
          Current Medicines ({summary.counts.current_medicines})
        </button>
        <button
          onClick={() => setSelectedCategory("conditions")}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
            selectedCategory === "conditions"
              ? "bg-emerald-400 text-[#071410] font-semibold"
              : "text-emerald-300/70 hover:text-white hover:bg-emerald-950/40"
          }`}
        >
          Conditions ({summary.counts.conditions})
        </button>
        <button
          onClick={() => setSelectedCategory("labs")}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
            selectedCategory === "labs"
              ? "bg-emerald-400 text-[#071410] font-semibold"
              : "text-emerald-300/70 hover:text-white hover:bg-emerald-950/40"
          }`}
        >
          Tests & Lab Results ({labs.length})
        </button>
      </div>

      {/* 1. ALLERGIES SECTION (Top & Prominent) */}
      {(selectedCategory === "all" || selectedCategory === "allergies") && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white flex items-center gap-2 print:text-black">
              <ShieldAlert className="w-5 h-5 text-rose-400 print:text-black" />
              Documented Allergies & Bad Reactions
            </h2>
            <span className="text-xs text-rose-300/70 font-medium print:text-gray-700">
              Priority Clinical Safety
            </span>
          </div>

          {summary.allergies.length === 0 ? (
            <div className="p-4 rounded-xl border border-emerald-800/40 bg-[#091a14] text-xs text-emerald-300/80 print:border-gray-400 print:text-black">
              No allergies found in your uploaded records.
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {summary.allergies.map((allergy, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-xl border border-rose-500/30 bg-rose-500/5 hover:border-rose-500/50 transition-all flex flex-col justify-between print:border-gray-400 print:bg-white print:p-2"
                >
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-white capitalize print:text-black">
                        {allergy.substance}
                      </span>
                      {allergy.is_patient_reported && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-amber-500/20 text-amber-300 border border-amber-500/30 print:border-black print:text-black">
                          Patient Reported
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-rose-200/90 print:text-black">
                      <span className="font-semibold text-rose-300 print:text-black">Reactions:</span>{" "}
                      {allergy.reactions.length > 0 ? allergy.reactions.join(", ") : "Adverse reaction"}
                    </p>
                  </div>

                  {allergy.sources.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-rose-500/20 flex items-center justify-between print:hidden">
                      <span className="text-[11px] text-emerald-400/60">
                        {allergy.sources.length} clinical {allergy.sources.length === 1 ? "source" : "sources"}
                      </span>
                      <button
                        onClick={() =>
                          setSelectedSource({
                            title: `Allergy: ${allergy.substance}`,
                            sources: allergy.sources,
                          })
                        }
                        className="inline-flex items-center gap-1 text-[11px] text-emerald-300 hover:text-white underline font-medium"
                      >
                        <FileText className="w-3 h-3" />
                        Verify Source
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* 2. PATIENT REACTIONS DEDICATED VIEW */}
      {selectedCategory === "reactions" && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <BadgeAlert className="w-5 h-5 text-amber-400" />
                Patient-Reported Past Reactions
              </h2>
              <p className="text-xs text-emerald-400/70">
                Self-reported drug intolerances used for deterministic safety cross-referencing.
              </p>
            </div>
            <button
              onClick={() => setShowAddReactionModal(true)}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 text-xs font-semibold border border-amber-500/30"
            >
              <Plus className="w-3 h-3" />
              Add Reaction
            </button>
          </div>

          {patientReactions.length === 0 ? (
            <div className="p-6 rounded-xl border border-emerald-800/40 bg-[#091a14] text-center space-y-2">
              <p className="text-xs text-emerald-300">No self-reported bad reactions currently recorded.</p>
              <p className="text-[11px] text-emerald-400/60">
                Have you had a bad reaction to any medicine in the past? Click &quot;Add Reaction&quot; above to log it safely.
              </p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {patientReactions.map((item, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/5 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-white capitalize">{item.substance}</span>
                    <span className="text-[10px] text-amber-400/80 font-mono">Patient Record</span>
                  </div>
                  <p className="text-xs text-amber-200">
                    <strong className="text-amber-300">Reported Symptoms:</strong>{" "}
                    {item.reactions.join(", ") || "Adverse symptom"}
                  </p>
                  <div className="text-[11px] text-emerald-400/60 pt-1 border-t border-amber-500/20">
                    Active in safety cross-reference engine
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* 3. CURRENT MEDICATIONS (90-Day Active Window) */}
      {(selectedCategory === "all" || selectedCategory === "medications") && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2 print:text-black">
                <Pill className="w-5 h-5 text-emerald-400 print:text-black" />
                Current Medications
              </h2>
              <p className="text-xs text-emerald-400/70 print:text-gray-600">
                Active within the last 90 days or ongoing course. Sorted alphabetically.
              </p>
            </div>
            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 print:border-black print:text-black">
              {summary.counts.current_medicines} Active
            </span>
          </div>

          {summary.current_medicines.length === 0 ? (
            <div className="p-4 rounded-xl border border-emerald-800/40 bg-[#091a14] text-xs text-emerald-300/80 print:text-black">
              No active medications recorded within the last 90 days.
            </div>
          ) : (
            <div className="grid gap-3">
              {summary.current_medicines.map((med) => (
                <div
                  key={med.group_key}
                  className="p-4 rounded-xl border border-emerald-800/50 bg-[#091a14]/90 hover:border-emerald-700/60 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 print:border-gray-400 print:bg-white print:p-2.5"
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-base text-white print:text-black">{med.display_name}</span>
                      {med.ingredients.length > 0 && (
                        <span className="text-xs text-emerald-300/70 print:text-gray-600">
                          ({med.ingredients.join(" + ")})
                        </span>
                      )}
                      {med.dose_conflict && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 print:border-black print:text-black">
                          Dose differs across recent prescriptions, please verify
                        </span>
                      )}
                      {med.warnings?.includes("date_in_future") && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30 print:border-black print:text-black">
                          Future prescription date
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-emerald-200/80 pt-1 print:text-black">
                      <div>
                        <span className="text-emerald-400/60 block text-[11px] print:text-gray-600">Strength</span>
                        <span className="font-medium text-white print:text-black">{med.strength || "As prescribed"}</span>
                      </div>
                      <div>
                        <span className="text-emerald-400/60 block text-[11px] print:text-gray-600">Dose / Freq</span>
                        <span className="font-medium text-white print:text-black">
                          {[med.dose, med.frequency].filter(Boolean).join(" ") || "As directed"}
                        </span>
                      </div>
                      <div>
                        <span className="text-emerald-400/60 block text-[11px] print:text-gray-600">Prescribed Date</span>
                        <span className="font-medium text-white print:text-black">{med.prescribed_date || "Recorded"}</span>
                      </div>
                      <div>
                        <span className="text-emerald-400/60 block text-[11px] print:text-gray-600">Prescriber</span>
                        <span className="font-medium text-white truncate block print:text-black">
                          {med.prescriber || "Document record"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 border-t md:border-t-0 pt-3 md:pt-0 border-emerald-900/40 print:hidden">
                    {med.sources.length > 0 && (
                      <button
                        onClick={() =>
                          setSelectedSource({
                            title: `Medication: ${med.display_name}`,
                            sources: med.sources,
                          })
                        }
                        className="px-3 py-1.5 rounded-lg border border-emerald-800/80 bg-emerald-950/40 text-emerald-300 hover:text-white hover:border-emerald-700 text-xs font-medium transition-all flex items-center gap-1"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>Source ({med.sources.length})</span>
                      </button>
                    )}

                    <button
                      disabled={isPending}
                      onClick={() => toggleStopped(med, true)}
                      className="px-3 py-1.5 rounded-lg border border-rose-500/30 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20 text-xs font-medium transition-all"
                    >
                      I stopped this
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Collapsible Other / Non-Current Medicines */}
          <div className="pt-2 print:hidden">
            <button
              onClick={() => setShowOtherMeds(!showOtherMeds)}
              className="flex items-center gap-2 text-xs font-medium text-emerald-400/80 hover:text-emerald-200 transition-colors"
            >
              {showOtherMeds ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              <span>
                {showOtherMeds ? "Hide" : "Show"} past, stopped, or course-ended medicines (
                {summary.counts.other_medicines})
              </span>
            </button>

            {showOtherMeds && (
              <div className="grid gap-2.5 mt-3">
                {summary.other_medicines.length === 0 ? (
                  <p className="text-xs text-emerald-400/60 italic">No past medications recorded.</p>
                ) : (
                  summary.other_medicines.map((med) => (
                    <div
                      key={med.group_key}
                      className="p-3.5 rounded-xl border border-emerald-900/30 bg-[#091a14]/50 opacity-80 hover:opacity-100 transition-opacity flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-white/90">{med.display_name}</span>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider ${
                              med.status === "stopped"
                                ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                                : med.status === "course_ended"
                                ? "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                                : "bg-emerald-900/40 text-emerald-400 border border-emerald-800/40"
                            }`}
                          >
                            {med.status.replace("_", " ")}
                          </span>
                        </div>
                        <p className="text-[11px] text-emerald-400/60 mt-0.5">
                          Prescribed: {med.prescribed_date || "Unknown"}
                          {med.stopped_on ? ` · Stopped on: ${med.stopped_on}` : ""}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        {med.sources.length > 0 && (
                          <button
                            onClick={() =>
                              setSelectedSource({
                                title: `Medication: ${med.display_name}`,
                                sources: med.sources,
                              })
                            }
                            className="text-[11px] text-emerald-300/80 hover:text-white underline"
                          >
                            Source
                          </button>
                        )}
                        {med.status === "stopped" && (
                          <button
                            disabled={isPending}
                            onClick={() => toggleStopped(med, false)}
                            className="px-2.5 py-1 rounded bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 text-[11px] font-medium"
                          >
                            Undo Stop
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </section>
      )}

      {/* 4. CONDITIONS SECTION */}
      {(selectedCategory === "all" || selectedCategory === "conditions") && (
        <section className="space-y-3">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2 print:text-black">
              <HeartPulse className="w-5 h-5 text-purple-400 print:text-black" />
              Recorded Conditions
            </h2>
            <p className="text-xs text-emerald-400/70 print:text-gray-600">
              Conditions recorded in your documents across all consultations.
            </p>
          </div>

          {summary.conditions.length === 0 ? (
            <div className="p-4 rounded-xl border border-emerald-800/40 bg-[#091a14] text-xs text-emerald-300/80 print:text-black">
              No conditions found in your uploaded records.
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {summary.conditions.map((cond, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-xl border border-purple-500/30 bg-purple-500/5 hover:border-purple-500/50 transition-all flex flex-col justify-between print:border-gray-400 print:bg-white print:p-2"
                >
                  <div className="space-y-1.5">
                    <span className="font-bold text-sm text-white block print:text-black">
                      {cond.name_canonical}
                    </span>
                    {cond.names_as_written.length > 0 && (
                      <p className="text-xs text-purple-200/80 print:text-black">
                        <span className="text-purple-400/60 print:text-gray-600">As written:</span>{" "}
                        {cond.names_as_written.join(", ")}
                      </p>
                    )}
                    <div className="flex items-center gap-3 text-xs text-emerald-300/80 pt-1 print:text-black">
                      <span>
                        <strong className="text-emerald-400/70 font-normal print:text-gray-600">First:</strong>{" "}
                        {cond.first_recorded || "Recorded"}
                      </span>
                      <span>
                        <strong className="text-emerald-400/70 font-normal print:text-gray-600">Latest:</strong>{" "}
                        {cond.last_mentioned || "Recent"}
                      </span>
                      <span className="ml-auto text-[11px] text-purple-300/70 print:text-gray-600">
                        {cond.mention_count} mentions
                      </span>
                    </div>
                  </div>

                  {cond.sources.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-purple-500/20 flex items-center justify-between print:hidden">
                      <span className="text-[11px] text-emerald-400/60">
                        {cond.sources.length} clinical citations
                      </span>
                      <button
                        onClick={() =>
                          setSelectedSource({
                            title: `Condition: ${cond.name_canonical}`,
                            sources: cond.sources,
                          })
                        }
                        className="inline-flex items-center gap-1 text-[11px] text-emerald-300 hover:text-white underline font-medium"
                      >
                        <FileText className="w-3 h-3" />
                        Verify Source
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* 5. TESTS & LAB RESULTS CATEGORY VIEW */}
      {(selectedCategory === "all" || selectedCategory === "labs") && labs.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2 print:text-black">
                <FlaskConical className="w-5 h-5 text-teal-400 print:text-black" />
                Tests & Diagnostic Panels
              </h2>
              <p className="text-xs text-emerald-400/70 print:text-gray-600">
                Confirmed diagnostic values across lab facilities with repeat interval monitoring.
              </p>
            </div>
            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 print:border-black print:text-black">
              {labs.length} Tests
            </span>
          </div>

          <div className="grid gap-2.5 sm:grid-cols-2">
            {labs.map((lab) => {
              const isRecent = flags.some(
                (f) => f.category === "retest_interval" && f.involved_items.includes(lab.test_name)
              );
              return (
                <div
                  key={lab.id}
                  className="p-4 rounded-xl border border-teal-500/30 bg-teal-500/5 hover:border-teal-500/50 transition-all space-y-2 print:border-gray-400 print:bg-white print:p-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="text-sm font-bold text-white print:text-black">{lab.test_name}</h4>
                      <p className="text-[11px] text-emerald-400/70 print:text-gray-600">
                        {lab.lab_name || "Diagnostic Lab"} · Taken: {lab.taken_on || "Recent"}
                      </p>
                    </div>
                    {isRecent && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 print:border-black print:text-black">
                        Recent Test
                      </span>
                    )}
                  </div>

                  <div className="p-2.5 rounded-lg bg-[#06140f] border border-emerald-900/40 flex justify-between items-center text-xs print:bg-gray-100 print:text-black">
                    <div>
                      <span className="text-[10px] text-emerald-400/60 block print:text-gray-600">Reported Result</span>
                      <span className="text-base font-extrabold text-white print:text-black">
                        {lab.value_num !== null && lab.value_num !== undefined
                          ? `${lab.value_num} ${lab.unit || ""}`
                          : lab.value_text || "Recorded"}
                      </span>
                    </div>
                    {lab.ref_range && (
                      <div className="text-right">
                        <span className="text-[10px] text-emerald-400/60 block print:text-gray-600">Reference Range</span>
                        <span className="text-xs font-mono text-emerald-200 print:text-black">{lab.ref_range}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Report Bad Reaction Modal */}
      {showAddReactionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#071712] border border-amber-500/40 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-emerald-900/40 pb-3">
              <div className="flex items-center gap-2">
                <BadgeAlert className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-white text-base">Report Past Bad Reaction</h3>
              </div>
              <button
                onClick={() => setShowAddReactionModal(false)}
                className="p-1 rounded-lg text-emerald-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleReportReaction} className="space-y-4 text-xs">
              <div>
                <label className="block text-emerald-300 font-semibold mb-1">
                  Medicine / Substance Name <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Aspirin, Ibuprofen, Penicillin"
                  value={newSubstance}
                  onChange={(e) => setNewSubstance(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#091f17] border border-emerald-800/80 text-white placeholder-emerald-500/50 focus:outline-none focus:border-emerald-400"
                />
              </div>

              <div>
                <label className="block text-emerald-300 font-semibold mb-1">
                  Reaction Symptoms Experienced
                </label>
                <textarea
                  rows={3}
                  placeholder="e.g. Severe stomach pain, gastric bleeding, facial rash, dizziness"
                  value={newReaction}
                  onChange={(e) => setNewReaction(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#091f17] border border-emerald-800/80 text-white placeholder-emerald-500/50 focus:outline-none focus:border-emerald-400"
                />
              </div>

              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-200/90 text-[11px]">
                <strong>Clinical Safety Notice:</strong> Reporting a past bad reaction permanently updates your allergy record and instantly cross-checks future prescriptions against known intolerances.
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-emerald-900/40">
                <button
                  type="button"
                  onClick={() => setShowAddReactionModal(false)}
                  className="px-4 py-2 rounded-xl text-emerald-300 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingReaction}
                  className="px-5 py-2 rounded-xl bg-amber-400 text-[#071410] font-bold hover:bg-amber-300 transition-all shadow-md disabled:opacity-50"
                >
                  {submittingReaction ? "Recording..." : "Save to My Record"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* High-Fidelity Source Inspection Drawer (Yellow Highlighting) */}
      {selectedSource && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#071712] border border-emerald-800/80 rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-emerald-900/40 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-white text-sm">{selectedSource.title}</h3>
                <p className="text-xs text-emerald-400/70">
                  Verbatim clinical evidence from source document pages
                </p>
              </div>
              <button
                onClick={() => setSelectedSource(null)}
                className="p-1.5 rounded-lg text-emerald-400 hover:text-white hover:bg-emerald-900/40 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-4 overflow-y-auto flex-1">
              {selectedSource.sources.map((src, i) => (
                <div
                  key={i}
                  className="p-4 rounded-xl border border-emerald-800/60 bg-[#091f17] text-xs space-y-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 text-emerald-400/80">
                    <span className="font-bold text-white text-xs">
                      Clinical Document #{i + 1} {src.page_number ? `· Page ${src.page_number}` : ""}
                    </span>
                    <span className="font-mono text-[11px]">{src.doc_date || "Date unspecified"}</span>
                  </div>

                  {/* Yellow Highlighting on verbatim extracted excerpt */}
                  <div className="p-3.5 rounded-xl bg-[#14231b] border border-emerald-700/40 space-y-1">
                    <span className="text-[10px] uppercase font-bold text-emerald-400/70 tracking-wider block">
                      Verbatim Extracted Quote:
                    </span>
                    <div className="p-2 rounded bg-yellow-400/20 border-l-4 border-yellow-400 text-yellow-100 font-mono text-[12px] leading-relaxed">
                      &ldquo;{src.evidence_text}&rdquo;
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px] text-emerald-300/80 pt-1">
                    <div>
                      <span className="text-emerald-400/60 block text-[10px]">Doctor</span>
                      <span className="font-medium text-white">{src.doctor ? `Dr. ${src.doctor}` : "Document Record"}</span>
                    </div>
                    <div>
                      <span className="text-emerald-400/60 block text-[10px]">Facility</span>
                      <span className="font-medium text-white">{src.hospital || "Clinical Facility"}</span>
                    </div>
                    <div>
                      <span className="text-emerald-400/60 block text-[10px]">Document Type</span>
                      <span className="font-medium text-white capitalize">{src.doc_type || "Prescription"}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-4 border-t border-emerald-900/40 text-right">
              <button
                onClick={() => setSelectedSource(null)}
                className="px-5 py-2 rounded-xl bg-emerald-400 text-[#071410] font-bold text-xs hover:bg-emerald-300 transition-all shadow-md"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
