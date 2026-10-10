"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  User,
  Stethoscope,
  Mail,
  Lock,
  Phone,
  Calendar,
  Droplet,
  Building2,
  FileCheck,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ShieldAlert,
  HeartPulse,
} from "lucide-react";
import {
  patientRegisterSchema,
  doctorRegisterSchema,
} from "@/lib/types/auth";
import { saveLocalSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/client";

type RegisterRole = "patient" | "doctor";

export default function RegisterPage() {
  const router = useRouter();
  const [role, setRole] = useState<RegisterRole>("patient");

  // Form State
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("+91");
  const [dob, setDob] = useState("");
  const [sex, setSex] = useState<"male" | "female" | "other">("male");
  const [bloodGroup, setBloodGroup] = useState<string>("B+");
  
  // Doctor-specific fields
  const [licenseNo, setLicenseNo] = useState("");
  const [hospital, setHospital] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      // 1. Zod Validation
      if (role === "patient") {
        const parsed = patientRegisterSchema.safeParse({
          full_name: fullName,
          email,
          password,
          phone,
          dob,
          sex,
          blood_group: bloodGroup,
        });

        if (!parsed.success) {
          throw new Error(parsed.error.errors[0]?.message || "Invalid patient data");
        }
      } else {
        const parsed = doctorRegisterSchema.safeParse({
          full_name: fullName,
          email,
          password,
          phone,
          license_no: licenseNo,
          hospital,
        });

        if (!parsed.success) {
          throw new Error(parsed.error.errors[0]?.message || "Invalid doctor data");
        }
      }

      // Create and confirm the account server-side without sending an email.
      const response = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role,
          full_name: fullName,
          email,
          password,
          phone,
          ...(role === "patient"
            ? { dob, sex, blood_group: bloodGroup }
            : { license_no: licenseNo, hospital }),
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Registration failed.");

      const supabase = createClient();
      const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({ email, password });
      if (loginError || !loginData.user) {
        throw new Error("Your account was created, but automatic sign-in failed. Please sign in with your email and password.");
      }

      saveLocalSession({
        user: { id: loginData.user.id, email: loginData.user.email || email, role },
        profile: {
          id: loginData.user.id,
          role,
          full_name: fullName,
          phone,
          health_id: result.health_id,
          ...(role === "patient" ? { dob, sex, blood_group: bloodGroup as "A+" | "A-" | "B+" | "B-" | "AB+" | "AB-" | "O+" | "O-" } : {}),
          emergency_enabled: role === "patient",
          emergency_fields: role === "patient" ? ["blood_group", "allergies", "conditions", "medications"] : [],
          emergency_access_hours: role === "patient" ? 24 : 0,
        },
        ...(role === "doctor" ? {
          doctorProfile: { user_id: loginData.user.id, license_no: licenseNo, hospital, verified: false },
        } : {}),
      });

      setSuccess(
        "Account created and saved. You are now signed in."
      );
      setTimeout(() => router.push(role === "doctor" ? "/emergency" : "/summary"), 700);

    } catch (err: any) {
      setError(err?.message || "Failed to complete registration.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center px-4 py-12 relative overflow-hidden">
      {/* Ambient background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-500/10 rounded-full blur-[140px] pointer-events-none" />

      <div className="w-full max-w-xl relative z-10">
        
        {/* Header Title */}
        <div className="text-center mb-8 space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center text-[#071410] mx-auto shadow-lg shadow-emerald-500/25">
            <HeartPulse className="w-7 h-7 stroke-[2.5]" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Create your MediCare Account
          </h1>
          <p className="text-xs sm:text-sm text-emerald-300/70">
            Join the unified patient health records platform
          </p>
        </div>

        {/* Card */}
        <div className="rounded-2xl bg-[#091b15]/90 border border-emerald-500/30 p-6 sm:p-8 shadow-2xl backdrop-blur-xl space-y-6">
          
          {/* Role Toggle Selector */}
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-emerald-200/90">
              I am registering as:
            </label>
            <div className="grid grid-cols-2 gap-2 p-1.5 rounded-xl bg-[#061510] border border-emerald-900/60">
              <button
                type="button"
                onClick={() => {
                  setRole("patient");
                  setError(null);
                }}
                className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs font-semibold transition-all ${
                  role === "patient"
                    ? "bg-emerald-500 text-[#071410] shadow-md"
                    : "text-emerald-300/70 hover:text-white"
                }`}
              >
                <User className="w-4 h-4" />
                Patient
              </button>
              <button
                type="button"
                onClick={() => {
                  setRole("doctor");
                  setError(null);
                }}
                className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs font-semibold transition-all ${
                  role === "doctor"
                    ? "bg-emerald-500 text-[#071410] shadow-md"
                    : "text-emerald-300/70 hover:text-white"
                }`}
              >
                <Stethoscope className="w-4 h-4" />
                Doctor
              </button>
            </div>
          </div>

          {/* Feedback messages */}
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-950/50 border border-rose-500/40 text-xs text-rose-200 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-3.5 rounded-xl bg-emerald-950/60 border border-emerald-400/50 text-xs text-emerald-200 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>{success}</span>
            </div>
          )}

          {/* Doctor Warning Banner */}
          {role === "doctor" && (
            <div className="p-3.5 rounded-xl bg-teal-950/40 border border-teal-500/30 text-xs text-teal-200/90 flex items-start gap-2.5">
              <ShieldAlert className="w-4 h-4 text-teal-400 flex-shrink-0 mt-0.5" />
              <div>
                <strong className="text-teal-300">Doctor Verification Policy:</strong> Doctor accounts start unverified. Your license must be reviewed before patient emergency lookup is enabled.
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleRegister} className="space-y-4">
            
            {/* Full Name */}
            <div>
              <label className="block text-xs font-medium text-emerald-200/90 mb-1.5">
                {role === "doctor" ? "Doctor Full Name" : "Patient Full Name"}
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder={role === "doctor" ? "Dr. Priya Patel" : "Ramesh Sharma"}
                required
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#061510] border border-emerald-900/60 text-white placeholder-emerald-700 text-sm focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 transition-colors"
              />
            </div>

            {/* Email & Password Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-emerald-200/90 mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-emerald-400/60" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="user@example.com"
                    required
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-[#061510] border border-emerald-900/60 text-white placeholder-emerald-700 text-sm focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-emerald-200/90 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-emerald-400/60" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    required
                    minLength={6}
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-[#061510] border border-emerald-900/60 text-white placeholder-emerald-700 text-sm focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 transition-colors"
                  />
                </div>
              </div>
            </div>

            {/* Phone Number */}
            <div>
              <label className="block text-xs font-medium text-emerald-200/90 mb-1.5">
                Phone Number (E.164 Format)
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-emerald-400/60" />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+919876543210"
                  required
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-[#061510] border border-emerald-900/60 text-white placeholder-emerald-700 text-sm focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 transition-colors font-mono"
                />
              </div>
              <p className="text-[11px] text-emerald-400/60 mt-1">
                Required for emergency lookup & verification alerts
              </p>
            </div>

            {/* Conditional Patient Fields */}
            {role === "patient" && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-emerald-200/90 mb-1.5">
                      Date of Birth
                    </label>
                    <input
                      type="date"
                      value={dob}
                      onChange={(e) => setDob(e.target.value)}
                      required
                      className="w-full px-3 py-2 rounded-xl bg-[#061510] border border-emerald-900/60 text-white text-xs focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-emerald-200/90 mb-1.5">
                      Sex
                    </label>
                    <select
                      value={sex}
                      onChange={(e) => setSex(e.target.value as any)}
                      className="w-full px-3 py-2.5 rounded-xl bg-[#061510] border border-emerald-900/60 text-white text-xs focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 transition-colors"
                    >
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-emerald-200/90 mb-1.5">
                      Blood Group
                    </label>
                    <select
                      value={bloodGroup}
                      onChange={(e) => setBloodGroup(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl bg-[#061510] border border-emerald-900/60 text-white text-xs focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 transition-colors font-semibold text-emerald-300"
                    >
                      {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((bg) => (
                        <option key={bg} value={bg}>
                          {bg}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

              </>
            )}

            {/* Conditional Doctor Fields */}
            {role === "doctor" && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-emerald-200/90 mb-1.5">
                    Medical Council License / Reg Number
                  </label>
                  <div className="relative">
                    <FileCheck className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-emerald-400/60" />
                    <input
                      type="text"
                      value={licenseNo}
                      onChange={(e) => setLicenseNo(e.target.value)}
                      placeholder="e.g. KMC-48291-MED or MCI/2018/002"
                      required
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-[#061510] border border-emerald-900/60 text-white placeholder-emerald-700 text-sm focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-emerald-200/90 mb-1.5">
                    Hospital / Practice Affiliation
                  </label>
                  <div className="relative">
                    <Building2 className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-emerald-400/60" />
                    <input
                      type="text"
                      value={hospital}
                      onChange={(e) => setHospital(e.target.value)}
                      placeholder="e.g. Apollo Specialty Hospital"
                      required
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-[#061510] border border-emerald-900/60 text-white placeholder-emerald-700 text-sm focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 transition-colors"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-emerald-400 text-[#071410] font-semibold text-sm hover:bg-emerald-300 transition-all shadow-lg shadow-emerald-400/20 hover:shadow-emerald-400/30 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed pt-3"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-[#071410] border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>Register as {role === "patient" ? "Patient" : "Doctor"}</span>
                  <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                </>
              )}
            </button>
          </form>

          {/* Footer link to Login */}
          <div className="pt-2 text-center border-t border-emerald-900/40">
            <p className="text-xs text-emerald-300/70">
              Already have an account?{" "}
              <Link
                href="/login"
                className="font-semibold text-emerald-400 hover:text-emerald-300 underline underline-offset-2 ml-1"
              >
                Sign in to your account
              </Link>
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}
