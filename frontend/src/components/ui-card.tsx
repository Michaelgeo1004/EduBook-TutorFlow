import type { ReactNode } from "react";

export function UiCard({
  children,
  className = "",
  padding = "p-6",
}: {
  children: ReactNode;
  className?: string;
  padding?: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-stone-200/80 bg-white shadow-sm shadow-stone-900/5 dark:border-stone-700/80 dark:bg-stone-900 dark:shadow-black/30 ${padding} ${className}`}
    >
      {children}
    </div>
  );
}

export function UiCardHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
      <div>
        <h2 className="text-lg font-semibold tracking-tight text-stone-900 dark:text-stone-50">
          {title}
        </h2>
        {description && (
          <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
            {description}
          </p>
        )}
      </div>
      {action}
    </div>
  );
}
