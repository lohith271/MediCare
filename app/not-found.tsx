import Link from "next/link";
import { FileQuestion, Home } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-4">
      <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto text-emerald-400 mb-4">
        <FileQuestion className="w-8 h-8" />
      </div>
      <h1 className="text-3xl font-extrabold text-white mb-2">404 - Page Not Found</h1>
      <p className="text-sm text-emerald-300/70 max-w-md mb-6">
        The medical record or page you requested could not be located in your vault.
      </p>
      <Link
        href="/"
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-400 text-[#071410] font-bold text-xs hover:bg-emerald-300 transition-all shadow-md shadow-emerald-400/20"
      >
        <Home className="w-4 h-4" />
        Return to Home
      </Link>
    </div>
  );
}
