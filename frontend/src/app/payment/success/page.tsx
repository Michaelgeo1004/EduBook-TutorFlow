"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { UiCard } from "@/components/ui-card";

function SuccessContent() {
  const search = useSearchParams();
  const sessionId = search.get("session_id");

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-16">
      <UiCard className="max-w-md text-center" padding="p-10">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-2xl dark:bg-emerald-950/50">
          ✓
        </div>
        <h1 className="mt-6 text-2xl font-semibold text-stone-900 dark:text-stone-50">
          Payment successful
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-stone-600 dark:text-stone-400">
          Stripe will call your webhook. With{" "}
          <code className="rounded bg-stone-100 px-1 py-0.5 text-xs dark:bg-stone-800">
            stripe listen
          </code>{" "}
          running, payment and session status update in Supabase.
        </p>
        {sessionId && (
          <Link
            href={`/dashboard/sessions/${sessionId}`}
            className="mt-8 inline-flex w-full justify-center rounded-xl bg-teal-600 py-3 text-sm font-semibold text-white hover:bg-teal-700"
          >
            Open session
          </Link>
        )}
        <Link
          href="/dashboard"
          className="mt-4 block text-sm font-medium text-teal-700 hover:underline dark:text-teal-400"
        >
          Dashboard
        </Link>
      </UiCard>
    </div>
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense
      fallback={
        <p className="p-8 text-center text-stone-500">Loading…</p>
      }
    >
      <SuccessContent />
    </Suspense>
  );
}
