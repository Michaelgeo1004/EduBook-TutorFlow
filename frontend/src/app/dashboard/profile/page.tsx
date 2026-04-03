"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/auth-context";
import { UiCard } from "@/components/ui-card";

export default function ProfilePage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");

  const [hourlyRate, setHourlyRate] = useState("");
  const [bio, setBio] = useState("");
  const [subjects, setSubjects] = useState("");
  const [curriculum, setCurriculum] = useState("");

  useEffect(() => {
    async function load() {
      if (user?.role !== "tutor") return;
      try {
        const data = await api<any>("/tutors/me");
        setProfile(data.profile);
        setHourlyRate(data.profile.hourly_rate);
        setBio(data.profile.bio || "");
        setSubjects(data.profile.subjects.join(", "));
        setCurriculum(data.profile.curriculum.join(", "));
      } catch (e: any) {
        setError(e.message);
      }
    }
    load();
  }, [user?.role]);

  async function update() {
    setBusy(true);
    setMsg("");
    setError("");
    try {
      await api("/tutors/me", {
        method: "PATCH",
        body: JSON.stringify({
          hourly_rate: parseFloat(hourlyRate),
          bio,
          subjects: subjects.split(",").map((s) => s.trim()),
          curriculum: curriculum.split(",").map((c) => c.trim()),
        }),
      });
      setMsg("Profile updated successfully!");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  if (user?.role !== "tutor") {
    return (
      <UiCard>
        <p className="text-stone-500">Only tutors can manage their profiles.</p>
      </UiCard>
    );
  }

  return (
    <div className="max-w-xl space-y-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-stone-900 dark:text-stone-50">
          My Profile settings
        </h1>
        <p className="mt-2 text-stone-600 dark:text-stone-400">
          Update how you appear to students and your booking rates.
        </p>
      </div>

      <UiCard className="space-y-6">
        {msg && <p className="text-sm font-medium text-teal-600">{msg}</p>}
        {error && <p className="text-sm font-medium text-red-600">{error}</p>}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-stone-700 dark:text-stone-300">
              Hourly Rate (USD)
            </label>
            <input
              type="number"
              value={hourlyRate}
              onChange={(e) => setHourlyRate(e.target.value)}
              className="mt-1 block w-full rounded-xl border-stone-300 bg-stone-50 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-700 dark:text-stone-300">
              Bio
            </label>
            <textarea
              rows={4}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="mt-1 block w-full rounded-xl border-stone-300 bg-stone-50 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100"
              placeholder="Tell students about your experience..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-700 dark:text-stone-300">
              Subjects (comma separated)
            </label>
            <input
              type="text"
              value={subjects}
              onChange={(e) => setSubjects(e.target.value)}
              className="mt-1 block w-full rounded-xl border-stone-300 bg-stone-50 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100"
              placeholder="Math, Physics, Biology"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-700 dark:text-stone-300">
              Curriculum (comma separated)
            </label>
            <input
              type="text"
              value={curriculum}
              onChange={(e) => setCurriculum(e.target.value)}
              className="mt-1 block w-full rounded-xl border-stone-300 bg-stone-50 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100"
              placeholder="IB, GCSE, A-Level"
            />
          </div>
        </div>

        <button
          onClick={update}
          disabled={busy}
          className="w-full rounded-xl bg-teal-600 py-3 text-sm font-semibold text-white shadow-lg shadow-teal-900/20 hover:bg-teal-700 disabled:opacity-50"
        >
          {busy ? "Saving..." : "Save changes"}
        </button>
      </UiCard>
    </div>
  );
}
