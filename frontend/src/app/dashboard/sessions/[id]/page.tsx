"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { api, getStoredToken } from "@/lib/api";
import { API_URL } from "@/lib/config";
import { RecapPanel, type RecapRecord } from "@/components/recap-panel";
import { SessionChat } from "@/components/session-chat";
import { SessionStatusBadge } from "@/components/session-status-badge";
import { UiCard, UiCardHeader } from "@/components/ui-card";
import { useAuth } from "@/contexts/auth-context";

type SessionRow = {
  id: string;
  subject: string;
  scheduled_at: string;
  duration_minutes: number;
  status: string;
  meeting_url?: string | null;
  student?: { id?: string; full_name?: string; email?: string };
  tutor?: { id?: string; full_name?: string; email?: string };
};

type PaymentRow = {
  status: string;
  amount: number;
  currency: string;
  paid_at?: string | null;
};

export default function SessionDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const { user, token } = useAuth();
  const [session, setSession] = useState<SessionRow | null>(null);
  const [payment, setPayment] = useState<PaymentRow | null>(null);
  const [recap, setRecap] = useState<RecapRecord | null>(null);
  const [error, setError] = useState("");
  const [payBusy, setPayBusy] = useState(false);
  const [manageBusy, setManageBusy] = useState(false);
  const [newTime, setNewTime] = useState("");

  const load = useCallback(async () => {
    setError("");
    try {
      const data = await api<{ sessions: SessionRow[] }>("/sessions/my");
      const found = (data.sessions || []).find((s) => s.id === id) || null;
      setSession(found);
      if (!found) setError("Session not found or you are not a participant.");

      if (user?.role === "student" && found) {
        try {
          const payData = await api<{ payment: PaymentRow }>(
            `/payments/session/${id}`
          );
          setPayment(payData.payment);
        } catch {
          setPayment(null);
        }
      } else {
        setPayment(null);
      }

      try {
        const r = await fetch(`${API_URL}/webhooks/recaps/${id}`);
        if (r.ok) {
          const body = await r.json();
          setRecap((body.recap as RecapRecord) ?? null);
        } else {
          setRecap(null);
        }
      } catch {
        setRecap(null);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    }
  }, [id, user?.role]);

  useEffect(() => {
    load();
  }, [load]);

  async function startCheckout() {
    setPayBusy(true);
    try {
      const data = await api<{ checkout_url: string }>("/payments/checkout", {
        method: "POST",
        body: JSON.stringify({ session_id: id }),
      });
      window.location.href = data.checkout_url;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Checkout failed");
    } finally {
      setPayBusy(false);
    }
  }

  async function reschedule() {
    if (!newTime) return alert("Select a new date/time first.");
    setManageBusy(true);
    try {
      await api(`/sessions/${id}/reschedule`, {
        method: "PATCH",
        body: JSON.stringify({ scheduled_at: new Date(newTime).toISOString() }),
      });
      load();
      alert("Session rescheduled!");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Reschedule failed");
    } finally {
      setManageBusy(false);
    }
  }

  async function cancel() {
    const msg =
      session?.status === "confirmed"
        ? "This session is PAID. Cancelling will trigger an automatic Stripe refund. Are you sure?"
        : "Are you sure you want to cancel this session?";
    if (!confirm(msg)) return;

    setManageBusy(true);
    try {
      await api(`/sessions/${id}/cancel`, { method: "PATCH" });
      load();
      alert("Session cancelled.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Cancellation failed");
    } finally {
      setManageBusy(false);
    }
  }

  if (!session && !error) {
    return (
      <div className="flex items-center gap-3 text-stone-500">
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-stone-300 border-t-teal-600" />
        Loading session…
      </div>
    );
  }

  if (error && !session) {
    return (
      <UiCard>
        <p className="text-red-600 dark:text-red-400">{error}</p>
        <Link
          href="/dashboard/sessions"
          className="mt-4 inline-block text-sm font-medium text-teal-700 dark:text-teal-400"
        >
          ← Back to sessions
        </Link>
      </UiCard>
    );
  }

  if (!session) return null;

  const isStudent = user?.role === "student" && user.id === session.student?.id;
  const canPay =
    isStudent &&
    (session.status === "pending" || session.status === "rescheduled");

  return (
    <div className="space-y-8">
      <Link
        href="/dashboard/sessions"
        className="inline-flex items-center gap-1 text-sm font-medium text-teal-700 hover:text-teal-800 dark:text-teal-400 dark:hover:text-teal-300"
      >
        <span aria-hidden>←</span> Sessions
      </Link>

      <div className="grid gap-8 lg:grid-cols-12 lg:items-start">
        <div className="space-y-6 lg:col-span-7">
          <UiCard padding="p-6 sm:p-8">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-teal-700 dark:text-teal-400">
                  Session
                </p>
                <h1 className="mt-2 text-2xl font-semibold tracking-tight text-stone-900 dark:text-stone-50 sm:text-3xl">
                  {session.subject}
                </h1>
                <p className="mt-2 text-stone-600 dark:text-stone-400">
                  {new Date(session.scheduled_at).toLocaleString(undefined, {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}{" "}
                  · {session.duration_minutes} min
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <SessionStatusBadge status={session.status} />
                  {session.student && (
                    <span className="text-xs text-stone-500">
                      Student:{" "}
                      <span className="font-medium text-stone-700 dark:text-stone-300">
                        {session.student.full_name ?? session.student.email}
                      </span>
                    </span>
                  )}
                  {session.tutor && (
                    <span className="text-xs text-stone-500">
                      Tutor:{" "}
                      <span className="font-medium text-stone-700 dark:text-stone-300">
                        {session.tutor.full_name ?? session.tutor.email}
                      </span>
                    </span>
                  )}
                </div>
              </div>
            </div>
            {session.meeting_url && (
              <a
                href={session.meeting_url}
                target="_blank"
                rel="noreferrer"
                className="mt-6 inline-flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-teal-700"
              >
                Join meeting
                <span aria-hidden>↗</span>
              </a>
            )}
          </UiCard>

          {user?.role === "student" && (
            <UiCard>
              <UiCardHeader
                title="Payment"
                description="Stripe Checkout — your booking is confirmed when the webhook marks this session paid."
              />
              {payment ? (
                <div className="flex flex-wrap items-center gap-3">
                  <SessionStatusBadge status={payment.status} />
                  <span className="text-sm text-stone-600 dark:text-stone-400">
                    {payment.amount} {payment.currency?.toUpperCase()}
                  </span>
                  {payment.status === "paid" && (
                    <button
                      type="button"
                      onClick={load}
                      className="text-sm font-medium text-teal-700 hover:underline dark:text-teal-400"
                    >
                      Refresh
                    </button>
                  )}
                </div>
              ) : (
                <p className="text-sm text-stone-500">
                  No payment record yet — use Pay below after booking.
                </p>
              )}
              {canPay && (
                <button
                  type="button"
                  disabled={payBusy}
                  onClick={startCheckout}
                  className="mt-4 w-full rounded-xl bg-stone-900 py-3 text-sm font-semibold text-white shadow-sm hover:bg-stone-800 disabled:opacity-50 dark:bg-teal-600 dark:hover:bg-teal-500 sm:w-auto sm:px-8"
                >
                  {payBusy ? "Opening Stripe…" : "Pay with Stripe Checkout"}
                </button>
              )}
            </UiCard>
          )}

          <div>
            <h2 className="mb-3 text-lg font-semibold text-stone-900 dark:text-stone-50">
              Live chat
            </h2>
            <p className="mb-3 text-sm text-stone-500 dark:text-stone-400">
              Messages are stored in your database; Socket.io delivers them in
              real time.
            </p>
            <SessionChat
              sessionId={id}
              token={token ?? getStoredToken()}
              currentUserId={user?.id ?? ""}
              partnerUserId={
                user?.role === "student"
                  ? session.tutor?.id
                  : session.student?.id
              }
              partnerName={
                user?.role === "student"
                  ? session.tutor?.full_name ?? session.tutor?.email ?? null
                  : session.student?.full_name ?? session.student?.email ?? null
              }
            />
          </div>
        </div>

        <aside className="lg:col-span-5 space-y-6">
          <UiCard>
            <UiCardHeader
              title="Manage Session"
              description="Reschedule or cancel this booking. If confirmed (paid), cancellation triggers a refund."
            />
            {session.status !== "cancelled" &&
            session.status !== "completed" ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-stone-500 uppercase tracking-wider mb-1">
                    New Date & Time
                  </label>
                  <input
                    type="datetime-local"
                    value={newTime}
                    onChange={(e) => setNewTime(e.target.value)}
                    className="w-full rounded-lg border-stone-300 bg-stone-50 text-sm focus:border-teal-500 focus:ring-teal-500 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={manageBusy}
                    onClick={reschedule}
                    className="flex-1 rounded-lg bg-stone-100 py-2 text-sm font-medium text-stone-900 hover:bg-stone-200 disabled:opacity-50 dark:bg-stone-800 dark:text-stone-100 dark:hover:bg-stone-700"
                  >
                    {manageBusy ? "Updating…" : "Update Time"}
                  </button>
                  <button
                    type="button"
                    disabled={manageBusy}
                    onClick={cancel}
                    className="flex-1 rounded-lg bg-red-50 py-2 text-sm font-medium text-red-700 hover:bg-red-100 disabled:opacity-50 dark:bg-red-950/30 dark:text-red-400 dark:hover:bg-red-950/50"
                  >
                    Cancel Session
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-stone-500 italic">
                Session is {session.status} and cannot be modified.
              </p>
            )}
          </UiCard>

          <RecapPanel sessionId={id} recap={recap} onRefresh={load} />
        </aside>
      </div>

      {error && session && (
        <p className="text-sm text-amber-700 dark:text-amber-400">{error}</p>
      )}
    </div>
  );
}
