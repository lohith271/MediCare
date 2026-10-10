"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { ShieldCheck, ShieldAlert, CheckCircle, XCircle, Clock, AlertTriangle, RefreshCw, Stethoscope, Lock, Building, User } from "lucide-react";

function EmergencyApproveContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [loading, setLoading] = useState(true);
  const [tokenData, setTokenData] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionDone, setActionDone] = useState<any | null>(null);

  useEffect(() => {
    if (!token) {
      setError("No token provided in the approval link.");
      setLoading(false);
      return;
    }

    async function fetchTokenInfo() {
      try {
        const res = await fetch(`/api/emergency/token?token=${encodeURIComponent(token!)}`);
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Invalid or expired token");
        }
        setTokenData(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchTokenInfo();
  }, [token]);

  const handleAction = async (action: "accept" | "decline") => {
    if (!token) return;
    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/emergency/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, action }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to process decision");
      }

      setActionDone(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="text-center text-slate-300">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto text-blue-500 mb-3" />
          <p className="text-sm font-medium">Loading Approval Request...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between py-12 px-4">
      <div className="max-w-xl mx-auto w-full">
        {/* Logo / Header */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-red-500/10 border border-red-500/30 text-red-500 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-bold text-white">MediCare Out-of-Band Approval</h1>
          <p className="text-xs text-slate-400 mt-1">Emergency Full Access Request</p>
        </div>

        {/* Action Completed Feedback */}
        {actionDone ? (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl text-center space-y-6 animate-in fade-in">
            {actionDone.action === "accept" ? (
              <>
                <div className="w-16 h-16 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle className="w-10 h-10" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Emergency Access Granted</h2>
                  <p className="text-sm text-emerald-400 mt-2 font-medium">
                    {actionDone.message}
                  </p>
                  <p className="text-xs text-slate-400 mt-2">
                    Access will automatically expire at:{" "}
                    <span className="text-white font-mono">{new Date(actionDone.access_expires_at).toLocaleString()}</span>
                  </p>
                </div>
              </>
            ) : (
              <>
                <div className="w-16 h-16 bg-red-500/10 text-red-400 border border-red-500/30 rounded-full flex items-center justify-center mx-auto">
                  <XCircle className="w-10 h-10" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Request Declined</h2>
                  <p className="text-sm text-red-400 mt-2 font-medium">
                    Emergency full access request was declined. Access remains locked.
                  </p>
                </div>
              </>
            )}
          </div>
        ) : error || (tokenData && !tokenData.valid) ? (
          /* Error or Already Handled Banner */
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl text-center space-y-4">
            <div className="w-12 h-12 bg-amber-500/10 text-amber-400 border border-amber-500/30 rounded-full flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold text-white">
              {tokenData?.already_handled ? "Request Already Handled or Expired" : "Invalid Request"}
            </h2>
            <p className="text-xs text-slate-400">
              {error || tokenData?.message || "This approval link is no longer active."}
            </p>
          </div>
        ) : (
          /* Approval Card */
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6">
            <div className="border-b border-slate-800 pb-4">
              <span className="text-[10px] uppercase font-bold tracking-wider text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/30">
                Action Required
              </span>
              <h2 className="text-xl font-bold text-white mt-3">
                Emergency Record Access Requested
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                A doctor is requesting temporary full read-only access to patient records in the Emergency Room.
              </p>
            </div>

            {/* Request Details */}
            <div className="space-y-3 text-xs bg-slate-950 p-4 rounded-xl border border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-blue-400" /> Patient Name
                </span>
                <span className="font-bold text-white">{tokenData.patient_name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <Stethoscope className="w-3.5 h-3.5 text-emerald-400" /> Requesting Doctor
                </span>
                <span className="font-bold text-white">{tokenData.doctor_name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <Building className="w-3.5 h-3.5 text-purple-400" /> Hospital / ER Unit
                </span>
                <span className="font-bold text-slate-200">{tokenData.hospital}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-amber-400" /> Requested Duration
                </span>
                <span className="font-bold text-amber-400">{tokenData.access_hours} Hours</span>
              </div>
            </div>

            {/* Medical Reason */}
            <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 block mb-1">
                Medical Reason Stated by Doctor:
              </span>
              <p className="text-xs text-slate-200 leading-relaxed font-medium italic">
                "{tokenData.reason}"
              </p>
            </div>

            {/* Accept / Decline Buttons */}
            <div className="grid grid-cols-2 gap-4 pt-2">
              <button
                onClick={() => handleAction("decline")}
                disabled={isSubmitting}
                className="py-3.5 px-4 rounded-xl border border-red-500/40 bg-red-950/30 hover:bg-red-900/50 text-red-300 text-xs font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <XCircle className="w-4 h-4" /> Decline Access
              </button>

              <button
                onClick={() => handleAction("accept")}
                disabled={isSubmitting}
                className="py-3.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-slate-950 text-xs font-extrabold shadow-lg shadow-emerald-600/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>Processing...</>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" /> Accept & Grant Access
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      <footer className="text-center text-xs text-slate-600">
        MediCare Emergency Approval Workflow • Decision support only
      </footer>
    </div>
  );
}

export default function EmergencyApprovePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">Loading...</div>}>
      <EmergencyApproveContent />
    </Suspense>
  );
}
