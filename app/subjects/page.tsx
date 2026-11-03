
"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { BookOpen, Search, Plus, Loader2, X } from "lucide-react";

type Subject = {
  id: string;
  subject_name: string;
};

export default function SubjectsPage() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [schoolId, setSchoolId] = useState("");
  const [subjectName, setSubjectName] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [message, setMessage] = useState("");

  async function loadSubjects() {
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

    setSchoolId(profile.school_id);

    const { data, error } = await supabase
      .from("subjects")
      .select("id, subject_name")
      .eq("school_id", profile.school_id)
      .order("subject_name");

    if (error) {
      setMessage(error.message);
    } else {
      setSubjects(data || []);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadSubjects();
  }, []);

  async function addSubject(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!schoolId || !subjectName.trim()) return;

    setSaving(true);
    setMessage("");

    const { error } = await supabase.from("subjects").insert({
      school_id: schoolId,
      subject_name: subjectName.trim(),
    });

    if (error) {
      setMessage(
        error.code === "23505"
          ? "This subject may already exist."
          : error.message
      );
    } else {
      setSubjectName("");
      setShowForm(false);
      await loadSubjects();
      setMessage("Subject added successfully.");
    }

    setSaving(false);
  }

  const filteredSubjects = useMemo(() => {
    const term = search.trim().toLowerCase();
    return subjects.filter((subject) =>
      subject.subject_name.toLowerCase().includes(term)
    );
  }, [subjects, search]);

  return (
    <div className="space-y-7">
      <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-[#193B32]">
            Subject Management
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Organise the subjects taught in your institution.
          </p>
        </div>

        <button
          onClick={() => {
            setMessage("");
            setShowForm(!showForm);
          }}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#087F5B] px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-900/10 transition hover:-translate-y-0.5 hover:bg-[#066B4D]"
        >
          {showForm ? <X size={18} /> : <Plus size={18} />}
          {showForm ? "Close form" : "Add subject"}
        </button>
      </section>

      <section className="rounded-2xl border border-[#E8EEE9] bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">Total subjects</p>
            <p className="mt-2 text-3xl font-bold text-[#193B32]">
              {loading ? "—" : subjects.length}
            </p>
          </div>
          <div className="rounded-xl bg-amber-100 p-3 text-amber-700">
            <BookOpen size={25} />
          </div>
        </div>
      </section>

      {message && (
        <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {message}
        </div>
      )}

      {showForm && (
        <form
          onSubmit={addSubject}
          className="space-y-4 rounded-2xl border border-[#E8EEE9] bg-white p-6 shadow-sm"
        >
          <div>
            <h2 className="font-bold text-[#193B32]">Add a new subject</h2>
            <p className="mt-1 text-sm text-gray-500">
              Enter the subject name.
            </p>
          </div>

          <label className="block space-y-2 text-sm font-medium text-gray-700">
            Subject name
            <input
              required
              value={subjectName}
              onChange={(event) => setSubjectName(event.target.value)}
              placeholder="e.g. Mathematics"
              className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
            />
          </label>

          <button
            type="submit"
            disabled={saving || !schoolId}
            className="rounded-xl bg-[#087F5B] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#066B4D] disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save subject"}
          </button>
        </form>
      )}

      <section className="overflow-hidden rounded-2xl border border-[#E8EEE9] bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-gray-100 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-bold text-[#193B32]">All subjects</h2>
            <p className="mt-1 text-xs text-gray-500">
              {filteredSubjects.length} subject records
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
              placeholder="Search subjects..."
              className="w-full rounded-xl border border-gray-200 py-2.5 pl-10 pr-4 text-sm outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-3 p-12 text-sm text-gray-500">
            <Loader2 className="animate-spin" size={20} />
            Loading subjects...
          </div>
        ) : filteredSubjects.length === 0 ? (
          <div className="p-12 text-center">
            <BookOpen className="mx-auto text-gray-300" size={38} />
            <p className="mt-3 font-semibold text-gray-700">
              {search ? "No matching subjects" : "No subjects added yet"}
            </p>
            <p className="mt-1 text-sm text-gray-400">
              Add your first subject to get started.
            </p>
          </div>
        ) : (
          <div className="grid gap-3 p-5 sm:grid-cols-2 xl:grid-cols-3">
            {filteredSubjects.map((subject) => (
              <div
                key={subject.id}
                className="flex items-center gap-3 rounded-xl border border-gray-100 p-4 transition hover:border-emerald-200 hover:bg-emerald-50/40"
              >
                <div className="rounded-xl bg-emerald-100 p-3 text-emerald-700">
                  <BookOpen size={20} />
                </div>
                <p className="font-semibold text-[#193B32]">
                  {subject.subject_name}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
