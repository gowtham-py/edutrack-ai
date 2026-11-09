"use client";

import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { supabase } from "@/lib/supabase";
import {
  UserPlus,
  Search,
  GraduationCap,
  Loader2,
  Users,
  X,
  Pencil,
  Eye,
  RefreshCw,
  Filter,
  BookOpen,
  CalendarDays,
  Hash,
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
  class_id: string | null;
  photo_storage_path: string | null;
  created_at: string | null;
};

type FormMode = "add" | "edit";

export default function StudentsPage() {
  const [schoolId, setSchoolId] = useState("");
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [classFilter, setClassFilter] = useState("all");
  const [sectionFilter, setSectionFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [formMode, setFormMode] = useState<FormMode>("add");
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error">("success");

  const [admissionNumber, setAdmissionNumber] = useState("");
  const [fullName, setFullName] = useState("");
  const [classId, setClassId] = useState("");

  function showNotice(text: string, type: "success" | "error" = "success") {
    setMessage(text);
    setMessageType(type);
  }

  async function loadData(showLoader = true) {
    if (showLoader) setLoading(true);
    setMessage("");

    const { data: authData, error: authError } = await supabase.auth.getUser();

    if (authError || !authData.user) {
      showNotice("Please log in again to manage students.", "error");
      setLoading(false);
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("school_id")
      .eq("user_id", authData.user.id)
      .maybeSingle();

    if (profileError || !profile?.school_id) {
      showNotice("We couldn't find your school profile.", "error");
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
        .select(
          "id, admission_number, full_name, class_id, photo_storage_path, created_at"
        )
        .eq("school_id", profile.school_id)
        .order("full_name"),
    ]);

    if (classResult.error || studentResult.error) {
      showNotice(
        classResult.error?.message ||
          studentResult.error?.message ||
          "Unable to load school data.",
        "error"
      );
    } else {
      setClasses(classResult.data || []);
      setStudents((studentResult.data || []) as Student[]);
    }

    setLoading(false);
  }

  useEffect(() => {
    void loadData();
  }, []);

  function resetForm() {
    setAdmissionNumber("");
    setFullName("");
    setClassId("");
    setEditingStudentId(null);
    setFormMode("add");
  }

  function openAddForm() {
    resetForm();
    setMessage("");
    setShowForm(true);
    setSelectedStudent(null);
  }

  function openEditForm(student: Student) {
    setFormMode("edit");
    setEditingStudentId(student.id);
    setAdmissionNumber(student.admission_number);
    setFullName(student.full_name);
    setClassId(student.class_id || "");
    setSelectedStudent(null);
    setMessage("");
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    resetForm();
  }

  async function saveStudent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!schoolId) {
      showNotice("Your school profile could not be verified. Please refresh.", "error");
      return;
    }

    if (!classId) {
      showNotice("Please select a class and section.", "error");
      return;
    }

    const cleanName = fullName.trim();
    const cleanAdmission = admissionNumber.trim();

    if (!cleanName || !cleanAdmission) {
      showNotice("Please complete the student's name and admission number.", "error");
      return;
    }

    setSaving(true);
    setMessage("");

    if (formMode === "edit" && editingStudentId) {
      const { error } = await supabase
        .from("students")
        .update({
          full_name: cleanName,
          admission_number: cleanAdmission,
          class_id: classId,
        })
        .eq("id", editingStudentId)
        .eq("school_id", schoolId);

      if (error) {
        showNotice(
          error.code === "23505"
            ? "This admission number is already used by another student in your school."
            : error.message,
          "error"
        );
      } else {
        closeForm();
        await loadData(false);
        showNotice("Student details updated successfully.");
      }
    } else {
      const { error } = await supabase.from("students").insert({
        school_id: schoolId,
        class_id: classId,
        admission_number: cleanAdmission,
        full_name: cleanName,
      });

      if (error) {
        showNotice(
          error.code === "23505"
            ? "This admission number already exists in your school."
            : error.message,
          "error"
        );
      } else {
        closeForm();
        await loadData(false);
        showNotice("Student added successfully.");
      }
    }

    setSaving(false);
  }

  const sections = useMemo(
    () =>
      Array.from(
        new Set(
          classes
            .filter((item) => classFilter === "all" || item.class_name === classFilter)
            .map((item) => item.section)
            .filter(Boolean)
        )
      ).sort(),
    [classes, classFilter]
  );

  const classNames = useMemo(
    () => Array.from(new Set(classes.map((item) => item.class_name))).sort(),
    [classes]
  );

  const filteredStudents = useMemo(() => {
    const term = search.trim().toLowerCase();

    return students.filter((student) => {
      const schoolClass = classes.find((item) => item.id === student.class_id);
      const matchesSearch =
        !term ||
        student.full_name.toLowerCase().includes(term) ||
        student.admission_number.toLowerCase().includes(term);
      const matchesClass =
        classFilter === "all" || schoolClass?.class_name === classFilter;
      const matchesSection =
        sectionFilter === "all" || schoolClass?.section === sectionFilter;

      return matchesSearch && matchesClass && matchesSection;
    });
  }, [students, classes, search, classFilter, sectionFilter]);

  function getClassName(id: string | null) {
    if (!id) return "Not assigned";
    const schoolClass = classes.find((item) => item.id === id);
    return schoolClass
      ? `${schoolClass.class_name} - ${schoolClass.section}`
      : "Class unavailable";
  }

  function formatDate(value: string | null) {
    if (!value) return "Not available";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Not available";
    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  return (
    <div className="space-y-7">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0B6B50] via-[#087F5B] to-[#15966D] p-6 text-white shadow-lg shadow-emerald-900/10 sm:p-8">
        <div className="pointer-events-none absolute -right-10 -top-16 h-56 w-56 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-24 right-1/3 h-48 w-48 rounded-full bg-lime-300/10 blur-2xl" />
        <div className="relative flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm font-semibold text-emerald-100">ACADEMIC MANAGEMENT</p>
            <h1 className="mt-2 text-2xl font-bold sm:text-3xl">Student Management</h1>
            <p className="mt-2 max-w-xl text-sm text-emerald-50/90">
              Manage student records, admissions and class assignments in one place.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void loadData()}
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/25 bg-white/10 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/20 disabled:opacity-60"
            >
              <RefreshCw size={17} className={loading ? "animate-spin" : ""} />
              Refresh
            </button>
            <button
              type="button"
              onClick={openAddForm}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-[#087F5B] shadow-md transition hover:-translate-y-0.5 hover:bg-emerald-50"
            >
              <UserPlus size={18} />
              Add student
            </button>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-2xl border border-[#E5EEE8] bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total students</p>
              <p className="mt-2 text-3xl font-bold text-[#193B32]">{students.length}</p>
              <p className="mt-1 text-xs text-gray-400">Registered in your school</p>
            </div>
            <div className="rounded-2xl bg-emerald-100 p-3 text-emerald-700">
              <GraduationCap size={26} />
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-[#E5EEE8] bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Classes available</p>
              <p className="mt-2 text-3xl font-bold text-[#193B32]">{classes.length}</p>
              <p className="mt-1 text-xs text-gray-400">Class and section combinations</p>
            </div>
            <div className="rounded-2xl bg-violet-100 p-3 text-violet-700">
              <Users size={25} />
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-[#E5EEE8] bg-white p-5 shadow-sm sm:col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Filtered results</p>
              <p className="mt-2 text-3xl font-bold text-[#193B32]">{filteredStudents.length}</p>
              <p className="mt-1 text-xs text-gray-400">Matching your current filters</p>
            </div>
            <div className="rounded-2xl bg-sky-100 p-3 text-sky-700">
              <Filter size={25} />
            </div>
          </div>
        </div>
      </section>

      {message && (
        <div
          role="status"
          className={`rounded-xl border px-4 py-3 text-sm ${
            messageType === "error"
              ? "border-rose-200 bg-rose-50 text-rose-800"
              : "border-emerald-200 bg-emerald-50 text-emerald-800"
          }`}
        >
          {message}
        </div>
      )}

      {showForm && (
        <form
          onSubmit={saveStudent}
          className="space-y-5 rounded-2xl border border-emerald-100 bg-white p-6 shadow-sm"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-emerald-700">
                {formMode === "edit" ? "Update record" : "New admission"}
              </p>
              <h2 className="mt-1 text-lg font-bold text-[#193B32]">
                {formMode === "edit" ? "Edit student details" : "Add a new student"}
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Enter the student's name, admission number and class assignment.
              </p>
            </div>
            <button
              type="button"
              onClick={closeForm}
              className="rounded-lg p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
              aria-label="Close form"
            >
              <X size={20} />
            </button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-2 text-sm font-medium text-gray-700">
              Full name
              <input
                required
                maxLength={150}
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
                maxLength={80}
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

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={saving || classes.length === 0}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#087F5B] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#066B4D] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving && <Loader2 size={17} className="animate-spin" />}
              {saving
                ? "Saving..."
                : formMode === "edit"
                  ? "Save changes"
                  : "Save student"}
            </button>
            <button
              type="button"
              onClick={closeForm}
              disabled={saving}
              className="rounded-xl border border-gray-200 px-5 py-3 text-sm font-semibold text-gray-600 transition hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>

          {classes.length === 0 && (
            <p className="text-sm text-amber-700">
              Create a class first before adding or assigning students.
            </p>
          )}
        </form>
      )}

      <section className="overflow-hidden rounded-2xl border border-[#E5EEE8] bg-white shadow-sm">
        <div className="space-y-4 border-b border-gray-100 p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-bold text-[#193B32]">Student directory</h2>
              <p className="mt-1 text-xs text-gray-500">
                {filteredStudents.length} of {students.length} student records
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
                placeholder="Search name or admission no."
                className="w-full rounded-xl border border-gray-200 py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1.5 text-xs font-semibold text-gray-500">
              Filter by class
              <select
                value={classFilter}
                onChange={(event) => {
                  setClassFilter(event.target.value);
                  setSectionFilter("all");
                }}
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm font-normal text-gray-700 outline-none focus:border-emerald-500"
              >
                <option value="all">All classes</option>
                {classNames.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1.5 text-xs font-semibold text-gray-500">
              Filter by section
              <select
                value={sectionFilter}
                onChange={(event) => setSectionFilter(event.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm font-normal text-gray-700 outline-none focus:border-emerald-500"
              >
                <option value="all">All sections</option>
                {sections.map((section) => (
                  <option key={section} value={section}>
                    {section}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-3 p-12 text-sm text-gray-500">
            <Loader2 className="animate-spin" size={20} />
            Loading students...
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="p-12 text-center">
            <GraduationCap className="mx-auto text-gray-300" size={40} />
            <p className="mt-3 font-semibold text-gray-700">
              {students.length === 0
                ? "No students added yet"
                : "No matching students"}
            </p>
            <p className="mt-1 text-sm text-gray-400">
              {students.length === 0
                ? "Add your first student to get started."
                : "Try another search term or change the class and section filters."}
            </p>
            {students.length === 0 && (
              <button
                type="button"
                onClick={openAddForm}
                className="mt-4 rounded-xl bg-[#087F5B] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#066B4D]"
              >
                Add first student
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#F7FAF8] text-xs uppercase tracking-wider text-gray-500">
                <tr>
                  <th className="px-5 py-4">Student</th>
                  <th className="px-5 py-4">Admission number</th>
                  <th className="px-5 py-4">Class / Section</th>
                  <th className="px-5 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredStudents.map((student) => (
                  <tr
                    key={student.id}
                    className="transition hover:bg-emerald-50/40"
                  >
                    <td className="whitespace-nowrap px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 font-bold text-emerald-800">
                          {student.full_name.trim().charAt(0).toUpperCase() || "S"}
                        </div>
                        <span className="font-semibold text-[#193B32]">
                          {student.full_name}
                        </span>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 text-gray-600">
                      {student.admission_number}
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 text-gray-600">
                      {getClassName(student.class_id)}
                    </td>
                    <td className="whitespace-nowrap px-5 py-4">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedStudent(student)}
                          title="View student profile"
                          aria-label={`View ${student.full_name}`}
                          className="rounded-lg border border-gray-200 p-2 text-gray-600 transition hover:border-sky-200 hover:bg-sky-50 hover:text-sky-700"
                        >
                          <Eye size={17} />
                        </button>
                        <button
                          type="button"
                          onClick={() => openEditForm(student)}
                          title="Edit student"
                          aria-label={`Edit ${student.full_name}`}
                          className="rounded-lg border border-gray-200 p-2 text-gray-600 transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700"
                        >
                          <Pencil size={17} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {selectedStudent && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm"
          onClick={() => setSelectedStudent(null)}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="student-profile-title"
            className="w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="relative bg-gradient-to-br from-[#0B6B50] to-[#15966D] p-6 text-white">
              <button
                type="button"
                onClick={() => setSelectedStudent(null)}
                aria-label="Close student profile"
                className="absolute right-4 top-4 rounded-lg p-2 text-white/80 transition hover:bg-white/15 hover:text-white"
              >
                <X size={20} />
              </button>
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 text-2xl font-bold">
                {selectedStudent.full_name.trim().charAt(0).toUpperCase() || "S"}
              </div>
              <p className="mt-4 text-xs font-bold uppercase tracking-wider text-emerald-100">
                Student profile
              </p>
              <h2 id="student-profile-title" className="mt-1 text-2xl font-bold">
                {selectedStudent.full_name}
              </h2>
            </div>
            <div className="space-y-4 p-6">
              <div className="flex items-center gap-3 rounded-xl bg-gray-50 p-4">
                <Hash className="text-emerald-700" size={20} />
                <div>
                  <p className="text-xs text-gray-500">Admission number</p>
                  <p className="mt-0.5 font-semibold text-gray-800">
                    {selectedStudent.admission_number}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-xl bg-gray-50 p-4">
                <BookOpen className="text-violet-700" size={20} />
                <div>
                  <p className="text-xs text-gray-500">Class and section</p>
                  <p className="mt-0.5 font-semibold text-gray-800">
                    {getClassName(selectedStudent.class_id)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-xl bg-gray-50 p-4">
                <CalendarDays className="text-sky-700" size={20} />
                <div>
                  <p className="text-xs text-gray-500">Record created</p>
                  <p className="mt-0.5 font-semibold text-gray-800">
                    {formatDate(selectedStudent.created_at)}
                  </p>
                </div>
              </div>
              <p className="text-xs leading-5 text-gray-400">
                This profile displays the student information currently stored in your
                school's database. Additional personal and parent details can be added
                after the database fields and privacy permissions are designed.
              </p>
              <button
                type="button"
                onClick={() => openEditForm(selectedStudent)}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#087F5B] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#066B4D]"
              >
                <Pencil size={17} />
                Edit student details
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
