"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { PasswordField } from "@/components/password-field";
import { UiCard } from "@/components/ui-card";

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setPending(true);
    try {
      await login(email, password);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-16">
      <UiCard className="w-full max-w-md" padding="p-8 sm:p-10">
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-teal-700 dark:text-teal-400">
            Welcome back
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-stone-900 dark:text-stone-50">
            Log in
          </h1>
          <p className="mt-2 text-sm text-stone-500">
            Student or tutor account
          </p>
        </div>
        <form onSubmit={onSubmit} className="mt-8 space-y-5">
          {error && (
            <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800 dark:bg-rose-950/40 dark:text-rose-200">
              {error}
            </p>
          )}
          <div>
            <label className="block text-sm font-medium text-stone-700 dark:text-stone-300">
              Email
            </label>
            <input
              type="email"
              required
              autoComplete="email"
              className="mt-1.5 w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2.5 text-sm outline-none ring-teal-600/20 focus:border-teal-500 focus:ring-4 dark:border-stone-700 dark:bg-stone-900 dark:focus:border-teal-500"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <PasswordField
            label="Password"
            value={password}
            onChange={setPassword}
            autoComplete="current-password"
          />
          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-xl bg-stone-900 py-3 text-sm font-semibold text-white shadow-sm hover:bg-stone-800 disabled:opacity-50 dark:bg-teal-600 dark:hover:bg-teal-500"
          >
            {pending ? "Signing in…" : "Sign in"}
          </button>
        </form>
        <p className="mt-8 text-center text-sm text-stone-500">
          No account?{" "}
          <Link
            href="/signup"
            className="font-medium text-teal-700 hover:underline dark:text-teal-400"
          >
            Sign up
          </Link>
        </p>
        <p className="mt-4 text-center text-xs text-stone-400">
          Legacy seed users without passwords: use API demo JWT.
        </p>
      </UiCard>
    </div>
  );
}
