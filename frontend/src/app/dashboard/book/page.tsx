"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/auth-context";
import { UiCard, UiCardHeader } from "@/components/ui-card";

type Tutor = {
  id: string;
  full_name: string;
  email: string;
  hourly_rate: number | null;
  subjects: string[];
};

export default function BookSessionPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [tutors, setTutors] = useState<Tutor[]>([]);
  const [tutor_id, setTutorId] = useState("");
  const [subject, setSubject] = useState("Math");
  const [scheduled_at, setScheduledAt] = useState("");
  const [duration_minutes, setDurationMinutes] = useState(60);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (user?.role !== "student") return;
    (async () => {
      try {
        const data = await api<{ tutors: Tutor[] }>("/tutors");
        setTutors(data.tutors || []);
        if (data.tutors?.[0]) setTutorId(data.tutors[0].id);
      } catch {
        setTutors([]);
      }
    })();
  }, [user?.role]);

  if (user?.role !== "student") {
    return (
      <UiCard>
        <p className="text-stone-600 dark:text-stone-400">
          Only students can book sessions.
        </p>
      </UiCard>
    );
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setPending(true);
    try {
      const iso = new Date(scheduled_at).toISOString();
      const data = await api<{ session: { id: string } }>("/sessions/book", {
        method: "POST",
        body: JSON.stringify({
          tutor_id,
          subject,
          scheduled_at: iso,
          duration_minutes,
        }),
      });
      router.push(`/dashboard/sessions/${data.session.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Booking failed");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-stone-900 dark:text-stone-50">
          Book a session
        </h1>
        <p className="mt-2 text-stone-600 dark:text-stone-400">
          Choose a tutor from your API directory. Pricing uses their hourly rate
          at checkout.
        </p>
      </div>
      <UiCard>
        <UiCardHeader
          title="Session details"
          description="Times are checked for tutor conflicts on the server."
        />
        <form onSubmit={onSubmit} className="space-y-5">
          {error && (
            <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800 dark:bg-rose-950/40 dark:text-rose-200">
              {error}
            </p>
          )}
          <div>
            <label className="block text-sm font-medium text-stone-700 dark:text-stone-300">
              Tutor
            </label>
            <select
              required
              className="mt-1.5 w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2.5 text-sm dark:border-stone-700 dark:bg-stone-900"
              value={tutor_id}
              onChange={(e) => setTutorId(e.target.value)}
            >
              {tutors.length === 0 && (
                <option value="">
                  No tutors — add seed data or register as tutor
                </option>
              )}
              {tutors.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.full_name}
                  {t.hourly_rate != null ? ` — $${t.hourly_rate}/hr` : ""}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700 dark:text-stone-300">
              Subject
            </label>
            <input
              required
              className="mt-1.5 w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2.5 text-sm dark:border-stone-700 dark:bg-stone-900"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700 dark:text-stone-300">
              Date &amp; time
            </label>
            <input
              type="datetime-local"
              required
              className="mt-1.5 w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2.5 text-sm dark:border-stone-700 dark:bg-stone-900"
              value={scheduled_at}
              onChange={(e) => setScheduledAt(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700 dark:text-stone-300">
              Duration (minutes)
            </label>
            <input
              type="number"
              min={30}
              step={15}
              className="mt-1.5 w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2.5 text-sm dark:border-stone-700 dark:bg-stone-900"
              value={duration_minutes}
              onChange={(e) => setDurationMinutes(Number(e.target.value))}
            />
          </div>
          <button
            type="submit"
            disabled={pending || !tutor_id}
            className="w-full rounded-xl bg-stone-900 py-3 text-sm font-semibold text-white hover:bg-stone-800 disabled:opacity-50 dark:bg-teal-600 dark:hover:bg-teal-500"
          >
            {pending ? "Booking…" : "Book session"}
          </button>
        </form>
      </UiCard>
    </div>
  );
}
