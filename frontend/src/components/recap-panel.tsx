"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { UiCard, UiCardHeader } from "@/components/ui-card";

export type RecapRecord = {
  summary?: string | null;
  key_points?: string[] | null;
  action_items?: string[] | null;
  transcript_url?: string | null;
  meeting_id?: string | null;
  received_at?: string | null;
};

export function RecapPanel({
  sessionId,
  recap,
  onRefresh,
}: {
  sessionId: string;
  recap: RecapRecord | null;
  onRefresh: () => void | Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const [demoBusy, setDemoBusy] = useState(false);
  const [demoError, setDemoError] = useState("");

  async function handleRefresh() {
    setBusy(true);
    try {
      await onRefresh();
    } finally {
      setBusy(false);
    }
  }

  async function runDemoRecap() {
    setDemoError("");
    setDemoBusy(true);
    try {
      await api<{ ok: boolean }>(`/sessions/${sessionId}/simulate-recap`, {
        method: "POST",
        body: JSON.stringify({}),
      });
      await onRefresh();
    } catch (e) {
      setDemoError(e instanceof Error ? e.message : "Demo recap failed");
    } finally {
      setDemoBusy(false);
    }
  }

  const hasContent =
    recap &&
    (recap.summary ||
      (recap.key_points && recap.key_points.length > 0) ||
      (recap.action_items && recap.action_items.length > 0));

  return (
    <UiCard className="h-fit">
      <UiCardHeader
        title="Meeting recap (Read.ai)"
        description="Production: Read.ai calls your API with a shared secret. Demo: one click below — no Postman."
        action={
          <button
            type="button"
            onClick={handleRefresh}
            disabled={busy}
            className="shrink-0 rounded-lg border border-stone-200 bg-stone-50 px-3 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-100 disabled:opacity-50 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-200 dark:hover:bg-stone-700"
          >
            {busy ? "Refreshing…" : "Refresh"}
          </button>
        }
      />

      {demoError && (
        <p className="mb-4 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-800 dark:bg-rose-950/40 dark:text-rose-200">
          {demoError}
        </p>
      )}

      <div className="mb-4 rounded-xl border border-dashed border-teal-300/60 bg-teal-50/50 p-4 dark:border-teal-800/60 dark:bg-teal-950/20">
        <p className="text-sm font-medium text-teal-900 dark:text-teal-100">
          Automate local demos (no READAI_WEBHOOK_SECRET)
        </p>
        <p className="mt-1 text-xs leading-relaxed text-teal-800/90 dark:text-teal-200/80">
          Uses your login JWT →{" "}
          <code className="rounded bg-white/60 px-1 dark:bg-black/20">
            POST /sessions/:id/simulate-recap
          </code>
          . Same DB path as the real webhook. Sets session to{" "}
          <strong>completed</strong>.
        </p>
        <button
          type="button"
          disabled={demoBusy}
          onClick={runDemoRecap}
          className="mt-3 w-full rounded-lg bg-teal-600 py-2 text-xs font-semibold text-white hover:bg-teal-700 disabled:opacity-50 sm:w-auto sm:px-4"
        >
          {demoBusy ? "Saving recap…" : "Simulate Read.ai recap"}
        </button>
      </div>

      {!hasContent ? (
        <div className="space-y-4">
          <div className="rounded-xl bg-stone-50 p-4 dark:bg-stone-800/50">
            <p className="text-sm font-medium text-stone-800 dark:text-stone-200">
              Production setup (real Read.ai)
            </p>
            <ol className="mt-2 list-decimal space-y-2 pl-4 text-sm leading-relaxed text-stone-600 dark:text-stone-400">
              <li>
                In Read.ai (or your meeting tool), set webhook URL to your public
                API:{" "}
                <code className="rounded bg-stone-200/80 px-1 text-xs dark:bg-stone-700">
                  …/webhooks/readai
                </code>
              </li>
              <li>
                Generate a secret in Read.ai and paste the{" "}
                <strong>same value</strong> into{" "}
                <code className="rounded bg-stone-200/80 px-1 text-xs dark:bg-stone-700">
                  READAI_WEBHOOK_SECRET
                </code>{" "}
                — that is the automation: one secret, two places.
              </li>
              <li>
                Map meeting → tutoring session using{" "}
                <code className="rounded bg-stone-200/80 px-1 text-xs dark:bg-stone-700">
                  external_id
                </code>{" "}
                = your{" "}
                <code className="rounded bg-stone-200/80 px-1 text-xs dark:bg-stone-700">
                  sessions.id
                </code>
                .
              </li>
            </ol>
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          {recap?.summary && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-stone-400 dark:text-stone-500">
                Summary
              </p>
              <p className="mt-2 text-sm leading-relaxed text-stone-700 dark:text-stone-300">
                {recap.summary}
              </p>
            </div>
          )}

          {recap?.key_points && recap.key_points.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-stone-400 dark:text-stone-500">
                Key points
              </p>
              <ul className="mt-2 flex flex-wrap gap-2">
                {recap.key_points.map((kp, i) => (
                  <li
                    key={i}
                    className="rounded-lg bg-teal-50 px-2.5 py-1 text-xs font-medium text-teal-900 dark:bg-teal-950/40 dark:text-teal-200"
                  >
                    {kp}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {recap.action_items && recap.action_items.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-stone-400 dark:text-stone-500">
                Action items
              </p>
              <ul className="mt-2 space-y-2">
                {recap.action_items.map((item, i) => (
                  <li
                    key={i}
                    className="flex gap-2 text-sm text-stone-700 dark:text-stone-300"
                  >
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border border-stone-300 text-[10px] text-stone-400 dark:border-stone-600">
                      ○
                    </span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex flex-wrap gap-3 border-t border-stone-100 pt-4 dark:border-stone-800">
            {recap.transcript_url && (
              <a
                href={recap.transcript_url}
                target="_blank"
                rel="noreferrer"
                className="text-sm font-medium text-teal-700 hover:text-teal-800 dark:text-teal-400 dark:hover:text-teal-300"
              >
                Open transcript →
              </a>
            )}
            {recap.received_at && (
              <span className="text-xs text-stone-400">
                Received {new Date(recap.received_at).toLocaleString()}
              </span>
            )}
            {recap.meeting_id && (
              <span className="text-xs text-stone-400">
                Meeting {recap.meeting_id}
              </span>
            )}
          </div>
        </div>
      )}
    </UiCard>
  );
}
