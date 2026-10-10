"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Clock,
  Check,
  SkipForward,
  AlertTriangle,
  Sparkles,
  Utensils,
  Plus,
  X,
  HelpCircle,
  Sun,
  Sunset,
  Moon,
  Sunrise,
} from "lucide-react";
import type { ScheduledDose } from "@/lib/adherence";

interface TodayCardProps {
  patientId?: string;
  today?: string;
  onRefreshCalendar?: () => void;
}

interface TodayData {
  date: string;
  patientId: string;
  isDemo: boolean;
  nextDose: ScheduledDose | null;
  totalScheduled: number;
  totalTaken: number;
  totalSkipped: number;
  totalRemaining: number;
  progressPercent: number;
  groupedDoses: {
    Morning: ScheduledDose[];
    Afternoon: ScheduledDose[];
    Evening: ScheduledDose[];
    Night: ScheduledDose[];
  };
  asNeededMeds: Array<{
    id: string;
    name_as_written: string;
    strength: string | null;
    dose: string | null;
    frequency: string | null;
  }>;
  unrecognizedMeds: Array<{
    id: string;
    name_as_written: string;
    strength: string | null;
    dose: string | null;
    frequency: string | null;
  }>;
}

const PERIOD_CONFIG = {
  Morning: { icon: Sunrise, label: "Morning", sub: "5:00 AM – 12:00 PM", color: "text-amber-500" },
  Afternoon: { icon: Sun, label: "Afternoon", sub: "12:00 PM – 5:00 PM", color: "text-amber-600" },
  Evening: { icon: Sunset, label: "Evening", sub: "5:00 PM – 9:00 PM", color: "text-indigo-500" },
  Night: { icon: Moon, label: "Night", sub: "9:00 PM onwards", color: "text-blue-500" },
};

