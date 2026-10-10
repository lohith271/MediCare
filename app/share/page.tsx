"use client";

import { useState } from "react";
import { useSession } from "@/lib/auth";
import SignInRequired from "@/components/SignInRequired";
import { Shield, Key, Copy, Check, AlertTriangle, Clock, RefreshCw, XCircle, Share2, Lock } from "lucide-react";

interface ShareItem {
  id: string;
  code_hash: string;
  scope: string[];
  expires_at: string;
  revoked_at?: string | null;
  max_uses: number;
  use_count: number;
  created_at?: string;
}

export default function SharePage() {
  const { session, loading: sessionLoading } = useSession();
  const [scopeAll, setScopeAll] = useState(true);
  const [selectedScope, setSelectedScope] = useState<string[]>([
    "allergies",
    "medications",
    "conditions",
    "lab_results",
  ]);
  const [expiry, setExpiry] = useState("24h");
  const [customDate, setCustomDate] = useState("");
  const [maxUses, setMaxUses] = useState(3);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [shares, setShares] = useState<ShareItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleScopeCategory = (cat: string) => {
    if (scopeAll) setScopeAll(false);
    if (selectedScope.includes(cat)) {
      setSelectedScope(selectedScope.filter((c) => c !== cat));
    } else {
      setSelectedScope([...selectedScope, cat]);
    }
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsGenerating(true);
    setError(null);
    setGeneratedCode(null);

    const finalScope = scopeAll ? ["all"] : selectedScope;
    const finalExpiry = expiry === "custom" ? customDate : expiry;

    try {
      const res = await fetch("/api/share/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scope: finalScope,
          expiry: finalExpiry,
          max_uses: maxUses,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to generate share code");
      }

      setGeneratedCode(data.code);
      // Add to local list
      const newItem: ShareItem = {
        id: data.share_id,
        code_hash: data.code,
        scope: data.scope,
        expires_at: data.expires_at,
        max_uses: data.max_uses,
        use_count: 0,
        created_at: new Date().toISOString(),
      };
      setShares([newItem, ...shares]);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRevoke = async (shareId: string) => {
    try {
      const res = await fetch("/api/share/revoke", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          share_id: shareId,
        }),
      });
      if (res.ok) {
        setShares(
          shares.map((s) =>
            s.id === shareId ? { ...s, revoked_at: new Date().toISOString() } : s
          )
        );
      }
    } catch (_err) {
      // Ignore
    }
  };

  const copyToClipboard = () => {
    if (!generatedCode) return;
    navigator.clipboard.writeText(generatedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  if (!sessionLoading && !session) return <SignInRequired />;
  if (session && session.user.role !== "patient") {
    return <SignInRequired message="Share codes are created from a patient account." showLink={false} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-16">
      {/* Header Banner */}
      <header className="bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-900 text-white py-10 px-4 sm:px-6 shadow-md">
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/30 text-blue-100 text-xs font-semibold mb-3 backdrop-blur-sm border border-blue-400/30">
              <Shield className="w-3.5 h-3.5" /> Patient Control & Security
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Temporary Doctor Access Codes
            </h1>
            <p className="text-blue-100 text-sm mt-1">
              Generate timed 8-character codes to grant doctors read-only access to specific records.
            </p>
          </div>
          <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md px-4 py-3 rounded-xl border border-white/20">
            <Lock className="w-5 h-5 text-blue-200" />
            <div className="text-xs">
              <span className="text-blue-200 block">Health ID</span>
              <span className="font-mono font-semibold">{session?.profile?.health_id || "—"}</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 mt-8 space-y-8">
        {/* Code Generation Form */}
        <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-slate-200">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
            <div className="p-3 bg-blue-50 rounded-xl text-blue-600">
              <Key className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Generate Access Code</h2>
              <p className="text-xs text-slate-500">Configure scope, expiry time, and max uses</p>
            </div>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleGenerate} className="space-y-6">
            {/* Scope Selection */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-3">
                1. Select Access Scope
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label
                  className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all ${
                    scopeAll
                      ? "bg-blue-50/70 border-blue-500 text-blue-900 ring-2 ring-blue-500/20"
                      : "bg-slate-50 border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={scopeAll}
                    onChange={(e) => {
                      setScopeAll(e.target.checked);
                      if (e.target.checked) {
                        setSelectedScope(["allergies", "medications", "conditions", "lab_results"]);
                      }
                    }}
                    className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                  />
                  <div>
                    <span className="font-semibold text-sm block">Full Record Access</span>
                    <span className="text-xs text-slate-500">All medical history, tests, and medicines</span>
                  </div>
                </label>

                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
                  <span className="text-xs font-semibold uppercase text-slate-500 tracking-wider block mb-1">
                    Or Pick Specific Categories:
                  </span>
                  {[
                    { id: "allergies", label: "Allergies & Reactions" },
                    { id: "medications", label: "Current & Past Medicines" },
                    { id: "conditions", label: "Diagnoses & Conditions" },
                    { id: "lab_results", label: "Lab Tests & Reports" },
                  ].map((cat) => (
                    <label key={cat.id} className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={scopeAll || selectedScope.includes(cat.id)}
                        disabled={scopeAll}
                        onChange={() => toggleScopeCategory(cat.id)}
                        className="w-3.5 h-3.5 text-blue-600 rounded border-slate-300"
                      />
                      <span>{cat.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Expiry Selection */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  2. Expiry Duration
                </label>
                <select
                  value={expiry}
                  onChange={(e) => setExpiry(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                >
                  <option value="1h">1 Hour (Quick Visit)</option>
                  <option value="24h">24 Hours (Standard Consultation)</option>
                  <option value="7d">7 Days (Follow-up Care)</option>
                  <option value="custom">Custom ISO Date/Time</option>
                </select>
                {expiry === "custom" && (
                  <input
                    type="datetime-local"
                    value={customDate}
                    onChange={(e) => setCustomDate(e.target.value)}
                    className="w-full mt-2 px-4 py-2 rounded-xl border border-slate-300 text-sm"
                    required
                  />
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  3. Max Allowed Uses
                </label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={maxUses}
                  onChange={(e) => setMaxUses(parseInt(e.target.value) || 1)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
                <p className="text-xs text-slate-500 mt-1">Access automatically revokes after N uses.</p>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isGenerating}
              className="w-full py-3.5 px-6 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm shadow-md shadow-blue-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" /> Generating Code...
                </>
              ) : (
                <>
                  <Share2 className="w-4 h-4" /> Generate 8-Character Temporary Code
                </>
              )}
            </button>
          </form>
        </div>

        {/* Revealed Code Modal / Banner */}
        {generatedCode && (
          <div className="bg-gradient-to-br from-emerald-900 to-teal-900 text-white rounded-2xl p-6 sm:p-8 shadow-xl border border-emerald-500/30 relative overflow-hidden animate-in fade-in slide-in-from-bottom-4">
            <div className="absolute top-0 right-0 p-8 opacity-10">
              <Key className="w-40 h-40" />
            </div>

            <div className="relative z-10 space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-400/20 text-emerald-200 text-xs font-semibold border border-emerald-400/30">
                <Check className="w-3.5 h-3.5" /> Share Code Active
              </div>

              <div>
                <h3 className="text-lg font-bold text-white">Your Temporary Access Code</h3>
                <p className="text-emerald-200 text-xs mt-1">
                  Share this 8-character code with your doctor to open the Access Portal at{" "}
                  <span className="font-mono text-emerald-300 font-semibold">/access</span>
                </p>
              </div>

              {/* Big Code Display */}
              <div className="flex flex-col sm:flex-row items-center gap-4 bg-black/40 backdrop-blur-md p-4 sm:p-6 rounded-2xl border border-emerald-400/30">
                <span className="font-mono text-4xl sm:text-5xl font-extrabold tracking-widest text-emerald-300 select-all">
                  {generatedCode}
                </span>

                <button
                  onClick={copyToClipboard}
                  className="sm:ml-auto w-full sm:w-auto px-5 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm flex items-center justify-center gap-2 shadow-lg transition-all"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4 text-slate-950" /> Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" /> Copy Code
                    </>
                  )}
                </button>
              </div>

              <div className="flex items-start gap-2 bg-emerald-950/60 p-3 rounded-xl border border-emerald-500/20 text-xs text-emerald-200">
                <AlertTriangle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Important Security Notice:</strong> This code is shown ONLY ONCE now for security.
                  The server only stores a secure hash. Provide this code directly to your doctor.
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Active Shares List */}
        {shares.length > 0 && (
          <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-600" /> Active & Generated Shares
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4">Code Preview</th>
                    <th className="py-3 px-4">Scope</th>
                    <th className="py-3 px-4">Expires</th>
                    <th className="py-3 px-4">Uses</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {shares.map((s) => {
                    const isRevoked = !!s.revoked_at;
                    const isExpired = new Date(s.expires_at) <= new Date();
                    return (
                      <tr key={s.id} className="hover:bg-slate-50">
                        <td className="py-3 px-4 font-mono font-bold text-slate-800">
                          {s.code_hash.substring(0, 8)}...
                        </td>
                        <td className="py-3 px-4">
                          <span className="inline-block px-2 py-1 bg-slate-100 text-slate-700 rounded-md">
                            {s.scope.join(", ")}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-600">
                          {new Date(s.expires_at).toLocaleString()}
                        </td>
                        <td className="py-3 px-4 font-medium text-slate-700">
                          {s.use_count} / {s.max_uses}
                        </td>
                        <td className="py-3 px-4">
                          {isRevoked ? (
                            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                              Revoked
                            </span>
                          ) : isExpired ? (
                            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                              Expired
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
                              Active
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          {!isRevoked && !isExpired && (
                            <button
                              onClick={() => handleRevoke(s.id)}
                              className="px-3 py-1 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg font-medium flex items-center gap-1 ml-auto text-xs"
                            >
                              <XCircle className="w-3.5 h-3.5" /> Revoke
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* Footer Disclaimer */}
      <footer className="mt-16 text-center text-xs text-slate-400 px-4">
        MediCare is a patient records app, not insurance. Demo with simulated data. Decision support only, not a diagnosis.
      </footer>
    </div>
  );
}
