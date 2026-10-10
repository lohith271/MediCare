"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Clock, LogOut, RefreshCw } from "lucide-react";
import SignInRequired from "@/components/SignInRequired";
import { useSession } from "@/lib/auth";
import type { ClinicalSummary, SummaryMedication } from "@/lib/types/summary";

interface SharedRecord {
  access: { actor_type: string; expires_at: string | null };
  profile: {
    full_name: string;
    dob: string | null;
    sex: string | null;
    blood_group: string | null;
    health_id: string;
    phone: string | null;
  };
  summary: ClinicalSummary;
  medications: Array<{ id: string; name_as_written: string; strength?: string; frequency?: string; start_date?: string; patient_marked_stopped?: boolean }>;
  diagnoses: Array<{ id: string; name_canonical: string; diagnosed_date?: string; doctor_name?: string; hospital?: string; status?: string }>;
  allergies: Array<{ id: string; substance: string; reaction?: string | null; created_on?: string }>;
  labs: Array<{ id: string; test_name: string; value_text?: string; unit?: string; ref_range?: string; flag?: string; taken_on?: string; lab_name?: string }>;
  encounters: Array<{ id: string; kind: string; start_date: string; doctor_name?: string; hospital?: string; reason?: string; next_visit_date?: string }>;
  appointments: Array<{ id: string; scheduled_date: string; doctor_name: string; hospital: string; reason: string; status: string }>;
  vault: Array<{ id: string; title: string; category: string; doc_date: string; hospital?: string }>;
  documents: Array<{ id: string; file_name: string; doc_type?: string; doc_date?: string; file_url?: string | null }>;
}

type Tab = "overview" | "medicines" | "labs" | "visits" | "documents";

const TABS: Array<{ key: Tab; label: string }> = [
  { key: "overview", label: "Overview" },
  { key: "medicines", label: "Medicines" },
  { key: "labs", label: "Lab results" },
  { key: "visits", label: "Visits & follow-ups" },
  { key: "documents", label: "Documents" },
];

const card = "rounded-2xl border border-emerald-900/40 bg-slate-900/60 p-5";
const muted = "text-xs text-emerald-200/60";

