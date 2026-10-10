"use client";

import Link from "next/link";

/** Shown when a page needs a signed-in user (or a patient) and `useSession` does not provide one. */
export default function SignInRequired({
  message = "Please sign in to continue.",
  showLink = true,
}: {
  message?: string;
  showLink?: boolean;
}) {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3 px-4 text-center">
      <p className="text-sm font-semibold">{message}</p>
      {showLink && (
        <Link href="/login" className="text-xs font-bold underline underline-offset-2 hover:opacity-80">
          Go to sign in
        </Link>
      )}
    </div>
  );
}
