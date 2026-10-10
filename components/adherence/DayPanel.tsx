"use client";

import React, { useEffect } from "react";
import { X, Check, SkipForward, AlertCircle, Clock, Utensils } from "lucide-react";
import type { CalendarDayItem } from "@/app/api/adherence/calendar/route";
import type { ScheduledDose } from "@/lib/adherence";

interface DayPanelProps {
  day: CalendarDayItem | null;
  onClose: () => void;
  onLogDose: (medicationId: string, slotKey: string, scheduledDate: string, status: "taken" | "skipped") => Promise<void>;
  loggingId?: string | null;
}

function formatFullDate(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map((v) => parseInt(v, 10));
  const dateObj = new Date(Date.UTC(y, m - 1, d));
  return dateObj.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

export function DayPanel({ day, onClose, onLogDose, loggingId }: DayPanelProps) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  if (!day) return null;

  // Logging allowed only for today and the previous 7 days
  const isLoggable = !day.isFuture;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="day-panel-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in"
    >
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40">
          <div>
            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
              Dose Details
            </span>
            <h3 id="day-panel-title" className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-0.5">
              {formatFullDate(day.date)}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Banner */}
        <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs bg-slate-50/30 dark:bg-slate-850">
          <div className="flex items-center gap-2">
            <span className="text-slate-500 dark:text-slate-400">Day State:</span>
            <span
              className={`font-semibold capitalize px-2 py-0.5 rounded-full border ${
                day.state === "perfect"
                  ? "bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-700"
                  : day.state === "partial"
                  ? "bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-700"
                  : day.state === "missed"
                  ? "bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-950 dark:text-rose-300 dark:border-rose-700"
                  : day.state === "today"
                  ? "bg-sky-50 text-sky-700 border-sky-300 dark:bg-sky-950 dark:text-sky-300 dark:border-sky-700"
                  : "bg-slate-100 text-slate-600 border-slate-300 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700"
              }`}
            >
              {day.state}
            </span>
          </div>

          <div className="text-slate-500 dark:text-slate-400">
            {day.totalTaken} of {day.totalScheduled} doses taken
          </div>
        </div>

        {/* Doses List */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-3 flex-1">
          {day.doses.length === 0 ? (
            <div className="text-center py-8 text-slate-500 dark:text-slate-400 text-sm">
              <Clock className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
              No medications scheduled for this day.
            </div>
          ) : (
            day.doses.map((dose: ScheduledDose) => {
              const doseKey = `${dose.medicationId}-${dose.slotKey}`;
              const isProcessing = loggingId === doseKey;

              return (
                <div
                  key={dose.doseId}
                  className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-slate-900 dark:text-slate-100 text-sm">
                        {dose.medicineName}
                      </span>
                      {dose.strength && (
                        <span className="text-xs text-slate-500 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                          {dose.strength}
                        </span>
                      )}
                      {dose.dose && (
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          ({dose.dose})
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
                      <span className="inline-flex items-center gap-1 font-medium text-slate-700 dark:text-slate-300">
                        <Clock className="w-3 h-3 text-slate-400" />
                        {dose.scheduledTime} ({dose.slotPeriod})
                      </span>

                      {dose.mealRelationLabel && (
                        <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300 px-1.5 py-0.5 rounded border border-amber-200 dark:border-amber-800 text-[11px]">
                          <Utensils className="w-2.5 h-2.5" />
                          {dose.mealRelationLabel}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Dose Status & Log Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    {/* Status Badge */}
                    <span
                      className={`text-xs font-medium px-2 py-1 rounded-md border ${
                        dose.status === "taken"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300"
                          : dose.status === "skipped"
                          ? "bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950 dark:text-amber-300"
                          : dose.status === "missed"
                          ? "bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-950 dark:text-rose-300"
                          : "bg-slate-100 text-slate-600 border-slate-300 dark:bg-slate-800 dark:text-slate-400"
                      }`}
                    >
                      {dose.status === "taken" && "Taken"}
                      {dose.status === "skipped" && "Skipped"}
                      {dose.status === "missed" && "Missed"}
                      {dose.status === "upcoming" && "Upcoming"}
                      {dose.status === "due_now" && "Due Now"}
                      {dose.status === "overdue" && "Overdue"}
                    </span>

                    {/* Interactive Log Buttons if in loggable window */}
                    {isLoggable && (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          disabled={isProcessing}
                          onClick={() =>
                            onLogDose(dose.medicationId, dose.slotKey, day.date, "taken")
                          }
                          className={`px-2.5 py-1 text-xs font-medium rounded-md border transition-colors flex items-center gap-1 ${
                            dose.status === "taken"
                              ? "bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700"
                              : "border-slate-300 hover:bg-emerald-50 hover:text-emerald-700 dark:border-slate-700"
                          }`}
                          title={dose.status === "taken" ? "Tap to undo taken" : "Mark as taken"}
                        >
                          <Check className="w-3 h-3" />
                          {dose.status === "taken" ? "Undo" : "Take"}
                        </button>

                        <button
                          type="button"
                          disabled={isProcessing}
                          onClick={() =>
                            onLogDose(dose.medicationId, dose.slotKey, day.date, "skipped")
                          }
                          className={`px-2 py-1 text-xs font-medium rounded-md border transition-colors flex items-center gap-1 ${
                            dose.status === "skipped"
                              ? "bg-amber-600 text-white border-amber-600 hover:bg-amber-700"
                              : "border-slate-300 hover:bg-amber-50 hover:text-amber-700 dark:border-slate-700"
                          }`}
                          title={dose.status === "skipped" ? "Tap to undo skip" : "Mark as skipped"}
                        >
                          <SkipForward className="w-3 h-3" />
                          {dose.status === "skipped" ? "Undo" : "Skip"}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer info */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between text-xs text-slate-500">
          <span>Decision support only, not a diagnosis.</span>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 rounded-lg font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
