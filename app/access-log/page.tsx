"use client";

import { useState, useEffect } from "react";
import { useSession } from "@/lib/auth";
import SignInRequired from "@/components/SignInRequired";
import { ShieldCheck, History, RefreshCw, Key, AlertTriangle, Stethoscope, Clock, ShieldAlert, FileText, UserCheck, Lock } from "lucide-react";

interface AccessLogItem {
  id: string;
  patient_id: string;
  actor_type: string;
  actor_id: string;
  action: string;
  detail?: Record<string, any>;
  ip?: string;
  created_at: string;
}

export default function AccessLogPage() {
  const [logs, setLogs] = useState<AccessLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { session, loading: sessionLoading } = useSession();

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/access-log");
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
      }
    } catch (_err) {
      // Ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (sessionLoading || !session) return;
    fetchLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionLoading, session?.user.id]);

  const renderActionBadge = (action: string) => {
    switch (action) {
      case "share_created":
        return <span className="px-2.5 py-1 bg-blue-100 text-blue-800 rounded-full font-semibold text-xs flex items-center gap-1 w-fit"><Key className="w-3 h-3" /> Share Code Created</span>;
      case "share_accessed":
        return <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-full font-semibold text-xs flex items-center gap-1 w-fit"><ShieldCheck className="w-3 h-3" /> Scoped Record Access</span>;
      case "share_revoked":
        return <span className="px-2.5 py-1 bg-red-100 text-red-800 rounded-full font-semibold text-xs flex items-center gap-1 w-fit"><Lock className="w-3 h-3" /> Share Code Revoked</span>;
      case "emergency_lookup":
        return <span className="px-2.5 py-1 bg-amber-100 text-amber-900 rounded-full font-semibold text-xs flex items-center gap-1 w-fit"><ShieldAlert className="w-3 h-3 text-amber-600" /> ER Basic Lookup</span>;
      case "emergency_full_access_requested":
        return <span className="px-2.5 py-1 bg-purple-100 text-purple-800 rounded-full font-semibold text-xs flex items-center gap-1 w-fit"><Stethoscope className="w-3 h-3" /> Full Access Requested</span>;
      case "emergency_access_approved":
        return <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-full font-semibold text-xs flex items-center gap-1 w-fit"><CheckCircleIcon className="w-3 h-3" /> Out-of-Band Approved</span>;
      case "emergency_access_declined":
        return <span className="px-2.5 py-1 bg-red-100 text-red-800 rounded-full font-semibold text-xs flex items-center gap-1 w-fit"><Lock className="w-3 h-3" /> Access Request Declined</span>;
      default:
        return <span className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-full font-semibold text-xs">{action}</span>;
    }
  };

  if (!sessionLoading && !session) return <SignInRequired />;
  if (session && session.user.role !== "patient") {
    return <SignInRequired message="The access log is available to patient accounts." showLink={false} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-16">
      {/* Header */}
      <header className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white py-10 px-4 sm:px-6 shadow-md">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-700 text-slate-200 text-xs font-semibold mb-3 border border-slate-600">
              <History className="w-3.5 h-3.5" /> Immutable Audit Trail
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Access Log & Security Audit
            </h1>
            <p className="text-slate-300 text-sm mt-1">
              Complete history of who accessed your records, temporary share codes, and emergency lookups.
            </p>
          </div>
          <button
            onClick={fetchLogs}
            className="p-2.5 bg-white/10 hover:bg-white/20 rounded-xl text-white text-xs font-medium border border-white/20 flex items-center gap-2"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh Log
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 mt-8">
        <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <History className="w-5 h-5 text-indigo-600" /> Recent Security Events
            </h2>
            <span className="text-xs font-medium text-slate-500">
              Total Log Entries: {logs.length}
            </span>
          </div>

          {loading ? (
            <div className="py-16 text-center text-slate-500 text-xs flex flex-col items-center justify-center">
              <RefreshCw className="w-6 h-6 animate-spin text-indigo-600 mb-2" />
              Loading Audit Trail...
            </div>
          ) : logs.length === 0 ? (
            <div className="py-16 text-center text-slate-500 text-xs">
              <History className="w-10 h-10 mx-auto mb-2 opacity-30 text-indigo-600" />
              No access log entries recorded yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4">Date & Time</th>
                    <th className="py-3 px-4">Action</th>
                    <th className="py-3 px-4">Actor</th>
                    <th className="py-3 px-4">Details</th>
                    <th className="py-3 px-4 text-right">IP Address</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50">
                      <td className="py-3.5 px-4 font-mono text-slate-600 whitespace-nowrap">
                        {new Date(log.created_at).toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4">
                        {renderActionBadge(log.action)}
                      </td>
                      <td className="py-3.5 px-4 font-medium text-slate-800 capitalize">
                        {log.actor_type.replace("_", " ")}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 max-w-xs truncate">
                        {log.detail?.doctor_name ? (
                          <span>
                            <strong>{log.detail.doctor_name}</strong> ({log.detail.hospital || "Hospital"})
                          </span>
                        ) : log.detail?.scope ? (
                          <span>Scope: {log.detail.scope.join(", ")}</span>
                        ) : (
                          JSON.stringify(log.detail || {})
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-slate-500 text-[11px]">
                        {log.ip || "127.0.0.1"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-16 text-center text-xs text-slate-400 px-4">
        MediCare is a patient records app, not insurance. Demo with simulated data. Decision support only, not a diagnosis.
      </footer>
    </div>
  );
}

function CheckCircleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  );
}
