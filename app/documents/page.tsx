"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  FileText,
  Upload,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowRight,
  ShieldAlert,
  Search,
  Filter,
  FileCode,
} from "lucide-react";

interface StoredDocument {
  id: string;
  patient_id: string;
  file_name: string;
  file_type: "pdf" | "jpg" | "png";
  mime_type: string;
  size_bytes: number;
  doc_type?: string;
  doc_date?: string;
  doctor?: string;
  hospital?: string;
  status: "uploaded" | "extracting" | "needs_review" | "confirmed" | "failed";
  confidence_score: number;
  created_at: string;
}

export default function DocumentsDashboardPage() {
  const [documents, setDocuments] = useState<StoredDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  useEffect(() => {
    async function loadDocs() {
      try {
        const res = await fetch("/api/documents");
        if (res.ok) {
          const data = await res.json();
          if (data.documents) {
            setDocuments(data.documents);
          }
        }
      } catch (err) {
        console.error("Failed to load documents:", err);
      } finally {
        setLoading(false);
      }
    }
    loadDocs();
  }, []);

  const filteredDocs = documents.filter((doc) => {
    const matchesSearch =
      doc.file_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (doc.doctor && doc.doctor.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (doc.hospital && doc.hospital.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus = statusFilter === "all" || doc.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const needsReviewCount = documents.filter((d) => d.status === "needs_review").length;
  const confirmedCount = documents.filter((d) => d.status === "confirmed").length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header & Primary CTA */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 text-xs font-semibold uppercase tracking-wider bg-sky-500/10 text-sky-400 border border-sky-500/20 rounded">
                HealthTech Engine
              </span>
              <span className="text-xs text-slate-400 font-mono">v0.1.0-live</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white mt-1">
              Medical Documents & Records
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Upload prescriptions, lab reports, and clinical scans. Extracted via structured Vision LLM with human-in-the-loop validation.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/documents/upload"
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-medium text-sm transition-all shadow-lg shadow-sky-600/20 focus:outline-none focus:ring-2 focus:ring-sky-400"
            >
              <Upload className="w-4 h-4" />
              Upload Medical Document
            </Link>
          </div>
        </div>

        {/* Quick Stats Banner */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
            <p className="text-xs font-medium text-slate-400">Total Records</p>
            <p className="text-2xl font-bold text-white mt-1">{documents.length}</p>
          </div>
          <div className="bg-slate-900/60 border border-amber-500/20 rounded-xl p-4">
            <p className="text-xs font-medium text-amber-400 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5" />
              Needs Review
            </p>
            <p className="text-2xl font-bold text-amber-300 mt-1">{needsReviewCount}</p>
          </div>
          <div className="bg-slate-900/60 border border-emerald-500/20 rounded-xl p-4">
            <p className="text-xs font-medium text-emerald-400 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Confirmed
            </p>
            <p className="text-2xl font-bold text-emerald-300 mt-1">{confirmedCount}</p>
          </div>
          <div className="bg-slate-900/60 border border-sky-500/20 rounded-xl p-4">
            <p className="text-xs font-medium text-sky-400">Avg Confidence</p>
            <p className="text-2xl font-bold text-sky-300 mt-1">
              {documents.length > 0
                ? `${Math.round(
                    documents.reduce((acc, d) => acc + (d.confidence_score || 80), 0) /
                      documents.length
                  )}%`
                : "N/A"}
            </p>
          </div>
        </div>

        {/* Filters and Search Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-900/40 p-3 rounded-lg border border-slate-800">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by filename, doctor, or clinic..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-md text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400 hidden sm:block" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-md py-2 px-3 text-sm text-slate-300 focus:outline-none focus:border-sky-500"
            >
              <option value="all">All Statuses</option>
              <option value="needs_review">Needs Review</option>
              <option value="confirmed">Confirmed</option>
              <option value="extracting">Extracting</option>
              <option value="uploaded">Uploaded</option>
            </select>
          </div>
        </div>

        {/* Documents List */}
        {loading ? (
          <div className="text-center py-16 bg-slate-900/30 border border-slate-800/80 rounded-xl">
            <div className="inline-block animate-spin w-8 h-8 border-2 border-sky-400 border-t-transparent rounded-full mb-3" />
            <p className="text-sm text-slate-400">Loading medical records...</p>
          </div>
        ) : filteredDocs.length === 0 ? (
          <div className="text-center py-16 bg-slate-900/30 border border-slate-800/80 rounded-xl">
            <FileText className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <p className="text-base font-semibold text-slate-300">No documents found</p>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
              Upload your first prescription or clinical lab report to experience side-by-side AI extraction.
            </p>
            <Link
              href="/documents/upload"
              className="inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-lg bg-sky-600 text-white text-xs font-semibold hover:bg-sky-500 transition-colors"
            >
              <Upload className="w-3.5 h-3.5" />
              Upload Now
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filteredDocs.map((doc) => {
              const isLowConfidence = doc.confidence_score > 0 && doc.confidence_score < 80;
              return (
                <div
                  key={doc.id}
                  className="bg-slate-900/60 border border-slate-800 hover:border-slate-700/80 rounded-xl p-5 transition-all shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="flex items-start gap-3.5">
                    <div className="w-10 h-10 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center shrink-0 mt-0.5">
                      <FileCode className="w-5 h-5 text-sky-400" />
                    </div>

                    <div>
                      <div className="flex items-center flex-wrap gap-2">
                        <h2 className="text-base font-semibold text-white">
                          {doc.file_name}
                        </h2>
                        <span className="uppercase text-[10px] font-mono font-semibold px-2 py-0.5 bg-slate-800 text-slate-300 rounded border border-slate-700">
                          {doc.file_type}
                        </span>
                        {doc.doc_type && (
                          <span className="text-[10px] font-medium px-2 py-0.5 bg-sky-950 text-sky-300 rounded border border-sky-800/60">
                            {doc.doc_type.replace("_", " ")}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400 mt-1.5">
                        {doc.doctor && <span>Provider: <strong className="text-slate-300">{doc.doctor}</strong></span>}
                        {doc.hospital && <span>Facility: <strong className="text-slate-300">{doc.hospital}</strong></span>}
                        {doc.doc_date && <span>Date: {doc.doc_date}</span>}
                        <span>Size: {(doc.size_bytes / 1024).toFixed(0)} KB</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-800">
                    {/* Status Badge */}
                    <div>
                      {doc.status === "needs_review" && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-300 border border-amber-500/30">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          Needs Review
                        </span>
                      )}
                      {doc.status === "confirmed" && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Confirmed
                        </span>
                      )}
                      {doc.status === "extracting" && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-sky-500/10 text-sky-300 border border-sky-500/30 animate-pulse">
                          <Clock className="w-3.5 h-3.5" />
                          Extracting...
                        </span>
                      )}
                      {doc.status === "uploaded" && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-800 text-slate-300 border border-slate-700">
                          Uploaded
                        </span>
                      )}
                    </div>

                    {/* Confidence Pill */}
                    {doc.confidence_score > 0 && (
                      <div
                        className={`text-xs px-2 py-0.5 rounded font-mono font-medium border ${
                          isLowConfidence
                            ? "bg-amber-950/40 text-amber-300 border-amber-600/50"
                            : "bg-emerald-950/40 text-emerald-300 border-emerald-600/50"
                        }`}
                      >
                        {doc.confidence_score}% Conf
                      </div>
                    )}

                    {/* Review CTA */}
                    <Link
                      href={`/documents/${doc.id}/review`}
                      className={`inline-flex items-center gap-1.5 text-xs font-medium px-3.5 py-2 rounded-lg transition-colors ${
                        doc.status === "needs_review"
                          ? "bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold"
                          : "bg-slate-800 hover:bg-slate-700 text-slate-200"
                      }`}
                    >
                      {doc.status === "needs_review" ? "Review Now" : "View Record"}
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Clinical Disclaimer Notice */}
        <div className="flex items-start gap-3 bg-slate-900/30 border border-slate-800/80 rounded-xl p-4 text-xs text-slate-400">
          <ShieldAlert className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
          <p>
            <strong className="text-slate-300">Notice:</strong> MediCare is a patient records app, not insurance. Demo with simulated data. Decision support only, not a clinical diagnosis. Extracted records require human-in-the-loop confirmation before being committed to your longitudinal timeline.
          </p>
        </div>
      </div>
    </div>
  );
}
