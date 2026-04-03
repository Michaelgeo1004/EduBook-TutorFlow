const styles: Record<string, string> = {
  pending:
    "bg-amber-100 text-amber-900 dark:bg-amber-950/50 dark:text-amber-200",
  confirmed:
    "bg-emerald-100 text-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-200",
  paid: "bg-emerald-100 text-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-200",
  completed:
    "bg-sky-100 text-sky-900 dark:bg-sky-950/50 dark:text-sky-200",
  cancelled:
    "bg-rose-100 text-rose-900 dark:bg-rose-950/50 dark:text-rose-200",
  rescheduled:
    "bg-violet-100 text-violet-900 dark:bg-violet-950/50 dark:text-violet-200",
  failed: "bg-rose-100 text-rose-900 dark:bg-rose-950/50 dark:text-rose-200",
  refunded:
    "bg-stone-200 text-stone-800 dark:bg-stone-700 dark:text-stone-200",
};

export function SessionStatusBadge({ status }: { status: string }) {
  const key = status.toLowerCase();
  const cls =
    styles[key] ||
    "bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300";
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${cls}`}
    >
      {status.replace(/_/g, " ")}
    </span>
  );
}
