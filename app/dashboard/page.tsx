
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function DashboardPage() {
  const router = useRouter();
  const [schoolName, setSchoolName] = useState("");
  const [adminName, setAdminName] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboard() {
      const { data: authData } = await supabase.auth.getUser();

      if (!authData.user) {
        router.replace("/login");
        return;
      }

      const { data: profile, error } = await supabase
        .from("profiles")
        .select("full_name, school_id")
        .eq("user_id", authData.user.id)
        .single();

      if (error || !profile) {
        router.replace("/login");
        return;
      }

      const { data: school } = await supabase
        .from("schools")
        .select("name")
        .eq("id", profile.school_id)
        .single();

      setAdminName(profile.full_name);
      setSchoolName(school?.name || "Your institution");
      setLoading(false);
    }

    loadDashboard();
  }, [router]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="text-slate-500">Loading your secure workspace...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 bg-white px-6 py-5 md:px-12">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600 text-xl font-bold text-white">
            E
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">EduTrack AI</h1>
            <p className="text-xs font-medium tracking-wider text-blue-600">
              SMART CAMPUS MANAGEMENT
            </p>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          Log out
        </button>
      </header>

      <section className="mx-auto max-w-6xl px-6 py-12">
        <p className="text-sm font-medium text-blue-600">YOUR WORKSPACE</p>
        <h2 className="mt-3 text-3xl font-bold text-slate-900">
          Welcome, {adminName}
        </h2>
        <p className="mt-2 text-lg text-slate-500">{schoolName}</p>

        <div className="mt-10 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <h3 className="text-xl font-bold text-slate-900">
            Your school workspace is ready
          </h3>
          <p className="mt-3 leading-7 text-slate-500">
            This private workspace is connected to your institution.
            Student management, classes, attendance and reports will
            appear here as we connect each feature.
          </p>
        </div>
      </section>
    </main>
  );
}
