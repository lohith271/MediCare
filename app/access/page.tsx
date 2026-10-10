"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, Loader2 } from "lucide-react";
import SignInRequired from "@/components/SignInRequired";
import { useSession } from "@/lib/auth";

export default function PatientCodePage() {
  const router = useRouter();
  const { session, loading } = useSession();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (loading) return <p className="p-10 text-center text-sm text-emerald-200/70">Loading…</p>;
  if (!session) return <SignInRequired />;
  if (session.user.role !== "doctor") {
    return <SignInRequired message="Patient codes are entered by doctors." showLink={false} />;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/share/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim().toUpperCase() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not verify the code");
      router.push("/shared");
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <main className="max-w-md mx-auto px-4 py-16">
      <div className="rounded-2xl border border-emerald-900/40 bg-slate-900/60 p-6 space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center">
            <KeyRound className="w-5 h-5 text-emerald-300" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-emerald-50">Enter patient code</h1>
            <p className="text-xs text-emerald-200/70">
              Ask the patient for their 8-character code. The code expires on the date they set.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            maxLength={8}
            autoComplete="off"
            placeholder="e.g. 7K3F9XQ2"
            className="w-full text-center tracking-[0.3em] text-lg font-mono uppercase rounded-xl bg-slate-950 border border-emerald-900/60 px-4 py-3 text-emerald-50 placeholder:text-emerald-200/30 focus:outline-none focus:border-emerald-400"
          />
          {error && (
            <p className="text-sm text-rose-300 bg-rose-950/40 border border-rose-900/50 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={busy || code.trim().length !== 8}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-400 text-[#071410] font-bold py-3 hover:bg-emerald-300 disabled:opacity-50 transition"
          >
            {busy && <Loader2 className="w-4 h-4 animate-spin" />}
            Open patient record
          </button>
        </form>
      </div>
    </main>
  );
}
