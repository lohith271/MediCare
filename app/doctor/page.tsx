"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { KeyRound, ShieldAlert, FolderOpen, ArrowRight } from "lucide-react";
import SignInRequired from "@/components/SignInRequired";
import { useSession } from "@/lib/auth";

export default function DoctorDashboardPage() {
  const { session, loading } = useSession();
  const [hasOpenRecord, setHasOpenRecord] = useState(false);

  useEffect(() => {
    if (session?.user.role !== "doctor") return;
    fetch("/api/shared/record", { cache: "no-store" })
      .then((r) => setHasOpenRecord(r.ok))
      .catch(() => setHasOpenRecord(false));
  }, [session]);

  if (loading) return <p className="p-10 text-center text-sm text-emerald-200/70">Loading…</p>;
  if (!session) return <SignInRequired />;
  if (session.user.role !== "doctor") {
    return <SignInRequired message="This dashboard is for doctor accounts." showLink={false} />;
  }

  const doctor = session.profile.full_name;

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 py-10 space-y-8">
      <header>
        <p className="text-xs uppercase tracking-wider text-emerald-300/70 font-semibold">Doctor dashboard</p>
        <h1 className="text-2xl font-bold text-emerald-50 mt-1">Welcome, {doctor}</h1>
        <p className="text-sm text-emerald-200/70 mt-1">Open a patient&apos;s record with their code, or look up a patient in an emergency.</p>
      </header>

      {hasOpenRecord && (
        <Link href="/shared" className="flex items-center justify-between gap-4 rounded-2xl border border-emerald-400/40 bg-emerald-500/10 p-5 hover:bg-emerald-500/15 transition">
          <div>
            <p className="font-bold text-emerald-50">You have a patient record open</p>
            <p className="text-sm text-emerald-200/70">Continue reading the shared record.</p>
          </div>
          <ArrowRight className="w-5 h-5 text-emerald-300 shrink-0" />
        </Link>
      )}

      <div className="grid gap-5 md:grid-cols-2">
        <Link href="/access" className="group rounded-2xl border border-emerald-900/40 bg-slate-900/60 p-6 hover:border-emerald-500/50 transition">
          <div className="w-11 h-11 rounded-xl bg-emerald-500/15 flex items-center justify-center mb-4">
            <KeyRound className="w-5 h-5 text-emerald-300" />
          </div>
          <h2 className="font-bold text-lg text-emerald-50">Enter patient code</h2>
          <p className="text-sm text-emerald-200/70 mt-1">
            Use the 8-character code the patient gives you to read their full record until the code expires.
          </p>
          <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-emerald-300 group-hover:underline">
            Open record <ArrowRight className="w-4 h-4" />
          </span>
        </Link>

        <Link href="/emergency" className="group rounded-2xl border border-rose-900/40 bg-slate-900/60 p-6 hover:border-rose-500/50 transition">
          <div className="w-11 h-11 rounded-xl bg-rose-500/15 flex items-center justify-center mb-4">
            <ShieldAlert className="w-5 h-5 text-rose-300" />
          </div>
          <h2 className="font-bold text-lg text-emerald-50">Emergency ER lookup</h2>
          <p className="text-sm text-emerald-200/70 mt-1">
            Find a patient by Health ID. The patient is notified and access is approved through their trusted contacts.
          </p>
          <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-rose-300 group-hover:underline">
            Start lookup <ArrowRight className="w-4 h-4" />
          </span>
        </Link>
      </div>

      <div className="flex items-start gap-3 rounded-xl border border-emerald-900/40 bg-slate-900/40 p-4 text-xs text-emerald-200/60">
        <FolderOpen className="w-4 h-4 mt-0.5 shrink-0" />
        Every record you open is written to the patient&apos;s access log. Decision support only, not a medical diagnosis.
      </div>
    </main>
  );
}
