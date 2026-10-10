"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  User,
  Stethoscope,
  ShieldAlert,
  Lock,
  Mail,
  ArrowRight,
  Sparkles,
  CheckCircle,
  AlertCircle,
  HeartPulse,
} from "lucide-react";
import { DEMO_CREDENTIALS, saveLocalSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/client";

type RoleTab = "patient" | "doctor" | "admin";

export default function LoginPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<RoleTab>("patient");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Quick fill helper for judges & reviewers
  const handleQuickFill = (role: RoleTab) => {
    setActiveTab(role);
    const creds = DEMO_CREDENTIALS[role];
    setEmail(creds.email);
    setPassword(creds.password);
    setError(null);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      // 1. Check if user is signing in with demo credentials
      if (
        (activeTab === "patient" && email === DEMO_CREDENTIALS.patient.email) ||
        (activeTab === "doctor" && email === DEMO_CREDENTIALS.doctor.email) ||
        (activeTab === "admin" && email === DEMO_CREDENTIALS.admin.email)
      ) {
        const demo = DEMO_CREDENTIALS[activeTab];
        saveLocalSession({
          user: { id: demo.profile.id, email: demo.email, role: demo.role },
          profile: demo.profile,
          doctorProfile: "doctorProfile" in demo ? demo.doctorProfile : undefined,
        });

        setSuccessMsg(`Welcome, ${demo.profile.full_name}! Logging you in...`);
        setTimeout(() => {
          if (activeTab === "doctor") {
            router.push("/emergency");
          } else if (activeTab === "admin") {
            router.push("/admin");
          } else {
            router.push("/summary");
          }
        }, 1000);
        return;
      }

      // 2. Otherwise try Supabase Auth
      const supabase = createClient();
      const { data, error: sbError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (sbError) {
        // If Supabase is not configured or user not found, provide clear guidance
        if (sbError.message.includes("Invalid login credentials")) {
          throw new Error("Invalid email or password. You can also use the demo buttons below for instant testing.");
        }
        throw new Error(sbError.message);
      }

      setSuccessMsg("Login successful! Redirecting...");
      setTimeout(() => {
        router.push(activeTab === "doctor" ? "/emergency" : "/summary");
      }, 1000);
    } catch (err: any) {
      setError(err?.message || "An unexpected error occurred during login.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center px-4 py-12 relative overflow-hidden">
      {/* Background radial glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] bg-emerald-500/10 rounded-full blur-[140px] pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        
        {/* Header Icon & Title */}
        <div className="text-center mb-8 space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center text-[#071410] mx-auto shadow-lg shadow-emerald-500/25">
            <HeartPulse className="w-7 h-7 stroke-[2.5]" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Sign In to MediCare
          </h1>
          <p className="text-xs sm:text-sm text-emerald-300/70">
            Access your patient records or doctor clinical portal
          </p>
        </div>

        {/* Main Card */}
        <div className="rounded-2xl bg-[#091b15]/90 border border-emerald-500/30 p-6 sm:p-8 shadow-2xl backdrop-blur-xl space-y-6">
          
          {/* Role Switcher Tabs */}
          <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-[#061510] border border-emerald-900/50">
            <button
              type="button"
              onClick={() => {
                setActiveTab("patient");
                setError(null);
              }}
              className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === "patient"
                  ? "bg-emerald-500 text-[#071410] shadow-sm"
                  : "text-emerald-300/70 hover:text-white"
              }`}
            >
              <User className="w-3.5 h-3.5" />
              Patient
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab("doctor");
                setError(null);
              }}
              className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === "doctor"
                  ? "bg-emerald-500 text-[#071410] shadow-sm"
                  : "text-emerald-300/70 hover:text-white"
              }`}
            >
              <Stethoscope className="w-3.5 h-3.5" />
              Doctor
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab("admin");
                setError(null);
              }}
              className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === "admin"
                  ? "bg-emerald-500 text-[#071410] shadow-sm"
                  : "text-emerald-300/70 hover:text-white"
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              Admin
            </button>
          </div>

          {/* Quick Demo Pill Bar for Judges */}
          <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/20 space-y-2">
            <div className="flex items-center justify-between text-[11px] font-medium text-emerald-300/80">
              <span className="flex items-center gap-1.5 text-emerald-300">
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                Hackathon Demo Quick-Fill:
              </span>
              <span className="text-[10px] text-emerald-400/60 font-mono">1-Click</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => handleQuickFill("patient")}
                className="text-[11px] px-2.5 py-1 rounded-md bg-[#0a231b] hover:bg-emerald-800/40 text-emerald-200 border border-emerald-500/30 transition-colors"
              >
                👤 Demo Patient
              </button>
              <button
                type="button"
                onClick={() => handleQuickFill("doctor")}
                className="text-[11px] px-2.5 py-1 rounded-md bg-[#0a231b] hover:bg-emerald-800/40 text-emerald-200 border border-emerald-500/30 transition-colors"
              >
                🩺 Demo Doctor
              </button>
              <button
                type="button"
                onClick={() => handleQuickFill("admin")}
                className="text-[11px] px-2.5 py-1 rounded-md bg-[#0a231b] hover:bg-emerald-800/40 text-emerald-200 border border-emerald-500/30 transition-colors"
              >
                🛡️ Demo Admin
              </button>
            </div>
          </div>

          {/* Feedback Alerts */}
          {error && (
            <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-500/40 text-xs text-rose-200 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-400/50 text-xs text-emerald-200 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-emerald-200/90 mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-emerald-400/60" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={
                    activeTab === "doctor"
                      ? "doctor@medicare.demo"
                      : activeTab === "admin"
                      ? "admin@medicare.demo"
                      : "patient@medicare.demo"
                  }
                  required
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#061510] border border-emerald-900/60 text-white placeholder-emerald-700 text-sm focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-emerald-200/90 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-emerald-400/60" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#061510] border border-emerald-900/60 text-white placeholder-emerald-700 text-sm focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-emerald-400 text-[#071410] font-semibold text-sm hover:bg-emerald-300 transition-all shadow-lg shadow-emerald-400/20 hover:shadow-emerald-400/30 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-[#071410] border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>Sign In as {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}</span>
                  <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                </>
              )}
            </button>
          </form>

          {/* Footer link to Register */}
          <div className="pt-2 text-center border-t border-emerald-900/40">
            <p className="text-xs text-emerald-300/70">
              New to MediCare?{" "}
              <Link
                href="/register"
                className="font-semibold text-emerald-400 hover:text-emerald-300 underline underline-offset-2 ml-1"
              >
                Create new Patient or Doctor account
              </Link>
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}
