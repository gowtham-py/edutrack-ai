
"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  UserPlus,
  Search,
  GraduationCap,
  Loader2,
  Users,
  X,
} from "lucide-react";

type SchoolClass = {
  id: string;
  class_name: string;
  section: string;
};

type Student = {
  id: string;
  admission_number: string;
  full_name: string;
  class_id: string;
};

export default function StudentsPage() {
  const [schoolId, setSchoolId] = useState("");
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [message, setMessage] = useState("");

  const [admissionNumber, setAdmissionNumber] = useState("");
  const [fullName, setFullName] = useState("");
  const [classId, setClassId] = useState("");

  async function loadData() {
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

    const [classResult, studentResult] = await Promise.all([
      supabase
        .from("classes")
        .select("id, class_name, section")
        .eq("school_id", profile.school_id)
        .order("class_name"),
      supabase
        .from("students")
        .select("id, admission_number, full_name, class_id")
        .eq("school_id", profile.school_id)
        .order("full_name"),
    ]);

    if (classResult.error || studentResult.error) {
      setMessage(
        classResult.error?.message ||
          studentResult.error?.message ||
          "Unable to load school data."
      );
    } else {
      setClasses(classResult.data || []);
      setStudents(studentResult.data || []);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  async function addStudent(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!schoolId || !classId) {
      setMessage("Please select a class.");
      return;
    }

    setSaving(true);
    setMessage("");

    const { error } = await supabase.from("students").insert({
      school_id: schoolId,
      class_id: classId,
      admission_number: admissionNumber.trim(),
      full_name: fullName.trim(),
    });

    if (error) {
      setMessage(
        error.code === "23505"
          ? "This admission number already exists in your school."
          : error.message
      );
    } else {
      setAdmissionNumber("");
      setFullName("");
      setClassId("");
      setShowForm(false);
      await loadData();
      setMessage("Student added successfully.");
    }

    setSaving(false);
  }

  const filteredStudents = useMemo(() => {
    const term = search.trim().toLowerCase();

    return students.filter(
      (student) =>
        student.full_name.toLowerCase().includes(term) ||
        student.admission_number.toLowerCase().includes(term)
    );
  }, [students, search]);

  function getClassName(id: string) {
    const schoolClass = classes.find((item) => item.id === id);
    return schoolClass
      ? `${schoolClass.class_name} - ${schoolClass.section}`
      : "Class unavailable";
  }

  return (
    <div className="space-y-7">
      <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-[#193B32]">
            Student Management
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage your school's student records.
          </p>
        </div>

        <button
          onClick={() => {
            setMessage("");
            setShowForm(!showForm);
          }}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#087F5B] px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-900/10 transition hover:-translate-y-0.5 hover:bg-[#066B4D]"
        >
          {showForm ? <X size={18} /> : <UserPlus size={18} />}
          {showForm ? "Close form" : "Add student"}
        </button>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-[#E8EEE9] bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total students</p>
              <p className="mt-2 text-3xl font-bold text-[#193B32]">
                {students.length}
              </p>
            </div>
            <div className="rounded-xl bg-emerald-100 p-3 text-emerald-700">
              <GraduationCap size={25} />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-[#E8EEE9] bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Classes available</p>
              <p className="mt-2 text-3xl font-bold text-[#193B32]">
                {classes.length}
              </p>
            </div>
            <div className="rounded-xl bg-violet-100 p-3 text-violet-700">
              <Users size={25} />
            </div>
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
          onSubmit={addStudent}
          className="space-y-5 rounded-2xl border border-[#E8EEE9] bg-white p-6 shadow-sm"
        >
          <div>
            <h2 className="text-lg font-bold text-[#193B32]">
              Add a new student
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Enter the student's basic school details.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-2 text-sm font-medium text-gray-700">
              Full name
              <input
                required
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                placeholder="Enter student's full name"
                className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              />
            </label>

            <label className="space-y-2 text-sm font-medium text-gray-700">
              Admission number
              <input
                required
                value={admissionNumber}
                onChange={(event) => setAdmissionNumber(event.target.value)}
                placeholder="e.g. EDU001"
                className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              />
            </label>

            <label className="space-y-2 text-sm font-medium text-gray-700 sm:col-span-2">
              Class and section
              <select
                required
                value={classId}
                onChange={(event) => setClassId(event.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              >
                <option value="">Select a class</option>
                {classes.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.class_name} - {item.section}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <button
            type="submit"
            disabled={saving || classes.length === 0}
            className="rounded-xl bg-[#087F5B] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#066B4D] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save student"}
          </button>

          {classes.length === 0 && (
            <p className="text-sm text-amber-700">
              Create a class first before adding students.
            </p>
          )}
        </form>
      )}

      <section className="overflow-hidden rounded-2xl border border-[#E8EEE9] bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-gray-100 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-bold text-[#193B32]">All students</h2>
            <p className="mt-1 text-xs text-gray-500">
              {filteredStudents.length} student records
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
              placeholder="Search students..."
              className="w-full rounded-xl border border-gray-200 py-2.5 pl-10 pr-4 text-sm outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-3 p-12 text-sm text-gray-500">
            <Loader2 className="animate-spin" size={20} />
            Loading students...
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="p-12 text-center">
            <GraduationCap className="mx-auto text-gray-300" size={38} />
            <p className="mt-3 font-semibold text-gray-700">
              {search ? "No matching students" : "No students added yet"}
            </p>
            <p className="mt-1 text-sm text-gray-400">
              {search
                ? "Try another name or admission number."
                : "Add your first student to get started."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#F7FAF8] text-xs uppercase tracking-wider text-gray-500">
                <tr>
                  <th className="px-5 py-4">Student</th>
                  <th className="px-5 py-4">Admission number</th>
                  <th className="px-5 py-4">Class / Section</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredStudents.map((student) => (
                  <tr
                    key={student.id}
                    className="transition hover:bg-emerald-50/40"
                  >
                    <td className="whitespace-nowrap px-5 py-4 font-semibold text-[#193B32]">
                      {student.full_name}
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 text-gray-600">
                      {student.admission_number}
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 text-gray-600">
                      {getClassName(student.class_id)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
