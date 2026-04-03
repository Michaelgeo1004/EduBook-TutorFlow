"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";

const nav = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/sessions", label: "Sessions" },
];

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const pathname = usePathname();

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-10 border-b border-stone-200/80 bg-white/90 backdrop-blur-md dark:border-stone-800/80 dark:bg-stone-950/90">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-4 py-3">
          <div className="flex flex-wrap items-center gap-8">
            <Link
              href="/dashboard"
              className="flex items-center gap-2 font-semibold tracking-tight text-stone-900 dark:text-stone-50"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-600 text-sm font-bold text-white shadow-sm">
                E
              </span>
              EduBook
            </Link>
            <nav className="flex flex-wrap gap-1">
              {nav.map((item) => {
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                      active
                        ? "bg-stone-900 text-white dark:bg-teal-600 dark:text-white"
                        : "text-stone-600 hover:bg-stone-100 hover:text-stone-900 dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-stone-100"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
              {user?.role === "student" && (
                <Link
                  href="/dashboard/book"
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                    pathname === "/dashboard/book"
                      ? "bg-stone-900 text-white dark:bg-teal-600 dark:text-white"
                      : "text-stone-600 hover:bg-stone-100 hover:text-stone-900 dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-stone-100"
                  }`}
                >
                  Book
                </Link>
              )}
              {user?.role === "tutor" && (
                <Link
                  href="/dashboard/profile"
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                    pathname === "/dashboard/profile"
                      ? "bg-stone-900 text-white dark:bg-teal-600 dark:text-white"
                      : "text-stone-600 hover:bg-stone-100 hover:text-stone-900 dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-stone-100"
                  }`}
                >
                  Profile
                </Link>
              )}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden text-right text-sm sm:block">
              <p className="font-medium text-stone-800 dark:text-stone-200">
                {user?.full_name}
              </p>
              <p className="text-xs capitalize text-stone-500">{user?.role}</p>
            </div>
            <button
              type="button"
              onClick={() => {
                logout();
                window.location.href = "/login";
              }}
              className="rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm font-medium text-stone-700 shadow-sm hover:bg-stone-50 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-200 dark:hover:bg-stone-800"
            >
              Log out
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10">{children}</main>
    </div>
  );
}
