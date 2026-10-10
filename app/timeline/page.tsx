"use strict";
"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import {
  Calendar,
  Pill,
  Activity,
  HeartPulse,
  Stethoscope,
  Building2,
  User,
  Search,
  Filter,
  FileText,
  X,
  ArrowRight,
  ShieldAlert,
} from "lucide-react";
import type { TimelineEvent } from "@/app/api/timeline/route";

export default function TimelinePage() {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<
    "all" | "active_meds" | "conditions" | "labs" | "encounters"
  >("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSource, setSelectedSource] = useState<TimelineEvent | null>(null);

  useEffect(() => {
    async function loadTimeline() {
      try {
        setLoading(true);
        const res = await fetch("/api/timeline");
        if (!res.ok) throw new Error("Failed to load timeline records");
        const data = await res.json();
        setEvents(data.events || []);
      } catch (err: any) {
        setError(err.message || "Failed to load timeline");
      } finally {
        setLoading(false);
      }
    }
    loadTimeline();
  }, []);

  // Filter and search logic
  const filteredEvents = useMemo(() => {
    return events.filter((ev) => {
      // Category filter
      if (activeFilter === "active_meds") {
        if (ev.type !== "medication" || !ev.is_active) return false;
      } else if (activeFilter === "conditions") {
        if (ev.type !== "diagnosis") return false;
      } else if (activeFilter === "labs") {
        if (ev.type !== "lab_result") return false;
      } else if (activeFilter === "encounters") {
        if (ev.type !== "encounter") return false;
      }

      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = ev.title.toLowerCase().includes(q);
        const matchesDoc = (ev.doctor || "").toLowerCase().includes(q);
        const matchesHosp = (ev.hospital || "").toLowerCase().includes(q);
        const matchesEv = (ev.evidence_text || "").toLowerCase().includes(q);
        const matchesDetails = ev.details.some(
          (d) => d.label.toLowerCase().includes(q) || d.value.toLowerCase().includes(q)
        );
        return matchesTitle || matchesDoc || matchesHosp || matchesEv || matchesDetails;
      }

      return true;
    });
  }, [events, activeFilter, searchQuery]);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-emerald-900/40 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Cross-Provider Record
            </span>
            <span className="text-xs text-emerald-400/60">
              Total {events.length} Historical Events
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Patient Journey Timeline
          </h1>
          <p className="text-sm text-emerald-300/70 mt-1">
            One unbroken chronological medical record unifying prescriptions, labs, visits, and diagnoses from all facilities.
          </p>
        </div>

        <Link
          href="/summary"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-400 text-[#071410] hover:bg-emerald-300 text-xs font-semibold transition-all shadow-md self-start sm:self-auto"
        >
          View Clinical Summary
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Filter and Search Controls */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-emerald-400/60 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search across medications, labs, diagnoses, or clinics..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#081b15] border border-emerald-800/60 text-xs text-white placeholder-emerald-500/50 focus:outline-none focus:border-emerald-400 transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Quick Filter Badges */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => setActiveFilter("all")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeFilter === "all"
                ? "bg-emerald-400 text-[#071410] font-semibold"
                : "bg-[#091a14] border border-emerald-800/40 text-emerald-300/80 hover:text-white"
            }`}
          >
            All Events ({events.length})
          </button>
          <button
            onClick={() => setActiveFilter("active_meds")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeFilter === "active_meds"
                ? "bg-emerald-400 text-[#071410] font-semibold"
                : "bg-[#091a14] border border-emerald-800/40 text-emerald-300/80 hover:text-white"
            }`}
          >
            Active Medications
          </button>
          <button
            onClick={() => setActiveFilter("conditions")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeFilter === "conditions"
                ? "bg-emerald-400 text-[#071410] font-semibold"
                : "bg-[#091a14] border border-emerald-800/40 text-emerald-300/80 hover:text-white"
            }`}
          >
            Conditions / Diagnoses
          </button>
          <button
            onClick={() => setActiveFilter("labs")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeFilter === "labs"
                ? "bg-emerald-400 text-[#071410] font-semibold"
                : "bg-[#091a14] border border-emerald-800/40 text-emerald-300/80 hover:text-white"
            }`}
          >
            Lab Tests
          </button>
          <button
            onClick={() => setActiveFilter("encounters")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeFilter === "encounters"
                ? "bg-emerald-400 text-[#071410] font-semibold"
                : "bg-[#091a14] border border-emerald-800/40 text-emerald-300/80 hover:text-white"
            }`}
          >
            Doctor Visits
          </button>
        </div>
      </div>

      {/* Loading & Empty States */}
      {loading && (
        <div className="py-16 text-center">
          <div className="inline-block w-8 h-8 border-4 border-emerald-400 border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-emerald-300 text-sm">Building chronological patient journey...</p>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-200 text-center">
          {error}
        </div>
      )}

      {!loading && !error && filteredEvents.length === 0 && (
        <div className="p-8 rounded-2xl border border-emerald-800/40 bg-[#081a14] text-center space-y-2">
          <p className="text-sm font-semibold text-white">No matching events found</p>
          <p className="text-xs text-emerald-400/60">
            Try adjusting your search query or switching active category filters.
          </p>
        </div>
      )}

      {/* Timeline Stream */}
      {!loading && !error && filteredEvents.length > 0 && (
        <div className="relative pl-6 sm:pl-8 space-y-6 before:absolute before:left-2 sm:before:left-3 before:top-3 before:bottom-3 before:w-0.5 before:bg-gradient-to-b before:from-emerald-500 before:via-teal-500/50 before:to-emerald-950">
          {filteredEvents.map((ev) => {
            let Icon = Calendar;
            if (ev.type === "medication") Icon = Pill;
            else if (ev.type === "diagnosis") Icon = HeartPulse;
            else if (ev.type === "lab_result") Icon = Activity;
            else if (ev.type === "encounter") Icon = Stethoscope;

            return (
              <div key={ev.id} className="relative group">
                {/* Node Dot */}
                <div className="absolute -left-6 sm:-left-8 top-4 -translate-x-1/2 w-4 h-4 rounded-full border-2 border-emerald-400 bg-[#071410] group-hover:scale-125 group-hover:border-white transition-all shadow-md shadow-emerald-500/30" />

                {/* Event Card */}
                <div className="p-4 sm:p-5 rounded-2xl border border-emerald-800/40 bg-[#091a14]/90 hover:border-emerald-700/70 transition-all space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-xs font-semibold text-emerald-400/90 block">
                          {ev.display_date}
                        </span>
                        <h3 className="text-sm sm:text-base font-bold text-white tracking-tight">
                          {ev.title}
                        </h3>
                      </div>
                    </div>

                    <span
                      className={`px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                        ev.badge_color === "rose"
                          ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                          : ev.badge_color === "amber"
                          ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                          : ev.badge_color === "purple"
                          ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                          : ev.badge_color === "blue"
                          ? "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                          : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                      }`}
                    >
                      {ev.badge}
                    </span>
                  </div>

                  {/* Provider Info */}
                  <div className="flex flex-wrap items-center gap-4 text-xs text-emerald-300/80 pt-1">
                    {ev.doctor && (
                      <span className="flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-emerald-400/60" />
                        Dr. {ev.doctor}
                      </span>
                    )}
                    {ev.hospital && (
                      <span className="flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-emerald-400/60" />
                        {ev.hospital}
                      </span>
                    )}
                  </div>

                  {/* Detail Key-Values */}
                  {ev.details.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 p-3 rounded-xl bg-[#06140f] border border-emerald-900/40 text-xs">
                      {ev.details.map((d, idx) => (
                        <div key={idx}>
                          <span className="text-[11px] text-emerald-400/60 block">{d.label}</span>
                          <span className="font-medium text-white">{d.value}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Source Action */}
                  {ev.evidence_text && (
                    <div className="pt-2 flex items-center justify-between border-t border-emerald-900/40 text-xs">
                      <span className="text-[11px] text-emerald-400/60 truncate max-w-[280px] sm:max-w-md">
                        &ldquo;{ev.evidence_text}&rdquo;
                      </span>
                      <button
                        onClick={() => setSelectedSource(ev)}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-300 hover:text-white underline flex-shrink-0"
                      >
                        <FileText className="w-3 h-3" />
                        Source Page
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Source Citation Modal */}
      {selectedSource && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#071712] border border-emerald-800/80 rounded-2xl max-w-xl w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-emerald-900/40 pb-3">
              <div>
                <h3 className="font-bold text-white text-sm">Source Document Verification</h3>
                <p className="text-xs text-emerald-400/70">{selectedSource.title}</p>
              </div>
              <button
                onClick={() => setSelectedSource(null)}
                className="p-1 rounded-lg text-emerald-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-[#05110d] border border-emerald-900/50 font-mono text-[12px] text-emerald-200">
                <span className="text-emerald-400/60 block text-[10px] uppercase font-sans mb-1 font-bold">
                  Verbatim Document Text:
                </span>
                &ldquo;{selectedSource.evidence_text}&rdquo;
              </div>

              <div className="grid grid-cols-2 gap-2 text-emerald-300/80">
                <div>
                  <span className="text-emerald-400/60 block text-[11px]">Date</span>
                  <span className="font-medium text-white">{selectedSource.display_date}</span>
                </div>
                <div>
                  <span className="text-emerald-400/60 block text-[11px]">Page Citation</span>
                  <span className="font-medium text-white">
                    {selectedSource.page_number ? `Page ${selectedSource.page_number}` : "Page 1 (Primary)"}
                  </span>
                </div>
                <div>
                  <span className="text-emerald-400/60 block text-[11px]">Doctor</span>
                  <span className="font-medium text-white">
                    {selectedSource.doctor ? `Dr. ${selectedSource.doctor}` : "Document Record"}
                  </span>
                </div>
                <div>
                  <span className="text-emerald-400/60 block text-[11px]">Facility</span>
                  <span className="font-medium text-white">
                    {selectedSource.hospital || "Clinical Facility"}
                  </span>
                </div>
              </div>
            </div>

            <div className="text-right pt-2 border-t border-emerald-900/40">
              <button
                onClick={() => setSelectedSource(null)}
                className="px-4 py-2 rounded-xl bg-emerald-400 text-[#071410] font-semibold text-xs hover:bg-emerald-300"
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
