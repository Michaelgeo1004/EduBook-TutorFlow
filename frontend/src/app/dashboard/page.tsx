"use client";

import Link from "next/link";
import { useAuth } from "@/contexts/auth-context";
import { UiCard } from "@/components/ui-card";
import { api } from "@/lib/api";

export default function DashboardHomePage() {
  const { user } = useAuth();

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-stone-900 dark:text-stone-50">
          Hi, {user?.full_name?.split(" ")[0] ?? "there"}
        </h1>
        <p className="mt-2 text-stone-600 dark:text-stone-400">
          You&apos;re signed in as a{" "}
          <span className="font-medium capitalize text-stone-800 dark:text-stone-200">
            {user?.role}
          </span>
          . Open a session to chat, pay, and view Read.ai recaps.
        </p>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <Link href="/dashboard/sessions" className="group block">
          <UiCard className="h-full transition-shadow group-hover:shadow-md group-hover:shadow-stone-900/10 dark:group-hover:shadow-black/40">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-200">
              ◆
            </div>
            <h2 className="mt-4 text-lg font-semibold text-stone-900 dark:text-stone-50">
              My sessions
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-stone-500 dark:text-stone-400">
              List bookings, open Stripe payment, live chat, and meeting recap
              panel.
            </p>
            <span className="mt-4 inline-block text-sm font-medium text-teal-700 group-hover:underline dark:text-teal-400">
              View sessions →
            </span>
          </UiCard>
        </Link>
        {user?.role === "student" && (
          <Link href="/dashboard/book" className="group block">
            <UiCard className="h-full transition-shadow group-hover:shadow-md group-hover:shadow-stone-900/10 dark:group-hover:shadow-black/40">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-stone-200 text-stone-800 dark:bg-stone-800 dark:text-stone-200">
                +
              </div>
              <h2 className="mt-4 text-lg font-semibold text-stone-900 dark:text-stone-50">
                Book a session
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-stone-500 dark:text-stone-400">
                Choose a tutor, subject, and time slot. Conflicts are checked on
                the server.
              </p>
              <span className="mt-4 inline-block text-sm font-medium text-teal-700 group-hover:underline dark:text-teal-400">
                Start booking →
              </span>
            </UiCard>
          </Link>
        )}
        {user?.role === "tutor" && (
          <button
            onClick={async () => {
              try {
                const data = await api<{ url: string }>("/calendar/auth");
                window.location.href = data.url;
              } catch (e) {
                alert(e instanceof Error ? e.message : "Auth failed");
              }
            }}
            className="group block w-full text-left"
          >
            <UiCard className="h-full transition-shadow group-hover:shadow-md group-hover:shadow-stone-900/10 dark:group-hover:shadow-black/40">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                G
              </div>
              <h2 className="mt-4 text-lg font-semibold text-stone-900 dark:text-stone-50">
                Google Calendar Sync
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-stone-500 dark:text-stone-400">
                Connect your account via OAuth2 to automatically block timeslots when you have external events.
              </p>
              <span className="mt-4 inline-block text-sm font-medium text-blue-700 group-hover:underline dark:text-blue-400">
                Connect Calendar →
              </span>
            </UiCard>
          </button>
        )}
      </div>
    </div>
  );
}