export function TodayCard({ patientId, today, onRefreshCalendar }: TodayCardProps) {
  const [data, setData] = useState<TodayData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [loggingKey, setLoggingKey] = useState<string | null>(null);

  // Set Times Modal state
  const [overrideMed, setOverrideMed] = useState<{ id: string; name: string } | null>(null);
  const [selectedTimes, setSelectedTimes] = useState<string[]>(["08:00"]);
  const [overrideSaving, setOverrideSaving] = useState<boolean>(false);

  const fetchToday = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (patientId) params.set("patient_id", patientId);
      if (today) params.set("today", today);
      const query = params.toString();
      const url = `/api/adherence/today${query ? `?${query}` : ""}`;
      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (e) {
      console.error("Failed to load today adherence", e);
    } finally {
      setLoading(false);
    }
  }, [patientId, today]);

  useEffect(() => {
    fetchToday();
  }, [fetchToday]);

  async function handleLog(
    medicationId: string,
    slotKey: string,
    scheduledDate: string,
    status: "taken" | "skipped"
  ) {
    const key = `${medicationId}-${slotKey}`;
    setLoggingKey(key);

    try {
      const params = new URLSearchParams();
      if (patientId) params.set("patient_id", patientId);
      if (today) params.set("today", today);
      const query = params.toString();
      const res = await fetch(`/api/adherence/log${query ? `?${query}` : ""}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          medication_id: medicationId,
          slot_key: slotKey,
          scheduled_date: scheduledDate,
          status,
        }),
      });

      if (res.ok) {
        await fetchToday();
        if (onRefreshCalendar) onRefreshCalendar();
      }
    } catch (e) {
      console.error("Failed to log dose", e);
    } finally {
      setLoggingKey(null);
    }
  }

  async function handleSaveOverride() {
    if (!overrideMed || selectedTimes.length === 0) return;
    setOverrideSaving(true);

    try {
      const res = await fetch(`/api/adherence/schedule/${overrideMed.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ times: selectedTimes }),
      });

      if (res.ok) {
        setOverrideMed(null);
        await fetchToday();
        if (onRefreshCalendar) onRefreshCalendar();
      }
    } catch (e) {
      console.error("Failed to save schedule override", e);
    } finally {
      setOverrideSaving(false);
    }
  }

  if (loading || !data) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm animate-pulse">
        <div className="h-6 w-48 bg-slate-200 dark:bg-slate-800 rounded mb-4" />
        <div className="h-28 bg-slate-100 dark:bg-slate-850 rounded-xl" />
      </div>
    );
  }

  // Circular progress calculations
  const radius = 38;
  const stroke = 8;
  const normalizedRadius = radius - stroke / 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset =
    circumference - (data.progressPercent / 100) * circumference;

  return (
    <section
      aria-labelledby="today-doses-heading"
      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-sm space-y-6"
    >
      {/* Top Banner: Next Dose Due + Circular Progress Ring */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-6 pb-6 border-b border-slate-100 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
              Today&apos;s Schedule
            </span>
            <span className="text-xs text-slate-400">
              {data.date} (Asia/Kolkata)
            </span>
          </div>

          <h2
            id="today-doses-heading"
            className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1"
          >
            Today&apos;s Doses
          </h2>

          {/* Next Dose Callout */}
          <div className="mt-3 flex items-center gap-3">
            {data.nextDose ? (
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800/80 text-amber-900 dark:text-amber-200 text-sm font-medium">
                <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                <span>
                  Next due: <strong>{data.nextDose.medicineName}</strong> at{" "}
                  <strong>{data.nextDose.scheduledTime}</strong>
                </span>
                <span
                  className={`text-[11px] px-1.5 py-0.5 rounded uppercase font-bold tracking-wider ${
                    data.nextDose.status === "due_now"
                      ? "bg-amber-200 text-amber-900 dark:bg-amber-800 dark:text-amber-100"
                      : data.nextDose.status === "overdue"
                      ? "bg-rose-200 text-rose-900 dark:bg-rose-800 dark:text-rose-100"
                      : "bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-200"
                  }`}
                >
                  {data.nextDose.status === "due_now" && "Due Now"}
                  {data.nextDose.status === "overdue" && "Overdue"}
                  {data.nextDose.status === "upcoming" && "Upcoming"}
                </span>
              </div>
            ) : data.totalScheduled > 0 && data.totalTaken === data.totalScheduled ? (
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 text-sm font-medium">
                <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>All doses taken for today! Excellent streak work.</span>
              </div>
            ) : (
              <span className="text-sm text-slate-500">
                No upcoming scheduled doses for today.
              </span>
            )}
          </div>
        </div>

        {/* Progress Ring Widget */}
        <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-850 p-3.5 sm:p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 shrink-0 self-start sm:self-auto">
          <div className="relative w-20 h-20 flex items-center justify-center">
            <svg height={radius * 2} width={radius * 2} className="rotate-[-90deg]">
              <circle
                stroke="currentColor"
                fill="transparent"
                strokeWidth={stroke}
                r={normalizedRadius}
                cx={radius}
                cy={radius}
                className="text-slate-200 dark:text-slate-700"
              />
              <circle
                stroke="currentColor"
                fill="transparent"
                strokeWidth={stroke}
                strokeDasharray={`${circumference} ${circumference}`}
                style={{ strokeDashoffset }}
                strokeLinecap="round"
                r={normalizedRadius}
                cx={radius}
                cy={radius}
                className="text-emerald-500 transition-all duration-500 ease-out"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="text-base font-extrabold text-slate-900 dark:text-slate-100">
                {data.progressPercent}%
              </span>
            </div>
          </div>

          <div>
            <div className="text-sm font-bold text-slate-900 dark:text-slate-100">
              {data.totalTaken} of {data.totalScheduled} doses taken
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {data.totalRemaining} remaining today
            </div>
            {data.totalSkipped > 0 && (
              <div className="text-[11px] text-amber-600 dark:text-amber-400 mt-0.5">
                {data.totalSkipped} skipped
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Doses Grouped by Slot Period (Morning / Afternoon / Evening / Night) */}
      <div className="space-y-6">
        {(["Morning", "Afternoon", "Evening", "Night"] as const).map((period) => {
          const doses = data.groupedDoses[period];
          if (!doses || doses.length === 0) return null;

          const config = PERIOD_CONFIG[period];
          const IconComponent = config.icon;

          return (
            <div key={period} className="space-y-3">
              <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-semibold text-sm">
                <IconComponent className={`w-4 h-4 ${config.color}`} />
                <span>{config.label}</span>
                <span className="text-xs font-normal text-slate-400">
                  ({config.sub})
                </span>
              </div>

              <div className="space-y-2.5">
                {doses.map((dose) => {
                  const key = `${dose.medicationId}-${dose.slotKey}`;
                  const isProcessing = loggingKey === key;

                  return (
                    <div
                      key={dose.doseId}
                      className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850/50 hover:bg-slate-50 dark:hover:bg-slate-850 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      {/* Left: Dose Information */}
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                            {dose.medicineName}
                          </span>
                          {dose.strength && (
                            <span className="text-xs font-medium text-slate-600 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2 py-0.5 rounded">
                              {dose.strength}
                            </span>
                          )}
                          {dose.dose && (
                            <span className="text-xs text-slate-500">
                              as written: {dose.dose}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 text-xs flex-wrap">
                          <span className="font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1">
                            <Clock className="w-3 h-3 text-slate-400" />
                            {dose.scheduledTime}
                          </span>

                          {dose.mealRelationLabel && (
                            <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-200 px-2 py-0.5 rounded-md border border-amber-200 dark:border-amber-800 font-medium">
                              <Utensils className="w-3 h-3 text-amber-600" />
                              {dose.mealRelationLabel}
                            </span>
                          )}

                          {/* Dose status badge */}
                          <span
                            className={`px-2 py-0.5 rounded text-[11px] font-semibold uppercase tracking-wider ${
                              dose.status === "taken"
                                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700"
                                : dose.status === "skipped"
                                ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-700"
                                : dose.status === "due_now"
                                ? "bg-amber-50 text-amber-900 dark:bg-amber-900/60 dark:text-amber-100 border border-amber-300 ring-1 ring-amber-400"
                                : dose.status === "overdue"
                                ? "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-300"
                                : "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-400"
                            }`}
                          >
                            {dose.status === "due_now" && "Due Now"}
                            {dose.status === "overdue" && "Overdue"}
                            {dose.status === "upcoming" && "Upcoming"}
                            {dose.status === "taken" && "Taken"}
                            {dose.status === "skipped" && "Skipped"}
                          </span>
                        </div>
                      </div>

                      {/* Right: Large Action Buttons (Taken & Skip) */}
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          disabled={isProcessing}
                          onClick={() =>
                            handleLog(dose.medicationId, dose.slotKey, dose.scheduledDate, "taken")
                          }
                          className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-1.5 shadow-sm ${
                            dose.status === "taken"
                              ? "bg-emerald-600 hover:bg-emerald-700 text-white ring-2 ring-emerald-400 ring-offset-1"
                              : "bg-white hover:bg-emerald-50 text-emerald-700 border border-emerald-300 dark:bg-slate-800 dark:hover:bg-emerald-950/60 dark:border-emerald-700 dark:text-emerald-300"
                          }`}
                          aria-label={
                            dose.status === "taken"
                              ? `Mark ${dose.medicineName} as not taken (undo)`
                              : `Mark ${dose.medicineName} as taken`
                          }
                        >
                          <Check className="w-4 h-4" />
                          <span>{dose.status === "taken" ? "Taken (Tap to undo)" : "Taken"}</span>
                        </button>

                        <button
                          type="button"
                          disabled={isProcessing}
                          onClick={() =>
                            handleLog(dose.medicationId, dose.slotKey, dose.scheduledDate, "skipped")
                          }
                          className={`px-3 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-1.5 ${
                            dose.status === "skipped"
                              ? "bg-amber-600 hover:bg-amber-700 text-white ring-2 ring-amber-400 ring-offset-1"
                              : "bg-white hover:bg-amber-50 text-slate-600 hover:text-amber-700 border border-slate-300 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300"
                          }`}
                          aria-label={
                            dose.status === "skipped"
                              ? `Undo skip for ${dose.medicineName}`
                              : `Skip dose of ${dose.medicineName}`
                          }
                        >
                          <SkipForward className="w-4 h-4" />
                          <span>{dose.status === "skipped" ? "Skipped (Undo)" : "Skip"}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty State when no scheduled, SOS, or unrecognized meds exist */}
      {data.totalScheduled === 0 && data.asNeededMeds.length === 0 && data.unrecognizedMeds.length === 0 && (
        <div className="p-8 text-center rounded-xl bg-slate-50 dark:bg-slate-850/60 border border-dashed border-slate-200 dark:border-slate-800 space-y-2">
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
            No active medications scheduled for today
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
            Once you upload and confirm a prescription or consultation record, your daily dose timetable will automatically appear here.
          </p>
        </div>
      )}

      {/* As-Needed (SOS / PRN) Medications */}
      {data.asNeededMeds.length > 0 && (
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-semibold text-sm mb-3">
            <HelpCircle className="w-4 h-4 text-sky-500" />
            <span>As Needed (SOS / PRN)</span>
            <span className="text-xs font-normal text-slate-400">
              No fixed schedule, take only as directed
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {data.asNeededMeds.map((med) => (
              <div
                key={med.id}
                className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850/50 flex items-center justify-between"
              >
                <div>
                  <div className="font-semibold text-slate-900 dark:text-slate-100 text-sm">
                    {med.name_as_written}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    {med.strength || ""} {med.dose ? `• ${med.dose}` : ""}
                  </div>
                </div>
                <span className="text-xs bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-300 px-2 py-1 rounded font-medium border border-sky-200 dark:border-sky-800">
                  SOS
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Unrecognized Prescriptions -> Timing not found + "Set times" */}
      {data.unrecognizedMeds.length > 0 && (
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
          <div className="p-4 rounded-xl border border-amber-200 dark:border-amber-800/80 bg-amber-50/50 dark:bg-amber-950/30 space-y-3">
            <div className="flex items-center gap-2 text-amber-800 dark:text-amber-200 font-semibold text-sm">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <span>Timing not found on the prescription</span>
            </div>
            <p className="text-xs text-amber-700 dark:text-amber-300">
              The frequency on some prescriptions couldn&apos;t be resolved to standard times automatically. You can set daily times without altering your prescription.
            </p>

            <div className="space-y-2">
              {data.unrecognizedMeds.map((med) => (
                <div
                  key={med.id}
                  className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-800 flex items-center justify-between"
                >
                  <div className="text-xs">
                    <span className="font-bold text-slate-900 dark:text-slate-100">
                      {med.name_as_written}
                    </span>
                    <span className="text-slate-500 ml-2">
                      ({med.frequency || "no frequency written"})
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setOverrideMed({ id: med.id, name: med.name_as_written })
                    }
                    className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold transition-colors"
                  >
                    Set times
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Set Times Modal */}
      {overrideMed && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="set-times-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
        >
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3 border-slate-100 dark:border-slate-800">
              <h3 id="set-times-title" className="font-bold text-slate-900 dark:text-slate-100 text-base">
                Set Schedule Times
              </h3>
              <button
                onClick={() => setOverrideMed(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <p className="text-xs text-slate-500">
                Choose up to 4 daily dose times for <strong>{overrideMed.name}</strong>.
                This is saved as an adherence schedule override and never edits the prescription.
              </p>
            </div>

            {/* Time inputs */}
            <div className="space-y-2">
              {selectedTimes.map((t, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    type="time"
                    value={t}
                    onChange={(e) => {
                      const next = [...selectedTimes];
                      next[idx] = e.target.value;
                      setSelectedTimes(next);
                    }}
                    className="px-3 py-2 border rounded-lg text-sm bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 flex-1"
                  />
                  {selectedTimes.length > 1 && (
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedTimes(selectedTimes.filter((_, i) => i !== idx))
                      }
                      className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg"
                      aria-label="Remove time"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}

              {selectedTimes.length < 4 && (
                <button
                  type="button"
                  onClick={() => setSelectedTimes([...selectedTimes, "14:00"])}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline pt-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add another time (max 4)
                </button>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setOverrideMed(null)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={overrideSaving || selectedTimes.length === 0}
                onClick={handleSaveOverride}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
              >
                {overrideSaving ? "Saving..." : "Save Times"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
