import type { Metadata } from "next";
import Navbar from "@/app/components/Navbar";
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

        {/* Dynamic Navigation Bar */}
        <Navbar />

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
