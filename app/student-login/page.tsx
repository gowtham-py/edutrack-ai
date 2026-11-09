
"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import {
  GraduationCap,
  Lock,
  School,
  UserRound,
  Loader2,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";

export default function StudentLoginPage() {
  const router = useRouter();

  const [schoolCode, setSchoolCode] = useState("");
  const [admissionNumber, setAdmissionNumber] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/students/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          schoolCode: schoolCode.trim(),
          admissionNumber: admissionNumber.trim(),
          password,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Student login failed.");
      }

      if (
        !result.session?.access_token ||
        !result.session?.refresh_token
      ) {
        throw new Error("Login session could not be created.");
      }

      // Save the authenticated Supabase session in the browser.
      const { error: sessionError } = await supabase.auth.setSession({
        access_token: result.session.access_token,
        refresh_token: result.session.refresh_token,
      });

      if (sessionError) {
        throw sessionError;
      }

      router.push("/student-portal");
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to sign in. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-emerald-50 via-white to-teal-50 px-4 py-10">
      <div className="pointer-events-none absolute -left-24 -top-24 h-80 w-80 rounded-full bg-emerald-200/40 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -right-24 h-80 w-80 rounded-full bg-teal-200/40 blur-3xl" />

      <div className="relative grid w-full max-w-5xl overflow-hidden rounded-3xl border border-white bg-white shadow-2xl shadow-emerald-900/10 md:grid-cols-2">
        {/* Left information panel */}
        <section className="relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-emerald-700 via-emerald-600 to-teal-600 p-10 text-white md:flex">
          <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full border-[40px] border-white/10" />
          <div className="absolute -bottom-28 -left-20 h-80 w-80 rounded-full border-[45px] border-white/10" />

          <div className="relative">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 backdrop-blur">
              <GraduationCap size={32} />
            </div>

            <h1 className="mt-8 text-4xl font-extrabold tracking-tight">
              EduTrack AI
            </h1>

            <p className="mt-4 max-w-sm text-lg leading-8 text-emerald-50">
              Your learning journey, attendance and academic progress — all
              in one place.
            </p>
          </div>

          <div className="relative rounded-2xl border border-white/20 bg-white/10 p-5 backdrop-blur">
            <div className="flex items-center gap-3">
              <ShieldCheck size={25} />
              <p className="font-semibold">Secure Student Portal</p>
            </div>
            <p className="mt-2 text-sm leading-6 text-emerald-50">
              Sign in with your school code and admission number to access
              your personal academic information.
            </p>
          </div>
        </section>

        {/* Login form */}
        <section className="p-7 sm:p-10 md:p-12">
          <div className="mb-8 flex items-center gap-3 md:hidden">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
              <GraduationCap size={27} />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-gray-900">
                EduTrack AI
              </h1>
              <p className="text-xs text-gray-500">Student Portal</p>
            </div>
          </div>

          <div>
            <span className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold uppercase tracking-wider text-emerald-700">
              Student access
            </span>

            <h2 className="mt-5 text-3xl font-extrabold tracking-tight text-gray-900">
              Welcome back!
            </h2>

            <p className="mt-2 text-sm leading-6 text-gray-500">
              Enter your school and admission details to continue.
            </p>
          </div>

          <form onSubmit={handleLogin} className="mt-8 space-y-5">
            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">
                School Code
              </label>
              <div className="relative">
                <School className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={19} />
                <input
                  type="text"
                  value={schoolCode}
                  onChange={(e) => setSchoolCode(e.target.value)}
                  placeholder="Enter your school code"
                  required
                  maxLength={100}
                  autoComplete="organization"
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 py-3.5 pl-12 pr-4 text-sm text-gray-900 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10"
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">
                Admission Number
              </label>
              <div className="relative">
                <UserRound className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={19} />
                <input
                  type="text"
                  value={admissionNumber}
                  onChange={(e) => setAdmissionNumber(e.target.value)}
                  placeholder="Enter your admission number"
                  required
                  maxLength={100}
                  autoComplete="username"
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 py-3.5 pl-12 pr-4 text-sm text-gray-900 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10"
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={19} />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  autoComplete="current-password"
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 py-3.5 pl-12 pr-12 text-sm text-gray-900 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 transition hover:text-emerald-700"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
                </button>
              </div>
            </div>

            {error && (
              <div
                role="alert"
                className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 py-3.5 text-sm font-bold text-white shadow-lg shadow-emerald-600/20 transition hover:-translate-y-0.5 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? (
                <>
                  <Loader2 size={19} className="animate-spin" />
                  Signing in...
                </>
              ) : (
                <>
                  Sign in to Student Portal
                  <ArrowRight size={19} />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 border-t border-gray-100 pt-6 text-center">
            <p className="text-sm text-gray-500">
              Are you a school administrator or teacher?
            </p>
            <Link
              href="/login"
              className="mt-2 inline-block text-sm font-bold text-emerald-700 transition hover:text-emerald-900"
            >
              Go to Institution Login →
            </Link>
          </div>

          <p className="mt-8 text-center text-xs text-gray-400">
            © {new Date().getFullYear()} EduTrack AI. Secure academic access.
          </p>
        </section>
      </div>
    </main>
  );
}
