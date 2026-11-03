
"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Users, Search, Loader2, GraduationCap } from "lucide-react";

type Teacher = {
  id: string;
  full_name: string;
};

export default function TeachersPage() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function loadTeachers() {
      setLoading(true);
      setMessage("");

      const { data: authData } = await supabase.auth.getUser();

      if (!authData.user) {
        setMessage("Please log in again.");
        setLoading(false);
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("school_id")
        .eq("user_id", authData.user.id)
        .maybeSingle();

      if (profileError || !profile?.school_id) {
        setMessage("We couldn't find your school profile.");
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name")
        .eq("school_id", profile.school_id)
        .eq("role", "teacher")
        .order("full_name");

      if (error) {
        setMessage(error.message);
      } else {
        setTeachers(data || []);
      }

      setLoading(false);
    }

    loadTeachers();
  }, []);

  const filteredTeachers = useMemo(() => {
    const term = search.trim().toLowerCase();
    return teachers.filter((teacher) =>
      teacher.full_name.toLowerCase().includes(term)
    );
  }, [teachers, search]);

  return (
    <div className="space-y-7">
      <section>
        <h1 className="text-2xl font-bold text-[#193B32]">
          Teacher Management
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          View and manage teachers in your institution.
        </p>
      </section>

      <section className="rounded-2xl border border-[#E8EEE9] bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">Registered teachers</p>
            <p className="mt-2 text-3xl font-bold text-[#193B32]">
              {loading ? "—" : teachers.length}
            </p>
          </div>
          <div className="rounded-xl bg-violet-100 p-3 text-violet-700">
            <Users size={25} />
          </div>
        </div>
      </section>

      {message && (
        <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
          {message}
        </div>
      )}

      <section className="overflow-hidden rounded-2xl border border-[#E8EEE9] bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-gray-100 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-bold text-[#193B32]">All teachers</h2>
            <p className="mt-1 text-xs text-gray-500">
              {filteredTeachers.length} teacher records
            </p>
          </div>

          <div className="relative w-full sm:max-w-xs">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search teachers..."
              className="w-full rounded-xl border border-gray-200 py-2.5 pl-10 pr-4 text-sm outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-3 p-12 text-sm text-gray-500">
            <Loader2 className="animate-spin" size={20} />
            Loading teachers...
          </div>
        ) : filteredTeachers.length === 0 ? (
          <div className="p-12 text-center">
            <GraduationCap className="mx-auto text-gray-300" size={38} />
            <p className="mt-3 font-semibold text-gray-700">
              {search ? "No matching teachers" : "No teachers registered yet"}
            </p>
            <p className="mt-1 text-sm text-gray-400">
              Teacher accounts will appear here after they are invited.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredTeachers.map((teacher) => (
              <div
                key={teacher.id}
                className="flex items-center gap-3 px-5 py-4 transition hover:bg-emerald-50/40"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-100 font-bold text-violet-700">
                  {teacher.full_name.charAt(0).toUpperCase()}
                </div>
                <p className="font-semibold text-[#193B32]">
                  {teacher.full_name}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
