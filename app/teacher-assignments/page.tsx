
"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Teacher = {
  user_id: string;
  full_name: string;
  teacher_key: string | null;
};

type ClassItem = {
  id: string;
  class_name: string;
  section: string;
};

type Subject = {
  id: string;
  subject_name: string;
};

type Assignment = {
  id: string;
  teacher_id: string;
  class_id: string;
  subject_id: string;
};

export default function TeacherAssignmentsPage() {
  const [schoolId, setSchoolId] = useState("");
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);

  const [teacherId, setTeacherId] = useState("");
  const [classId, setClassId] = useState("");
  const [subjectId, setSubjectId] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    setError("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      window.location.href = "/login";
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("school_id, role")
      .eq("user_id", user.id)
      .single();

    if (profileError || !profile?.school_id) {
      setError("Unable to load your school profile.");
      setLoading(false);
      return;
    }

    if (profile.role !== "school_admin") {
      setError("Only school administrators can manage teacher assignments.");
      setLoading(false);
      return;
    }

    setSchoolId(profile.school_id);

    const [
      teachersResult,
      classesResult,
      subjectsResult,
      assignmentsResult,
    ] = await Promise.all([
      supabase
        .from("profiles")
        .select("user_id, full_name, teacher_key")
        .eq("school_id", profile.school_id)
        .eq("role", "teacher")
        .order("full_name"),

      supabase
        .from("classes")
        .select("id, class_name, section")
        .eq("school_id", profile.school_id)
        .order("class_name"),

      supabase
        .from("subjects")
        .select("id, subject_name")
        .eq("school_id", profile.school_id)
        .order("subject_name"),

      supabase
        .from("teacher_assignments")
        .select("id, teacher_id, class_id, subject_id")
        .eq("school_id", profile.school_id),
    ]);

    if (
      teachersResult.error ||
      classesResult.error ||
      subjectsResult.error ||
      assignmentsResult.error
    ) {
      setError("Could not load assignment data. Please refresh and try again.");
    } else {
      setTeachers(teachersResult.data || []);
      setClasses(classesResult.data || []);
      setSubjects(subjectsResult.data || []);
      setAssignments(assignmentsResult.data || []);
    }

    setLoading(false);
  }

  async function addAssignment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setError("");

    if (!teacherId || !classId || !subjectId || !schoolId) {
      setError("Please select a teacher, class and subject.");
      return;
    }

    const alreadyAssigned = assignments.some(
      (item) =>
        item.teacher_id === teacherId &&
        item.class_id === classId &&
        item.subject_id === subjectId
    );

    if (alreadyAssigned) {
      setError("This teacher already has this class and subject assigned.");
      return;
    }

    setSaving(true);

    const { error: insertError } = await supabase
      .from("teacher_assignments")
      .insert({
        school_id: schoolId,
        teacher_id: teacherId,
        class_id: classId,
        subject_id: subjectId,
      });

    if (insertError) {
      setError(insertError.message);
    } else {
      setMessage("Teacher assignment added successfully!");
      setTeacherId("");
      setClassId("");
      setSubjectId("");
      await loadData();
    }

    setSaving(false);
  }

  async function removeAssignment(id: string) {
    const confirmed = window.confirm(
      "Are you sure you want to remove this teacher assignment?"
    );

    if (!confirmed) return;

    setError("");
    setMessage("");

    const { error: deleteError } = await supabase
      .from("teacher_assignments")
      .delete()
      .eq("id", id);

    if (deleteError) {
      setError(deleteError.message);
    } else {
      setMessage("Assignment removed successfully.");
      await loadData();
    }
  }

  function teacherName(id: string) {
    return teachers.find((teacher) => teacher.user_id === id)?.full_name || "Unknown teacher";
  }

  function className(id: string) {
    const item = classes.find((classItem) => classItem.id === id);
    return item ? `${item.class_name} - ${item.section}` : "Unknown class";
  }

  function subjectName(id: string) {
    return subjects.find((subject) => subject.id === id)?.subject_name || "Unknown subject";
  }

  if (loading) {
    return <div className="p-8 text-slate-500">Loading teacher assignments...</div>;
  }

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wider text-emerald-700">
          Academic Management
        </p>
        <h1 className="mt-2 text-3xl font-bold text-slate-900">
          Teacher Assignments
        </h1>
        <p className="mt-2 text-slate-500">
          Assign teachers to the classes and subjects they teach.
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {message && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
          {message}
        </div>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-bold text-slate-900">
          Assign a Teacher
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          A teacher can have multiple class and subject assignments.
        </p>

        <form onSubmit={addAssignment} className="mt-6 grid gap-5 md:grid-cols-3">
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              Teacher
            </label>
            <select
              value={teacherId}
              onChange={(event) => setTeacherId(event.target.value)}
              required
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-800 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
            >
              <option value="">Select teacher</option>
              {teachers.map((teacher) => (
                <option key={teacher.user_id} value={teacher.user_id}>
                  {teacher.full_name}
                  {teacher.teacher_key ? ` (${teacher.teacher_key})` : ""}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              Class and Section
            </label>
            <select
              value={classId}
              onChange={(event) => setClassId(event.target.value)}
              required
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-800 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
            >
              <option value="">Select class</option>
              {classes.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.class_name} - {item.section}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              Subject
            </label>
            <select
              value={subjectId}
              onChange={(event) => setSubjectId(event.target.value)}
              required
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-800 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
            >
              <option value="">Select subject</option>
              {subjects.map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {subject.subject_name}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-3">
            <button
              type="submit"
              disabled={saving || teachers.length === 0 || classes.length === 0 || subjects.length === 0}
              className="rounded-xl bg-emerald-700 px-6 py-3 font-semibold text-white shadow-sm transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? "Saving..." : "Add Assignment"}
            </button>
          </div>
        </form>

        {(teachers.length === 0 || classes.length === 0 || subjects.length === 0) && (
          <p className="mt-4 text-sm text-amber-700">
            Add teachers, classes and subjects before creating assignments.
          </p>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              Current Assignments
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {assignments.length} assignment{assignments.length === 1 ? "" : "s"} created
            </p>
          </div>
          <button
            type="button"
            onClick={loadData}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Refresh
          </button>
        </div>

        {assignments.length === 0 ? (
          <div className="mt-6 rounded-xl bg-slate-50 p-8 text-center">
            <p className="font-semibold text-slate-700">No assignments yet</p>
            <p className="mt-1 text-sm text-slate-500">
              Use the form above to assign a teacher.
            </p>
          </div>
        ) : (
          <div className="mt-6 overflow-x-auto">
            <table className="w-full min-w-[600px] text-left">
              <thead>
                <tr className="border-b border-slate-200 text-sm text-slate-500">
                  <th className="px-3 py-3 font-semibold">Teacher</th>
                  <th className="px-3 py-3 font-semibold">Class</th>
                  <th className="px-3 py-3 font-semibold">Subject</th>
                  <th className="px-3 py-3 text-right font-semibold">Action</th>
                </tr>
              </thead>
              <tbody>
                {assignments.map((assignment) => (
                  <tr key={assignment.id} className="border-b border-slate-100 last:border-0">
                    <td className="px-3 py-4 font-semibold text-slate-800">
                      {teacherName(assignment.teacher_id)}
                    </td>
                    <td className="px-3 py-4 text-slate-600">
                      {className(assignment.class_id)}
                    </td>
                    <td className="px-3 py-4 text-slate-600">
                      {subjectName(assignment.subject_id)}
                    </td>
                    <td className="px-3 py-4 text-right">
                      <button
                        type="button"
                        onClick={() => removeAssignment(assignment.id)}
                        className="text-sm font-semibold text-red-600 transition hover:text-red-800"
                      >
                        Remove
                      </button>
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
