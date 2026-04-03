"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/auth-context";
import { SessionStatusBadge } from "@/components/session-status-badge";
import { UiCard } from "@/components/ui-card";

type SessionRow = {
  id: string;
  subject: string;
  scheduled_at: string;
  duration_minutes: number;
  status: string;
  meeting_url?: string | null;
  student?: { full_name?: string; email?: string };
  tutor?: { full_name?: string; email?: string };
};

export default function SessionsListPage() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await api<{ sessions: SessionRow[] }>("/sessions/my");
        if (!cancelled) setSessions(data.sessions || []);
      } catch (e) {
        if (!cancelled)
          setError(e instanceof Error ? e.message : "Failed to load sessions");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center gap-3 text-stone-500">
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-stone-300 border-t-teal-600" />
        Loading sessions…
      </div>
    );
  }

  if (error) {
    return (
      <UiCard>
        <p className="text-red-600 dark:text-red-400">{error}</p>
      </UiCard>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-stone-900 dark:text-stone-50">
          Sessions
        </h1>
        <p className="mt-2 text-stone-600 dark:text-stone-400">
          Pay, chat, and read AI recaps on each session page.
        </p>
      </div>
      {sessions.length === 0 ? (
        <UiCard>
          <p className="text-stone-500">No sessions yet.</p>
          {user?.role === "student" && (
            <Link
              href="/dashboard/book"
              className="mt-4 inline-block text-sm font-medium text-teal-700 dark:text-teal-400"
            >
              Book your first session →
            </Link>
          )}
        </UiCard>
      ) : (
        <ul className="space-y-4">
          {sessions.map((s) => (
            <li key={s.id}>
              <Link href={`/dashboard/sessions/${s.id}`} className="block">
                <UiCard className="transition-shadow hover:shadow-md hover:shadow-stone-900/8 dark:hover:shadow-black/40">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <span className="font-semibold text-stone-900 dark:text-stone-50">
                        {s.subject}
                      </span>
                      <p className="mt-1 text-sm text-stone-500">
                        {new Date(s.scheduled_at).toLocaleString(undefined, {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        })}{" "}
                        · {s.duration_minutes} min
                      </p>
                      {(s.student || s.tutor) && (
                        <p className="mt-2 text-xs text-stone-400">
                          {s.student &&
                            `Student: ${s.student.full_name ?? s.student.email}`}
                          {s.student && s.tutor && " · "}
                          {s.tutor &&
                            `Tutor: ${s.tutor.full_name ?? s.tutor.email}`}
                        </p>
                      )}
                    </div>
                    <SessionStatusBadge status={s.status} />
                  </div>
                  <span className="mt-4 inline-block text-sm font-medium text-teal-700 dark:text-teal-400">
                    Open session →
                  </span>
                </UiCard>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