function fmtDate(value?: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  return isNaN(d.getTime()) ? value : d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function Empty({ text }: { text: string }) {
  return <p className="text-sm text-emerald-200/60 py-6 text-center">{text}</p>;
}

function MedicineRow({ med }: { med: SummaryMedication }) {
  return (
    <li className="py-3 border-b border-emerald-900/30 last:border-0">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-semibold text-emerald-50">{med.display_name}</span>
        {med.dose_conflict && (
          <span className="text-[11px] px-2 py-0.5 rounded bg-amber-950 text-amber-200 border border-amber-800">Needs doctor review</span>
        )}
      </div>
      <p className={muted}>
        {[med.strength, med.frequency, med.prescriber && `by ${med.prescriber}`, med.prescribed_date && fmtDate(med.prescribed_date)]
          .filter(Boolean)
          .join(" · ") || "Details not recorded"}
      </p>
      {med.warnings?.map((w) => (
        <p key={w} className="text-xs text-amber-200 mt-1">{w}</p>
      ))}
    </li>
  );
}

export default function SharedRecordPage() {
  const router = useRouter();
  const { session, loading: sessionLoading } = useSession();
  const [record, setRecord] = useState<SharedRecord | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("overview");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/shared/record", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not load the record");
      setRecord(data as SharedRecord);
    } catch (err) {
      setRecord(null);
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (session?.user.role === "doctor") load();
  }, [session, load]);

  if (sessionLoading) return <p className="p-10 text-center text-sm text-emerald-200/70">Loading…</p>;
  if (!session) return <SignInRequired />;
  if (session.user.role !== "doctor") {
    return <SignInRequired message="Shared records are opened by doctors with a patient code." showLink={false} />;
  }

  async function endAccess() {
    await fetch("/api/share/leave", { method: "POST" });
    router.push("/access");
  }

  if (loading) {
    return <main className="max-w-6xl mx-auto px-4 py-10 text-sm text-emerald-200/70">Loading patient record…</main>;
  }

  if (error || !record) {
    return (
      <main className="max-w-md mx-auto px-4 py-16 space-y-4 text-center">
        <AlertTriangle className="w-8 h-8 text-amber-300 mx-auto" />
        <p className="text-emerald-50 font-semibold">{error || "No patient record is open."}</p>
        <div className="flex justify-center gap-3">
          <button onClick={load} className="px-4 py-2 rounded-lg bg-emerald-500/20 text-emerald-100 text-sm font-semibold">Try again</button>
          <button onClick={() => router.push("/access")} className="px-4 py-2 rounded-lg border border-emerald-800 text-emerald-200 text-sm font-semibold">Enter a code</button>
        </div>
      </main>
    );
  }

  const p = record.profile;
  const s = record.summary;
  const expires = record.access.expires_at;

  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* Header */}
      <section className={`${card} flex flex-col md:flex-row md:items-center justify-between gap-4`}>
        <div>
          <p className="text-[11px] uppercase tracking-wider text-emerald-300/80 font-semibold">Shared patient record · read only</p>
          <h1 className="text-2xl font-bold text-emerald-50 mt-1">{p.full_name}</h1>
          <p className={muted}>
            Health ID {p.health_id}
            {p.blood_group && ` · Blood group ${p.blood_group}`}
            {p.sex && ` · ${p.sex}`}
            {p.dob && ` · DOB ${fmtDate(p.dob)}`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {expires && (
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full bg-amber-950/60 text-amber-200 border border-amber-800">
              <Clock className="w-3.5 h-3.5" /> Access until {new Date(expires).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
            </span>
          )}
          <button onClick={load} className="p-2 rounded-lg border border-emerald-900 text-emerald-200 hover:bg-emerald-500/10" title="Refresh">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button onClick={endAccess} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-rose-900 text-rose-300 text-xs font-semibold hover:bg-rose-950/40">
            <LogOut className="w-3.5 h-3.5" /> End access
          </button>
        </div>
      </section>

      {/* Tabs */}
      <nav className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-3.5 py-2 rounded-lg text-sm font-semibold transition ${
              tab === t.key ? "bg-emerald-400 text-[#071410]" : "border border-emerald-900 text-emerald-200 hover:bg-emerald-500/10"
            }`}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {tab === "overview" && (
        <div className="grid gap-5 md:grid-cols-3">
          <section className={card}>
            <h2 className="font-bold text-rose-200 mb-3">Allergies</h2>
            {s.allergies.length === 0 && record.allergies.length === 0 ? (
              <Empty text="No allergies recorded" />
            ) : (
              <ul className="space-y-2">
                {s.allergies.map((a) => (
                  <li key={a.substance} className="text-sm">
                    <span className="font-semibold text-emerald-50">{a.substance}</span>
                    {a.reactions.length > 0 && <span className={muted}> · {a.reactions.join(", ")}</span>}
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section className={card}>
            <h2 className="font-bold text-emerald-100 mb-3">Current medicines ({s.current_medicines.length})</h2>
            {s.current_medicines.length === 0 ? (
              <Empty text="No current medicines" />
            ) : (
              <ul>{s.current_medicines.map((m) => <MedicineRow key={m.group_key} med={m} />)}</ul>
            )}
          </section>
          <section className={card}>
            <h2 className="font-bold text-emerald-100 mb-3">Conditions ({s.conditions.length})</h2>
            {s.conditions.length === 0 ? (
              <Empty text="No conditions recorded" />
            ) : (
              <ul className="space-y-2">
                {s.conditions.map((c) => (
                  <li key={c.name_canonical} className="text-sm">
                    <span className="font-semibold text-emerald-50">{c.name_canonical}</span>
                    <span className={muted}> · last mentioned {fmtDate(c.last_mentioned)}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <p className="md:col-span-3 text-xs text-emerald-200/50">{s.disclaimer}</p>
        </div>
      )}

      {tab === "medicines" && (
        <div className="grid gap-5 md:grid-cols-2">
          <section className={card}>
            <h2 className="font-bold text-emerald-100 mb-3">Current</h2>
            {s.current_medicines.length === 0 ? <Empty text="No current medicines" /> : <ul>{s.current_medicines.map((m) => <MedicineRow key={m.group_key} med={m} />)}</ul>}
          </section>
          <section className={card}>
            <h2 className="font-bold text-emerald-100 mb-3">Earlier</h2>
            {s.other_medicines.length === 0 ? <Empty text="No earlier medicines" /> : <ul>{s.other_medicines.map((m) => <MedicineRow key={m.group_key} med={m} />)}</ul>}
          </section>
        </div>
      )}

      {tab === "labs" && (
        <section className={card}>
          {record.labs.length === 0 ? (
            <Empty text="No lab results recorded" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs uppercase tracking-wider text-emerald-300/70">
                  <tr><th className="py-2">Test</th><th>Result</th><th>Reference</th><th>Flag</th><th>Date</th></tr>
                </thead>
                <tbody>
                  {record.labs.map((l) => (
                    <tr key={l.id} className="border-t border-emerald-900/30">
                      <td className="py-2 font-semibold text-emerald-50">{l.test_name}</td>
                      <td className="text-emerald-100">{l.value_text} {l.unit}</td>
                      <td className="text-emerald-200/70">{l.ref_range || "—"}</td>
                      <td>
                        {l.flag && l.flag !== "normal" ? (
                          <span className="text-xs px-2 py-0.5 rounded bg-rose-950 text-rose-200 border border-rose-800 uppercase">{l.flag}</span>
                        ) : (
                          <span className="text-xs text-emerald-300">normal</span>
                        )}
                      </td>
                      <td className="text-emerald-200/70">{fmtDate(l.taken_on)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {tab === "visits" && (
        <div className="grid gap-5 md:grid-cols-2">
          <section className={card}>
            <h2 className="font-bold text-emerald-100 mb-3">Consultations</h2>
            {record.encounters.length === 0 ? <Empty text="No consultations recorded" /> : (
              <ul className="space-y-3">
                {record.encounters.map((e) => (
                  <li key={e.id} className="text-sm border-b border-emerald-900/30 pb-3 last:border-0">
                    <p className="font-semibold text-emerald-50">{e.reason || e.kind} · {fmtDate(e.start_date)}</p>
                    <p className={muted}>{[e.doctor_name, e.hospital].filter(Boolean).join(" · ")}</p>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section className={card}>
            <h2 className="font-bold text-emerald-100 mb-3">Follow-up appointments</h2>
            {record.appointments.length === 0 ? <Empty text="No follow-ups scheduled" /> : (
              <ul className="space-y-3">
                {record.appointments.map((a) => (
                  <li key={a.id} className="text-sm border-b border-emerald-900/30 pb-3 last:border-0">
                    <p className="font-semibold text-emerald-50">{fmtDate(a.scheduled_date)} · {a.reason}</p>
                    <p className={muted}>{[a.doctor_name, a.hospital, a.status].filter(Boolean).join(" · ")}</p>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section className={`${card} md:col-span-2`}>
            <h2 className="font-bold text-emerald-100 mb-3">Diagnoses</h2>
            {record.diagnoses.length === 0 ? <Empty text="No diagnoses recorded" /> : (
              <ul className="grid gap-2 sm:grid-cols-2">
                {record.diagnoses.map((d) => (
                  <li key={d.id} className="text-sm text-emerald-50">
                    {d.name_canonical} <span className={muted}>· {fmtDate(d.diagnosed_date)}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}

      {tab === "documents" && (
        <div className="grid gap-5 md:grid-cols-2">
          <section className={card}>
            <h2 className="font-bold text-emerald-100 mb-3">Uploaded documents</h2>
            {record.documents.length === 0 ? <Empty text="No uploaded documents" /> : (
              <ul className="space-y-2">
                {record.documents.map((d) => (
                  <li key={d.id} className="flex items-center justify-between gap-3 text-sm border-b border-emerald-900/30 pb-2 last:border-0">
                    <span className="min-w-0">
                      <span className="font-semibold text-emerald-50 block truncate">{d.file_name}</span>
                      <span className={muted}>{[d.doc_type, fmtDate(d.doc_date)].filter(Boolean).join(" · ")}</span>
                    </span>
                    {d.file_url && (
                      <a href={d.file_url} target="_blank" rel="noreferrer" className="text-xs font-semibold text-emerald-300 hover:underline shrink-0">Open</a>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section className={card}>
            <h2 className="font-bold text-emerald-100 mb-3">Medical files &amp; scans</h2>
            {record.vault.length === 0 ? <Empty text="No medical files" /> : (
              <ul className="space-y-2">
                {record.vault.map((v) => (
                  <li key={v.id} className="text-sm border-b border-emerald-900/30 pb-2 last:border-0">
                    <p className="font-semibold text-emerald-50">{v.title}</p>
                    <p className={muted}>{[v.category.replace("_", " "), fmtDate(v.doc_date), v.hospital].filter(Boolean).join(" · ")}</p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </main>
  );
}
