import Link from "next/link";
import {
  FileText,
  Shield,
  Zap,
  Activity,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Lock,
  ArrowRight,
  Share2,
  Stethoscope,
  Heart,
} from "lucide-react";

export default function HomePage() {
  return (
    <div className="relative overflow-hidden pt-8 pb-20">
      {/* Background Radial Glow Spots */}
      <div className="absolute top-1/4 left-1/3 -translate-x-1/2 w-[600px] h-[500px] bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-1/3 right-10 w-[450px] h-[400px] bg-teal-500/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 lg:pt-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          
          {/* Left Hero Column */}
          <div className="lg:col-span-7 space-y-6">
            {/* Pill Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 text-xs font-semibold tracking-wide shadow-sm">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Hackathon Ready • HealthTech Track
            </div>

            {/* Giant Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-[1.15]">
              Every <span className="text-emerald-400 underline decoration-emerald-500/30 underline-offset-4">doctor</span>.{" "}
              Every <span className="text-teal-300">report</span>.{" "}
              <br className="hidden sm:inline" />
              One <span className="text-emerald-400">record</span>.
            </h1>

            {/* Subline */}
            <p className="text-lg sm:text-xl text-emerald-100/75 max-w-2xl leading-relaxed font-normal">
              Prescriptions, labs and allergies from every provider, organised into one timeline you control.
              Say goodbye to lost paper files and repeated blood tests.
            </p>

            {/* CTA Buttons */}
            <div className="pt-2 flex flex-wrap items-center gap-4">
              <Link
                href="/register"
                className="px-7 py-3.5 rounded-full bg-emerald-400 text-[#071410] font-semibold text-base hover:bg-emerald-300 transition-all shadow-lg shadow-emerald-400/25 hover:shadow-emerald-400/35 hover:scale-[1.02] flex items-center gap-2"
              >
                Get Started
                <ArrowRight className="w-4 h-4 stroke-[2.5]" />
              </Link>
              <Link
                href="/login"
                className="px-7 py-3.5 rounded-full bg-[#0b241c]/80 hover:bg-[#103026] text-emerald-200 border border-emerald-500/30 font-semibold text-base transition-all hover:border-emerald-400/50 flex items-center gap-2"
              >
                Doctor & User Login
              </Link>
            </div>

            {/* Highlights pill row */}
            <div className="pt-4 flex flex-wrap items-center gap-y-2 gap-x-6 text-xs text-emerald-300/70">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Instant Demo Logins
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Patient Controlled Privacy
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Emergency ER Flow
              </span>
            </div>
          </div>

          {/* Right Column: Floating Cards (Matching Screenshot Layout) */}
          <div className="lg:col-span-5 relative flex justify-center">
            <div className="relative w-full max-w-md">

              {/* Main Terminal / Code Card */}
              <div className="rounded-2xl bg-[#091b15]/90 border border-emerald-500/30 p-5 shadow-2xl backdrop-blur-xl space-y-4">
                {/* Window header dots */}
                <div className="flex items-center gap-2 pb-2 border-b border-emerald-900/40">
                  <div className="w-3 h-3 rounded-full bg-rose-500/80" />
                  <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                  <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
                  <span className="ml-2 text-[11px] font-mono text-emerald-400/70">patient_record.extract()</span>
                </div>

                {/* Code / Record content */}
                <div className="font-mono text-xs space-y-2 text-emerald-200/90 leading-relaxed">
                  <div className="text-emerald-500/70">// Cross-provider timeline synced</div>
                  <div className="text-emerald-300">
                    <span className="text-teal-400">const</span> record = await extractDocument(sourcePdf);
                  </div>
                  <div className="pl-3 border-l-2 border-emerald-500/30 space-y-1 text-emerald-100">
                    <p><span className="text-emerald-400">Rx:</span> Metformin 500mg BID (Dr. Sharma)</p>
                    <p><span className="text-emerald-400">Lab:</span> HbA1c 6.8% (Apollo Labs)</p>
                    <p className="text-amber-300 flex items-center gap-1 text-[11px]">
                      <AlertTriangle className="w-3 h-3" /> Flag: Retest done within 45 days
                    </p>
                  </div>
                  <div className="text-emerald-400/90 font-semibold pt-1">
                    status: <span className="text-emerald-300">"timeline_confirmed"</span>
                  </div>
                </div>
              </div>

              {/* Floating Pill: Safe ER Access */}
              <div className="absolute -top-4 -right-2 sm:-right-4 px-4 py-2 rounded-full bg-gradient-to-r from-teal-500/20 to-emerald-500/30 border border-emerald-400/40 backdrop-blur-md shadow-lg flex items-center gap-2 text-xs font-semibold text-emerald-200 animate-bounce duration-1000">
                <Zap className="w-3.5 h-3.5 text-amber-300 fill-amber-300" />
                <span>⚡ Safe ER Access</span>
              </div>

              {/* Floating Metric Card */}
              <div className="absolute -bottom-6 -left-3 sm:-left-6 rounded-xl bg-[#0b241c]/95 border border-emerald-500/35 p-4 shadow-xl backdrop-blur-md space-y-1">
                <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-400/80">
                  UNIFIED TIMELINE
                </div>
                <div className="text-2xl font-black text-white flex items-baseline gap-1">
                  100%
                  <span className="text-xs font-medium text-emerald-300">Cross-Provider</span>
                </div>
                <div className="text-[11px] text-emerald-400/70">
                  Zero repeated diagnostic tests
                </div>
              </div>

            </div>
          </div>

        </div>
      </div>

      {/* Feature Problem-to-Solution Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-24">
        <div className="text-center space-y-3 mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Solving "Lost in Transit" Medical Care
          </h2>
          <p className="text-sm sm:text-base text-emerald-200/70 max-w-2xl mx-auto">
            From fragmented paper prescriptions to seamless, secure continuity across any hospital.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Feature 1 */}
          <div className="rounded-2xl bg-[#091b15]/60 border border-emerald-900/40 p-6 space-y-3 hover:border-emerald-500/40 transition-all hover:bg-[#0d261e]/70">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <FileText className="w-5 h-5" />
            </div>
            <h3 className="text-base font-semibold text-white">Scattered Records → One Timeline</h3>
            <p className="text-xs text-emerald-200/70 leading-relaxed">
              Upload photos and PDFs from any clinic. Extracted into a single chronological patient journey with direct links to original source pages.
            </p>
          </div>

          {/* Feature 2 */}
          <div className="rounded-2xl bg-[#091b15]/60 border border-emerald-900/40 p-6 space-y-3 hover:border-emerald-500/40 transition-all hover:bg-[#0d261e]/70">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Activity className="w-5 h-5" />
            </div>
            <h3 className="text-base font-semibold text-white">One-Page Clinical Summary</h3>
            <p className="text-xs text-emerald-200/70 leading-relaxed">
              Instant overview of allergies, current medicines, and verified diagnoses for quick doctor review without digging through stacks of paper.
            </p>
          </div>

          {/* Feature 3 */}
          <div className="rounded-2xl bg-[#091b15]/60 border border-emerald-900/40 p-6 space-y-3 hover:border-emerald-500/40 transition-all hover:bg-[#0d261e]/70">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <h3 className="text-base font-semibold text-white">Repeated Tests & Drug Safety Flags</h3>
            <p className="text-xs text-emerald-200/70 leading-relaxed">
              Deterministic flags detect recently completed lab tests, overlapping active ingredients, and dangerous drug interactions across prescribers.
            </p>
          </div>

          {/* Feature 4 */}
          <div className="rounded-2xl bg-[#091b15]/60 border border-emerald-900/40 p-6 space-y-3 hover:border-emerald-500/40 transition-all hover:bg-[#0d261e]/70">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Share2 className="w-5 h-5" />
            </div>
            <h3 className="text-base font-semibold text-white">Secure Share By Code</h3>
            <p className="text-xs text-emerald-200/70 leading-relaxed">
              Share records with new doctors using time-bound 8-character codes with custom scope (all, meds, labs), auto-expiry, and instant revoke.
            </p>
          </div>

          {/* Feature 5 */}
          <div className="rounded-2xl bg-[#091b15]/60 border border-emerald-900/40 p-6 space-y-3 hover:border-emerald-500/40 transition-all hover:bg-[#0d261e]/70">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Stethoscope className="w-5 h-5" />
            </div>
            <h3 className="text-base font-semibold text-white">Emergency ER Lookup Flow</h3>
            <p className="text-xs text-emerald-200/70 leading-relaxed">
              Verified ER doctors can look up critical life-saving info (blood group, severe allergies) via Health ID with instant alerts to trusted contacts.
            </p>
          </div>

          {/* Feature 6 */}
          <div className="rounded-2xl bg-[#091b15]/60 border border-emerald-900/40 p-6 space-y-3 hover:border-emerald-500/40 transition-all hover:bg-[#0d261e]/70">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Lock className="w-5 h-5" />
            </div>
            <h3 className="text-base font-semibold text-white">Full Access Audit Log</h3>
            <p className="text-xs text-emerald-200/70 leading-relaxed">
              Patients view every access attempt, doctor verification, and emergency unlock with exact timestamps and provider details.
            </p>
          </div>
        </div>
      </div>

    </div>
  );
}
