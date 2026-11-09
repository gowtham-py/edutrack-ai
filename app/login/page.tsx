
"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type LoginRole = "admin" | "teacher" | "student";

export default function LoginPage() {
  const router = useRouter();

  const [role, setRole] = useState<LoginRole>("admin");

  const [email, setEmail] = useState("");
  const [schoolId, setSchoolId] = useState("");
  const [teacherKey, setTeacherKey] = useState("");
  const [admissionNumber, setAdmissionNumber] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function changeRole(nextRole: LoginRole) {
    setRole(nextRole);
    setError("");
    setPassword("");
  }

  async function handleLogin(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setError("");
    setLoading(true);

    try {
      // SCHOOL ADMIN LOGIN
      if (role === "admin") {
        const { error: loginError } =
          await supabase.auth.signInWithPassword({
            email: email.trim(),
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
        router.refresh();
        return;
      }

      // TEACHER LOGIN
      if (role === "teacher") {
        const response = await fetch("/api/teacher-login", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            schoolCode: schoolId.trim().toUpperCase(),
            teacherKey: teacherKey.trim().toUpperCase(),
            password,
          }),
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || "Teacher login failed.");
        }

        if (
          !result.session?.access_token ||
          !result.session?.refresh_token
        ) {
          throw new Error("Invalid teacher login response.");
        }

        const { error: sessionError } =
          await supabase.auth.setSession({
            access_token: result.session.access_token,
            refresh_token: result.session.refresh_token,
          });

        if (sessionError) throw sessionError;

        router.push("/dashboard");
        router.refresh();
        return;
      }

      // STUDENT LOGIN
      if (role === "student") {
        const response = await fetch("/api/students/login", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            schoolCode: schoolId.trim().toUpperCase(),
            admissionNumber: admissionNumber.trim().toUpperCase(),
            password,
          }),
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || "Student login failed.");
        }

        if (!result.access_token || !result.refresh_token) {
          throw new Error("Invalid student login response.");
        }

        const { error: sessionError } =
          await supabase.auth.setSession({
            access_token: result.access_token,
            refresh_token: result.refresh_token,
          });

        if (sessionError) throw sessionError;

        router.push("/student-portal");
        router.refresh();
        return;
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Login failed. Please check your details and try again."
      );
    } finally {
      setLoading(false);
    }
  }

  const roleDetails = {
    admin: {
      title: "Welcome back",
      description: "Sign in to manage your institution.",
      button: "Login to your school",
    },
    teacher: {
      title: "Teacher login",
      description: "Access your classes and attendance workspace.",
      button: "Login as teacher",
    },
    student: {
      title: "Student login",
      description: "Access your personal student portal.",
      button: "Login as student",
    },
  };

  const active = roleDetails[role];

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-emerald-50 via-white to-teal-50 px-4 py-10 sm:px-6">
      {/* Background decoration */}
      <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-emerald-200/40 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -right-24 h-80 w-80 rounded-full bg-teal-200/40 blur-3xl" />

      <div className="relative w-full max-w-md">
        <div className="rounded-[28px] border border-white bg-white/95 p-6 shadow-2xl shadow-emerald-900/10 backdrop-blur-xl sm:p-9">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-emerald-700"
          >
            <span>←</span>
            Back to home
          </Link>

          {/* Brand */}
          <div className="mt-7 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 text-2xl font-black text-white shadow-lg shadow-emerald-600/20">
              E
            </div>

            <div>
              <h2 className="text-xl font-black tracking-tight text-slate-900">
                EduTrack <span className="text-emerald-600">AI</span>
              </h2>
              <p className="text-xs font-medium text-slate-500">
                Smart Education Management
              </p>
            </div>
          </div>

          {/* Heading */}
          <div className="mt-8">
            <h1 className="text-3xl font-black tracking-tight text-slate-900">
              {active.title}
            </h1>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              {active.description}
            </p>
          </div>

          {/* Role selector */}
          <div className="mt-7">
            <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">
              Continue as
            </p>

            <div className="grid grid-cols-3 gap-2 rounded-2xl bg-slate-100 p-1.5">
              <button
                type="button"
                onClick={() => changeRole("admin")}
                className={`rounded-xl px-2 py-3 text-sm font-bold transition-all ${
                  role === "admin"
                    ? "bg-white text-emerald-700 shadow-md"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Admin
              </button>

              <button
                type="button"
                onClick={() => changeRole("teacher")}
                className={`rounded-xl px-2 py-3 text-sm font-bold transition-all ${
                  role === "teacher"
                    ? "bg-white text-emerald-700 shadow-md"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Teacher
              </button>

              <button
                type="button"
                onClick={() => changeRole("student")}
                className={`rounded-xl px-2 py-3 text-sm font-bold transition-all ${
                  role === "student"
                    ? "bg-white text-emerald-700 shadow-md"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Student
              </button>
            </div>

            <div className="mt-3 flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5">
              <span className="text-xs text-slate-500">
                Are you a parent?
              </span>
              <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-bold text-amber-700">
                Coming soon
              </span>
            </div>
          </div>

          {/* Login form */}
          <form onSubmit={handleLogin} className="mt-7 space-y-4">
            {role === "admin" && (
              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">
                  Email address
                </label>
                <input
                  required
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@school.com"
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
                />
              </div>
            )}

            <div>
              <label className="mb-2 block text-sm font-bold text-slate-700">
                {role === "admin" ? "School ID" : "School Code"}
              </label>

              <input
                required
                value={schoolId}
                onChange={(e) =>
                  setSchoolId(e.target.value.toUpperCase())
                }
                placeholder="Enter your school code"
                autoComplete="organization"
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-sm uppercase text-slate-900 outline-none transition placeholder:normal-case placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
              />
            </div>

            {role === "teacher" && (
              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">
                  Teacher Key
                </label>
                <input
                  required
                  value={teacherKey}
                  onChange={(e) =>
                    setTeacherKey(e.target.value.toUpperCase())
                  }
                  placeholder="Enter your Teacher Key"
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-sm uppercase text-slate-900 outline-none transition placeholder:normal-case placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
                />
              </div>
            )}

            {role === "student" && (
              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">
                  Admission Number
                </label>
                <input
                  required
                  value={admissionNumber}
                  onChange={(e) =>
                    setAdmissionNumber(e.target.value.toUpperCase())
                  }
                  placeholder="Enter your admission number"
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-sm uppercase text-slate-900 outline-none transition placeholder:normal-case placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
                />
              </div>
            )}

            <div>
              <label className="mb-2 block text-sm font-bold text-slate-700">
                Password
              </label>
              <input
                required
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
              />
            </div>

            {error && (
              <div className="rounded-xl border border-red-100 bg-red-50 p-3.5 text-sm leading-5 text-red-700">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 p-4 text-sm font-bold text-white shadow-lg shadow-emerald-600/20 transition hover:-translate-y-0.5 hover:from-emerald-700 hover:to-teal-700 hover:shadow-xl disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Signing in..." : active.button}
            </button>
          </form>

          {/* Registration */}
          {role === "admin" && (
            <p className="mt-6 text-center text-sm text-slate-500">
              New institution?{" "}
              <Link
                href="/register"
                className="font-bold text-emerald-700 transition hover:text-emerald-900"
              >
                Create your school
              </Link>
            </p>
          )}

          {role === "teacher" && (
            <p className="mt-6 text-center text-xs leading-5 text-slate-400">
              Use the School Code and Teacher Key provided by your school
              administrator.
            </p>
          )}

          {role === "student" && (
            <p className="mt-6 text-center text-xs leading-5 text-slate-400">
              Use the School Code and Admission Number provided by your
              school.
            </p>
          )}

          <div className="mt-7 border-t border-slate-100 pt-5 text-center">
            <p className="text-xs font-medium text-slate-400">
              Secure access · Role-based portals · EduTrack AI
            </p>
          </div>
        </div>

        <p className="mt-5 text-center text-xs text-slate-400">
          © {new Date().getFullYear()} EduTrack AI. All rights reserved.
        </p>
      </div>
    </main>
  );
}
