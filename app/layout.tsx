import type { Metadata } from "next";
import Link from "next/link";
import { Activity, ShieldCheck, HeartPulse, User, Stethoscope } from "lucide-react";
import "./globals.css";

export const metadata: Metadata = {
  title: "MediCare — Your care, in one place",
  description:
    "Every doctor. Every report. One record. Prescriptions, labs and allergies from every provider, organised into one timeline you control.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen flex flex-col bg-[#071410] text-emerald-50 selection:bg-emerald-500/30 selection:text-emerald-200">
        {/* Ambient Top Glow */}
        <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[800px] h-[350px] bg-gradient-to-b from-emerald-500/10 via-teal-500/5 to-transparent blur-3xl pointer-events-none -z-10" />

        {/* Navigation Bar */}
        <header className="sticky top-0 z-50 backdrop-blur-md bg-[#071410]/80 border-b border-emerald-900/30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center text-dark-bg shadow-lg shadow-emerald-500/20 group-hover:scale-105 transition-transform">
                <HeartPulse className="w-6 h-6 text-[#071410] stroke-[2.5]" />
              </div>
              <div className="flex flex-col">
                <span className="text-xl font-bold tracking-tight text-white flex items-center gap-1.5">
                  MediCare
                  <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    HealthTech
                  </span>
                </span>
                <span className="text-[11px] text-emerald-400/70 -mt-0.5">Your care, in one place</span>
              </div>
            </Link>

            {/* Nav Links & Actions */}
            <nav className="flex items-center gap-4 sm:gap-6">
              <Link
                href="/login"
                className="text-sm font-medium text-emerald-200/80 hover:text-white transition-colors"
              >
                Login
              </Link>
              <Link
                href="/register"
                className="inline-flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-full bg-emerald-400 text-[#071410] hover:bg-emerald-300 transition-all shadow-md shadow-emerald-400/20 hover:shadow-emerald-400/30 hover:scale-[1.02]"
              >
                Register
              </Link>
            </nav>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1">{children}</main>

        {/* Persistent Hackathon Footer */}
        <footer className="border-t border-emerald-900/30 bg-[#050f0c] py-6 px-4 sm:px-6 text-center text-xs text-emerald-500/70">
          <div className="max-w-5xl mx-auto space-y-2">
            <p className="font-medium text-emerald-400/90">
              MediCare is a patient health-records app, not insurance and unrelated to any government Medicare scheme.
            </p>
            <p className="text-emerald-500/60">
              Demo with simulated data. Decision support only, not a medical diagnosis.
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
