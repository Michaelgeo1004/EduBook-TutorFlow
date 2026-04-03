import Link from "next/link";
import { UiCard } from "@/components/ui-card";

export default function PaymentCancelledPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-16">
      <UiCard className="max-w-md text-center" padding="p-10">
        <h1 className="text-2xl font-semibold text-stone-900 dark:text-stone-50">
          Payment cancelled
        </h1>
        <p className="mt-3 text-sm text-stone-600 dark:text-stone-400">
          No charge was completed. You can try again from the session page.
        </p>
        <Link
          href="/dashboard/sessions"
          className="mt-8 inline-flex w-full justify-center rounded-xl border border-stone-300 py-3 text-sm font-semibold text-stone-800 hover:bg-stone-50 dark:border-stone-600 dark:text-stone-100 dark:hover:bg-stone-800"
        >
          Back to sessions
        </Link>
      </UiCard>
    </div>
  );
}
