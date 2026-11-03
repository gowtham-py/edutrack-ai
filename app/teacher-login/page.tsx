
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  GraduationCap,
  School,
  KeyRound,
  LockKeyhole,
  Loader2,
  AlertCircle,
} from "lucide-react";

export default function TeacherLoginPage() {
  const router = useRouter();

  const [schoolCode, setSchoolCode] = useState("");
  const [teacherKey, setTeacherKey] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/teacher-login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          schoolCode: schoolCode.trim().toUpperCase(),
          teacherKey: teacherKey.trim().toUpperCase(),
          password,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Unable to sign in.");
      }

      if (!result.session?.access_token || !result.session?.refresh_token) {
        throw new Error("The login server returned an invalid session.");
      }

      const { error: sessionError } = await supabase.auth.setSession({
        access_token: result.session.access_token,
        refresh_token: result.session.refresh_token,
      });

      if (sessionError) {
        throw sessionError;
      }

      router.replace("/dashboard");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#EAF5EF] via-[#F8FAF8] to-[#F0ECFF] px-4 py-10">
      <section className="w-full max-w-md rounded-3xl border border-white bg-white p-8 shadow-xl shadow-emerald-900/10">
        <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
          <GraduationCap size={29} />
        </div>

        <p className="text-sm font-semibold text-emerald-700">
          EduTrack AI · Teacher Portal
        </p>

        <h1 className="mt-2 text-3xl font-bold text-[#193B32]">
          Teacher Login
        </h1>

        <p className="mt-2 text-sm leading-6 text-gray-500">
          Sign in using the School ID and Teacher Key provided by your School
          Admin.
        </p>

        {error && (
          <div className="mt-6 flex gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            <AlertCircle size={18} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="mt-7 space-y-5">
          <div>
            <label className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-700">
              <School size={16} />
              School ID
            </label>
            <input
              value={schoolCode}
              onChange={(e) => setSchoolCode(e.target.value)}
              placeholder="Enter your School ID"
              autoComplete="organization"
              className="w-full rounded-xl border border-gray-200 px-4 py-3 uppercase outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              required
            />
          </div>

          <div>
            <label className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-700">
              <KeyRound size={16} />
              Teacher Key
            </label>
            <input
              value={teacherKey}
              onChange={(e) => setTeacherKey(e.target.value)}
              placeholder="Example: TCH-A1B2C3D4"
              autoComplete="username"
              className="w-full rounded-xl border border-gray-200 px-4 py-3 uppercase outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              required
            />
          </div>

          <div>
            <label className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-700">
              <LockKeyhole size={16} />
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              autoComplete="current-password"
              className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 py-3.5 font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? (
              <>
                <Loader2 size={19} className="animate-spin" />
                Signing in...
              </>
            ) : (
              "Sign In"
            )}
          </button>
        </form>

        <p className="mt-6 text-center text-xs leading-5 text-gray-500">
          Having trouble signing in? Contact your School Admin.
        </p>
      </section>
    </main>
  );
}
