
"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  UserPlus,
  Search,
  Users,
  Mail,
  KeyRound,
  Loader2,
} from "lucide-react";

type Teacher = {
  user_id: string;
  full_name: string;
  teacher_key: string | null;
  email?: string;
};

export default function TeachersPage() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [schoolId, setSchoolId] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    loadTeachers();
  }, []);

  async function loadTeachers() {
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("Please log in again.");
      setLoading(false);
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("school_id")
      .eq("user_id", user.id)
      .single();

    if (profileError || !profile?.school_id) {
      setError("Could not find your school profile.");
      setLoading(false);
      return;
    }

    setSchoolId(profile.school_id);

    const { data, error: teacherError } = await supabase
      .from("profiles")
      .select("user_id, full_name, teacher_key")
      .eq("school_id", profile.school_id)
      .eq("role", "teacher")
      .order("full_name");

    if (teacherError) {
      setError(teacherError.message);
    } else {
      setTeachers(data || []);
    }

    setLoading(false);
  }

  async function inviteTeacher(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setMessage("");

    if (!fullName.trim() || !email.trim()) {
      setError("Please enter the teacher's name and email.");
      return;
    }

    setSending(true);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error("Your session has expired. Please log in again.");
      }

      const response = await fetch("/api/teachers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          fullName: fullName.trim(),
          email: email.trim(),
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Could not invite teacher.");
      }

      setMessage(
        `Invitation sent! Teacher Key: ${result.teacher.teacherKey}`
      );

      setFullName("");
      setEmail("");

      await loadTeachers();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong."
      );
    } finally {
      setSending(false);
    }
  }

  const filteredTeachers = teachers.filter((teacher) =>
    `${teacher.full_name} ${teacher.teacher_key || ""}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="text-sm font-medium text-emerald-700">
            School Management
          </p>
          <h1 className="mt-1 text-3xl font-bold text-[#193B32]">
            Teachers
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            Invite teachers and manage their school accounts.
          </p>
        </div>

        <div className="flex items-center gap-3 rounded-2xl border border-emerald-100 bg-white px-5 py-3 shadow-sm">
          <Users className="text-emerald-600" size={22} />
          <div>
            <p className="text-2xl font-bold text-[#193B32]">
              {teachers.length}
            </p>
            <p className="text-xs text-gray-500">Total teachers</p>
          </div>
        </div>
      </div>

      {message && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
          {message}
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
        <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center gap-3">
            <div className="rounded-xl bg-emerald-50 p-3 text-emerald-700">
              <UserPlus size={22} />
            </div>
            <div>
              <h2 className="font-bold text-[#193B32]">Invite a Teacher</h2>
              <p className="text-xs text-gray-500">
                Send a secure account invitation
              </p>
            </div>
          </div>

          <form onSubmit={inviteTeacher} className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Teacher's full name
              </label>
              <input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Enter full name"
                className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                required
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Email address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="teacher@school.com"
                className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                required
              />
            </div>

            <button
              type="submit"
              disabled={sending || !schoolId}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 py-3 font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {sending ? (
                <>
                  <Loader2 className="animate-spin" size={18} />
                  Sending invitation...
                </>
              ) : (
                <>
                  <Mail size={18} />
                  Send Invitation
                </>
              )}
            </button>
          </form>

          <div className="mt-5 rounded-xl bg-[#F4F8F5] p-4">
            <p className="text-xs leading-5 text-gray-600">
              Each invited teacher receives a unique Teacher Key. They will
              use it with their School ID and password when signing in.
            </p>
          </div>
        </section>

        <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              <h2 className="font-bold text-[#193B32]">Teacher Directory</h2>
              <p className="mt-1 text-xs text-gray-500">
                Teachers registered with your school
              </p>
            </div>

            <div className="relative">
              <Search
                size={17}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search teachers..."
                className="w-full rounded-xl border border-gray-200 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-emerald-500 sm:w-52"
              />
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="animate-spin text-emerald-600" size={28} />
            </div>
          ) : filteredTeachers.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-200 py-12 text-center">
              <Users className="mx-auto mb-3 text-gray-300" size={32} />
              <p className="font-medium text-gray-600">
                {search ? "No matching teachers" : "No teachers added yet"}
              </p>
              <p className="mt-1 text-xs text-gray-400">
                Invite your first teacher using the form.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredTeachers.map((teacher) => (
                <div
                  key={teacher.user_id}
                  className="flex items-center gap-3 rounded-xl border border-gray-100 p-4 transition hover:border-emerald-200 hover:bg-emerald-50/40"
                >
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-violet-100 font-bold text-violet-700">
                    {teacher.full_name.charAt(0).toUpperCase()}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-[#193B32]">
                      {teacher.full_name}
                    </p>
                    <p className="mt-1 flex items-center gap-1 text-xs text-gray-500">
                      <KeyRound size={12} />
                      {teacher.teacher_key || "Key not assigned"}
                    </p>
                  </div>

                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                    Teacher
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
