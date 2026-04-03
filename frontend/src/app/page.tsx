import Link from "next/link";
import { UiCard } from "@/components/ui-card";

export default function HomePage() {
  return (
    <div className="min-h-screen px-4 py-16 sm:py-24">
      <div className="mx-auto max-w-4xl">
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-16 lg:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-widest text-teal-700 dark:text-teal-400">
              EduTech demo
            </p>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight text-stone-900 dark:text-stone-50 sm:text-5xl">
              Tutor sessions, payments &amp; chat — end to end
            </h1>
            <p className="mt-5 text-lg leading-relaxed text-stone-600 dark:text-stone-400">
              Next.js UI on top of your Express + Supabase + Stripe + Socket.io
              stack. Includes{" "}
              <strong className="font-medium text-stone-800 dark:text-stone-200">
                Read.ai-style meeting recaps
              </strong>{" "}
              via webhook.
            </p>
            <div className="mt-10 flex flex-wrap gap-3">
              <Link
                href="/signup"
                className="inline-flex items-center justify-center rounded-xl bg-teal-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-teal-900/20 hover:bg-teal-700"
              >
                Create account
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center justify-center rounded-xl border border-stone-300 bg-white px-6 py-3 text-sm font-semibold text-stone-800 shadow-sm hover:bg-stone-50 dark:border-stone-600 dark:bg-stone-900 dark:text-stone-100 dark:hover:bg-stone-800"
              >
                Log in
              </Link>
              <Link
                href="/dashboard"
                className="inline-flex items-center justify-center rounded-xl px-6 py-3 text-sm font-semibold text-teal-800 hover:underline dark:text-teal-400"
              >
                Dashboard →
              </Link>
            </div>
          </div>
          <div className="space-y-4">
            <UiCard className="border-teal-600/20 dark:border-teal-500/20">
              <p className="text-xs font-semibold uppercase tracking-wider text-stone-400">
                Flow
              </p>
              <ol className="mt-4 space-y-3 text-sm text-stone-600 dark:text-stone-400">
                <li className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-teal-100 text-xs font-bold text-teal-800 dark:bg-teal-950 dark:text-teal-200">
                    1
                  </span>
                  Student books a session with a tutor.
                </li>
                <li className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-teal-100 text-xs font-bold text-teal-800 dark:bg-teal-950 dark:text-teal-200">
                    2
                  </span>
                  Pay with Stripe Checkout; webhook confirms in Supabase.
                </li>
                <li className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-teal-100 text-xs font-bold text-teal-800 dark:bg-teal-950 dark:text-teal-200">
                    3
                  </span>
                  Real-time chat per session (Socket.io).
                </li>
                <li className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-teal-100 text-xs font-bold text-teal-800 dark:bg-teal-950 dark:text-teal-200">
                    4
                  </span>
                  After the lesson, Read.ai posts a recap to your API — shown on
                  the session page.
                </li>
              </ol>
            </UiCard>
          </div>
        </div>
      </div>
    </div>
  );
}
