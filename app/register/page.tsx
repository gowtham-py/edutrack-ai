
"use client";

import { useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function RegisterPage() {
  const [schoolName, setSchoolName] = useState("");
  const [schoolId, setSchoolId] = useState("");
  const [adminName, setAdminName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage("");
    setError("");
    setLoading(true);

    try {
      const { data: sessionData } = await supabase.auth.getSession();

      if (sessionData.session) {
        const { error: schoolError } = await supabase.rpc(
          "create_school_for_current_user",
          {
            p_school_name: schoolName,
            p_school_code: schoolId,
            p_full_name: adminName,
          }
        );

        if (schoolError) throw schoolError;

        setMessage("Your school has been created successfully. You can now log in.");
      } else {
        const { data, error: signupError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              school_name: schoolName,
              school_code: schoolId,
              full_name: adminName,
            },
          },
        });

        if (signupError) throw signupError;

        if (data.user && data.user.identities?.length === 0) {
          throw new Error(
            "This email already has an account. Please log in first, then return here to create your school."
          );
        }

        if (data.session) {
          const { error: schoolError } = await supabase.rpc(
            "create_school_for_current_user",
            {
              p_school_name: schoolName,
              p_school_code: schoolId,
              p_full_name: adminName,
            }
          );

          if (schoolError) throw schoolError;

          setMessage("Your school has been created successfully.");
        } else {
          setMessage(
            "Account created! Please check your email and click the confirmation link. Then log in to finish creating your school."
          );
        }
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-5 py-12">
      <div className="w-full max-w-xl rounded-3xl border border-slate-200 bg-white p-7 shadow-xl md:p-10">
        <Link href="/" className="text-sm font-medium text-blue-600">
          ← Back to home
        </Link>

        <div className="mt-7">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600 text-xl font-bold text-white">
            E
          </div>
          <h1 className="mt-5 text-3xl font-bold text-slate-900">
            Register your school
          </h1>
          <p className="mt-2 text-slate-500">
            Create your institution's secure EduTrack AI workspace.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          <div>
            <label className="mb-2 block text-sm font-semibold">School name</label>
            <input
              required
              value={schoolName}
              onChange={(e) => setSchoolName(e.target.value)}
              placeholder="Enter your school name"
              className="w-full rounded-xl border border-slate-300 p-3 outline-none focus:border-blue-600"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold">School ID</label>
            <input
              required
              minLength={4}
              maxLength={30}
              value={schoolId}
              onChange={(e) =>
                setSchoolId(e.target.value.toUpperCase().replace(/\s/g, ""))
              }
              placeholder="Example: GREENWOOD01"
              className="w-full rounded-xl border border-slate-300 p-3 uppercase outline-none focus:border-blue-600"
            />
            <p className="mt-1 text-xs text-slate-400">
              Use 4–30 letters, numbers, hyphens or underscores.
            </p>
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold">Administrator name</label>
            <input
              required
              value={adminName}
              onChange={(e) => setAdminName(e.target.value)}
              placeholder="Your full name"
              className="w-full rounded-xl border border-slate-300 p-3 outline-none focus:border-blue-600"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold">Email address</label>
            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@school.com"
              className="w-full rounded-xl border border-slate-300 p-3 outline-none focus:border-blue-600"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold">Password</label>
            <input
              required
              type="password"
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Create at least 8 characters"
              className="w-full rounded-xl border border-slate-300 p-3 outline-none focus:border-blue-600"
            />
          </div>

          {error && (
            <p className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>
          )}

          {message && (
            <p className="rounded-xl bg-blue-50 p-4 text-sm text-blue-700">{message}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-blue-600 p-4 font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "Please wait..." : "Create school account"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500">
          Already registered?{" "}
          <Link href="/login" className="font-semibold text-blue-600">
            Login here
          </Link>
        </p>
      </div>
    </main>
  );
}
