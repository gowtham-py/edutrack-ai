
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [schoolId, setSchoolId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const { error: loginError } =
        await supabase.auth.signInWithPassword({
          email,
          password,
        });

      if (loginError) throw loginError;

      const { error: schoolError } = await supabase.rpc(
        "complete_school_registration",
        {
          p_school_code: schoolId.trim().toUpperCase(),
        }
      );

      if (schoolError) {
        await supabase.auth.signOut();
        throw schoolError;
      }

      router.push("/dashboard");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Login failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-5 py-12">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-xl md:p-10">
        <Link href="/" className="text-sm font-medium text-blue-600">
          ← Back to home
        </Link>

        <div className="mt-8 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600 text-xl font-bold text-white">
          E
        </div>

        <h1 className="mt-6 text-3xl font-bold text-slate-900">
          Welcome back
        </h1>

        <p className="mt-2 text-slate-500">
          Sign in to your institution's workspace.
        </p>

        <form onSubmit={handleLogin} className="mt-8 space-y-5">
          <div>
            <label className="mb-2 block text-sm font-semibold">
              Email address
            </label>
            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@school.com"
              className="w-full rounded-xl border border-slate-300 p-3 outline-none focus:border-blue-600"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold">
              School ID
            </label>
            <input
              required
              value={schoolId}
              onChange={(e) => setSchoolId(e.target.value.toUpperCase())}
              placeholder="Enter your School ID"
              className="w-full rounded-xl border border-slate-300 p-3 uppercase outline-none focus:border-blue-600"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold">
              Password
            </label>
            <input
              required
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              className="w-full rounded-xl border border-slate-300 p-3 outline-none focus:border-blue-600"
            />
          </div>

          {error && (
            <p className="rounded-xl bg-red-50 p-4 text-sm text-red-700">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-blue-600 p-4 font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "Signing in..." : "Login to your school"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500">
          New institution?{" "}
          <Link href="/register" className="font-semibold text-blue-600">
            Create your school
          </Link>
        </p>

        <div className="mt-6 border-t border-slate-100 pt-5 text-center">
          <p className="text-sm text-slate-500">
            Are you a teacher?
          </p>

          <Link
            href="/teacher-login"
            className="mt-2 inline-block font-semibold text-emerald-700 transition hover:text-emerald-900"
          >
            Teacher Login →
          </Link>
        </div>
      </div>
    </main>
  );
}
