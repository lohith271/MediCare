"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  CircleSlash,
  Sparkles,
  Calendar as CalendarIcon,
} from "lucide-react";
import { StatsStrip } from "./StatsStrip";
import { DayPanel } from "./DayPanel";
import type { CalendarDayItem } from "@/app/api/adherence/calendar/route";
import type { AdherenceStats, DayState } from "@/lib/adherence";

interface StreakCalendarProps {
  patientId?: string;
  today?: string;
  onRefreshToday?: () => void;
}

export function StreakCalendar({ patientId, today, onRefreshToday }: StreakCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState<string>("2026-10");
  const [calendarDays, setCalendarDays] = useState<CalendarDayItem[]>([]);
  const [stats, setStats] = useState<AdherenceStats | null>(null);
  const [selectedDay, setSelectedDay] = useState<CalendarDayItem | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [loggingId, setLoggingId] = useState<string | null>(null);

  const fetchCalendar = useCallback(
    async (month: string) => {
      try {
        const params = new URLSearchParams();
        if (patientId) params.set("patient_id", patientId);
        params.set("month", month);
        if (today) params.set("today", today);
        const url = `/api/adherence/calendar?${params.toString()}`;
        const res = await fetch(url);
        if (res.ok) {
          const data = await chalkJson(res);
          setCalendarDays(data.days || []);
        }
      } catch (e) {
        console.error("Failed to fetch calendar", e);
      }
    },
    [patientId, today]
  );

  const fetchStats = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (patientId) params.set("patient_id", patientId);
      if (today) params.set("today", today);
      const query = params.toString();
      const url = `/api/adherence/stats${query ? `?${query}` : ""}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await chalkJson(res);
        setStats(data);
      }
    } catch (e) {
      console.error("Failed to fetch stats", e);
    }
  }, [patientId, today]);

  const refreshAll = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchCalendar(currentMonth), fetchStats()]);
    setLoading(false);
  }, [currentMonth, fetchCalendar, fetchStats]);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  // Helper safely parsing json
  async function chalkJson(res: Response) {
    return await res.json();
  }

  function handlePrevMonth() {
    const [y, m] = currentMonth.split("-").map((v) => parseInt(v, 10));
    const prevDate = new Date(Date.UTC(y, m - 2, 1));
    const nextMonthStr = `${prevDate.getUTCFullYear()}-${String(
      prevDate.getUTCMonth() + 1
    ).padStart(2, "0")}`;
    setCurrentMonth(nextMonthStr);
  }

  function handleNextMonth() {
    const [y, m] = currentMonth.split("-").map((v) => parseInt(v, 10));
    const nextDate = new Date(Date.UTC(y, m, 1));
    const nextMonthStr = `${nextDate.getUTCFullYear()}-${String(
      nextDate.getUTCMonth() + 1
    ).padStart(2, "0")}`;
    setCurrentMonth(nextMonthStr);
  }

  async function handleLogDose(
    medicationId: string,
    slotKey: string,
    scheduledDate: string,
    status: "taken" | "skipped"
  ) {
    const doseKey = `${medicationId}-${slotKey}`;
    setLoggingId(doseKey);

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
        await Promise.all([fetchCalendar(currentMonth), fetchStats()]);
        if (onRefreshToday) onRefreshToday();

        // Update selectedDay if open
        if (selectedDay && selectedDay.date === scheduledDate) {
          const calParams = new URLSearchParams();
          if (patientId) calParams.set("patient_id", patientId);
          calParams.set("month", currentMonth);
          if (today) calParams.set("today", today);
          const updatedCalendarRes = await fetch(
            `/api/adherence/calendar?${calParams.toString()}`
          );
          if (updatedCalendarRes.ok) {
            const data = await updatedCalendarRes.json();
            const updated = data.days.find((d: CalendarDayItem) => d.date === scheduledDate);
            if (updated) setSelectedDay(updated);
          }
        }
      }
    } catch (e) {
      console.error("Failed to log dose", e);
    } finally {
      setLoggingId(null);
    }
  }

  // Format month title (e.g. "October 2026")
  const [mYear, mMonth] = currentMonth.split("-").map((v) => parseInt(v, 10));
  const monthTitle = new Date(Date.UTC(mYear, mMonth - 1, 1)).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

  // Calculate empty padding slots for the first day of the month
  const firstDayOfWeek = calendarDays.length > 0 ? calendarDays[0].dayOfWeek : 0;
  const paddingSlots = Array.from({ length: firstDayOfWeek });

  return (
    <section className="space-y-6" aria-labelledby="streak-calendar-heading">
      <div className="flex items-center justify-between">
        <div>
          <h2
            id="streak-calendar-heading"
            className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2"
          >
            <CalendarIcon className="w-5 h-5 text-emerald-600" aria-hidden="true" />
            Adherence & Streak Calendar
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Track daily doses, build healthy habits, and review your adherence history.
          </p>
        </div>
      </div>

      {/* Adherence Stats Strip */}
      <StatsStrip stats={stats} loading={loading} />

      {/* Monthly Calendar Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-6 shadow-sm">
        {/* Month Navigation */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              {monthTitle}
            </h3>
            <span className="text-xs text-slate-400">Asia/Kolkata</span>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={handlePrevMonth}
              aria-label="Previous month"
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleNextMonth}
              aria-label="Next month"
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Calendar Day Header */}
        <div className="grid grid-cols-7 gap-1 text-center font-semibold text-xs text-slate-400 dark:text-slate-500 mb-2">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((w) => (
            <div key={w} className="py-1">
              {w}
            </div>
          ))}
        </div>

        {/* Calendar Grid (CSS Grid, no external library) */}
        <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
          {/* Empty padding slots before day 1 */}
          {paddingSlots.map((_, i) => (
            <div
              key={`pad-${i}`}
              className="min-h-[58px] sm:min-h-[72px] rounded-xl bg-slate-50/50 dark:bg-slate-900/30 border border-transparent"
              aria-hidden="true"
            />
          ))}

          {/* Month Days */}
          {calendarDays.map((day) => {
            const ind = getCalendarStyle(day.state, day.isToday);

            return (
              <button
                key={day.date}
                type="button"
                onClick={() => setSelectedDay(day)}
                className={`min-h-[58px] sm:min-h-[72px] p-1.5 rounded-xl border text-left flex flex-col justify-between transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500 hover:shadow-md ${ind.wrapperClass}`}
                aria-label={`${day.date}: ${ind.label}, ${day.totalTaken} of ${day.totalScheduled} taken. Click to inspect.`}
              >
                <div className="flex items-center justify-between w-full">
                  <span
                    className={`text-xs font-bold ${
                      day.isToday
                        ? "w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center -ml-0.5"
                        : "text-slate-800 dark:text-slate-200"
                    }`}
                  >
                    {day.dayNumber}
                  </span>
                  <span className="shrink-0">{ind.icon}</span>
                </div>

                {/* Dose fraction counter */}
                <div className="text-[10px] sm:text-xs font-medium text-slate-500 dark:text-slate-400">
                  {day.totalScheduled > 0 ? (
                    <span>
                      {day.totalTaken}/{day.totalScheduled}
                    </span>
                  ) : (
                    <span className="text-slate-300 dark:text-slate-600">—</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Accessible Visual Legend (Never rely on colour alone) */}
        <div
          className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center gap-3 sm:gap-6 text-xs text-slate-600 dark:text-slate-300"
          aria-label="Calendar legend"
        >
          <span className="font-semibold text-slate-700 dark:text-slate-200">Legend:</span>
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Perfect (all taken)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
            <span>Partial</span>
          </div>
          <div className="flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
            <span>Missed</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-sky-600" />
            <span>Today (in progress)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <CircleSlash className="w-3.5 h-3.5 text-slate-400" />
            <span>Neutral (no meds)</span>
          </div>
        </div>
      </div>

      {/* Day Inspector Panel */}
      <DayPanel
        day={selectedDay}
        onClose={() => setSelectedDay(null)}
        onLogDose={handleLogDose}
        loggingId={loggingId}
      />
    </section>
  );
}

function getCalendarStyle(state: DayState, isToday: boolean) {
  if (isToday && state === "today") {
    return {
      label: "Today (in progress)",
      wrapperClass:
        "bg-sky-50/70 border-sky-300 dark:bg-sky-950/40 dark:border-sky-800 ring-2 ring-sky-400/80",
      icon: <Sparkles className="w-3 h-3 text-sky-600 dark:text-sky-400" aria-hidden="true" />,
    };
  }

  switch (state) {
    case "perfect":
      return {
        label: "Perfect Day",
        wrapperClass:
          "bg-emerald-50/70 border-emerald-300 dark:bg-emerald-950/40 dark:border-emerald-800 hover:border-emerald-400",
        icon: (
          <CheckCircle2
            className="w-3 h-3 text-emerald-600 dark:text-emerald-400"
            aria-hidden="true"
          />
        ),
      };
    case "partial":
      return {
        label: "Partial Day",
        wrapperClass:
          "bg-amber-50/70 border-amber-300 dark:bg-amber-950/40 dark:border-amber-800 hover:border-amber-400",
        icon: (
          <AlertCircle className="w-3 h-3 text-amber-600 dark:text-amber-400" aria-hidden="true" />
        ),
      };
    case "missed":
      return {
        label: "Missed Day",
        wrapperClass:
          "bg-rose-50/70 border-rose-300 dark:bg-rose-950/40 dark:border-rose-800 hover:border-rose-400",
        icon: (
          <AlertCircle className="w-3 h-3 text-rose-600 dark:text-rose-400" aria-hidden="true" />
        ),
      };
    default:
      return {
        label: "Neutral",
        wrapperClass:
          "bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300",
        icon: (
          <CircleSlash className="w-3 h-3 text-slate-300 dark:text-slate-600" aria-hidden="true" />
        ),
      };
  }
}
