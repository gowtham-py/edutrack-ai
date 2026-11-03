
"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { KeyRound, Loader2, CheckCircle2, AlertCircle } from "lucide-react";

export default function TeacherSetupPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    async function prepareInvitation() {
      try {
        const params = new URLSearchParams(window.location.search);
        const code = params.get("code");
        const tokenHash = params.get("token_hash");
        const type = params.get("type");

        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
        } else if (tokenHash && type === "invite") {
          const { error } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: "invite",
          });
          if (error) throw error;
        }

        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError || !session) {
          throw new Error(
            "This invitation link is invalid or expired. Please ask your School Admin to send a new invitation."
          );
        }

        setReady(true);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Could not verify your invitation."
        );
      } finally {
        setLoading(false);
      }
    }

    prepareInvitation();
  }, []);

  async function setTeacherPassword(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setMessage("");

    if (password.length < 8) {
      setError("Your password must contain at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("The passwords do not match.");
      return;
    }

    setSaving(true);

    try {
      const { error } = await supabase.auth.updateUser({ password });

      if (error) throw error;

      setMessage(
        "Your password has been created successfully. Your School Admin can now help you sign in."
      );
      setPassword("");
      setConfirmPassword("");
      setReady(false);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not set your password."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#EAF5EF] via-[#F8FAF8] to-[#F0ECFF] px-4 py-10">
      <section className="w-full max-w-md rounded-3xl border border-white bg-white p-8 shadow-xl shadow-emerald-900/10">
        <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
          <KeyRound size={28} />
        </div>

        <p className="text-sm font-semibold text-emerald-700">
          EduTrack AI · Teacher Account
        </p>

        <h1 className="mt-2 text-2xl font-bold text-[#193B32]">
          Set up your password
        </h1>

        <p className="mt-2 text-sm leading-6 text-gray-500">
          Create a private password to secure your teacher account.
        </p>

        {loading ? (
          <div className="flex items-center gap-3 py-10 text-sm text-gray-500">
            <Loader2 className="animate-spin text-emerald-600" size={20} />
            Verifying your invitation...
          </div>
        ) : (
          <>
            {error && (
              <div className="mt-6 flex gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                <AlertCircle className="mt-0.5 shrink-0" size={18} />
                <span>{error}</span>
              </div>
            )}

            {message && (
              <div className="mt-6 flex gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
                <CheckCircle2 className="mt-0.5 shrink-0" size={18} />
                <span>{message}</span>
              </div>
            )}

            {ready && (
              <form onSubmit={setTeacherPassword} className="mt-7 space-y-5">
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    New password
                  </label>
                  <input
                    type="password"
                    autoComplete="new-password"
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                    required
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Confirm password
                  </label>
                  <input
                    type="password"
                    autoComplete="new-password"
                    minLength={8}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Enter the password again"
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={saving}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 py-3 font-semibold text-white transition hover:bg-emerald-800 disabled:opacity-60"
                >
                  {saving ? (
                    <>
                      <Loader2 className="animate-spin" size={18} />
                      Saving password...
                    </>
                  ) : (
                    "Create Password"
                  )}
                </button>
              </form>
            )}
          </>
        )}
      </section>
    </main>
  );
}
