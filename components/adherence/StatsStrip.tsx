"use client";

import React from "react";
import { CheckCircle2, AlertCircle, CircleSlash, Sparkles, Flame, Trophy, Percent, Info } from "lucide-react";
import type { AdherenceStats, DayState } from "@/lib/adherence";

interface StatsStripProps {
  stats: AdherenceStats | null;
  loading?: boolean;
}

function getDayStateIndicator(state: DayState) {
  switch (state) {
    case "perfect":
      return {
        bg: "bg-emerald-950 text-emerald-300 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-200 dark:border-emerald-700",
        label: "Perfect",
        icon: <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />,
      };
    case "partial":
      return {
        bg: "bg-amber-100 text-amber-200 border-amber-300 dark:bg-amber-950 dark:text-amber-200 dark:border-amber-700",
        label: "Partial",
        icon: <AlertCircle className="w-3.5 h-3.5" aria-hidden="true" />,
      };
    case "missed":
      return {
        bg: "bg-rose-100 text-rose-200 border-rose-300 dark:bg-rose-950 dark:text-rose-200 dark:border-rose-700",
        label: "Missed",
        icon: <AlertCircle className="w-3.5 h-3.5" aria-hidden="true" />,
      };
    case "today":
      return {
        bg: "bg-sky-100 text-sky-200 border-sky-300 dark:bg-sky-950 dark:text-sky-200 dark:border-sky-700 ring-2 ring-sky-400",
        label: "Today",
        icon: <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />,
      };
    default:
      return {
        bg: "bg-slate-800 text-slate-400 border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700",
        label: "Neutral",
        icon: <CircleSlash className="w-3.5 h-3.5" aria-hidden="true" />,
      };
  }
}

function formatDayWeekday(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map((v) => parseInt(v, 10));
  const dateObj = new Date(Date.UTC(y, m - 1, d));
  const names = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return names[dateObj.getUTCDay()];
}

function formatDayNumber(dateStr: string): string {
  const parts = dateStr.split("-");
  return parseInt(parts[2], 10).toString();
}

export function StatsStrip({ stats, loading = false }: StatsStripProps) {
  if (loading || !stats) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 animate-pulse" aria-busy="true" aria-label="Loading stats">
        <div className="h-20 bg-slate-800 dark:bg-slate-800 rounded-xl" />
        <div className="h-20 bg-slate-800 dark:bg-slate-800 rounded-xl" />
        <div className="h-20 bg-slate-800 dark:bg-slate-800 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 3 Key Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3">
        {/* Current Streak */}
        <div className="bg-slate-900 dark:bg-slate-900 border border-slate-700 dark:border-slate-800 rounded-xl p-3 sm:p-3.5 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-[10px] sm:text-xs font-medium text-slate-400 dark:text-slate-400 uppercase tracking-wider">
              Current Streak
            </div>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="text-xl sm:text-2xl font-bold text-slate-100 dark:text-slate-100">
                {stats.currentStreak}
              </span>
              <span className="text-xs sm:text-sm font-medium text-slate-400 dark:text-slate-400">
                {stats.currentStreak === 1 ? "day" : "days"}
              </span>
            </div>
          </div>
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-emerald-950/60 dark:bg-emerald-950/60 border border-emerald-800 dark:border-emerald-800 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
            <Flame className="w-4 h-4 sm:w-5 sm:h-5" aria-hidden="true" />
          </div>
        </div>

        {/* Best Streak */}
        <div className="bg-slate-900 dark:bg-slate-900 border border-slate-700 dark:border-slate-800 rounded-xl p-3 sm:p-3.5 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-[10px] sm:text-xs font-medium text-slate-400 dark:text-slate-400 uppercase tracking-wider">
              Best Streak
            </div>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="text-xl sm:text-2xl font-bold text-slate-100 dark:text-slate-100">
                {stats.bestStreak}
              </span>
              <span className="text-xs sm:text-sm font-medium text-slate-400 dark:text-slate-400">
                {stats.bestStreak === 1 ? "day" : "days"}
              </span>
            </div>
          </div>
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-amber-950/60 dark:bg-amber-950/60 border border-amber-800 dark:border-amber-800 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
            <Trophy className="w-4 h-4 sm:w-5 sm:h-5" aria-hidden="true" />
          </div>
        </div>

        {/* 30-Day Adherence */}
        <div className="bg-slate-900 dark:bg-slate-900 border border-slate-700 dark:border-slate-800 rounded-xl p-3 sm:p-3.5 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-[10px] sm:text-xs font-medium text-slate-400 dark:text-slate-400 uppercase tracking-wider">
              30-Day Adherence
            </div>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="text-xl sm:text-2xl font-bold text-slate-100 dark:text-slate-100">
                {stats.adherence30DayRate}%
              </span>
              <span className="text-[11px] sm:text-xs font-medium text-slate-400">completed</span>
            </div>
          </div>
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-sky-950/60 dark:bg-sky-950/60 border border-sky-800 dark:border-sky-800 flex items-center justify-center text-sky-600 dark:text-sky-400 shrink-0">
            <Percent className="w-4 h-4 sm:w-5 sm:h-5" aria-hidden="true" />
          </div>
        </div>
      </div>

      {/* Gentle supportive non-shaming message */}
      {stats.gentleMessage && (
        <div
          role="status"
          className="bg-emerald-950/60/80 dark:bg-emerald-950/40 border border-emerald-800 dark:border-emerald-800/60 rounded-xl p-3.5 flex items-start gap-3 text-sm text-emerald-200 dark:text-emerald-200"
        >
          <Info className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" aria-hidden="true" />
          <div>
            <p className="font-medium">{stats.gentleMessage}</p>
            <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-0.5">
              Taking your next dose as written on your prescription keeps you on track.
            </p>
          </div>
        </div>
      )}

      {/* Last 7 Days Mini Strip */}
      <div className="bg-slate-900 dark:bg-slate-900 border border-slate-700 dark:border-slate-800 rounded-xl p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold text-slate-400 dark:text-slate-300 uppercase tracking-wider">
            Last 7 Days Activity
          </span>
          <span className="text-xs text-slate-400">
            Asia/Kolkata local
          </span>
        </div>

        <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
          {stats.last7Days.map((day) => {
            const ind = getDayStateIndicator(day.state);
            return (
              <div
                key={day.date}
                className={`flex flex-col items-center justify-center p-2 rounded-lg border text-center transition-colors ${ind.bg}`}
                title={`${day.date}: ${ind.label} (${day.totalTaken}/${day.totalScheduled} taken)`}
              >
                <span className="text-[10px] font-semibold opacity-75">
                  {formatDayWeekday(day.date)}
                </span>
                <span className="text-sm font-bold my-0.5">
                  {formatDayNumber(day.date)}
                </span>
                <span className="mt-0.5" aria-label={ind.label}>
                  {ind.icon}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
