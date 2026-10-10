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
  ExternalLink,
  Info,
  Calendar,
  Building2,
  User,
} from "lucide-react";
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

export default function ClinicalSummaryPage() {
  const [summary, setSummary] = useState<ClinicalSummary | null>(null);
  const [flags, setFlags] = useState<SafetyFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<
    "all" | "allergies" | "medications" | "conditions"
  >("all");
  const [showOtherMeds, setShowOtherMeds] = useState(false);
  const [selectedSource, setSelectedSource] = useState<{
    title: string;
    sources: SourceReference[];
  } | null>(null);

  const [isPending, startTransition] = useTransition();

  // Load summary and safety rules on mount
  useEffect(() => {
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
          // Move from current to other with status "stopped"
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
          // Move from other back to current with status "current"
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
    } catch (err) {
      console.error("Failed to persist stop action:", err);
    }
  }

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-16 text-center">
        <div className="inline-block w-8 h-8 border-4 border-emerald-400 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-emerald-300 font-medium">Generating unified clinical summary...</p>
        <p className="text-xs text-emerald-400/60 mt-1">Cross-referencing confirmed records across all providers</p>
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

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header and Print Control */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-emerald-900/40 pb-6">
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

        <div className="flex items-center gap-3">
          <Link
            href="/timeline"
            className="px-4 py-2 rounded-xl border border-emerald-800/60 text-emerald-200 hover:text-white hover:border-emerald-700 text-xs font-medium transition-all"
          >
            View Full Timeline
          </Link>
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 text-xs font-medium transition-all border border-emerald-500/30"
          >
            <Printer className="w-4 h-4" />
            Print Summary
          </button>
        </div>
      </div>

      {/* Safety Warning Flags Banner (Always worded 'Needs doctor review') */}
      {flags.length > 0 && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5 space-y-3">
          <div className="flex items-center gap-2 text-amber-300 font-semibold text-sm">
            <ShieldAlert className="w-5 h-5 text-amber-400" />
            <span>Safety Alerts & Potential Conflicts ({flags.length})</span>
            <span className="text-[11px] font-normal text-amber-400/70 ml-auto">
              Decision support only — not clinical advice
            </span>
          </div>
          <div className="grid gap-2.5">
            {flags.map((flag) => (
              <div
                key={flag.id}
                className="p-3.5 rounded-xl bg-[#091813]/80 border border-amber-500/20 text-xs text-amber-200/90 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
              >
                <div>
                  <span className="font-bold text-amber-300">{flag.title}:</span>{" "}
                  <span>{flag.description}</span>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    {flag.severity}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Category Tabs */}
      <div className="flex items-center gap-2 border-b border-emerald-900/40 pb-2 overflow-x-auto">
        <button
          onClick={() => setSelectedCategory("all")}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
            selectedCategory === "all"
              ? "bg-emerald-400 text-[#071410] font-semibold"
              : "text-emerald-300/70 hover:text-white hover:bg-emerald-950/40"
          }`}
        >
          All Categories
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
      </div>

      {/* 1. ALLERGIES SECTION (Top & Prominent) */}
      {(selectedCategory === "all" || selectedCategory === "allergies") && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-rose-400" />
              Documented Allergies & Bad Reactions
            </h2>
            <span className="text-xs text-rose-300/70 font-medium">
              Priority Clinical Safety
            </span>
          </div>

          {summary.allergies.length === 0 ? (
            <div className="p-4 rounded-xl border border-emerald-800/40 bg-[#091a14] text-xs text-emerald-300/80">
              No allergies found in your uploaded records.
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {summary.allergies.map((allergy, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-xl border border-rose-500/30 bg-rose-500/5 hover:border-rose-500/50 transition-all flex flex-col justify-between"
                >
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-white capitalize">
                        {allergy.substance}
                      </span>
                      {allergy.is_patient_reported && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          Patient Reported
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-rose-200/90">
                      <span className="font-semibold text-rose-300">Reactions:</span>{" "}
                      {allergy.reactions.length > 0 ? allergy.reactions.join(", ") : "Adverse reaction"}
                    </p>
                  </div>

                  {allergy.sources.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-rose-500/20 flex items-center justify-between">
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
                        View Source
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* 2. CURRENT MEDICATIONS (90-Day Active Window) */}
      {(selectedCategory === "all" || selectedCategory === "medications") && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Pill className="w-5 h-5 text-emerald-400" />
                Current Medications
              </h2>
              <p className="text-xs text-emerald-400/70">
                Active within the last 90 days or ongoing course. Sorted alphabetically.
              </p>
            </div>
            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              {summary.counts.current_medicines} Active
            </span>
          </div>

          {summary.current_medicines.length === 0 ? (
            <div className="p-4 rounded-xl border border-emerald-800/40 bg-[#091a14] text-xs text-emerald-300/80">
              No active medications recorded within the last 90 days.
            </div>
          ) : (
            <div className="grid gap-3">
              {summary.current_medicines.map((med) => (
                <div
                  key={med.group_key}
                  className="p-4 rounded-xl border border-emerald-800/50 bg-[#091a14]/90 hover:border-emerald-700/60 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-base text-white">{med.display_name}</span>
                      {med.ingredients.length > 0 && (
                        <span className="text-xs text-emerald-300/70">
                          ({med.ingredients.join(" + ")})
                        </span>
                      )}
                      {med.dose_conflict && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          Dose differs across recent prescriptions, please verify
                        </span>
                      )}
                      {med.warnings?.includes("date_in_future") && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                          Future prescription date
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-emerald-200/80 pt-1">
                      <div>
                        <span className="text-emerald-400/60 block text-[11px]">Strength</span>
                        <span className="font-medium text-white">{med.strength || "As prescribed"}</span>
                      </div>
                      <div>
                        <span className="text-emerald-400/60 block text-[11px]">Dose / Freq</span>
                        <span className="font-medium text-white">
                          {[med.dose, med.frequency].filter(Boolean).join(" ") || "As directed"}
                        </span>
                      </div>
                      <div>
                        <span className="text-emerald-400/60 block text-[11px]">Prescribed Date</span>
                        <span className="font-medium text-white">{med.prescribed_date || "Recorded"}</span>
                      </div>
                      <div>
                        <span className="text-emerald-400/60 block text-[11px]">Prescriber</span>
                        <span className="font-medium text-white truncate block">
                          {med.prescriber || "Document record"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 border-t md:border-t-0 pt-3 md:pt-0 border-emerald-900/40">
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
          <div className="pt-2">
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

      {/* 3. CONDITIONS SECTION */}
      {(selectedCategory === "all" || selectedCategory === "conditions") && (
        <section className="space-y-3">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <HeartPulse className="w-5 h-5 text-purple-400" />
              Recorded Conditions
            </h2>
            <p className="text-xs text-emerald-400/70">
              Conditions recorded in your documents across all consultations.
            </p>
          </div>

          {summary.conditions.length === 0 ? (
            <div className="p-4 rounded-xl border border-emerald-800/40 bg-[#091a14] text-xs text-emerald-300/80">
              No conditions found in your uploaded records.
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {summary.conditions.map((cond, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-xl border border-purple-500/30 bg-purple-500/5 hover:border-purple-500/50 transition-all flex flex-col justify-between"
                >
                  <div className="space-y-1.5">
                    <span className="font-bold text-sm text-white block">
                      {cond.name_canonical}
                    </span>
                    {cond.names_as_written.length > 0 && (
                      <p className="text-xs text-purple-200/80">
                        <span className="text-purple-400/60">As written:</span>{" "}
                        {cond.names_as_written.join(", ")}
                      </p>
                    )}
                    <div className="flex items-center gap-3 text-xs text-emerald-300/80 pt-1">
                      <span>
                        <strong className="text-emerald-400/70 font-normal">First:</strong>{" "}
                        {cond.first_recorded || "Recorded"}
                      </span>
                      <span>
                        <strong className="text-emerald-400/70 font-normal">Latest:</strong>{" "}
                        {cond.last_mentioned || "Recent"}
                      </span>
                      <span className="ml-auto text-[11px] text-purple-300/70">
                        {cond.mention_count} mentions
                      </span>
                    </div>
                  </div>

                  {cond.sources.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-purple-500/20 flex items-center justify-between">
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
                        View Source
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Slide-over / Modal for Source Inspection */}
      {selectedSource && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
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

            <div className="p-4 space-y-3 overflow-y-auto flex-1">
              {selectedSource.sources.map((src, i) => (
                <div
                  key={i}
                  className="p-3.5 rounded-xl border border-emerald-900/50 bg-[#091f17] text-xs space-y-2"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 text-emerald-400/80">
                    <span className="font-semibold text-white">
                      Source #{i + 1} {src.page_number ? `· Page ${src.page_number}` : ""}
                    </span>
                    <span>{src.doc_date || "Date unspecified"}</span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-[#05110d] border border-emerald-900/40 font-mono text-[12px] text-emerald-200">
                    Based on: &ldquo;{src.evidence_text}&rdquo;
                  </div>

                  <div className="flex flex-wrap items-center gap-4 text-[11px] text-emerald-400/70 pt-1">
                    {src.doctor && <span>Doctor: Dr. {src.doctor}</span>}
                    {src.hospital && <span>Hospital: {src.hospital}</span>}
                    {src.doc_type && <span>Type: {src.doc_type}</span>}
                  </div>
                </div>
              ))}
            </div>

            <div className="p-4 border-t border-emerald-900/40 text-right">
              <button
                onClick={() => setSelectedSource(null)}
                className="px-4 py-2 rounded-xl bg-emerald-400 text-[#071410] font-semibold text-xs hover:bg-emerald-300 transition-all"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
