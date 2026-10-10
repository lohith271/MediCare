"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  HeartPulse,
  User,
  Stethoscope,
  TrendingUp,
  FileText,
  ShieldAlert,
  LogOut,
  Menu,
  X,
  LayoutDashboard,
  QrCode,
  CalendarCheck,
} from "lucide-react";
import { getLocalSession, clearLocalSession, AuthSession } from "@/lib/auth";

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [session, setSession] = useState<AuthSession | null>(null);
  const [mounted, setMounted] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
    setSession(getLocalSession());
  }, [pathname]);

  const handleLogout = () => {
    clearLocalSession();
    setSession(null);
    router.push("/login");
  };

  const isAuthPage = pathname === "/login" || pathname === "/register";
  // Patient portal links only show AFTER login
  const isLoggedIn = mounted && session !== null && !isAuthPage;

  const patientNavLinks = [
    { href: "/summary", label: "Overview", icon: LayoutDashboard },
    { href: "/consultations", label: "Consultations & Follow-ups", icon: Stethoscope },
    { href: "/trends", label: "Lab Trends", icon: TrendingUp },
    { href: "/profile", label: "Profile & QR", icon: QrCode },
    { href: "/documents", label: "Medical Files & Scans", icon: FileText },
    { href: "/emergency", label: "Emergency ER", icon: ShieldAlert },
  ];

  const doctorNavLinks = [
    { href: "/emergency", label: "Emergency ER", icon: ShieldAlert },
    { href: "/access", label: "Access by Code", icon: QrCode },
  ];

  const currentNavLinks =
    session?.user.role === "doctor" ? doctorNavLinks : patientNavLinks;

  return (
    <header className="sticky top-0 z-50 backdrop-blur-md bg-[#071410]/90 border-b border-emerald-900/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center text-dark-bg shadow-lg shadow-emerald-500/20 group-hover:scale-105 transition-transform">
            <HeartPulse className="w-5 h-5 text-[#071410] stroke-[2.5]" />
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-bold tracking-tight text-white flex items-center gap-1.5">
              MediCare
              <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                HealthTech
              </span>
            </span>
            <span className="text-[10px] text-emerald-400/70 -mt-0.5">Every doctor. One record.</span>
          </div>
        </Link>

        {/* Desktop Nav Links - ONLY SHOWN AFTER LOGIN */}
        {isLoggedIn && (
          <nav className="hidden lg:flex items-center gap-1">
            {currentNavLinks.map((link) => {
              const isActive = pathname === link.href;
              const Icon = link.icon;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    isActive
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-sm"
                      : "text-emerald-200/75 hover:text-white hover:bg-emerald-500/10"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {link.label}
                </Link>
              );
            })}
          </nav>
        )}

        {/* Right side: User Session if logged in, or Login/Register if before login */}
        <div className="hidden sm:flex items-center gap-3">
          {isLoggedIn ? (
            <div className="flex items-center gap-2.5">
              <Link
                href="/profile"
                className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#092219] border border-emerald-500/30 text-xs text-emerald-200 hover:border-emerald-400 transition-colors"
              >
                <div className="w-5 h-5 rounded-full bg-emerald-400/20 flex items-center justify-center text-[10px] font-bold text-emerald-300">
                  {session.profile?.full_name?.charAt(0) || "P"}
                </div>
                <span className="font-semibold text-white max-w-[120px] truncate">
                  {session.profile?.full_name || "Patient"}
                </span>
                <span className="text-[10px] uppercase font-mono px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-300">
                  {session.user.role}
                </span>
              </Link>

              <button
                type="button"
                onClick={handleLogout}
                className="p-1.5 rounded-lg text-emerald-400/70 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                title="Log out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Link
                href="/login"
                className={`text-xs font-semibold transition-colors ${
                  pathname === "/login"
                    ? "text-emerald-300 font-bold"
                    : "text-emerald-200/80 hover:text-white"
                }`}
              >
                Login
              </Link>
              <Link
                href="/register"
                className="inline-flex items-center gap-1.5 text-xs font-bold px-3.5 py-2 rounded-full bg-emerald-400 text-[#071410] hover:bg-emerald-300 transition-all shadow-md shadow-emerald-400/20 hover:scale-[1.02]"
              >
                Register
              </Link>
            </div>
          )}
        </div>

        {/* Mobile menu toggle button */}
        <button
          type="button"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="lg:hidden p-2 rounded-lg text-emerald-300 hover:bg-emerald-500/10"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-emerald-900/30 bg-[#071410] px-4 py-4 space-y-3">
          {isLoggedIn ? (
            <>
              <div className="pb-3 border-b border-emerald-900/30 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-white block">
                    {session.profile?.full_name}
                  </span>
                  <span className="text-[10px] text-emerald-400/70 font-mono">
                    Health ID: {session.profile?.health_id}
                  </span>
                </div>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-1 text-xs text-rose-400 font-semibold"
                >
                  <LogOut className="w-3.5 h-3.5" /> Logout
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                {currentNavLinks.map((link) => {
                  const Icon = link.icon;
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-2 p-2.5 rounded-xl text-xs font-semibold ${
                        pathname === link.href
                          ? "bg-emerald-400 text-[#071410]"
                          : "bg-[#091b15] text-emerald-200"
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {link.label}
                    </Link>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="pt-2 flex flex-col gap-2">
              <Link
                href="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full py-2.5 text-center rounded-xl bg-[#091b15] text-emerald-200 text-xs font-semibold"
              >
                Sign In to MediCare
              </Link>
              <Link
                href="/register"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full py-2.5 text-center rounded-xl bg-emerald-400 text-[#071410] text-xs font-bold"
              >
                Create Free Account
              </Link>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
