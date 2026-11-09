"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { supabase } from "@/lib/supabase";
import {
  UserPlus,
  Search,
  Users,
  Mail,
  KeyRound,
  Loader2,
  RefreshCw,
  Pencil,
  X,
  BookOpen,
  GraduationCap,
  Trash2,
  Plus,
  CheckCircle2,
  AlertCircle,
  UserRound,
  School,
  Layers3,
  Save,
} from "lucide-react";

type Teacher = {
  user_id: string;
  full_name: string;
  teacher_key: string | null;
  created_at: string | null;
};

type SchoolClass = {
  id: string;
  class_name: string;
  section: string;
};

type Subject = {
  id: string;
  subject_name: string;
};

type TeacherAssignment = {
  id: string;
  teacher_id: string;
  class_id: string;
  subject_id: string;
  created_at: string;
};

type Notice = {
  type: "success" | "error";
  text: string;
};

export default function TeachersPage() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [assignments, setAssignments] = useState<TeacherAssignment[]>([]);
  const [schoolId, setSchoolId] = useState("");

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [search, setSearch] = useState("");
  const [classFilter, setClassFilter] = useState("all");

  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingAssignment, setSavingAssignment] = useState(false);
  const [deletingAssignmentId, setDeletingAssignmentId] = useState("");

  const [notice, setNotice] = useState<Notice | null>(null);
  const [error, setError] = useState("");

  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [editTeacherName, setEditTeacherName] = useState("");

  const [assignmentTeacherId, setAssignmentTeacherId] = useState("");
  const [assignmentClassId, setAssignmentClassId] = useState("");
  const [assignmentSubjectId, setAssignmentSubjectId] = useState("");
  const [editingAssignmentId, setEditingAssignmentId] = useState("");

  const [profileTeacher, setProfileTeacher] = useState<Teacher | null>(null);

  const loadData = useCallback(async (showSpinner = true) => {
    if (showSpinner) setLoading(true);
    setError("");

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        throw new Error("Please log in again.");
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("school_id, role")
        .eq("user_id", user.id)
        .single();

      if (profileError || !profile?.school_id) {
        throw new Error("Could not find your school profile.");
      }

      if (profile.role !== "school_admin") {
        throw new Error("Only a School Admin can manage teachers.");
      }

      const currentSchoolId = profile.school_id as string;
      setSchoolId(currentSchoolId);

      const [
        teachersResult,
        classesResult,
        subjectsResult,
        assignmentsResult,
      ] = await Promise.all([
        supabase
          .from("profiles")
          .select("user_id, full_name, teacher_key, created_at")
          .eq("school_id", currentSchoolId)
          .eq("role", "teacher")
          .order("full_name"),
        supabase
          .from("classes")
          .select("id, class_name, section")
          .eq("school_id", currentSchoolId)
          .order("class_name")
          .order("section"),
        supabase
          .from("subjects")
          .select("id, subject_name")
          .eq("school_id", currentSchoolId)
          .order("subject_name"),
        supabase
          .from("teacher_assignments")
          .select("id, teacher_id, class_id, subject_id, created_at")
          .eq("school_id", currentSchoolId)
          .order("created_at", { ascending: false }),
      ]);

      if (teachersResult.error) throw teachersResult.error;
      if (classesResult.error) throw classesResult.error;
      if (subjectsResult.error) throw subjectsResult.error;
      if (assignmentsResult.error) throw assignmentsResult.error;

      setTeachers((teachersResult.data || []) as Teacher[]);
      setClasses((classesResult.data || []) as SchoolClass[]);
      setSubjects((subjectsResult.data || []) as Subject[]);
      setAssignments((assignmentsResult.data || []) as TeacherAssignment[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load teacher data.");
    } finally {
      if (showSpinner) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const filteredTeachers = useMemo(() => {
    const query = search.trim().toLowerCase();

    return teachers.filter((teacher) => {
      const matchesSearch =
        !query ||
        `${teacher.full_name} ${teacher.teacher_key || ""}`
          .toLowerCase()
          .includes(query);

      const teacherAssignments = assignments.filter(
        (assignment) => assignment.teacher_id === teacher.user_id
      );

      const matchesClass =
        classFilter === "all" ||
        teacherAssignments.some(
          (assignment) => assignment.class_id === classFilter
        );

      return matchesSearch && matchesClass;
    });
  }, [teachers, assignments, search, classFilter]);

  const getClassLabel = (classId: string) => {
    const schoolClass = classes.find((item) => item.id === classId);
    return schoolClass
      ? `${schoolClass.class_name} - ${schoolClass.section}`
      : "Class unavailable";
  };

  const getSubjectLabel = (subjectId: string) =>
    subjects.find((item) => item.id === subjectId)?.subject_name ||
    "Subject unavailable";

  const getTeacherAssignments = (teacherId: string) =>
    assignments.filter((assignment) => assignment.teacher_id === teacherId);

  async function inviteTeacher(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice(null);
    setError("");

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
          email: email.trim().toLowerCase(),
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Could not invite teacher.");
      }

      setNotice({
        type: "success",
        text: `Invitation sent to ${email.trim()}. Teacher Key: ${result.teacher.teacherKey}`,
      });
      setFullName("");
      setEmail("");
      await loadData(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSending(false);
    }
  }

  function openEditTeacher(teacher: Teacher) {
    setEditingTeacher(teacher);
    setEditTeacherName(teacher.full_name);
    setNotice(null);
    setError("");
  }

  async function saveTeacherProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingTeacher || !editTeacherName.trim()) return;

    setSavingProfile(true);
    setNotice(null);
    setError("");

    try {
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ full_name: editTeacherName.trim() })
        .eq("user_id", editingTeacher.user_id)
        .eq("school_id", schoolId)
        .eq("role", "teacher");

      if (updateError) throw updateError;

      setNotice({ type: "success", text: "Teacher profile updated successfully." });
      setEditingTeacher(null);
      setProfileTeacher(null);
      await loadData(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update teacher.");
    } finally {
      setSavingProfile(false);
    }
  }

  function resetAssignmentForm() {
    setAssignmentTeacherId("");
    setAssignmentClassId("");
    setAssignmentSubjectId("");
    setEditingAssignmentId("");
  }

  function startEditAssignment(assignment: TeacherAssignment) {
    setAssignmentTeacherId(assignment.teacher_id);
    setAssignmentClassId(assignment.class_id);
    setAssignmentSubjectId(assignment.subject_id);
    setEditingAssignmentId(assignment.id);
    setNotice(null);
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function saveAssignment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice(null);
    setError("");

    if (!assignmentTeacherId || !assignmentClassId || !assignmentSubjectId) {
      setError("Choose a teacher, class and subject.");
      return;
    }

    setSavingAssignment(true);

    const payload = {
      school_id: schoolId,
      teacher_id: assignmentTeacherId,
      class_id: assignmentClassId,
      subject_id: assignmentSubjectId,
    };

    try {
      const result = editingAssignmentId
        ? await supabase
            .from("teacher_assignments")
            .update(payload)
            .eq("id", editingAssignmentId)
            .eq("school_id", schoolId)
        : await supabase.from("teacher_assignments").insert(payload);

      if (result.error) {
        if (result.error.code === "23505") {
          throw new Error(
            "This exact teacher, class and subject combination is already assigned."
          );
        }
        throw result.error;
      }

      setNotice({
        type: "success",
        text: editingAssignmentId
          ? "Teacher assignment updated successfully."
          : "Teacher assignment created successfully.",
      });
      resetAssignmentForm();
      await loadData(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save assignment.");
    } finally {
      setSavingAssignment(false);
    }
  }

  async function deleteAssignment(assignment: TeacherAssignment) {
    const teacher = teachers.find((item) => item.user_id === assignment.teacher_id);
    const confirmed = window.confirm(
      `Remove ${getClassLabel(assignment.class_id)} / ${getSubjectLabel(
        assignment.subject_id
      )} from ${teacher?.full_name || "this teacher"}?`
    );

    if (!confirmed) return;

    setDeletingAssignmentId(assignment.id);
    setNotice(null);
    setError("");

    try {
      const { error: deleteError } = await supabase
        .from("teacher_assignments")
        .delete()
        .eq("id", assignment.id)
        .eq("school_id", schoolId);

      if (deleteError) throw deleteError;

      if (editingAssignmentId === assignment.id) resetAssignmentForm();

      setNotice({ type: "success", text: "Teacher assignment removed." });
      await loadData(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not remove assignment.");
    } finally {
      setDeletingAssignmentId("");
    }
  }

  const totalAssignments = assignments.length;
  const assignedTeacherCount = new Set(assignments.map((item) => item.teacher_id)).size;
  const unassignedTeacherCount = teachers.length - assignedTeacherCount;

  return (
    <div className="min-h-screen space-y-7 pb-10">
      <div className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-[#103F35] via-[#12634D] to-[#1A8A68] p-6 text-white shadow-xl shadow-emerald-950/10 sm:p-8">
        <div className="pointer-events-none absolute -right-10 -top-16 h-64 w-64 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-24 right-1/4 h-52 w-52 rounded-full bg-lime-300/10 blur-2xl" />
        <div className="relative flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <div className="max-w-2xl">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold text-emerald-50">
              <GraduationCap size={15} />
              SCHOOL MANAGEMENT
            </div>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Teacher Management
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-emerald-50/85 sm:text-base">
              Invite educators, maintain teacher profiles and organize class and
              subject responsibilities from one place.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void loadData()}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 self-start rounded-xl border border-white/25 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/20 disabled:opacity-60 lg:self-auto"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            Refresh data
          </button>
        </div>

        <div className="relative mt-7 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            { label: "Total teachers", value: teachers.length, icon: Users },
            { label: "Class & subject assignments", value: totalAssignments, icon: BookOpen },
            { label: "Teachers with assignments", value: assignedTeacherCount, icon: CheckCircle2 },
            { label: "Not yet assigned", value: unassignedTeacherCount, icon: UserRound },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.label}
                className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-sm"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-medium text-emerald-50/80">{item.label}</p>
                  <Icon size={17} className="text-lime-200" />
                </div>
                <p className="mt-2 text-3xl font-bold tabular-nums">{item.value}</p>
              </div>
            );
          })}
        </div>
      </div>

      {notice && (
        <div
          className={`flex items-start gap-3 rounded-2xl border p-4 text-sm ${
            notice.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
          <p>{notice.text}</p>
          <button
            type="button"
            onClick={() => setNotice(null)}
            className="ml-auto text-current opacity-60 hover:opacity-100"
            aria-label="Dismiss message"
          >
            <X size={17} />
          </button>
        </div>
      )}

      {error && (
        <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle size={18} className="mt-0.5 shrink-0" />
          <p>{error}</p>
          <button
            type="button"
            onClick={() => setError("")}
            className="ml-auto text-red-500 hover:text-red-700"
            aria-label="Dismiss error"
          >
            <X size={17} />
          </button>
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <section className="rounded-3xl border border-emerald-100/80 bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-5 flex items-center gap-3">
            <div className="rounded-2xl bg-emerald-50 p-3 text-emerald-700">
              <UserPlus size={22} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#193B32]">Invite a teacher</h2>
              <p className="text-xs text-gray-500">Create a secure school account</p>
            </div>
          </div>

          <form onSubmit={inviteTeacher} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                Teacher&apos;s full name
              </label>
              <input
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                placeholder="e.g. Ananya Sharma"
                autoComplete="name"
                className="w-full rounded-xl border border-gray-200 bg-gray-50/60 px-4 py-3 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10"
                required
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                Email address
              </label>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="teacher@school.com"
                autoComplete="email"
                className="w-full rounded-xl border border-gray-200 bg-gray-50/60 px-4 py-3 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10"
                required
              />
            </div>
            <button
              type="submit"
              disabled={sending || loading || !schoolId}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-700 to-emerald-600 px-5 py-3 font-semibold text-white shadow-lg shadow-emerald-700/15 transition hover:-translate-y-0.5 hover:from-emerald-800 hover:to-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {sending ? (
                <>
                  <Loader2 className="animate-spin" size={18} />
                  Sending invitation...
                </>
              ) : (
                <>
                  <Mail size={18} />
                  Send teacher invitation
                </>
              )}
            </button>
          </form>

          <div className="mt-5 rounded-2xl border border-emerald-100 bg-[#F3F9F5] p-4">
            <div className="flex items-start gap-2">
              <KeyRound size={17} className="mt-0.5 shrink-0 text-emerald-700" />
              <p className="text-xs leading-5 text-gray-600">
                Each teacher receives a unique Teacher Key and an account
                invitation. They can use their school credentials to access
                their teacher portal after setup.
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-lg font-bold text-[#193B32]">Teacher directory</h2>
              <p className="text-xs text-gray-500">
                Profiles and teaching responsibilities
              </p>
            </div>
            <div className="relative w-full sm:max-w-[250px]">
              <Search
                size={17}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search name or Teacher Key"
                className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-9 pr-3 text-sm outline-none transition focus:border-emerald-500 focus:bg-white"
              />
            </div>
          </div>

          <div className="mb-4 flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-gray-500">Class filter</span>
            <select
              value={classFilter}
              onChange={(event) => setClassFilter(event.target.value)}
              className="max-w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs text-gray-700 outline-none focus:border-emerald-500"
            >
              <option value="all">All classes</option>
              {classes.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.class_name} - {item.section}
                </option>
              ))}
            </select>
            {(search || classFilter !== "all") && (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setClassFilter("all");
                }}
                className="text-xs font-semibold text-emerald-700 hover:text-emerald-900"
              >
                Clear filters
              </button>
            )}
          </div>

          {loading ? (
            <div className="flex justify-center py-14">
              <Loader2 className="animate-spin text-emerald-600" size={30} />
            </div>
          ) : filteredTeachers.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-200 px-4 py-12 text-center">
              <Users className="mx-auto mb-3 text-gray-300" size={34} />
              <p className="font-semibold text-gray-600">
                {search || classFilter !== "all"
                  ? "No matching teachers"
                  : "No teachers added yet"}
              </p>
              <p className="mt-1 text-xs text-gray-400">
                {search || classFilter !== "all"
                  ? "Try changing your search or class filter."
                  : "Invite your first teacher using the form."}
              </p>
            </div>
          ) : (
            <div className="max-h-[650px] space-y-3 overflow-y-auto pr-1">
              {filteredTeachers.map((teacher) => {
                const teacherAssignments = getTeacherAssignments(teacher.user_id);
                return (
                  <div
                    key={teacher.user_id}
                    className="rounded-2xl border border-gray-100 p-4 transition hover:border-emerald-200 hover:bg-emerald-50/30"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-100 to-indigo-100 text-lg font-bold text-violet-700">
                        {teacher.full_name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-bold text-[#193B32]">
                          {teacher.full_name}
                        </p>
                        <p className="mt-1 flex items-center gap-1.5 text-xs text-gray-500">
                          <KeyRound size={12} />
                          {teacher.teacher_key || "Key not assigned"}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {teacherAssignments.length ? (
                            teacherAssignments.slice(0, 3).map((assignment) => (
                              <span
                                key={assignment.id}
                                className="rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-medium text-blue-700"
                              >
                                {getClassLabel(assignment.class_id)} ·{" "}
                                {getSubjectLabel(assignment.subject_id)}
                              </span>
                            ))
                          ) : (
                            <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-medium text-amber-700">
                              No assignments yet
                            </span>
                          )}
                          {teacherAssignments.length > 3 && (
                            <span className="rounded-full bg-gray-100 px-2.5 py-1 text-[11px] text-gray-600">
                              +{teacherAssignments.length - 3} more
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex shrink-0 flex-col gap-1.5 sm:flex-row">
                        <button
                          type="button"
                          onClick={() => setProfileTeacher(teacher)}
                          className="rounded-lg border border-gray-200 p-2 text-gray-600 transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700"
                          title="View teacher profile"
                          aria-label={`View ${teacher.full_name} profile`}
                        >
                          <UserRound size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => openEditTeacher(teacher)}
                          className="rounded-lg border border-gray-200 p-2 text-gray-600 transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700"
                          title="Edit teacher"
                          aria-label={`Edit ${teacher.full_name}`}
                        >
                          <Pencil size={16} />
                        </button>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-3">
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-emerald-700">
                        <CheckCircle2 size={13} />
                        Teacher account
                      </span>
                      <span className="text-[11px] text-gray-400">
                        {teacherAssignments.length}{" "}
                        {teacherAssignments.length === 1 ? "assignment" : "assignments"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      <section className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <div className="rounded-xl bg-blue-50 p-2.5 text-blue-700">
                <Layers3 size={20} />
              </div>
              <h2 className="text-lg font-bold text-[#193B32]">
                Class & subject assignments
              </h2>
            </div>
            <p className="mt-2 text-xs text-gray-500">
              Assign teachers to the classes and subjects they are responsible for.
            </p>
          </div>
          <span className="w-fit rounded-full bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700">
            {assignments.length} total assignments
          </span>
        </div>

        <form
          onSubmit={saveAssignment}
          className="mb-6 grid gap-3 rounded-2xl border border-blue-100 bg-blue-50/40 p-4 md:grid-cols-2 xl:grid-cols-[1fr_1fr_1fr_auto]"
        >
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-gray-700">
              Teacher
            </label>
            <select
              value={assignmentTeacherId}
              onChange={(event) => setAssignmentTeacherId(event.target.value)}
              required
              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-3 text-sm outline-none focus:border-emerald-500"
            >
              <option value="">Select teacher</option>
              {teachers.map((teacher) => (
                <option key={teacher.user_id} value={teacher.user_id}>
                  {teacher.full_name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-gray-700">
              Class & section
            </label>
            <select
              value={assignmentClassId}
              onChange={(event) => setAssignmentClassId(event.target.value)}
              required
              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-3 text-sm outline-none focus:border-emerald-500"
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
            <label className="mb-1.5 block text-xs font-semibold text-gray-700">
              Subject
            </label>
            <select
              value={assignmentSubjectId}
              onChange={(event) => setAssignmentSubjectId(event.target.value)}
              required
              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-3 text-sm outline-none focus:border-emerald-500"
            >
              <option value="">Select subject</option>
              {subjects.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.subject_name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end gap-2">
            <button
              type="submit"
              disabled={
                savingAssignment ||
                loading ||
                !teachers.length ||
                !classes.length ||
                !subjects.length
              }
              className="flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl bg-[#176B52] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#105640] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {savingAssignment ? (
                <Loader2 size={16} className="animate-spin" />
              ) : editingAssignmentId ? (
                <Save size={16} />
              ) : (
                <Plus size={17} />
              )}
              {editingAssignmentId ? "Save changes" : "Assign"}
            </button>
            {editingAssignmentId && (
              <button
                type="button"
                onClick={resetAssignmentForm}
                className="min-h-[44px] rounded-xl border border-gray-200 bg-white px-3 text-sm font-medium text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>
            )}
          </div>
          {(!teachers.length || !classes.length || !subjects.length) && (
            <p className="text-xs leading-5 text-amber-700 md:col-span-2 xl:col-span-4">
              To create assignments, your school needs at least one teacher,
              one class and one subject.
            </p>
          )}
        </form>

        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="animate-spin text-emerald-600" size={27} />
          </div>
        ) : assignments.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-200 py-12 text-center">
            <BookOpen className="mx-auto mb-3 text-gray-300" size={32} />
            <p className="font-semibold text-gray-600">No teacher assignments yet</p>
            <p className="mt-1 text-xs text-gray-400">
              Use the form above to assign a teacher to a class and subject.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[650px] text-left">
              <thead>
                <tr className="border-b border-gray-100 text-[11px] uppercase tracking-wider text-gray-400">
                  <th className="px-3 py-3 font-semibold">Teacher</th>
                  <th className="px-3 py-3 font-semibold">Class & section</th>
                  <th className="px-3 py-3 font-semibold">Subject</th>
                  <th className="px-3 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {assignments.map((assignment) => {
                  const teacher = teachers.find(
                    (item) => item.user_id === assignment.teacher_id
                  );
                  return (
                    <tr
                      key={assignment.id}
                      className="border-b border-gray-50 last:border-0 hover:bg-gray-50/70"
                    >
                      <td className="px-3 py-4">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-100 text-xs font-bold text-violet-700">
                            {teacher?.full_name?.charAt(0).toUpperCase() || "T"}
                          </div>
                          <span className="text-sm font-semibold text-gray-800">
                            {teacher?.full_name || "Teacher unavailable"}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-4 text-sm text-gray-600">
                        <span className="inline-flex items-center gap-1.5">
                          <School size={14} className="text-gray-400" />
                          {getClassLabel(assignment.class_id)}
                        </span>
                      </td>
                      <td className="px-3 py-4">
                        <span className="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700">
                          {getSubjectLabel(assignment.subject_id)}
                        </span>
                      </td>
                      <td className="px-3 py-4">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => startEditAssignment(assignment)}
                            className="rounded-lg border border-gray-200 p-2 text-gray-500 transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700"
                            title="Edit assignment"
                            aria-label="Edit assignment"
                          >
                            <Pencil size={15} />
                          </button>
                          <button
                            type="button"
                            onClick={() => void deleteAssignment(assignment)}
                            disabled={deletingAssignmentId === assignment.id}
                            className="rounded-lg border border-gray-200 p-2 text-gray-500 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                            title="Remove assignment"
                            aria-label="Remove assignment"
                          >
                            {deletingAssignmentId === assignment.id ? (
                              <Loader2 size={15} className="animate-spin" />
                            ) : (
                              <Trash2 size={15} />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {editingTeacher && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-[#193B32]">Edit teacher profile</h3>
                <p className="mt-1 text-xs text-gray-500">
                  Update the teacher&apos;s display name.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingTeacher(null)}
                className="rounded-xl p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                aria-label="Close edit profile"
              >
                <X size={19} />
              </button>
            </div>
            <form onSubmit={saveTeacherProfile} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                  Full name
                </label>
                <input
                  value={editTeacherName}
                  onChange={(event) => setEditTeacherName(event.target.value)}
                  required
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
                />
              </div>
              <div className="rounded-xl bg-gray-50 p-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                  Teacher Key
                </p>
                <p className="mt-1 font-mono text-sm font-semibold text-gray-700">
                  {editingTeacher.teacher_key || "Not assigned"}
                </p>
                <p className="mt-1 text-[11px] text-gray-500">
                  Teacher Keys are kept unchanged to protect the existing login flow.
                </p>
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setEditingTeacher(null)}
                  className="flex-1 rounded-xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingProfile || !editTeacherName.trim()}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60"
                >
                  {savingProfile ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Save size={16} />
                  )}
                  Save changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {profileTeacher && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
          <div className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-100 to-indigo-100 text-xl font-bold text-violet-700">
                  {profileTeacher.full_name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[#193B32]">
                    {profileTeacher.full_name}
                  </h3>
                  <p className="mt-1 text-xs text-gray-500">Teacher profile</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setProfileTeacher(null)}
                className="rounded-xl p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                aria-label="Close teacher profile"
              >
                <X size={19} />
              </button>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl bg-gray-50 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                  Teacher Key
                </p>
                <p className="mt-2 flex items-center gap-2 font-mono text-sm font-bold text-gray-800">
                  <KeyRound size={15} className="text-emerald-700" />
                  {profileTeacher.teacher_key || "Not assigned"}
                </p>
              </div>
              <div className="rounded-2xl bg-gray-50 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                  Total assignments
                </p>
                <p className="mt-2 flex items-center gap-2 text-xl font-bold text-gray-800">
                  <BookOpen size={17} className="text-blue-700" />
                  {getTeacherAssignments(profileTeacher.user_id).length}
                </p>
              </div>
            </div>

            <div className="mt-5">
              <h4 className="mb-3 text-sm font-bold text-gray-800">
                Assigned classes and subjects
              </h4>
              {getTeacherAssignments(profileTeacher.user_id).length === 0 ? (
                <div className="rounded-xl border border-dashed border-gray-200 p-6 text-center text-sm text-gray-500">
                  No class or subject assignments have been added.
                </div>
              ) : (
                <div className="space-y-2">
                  {getTeacherAssignments(profileTeacher.user_id).map((assignment) => (
                    <div
                      key={assignment.id}
                      className="flex items-center justify-between gap-3 rounded-xl border border-gray-100 p-3"
                    >
                      <div>
                        <p className="text-sm font-semibold text-gray-800">
                          {getClassLabel(assignment.class_id)}
                        </p>
                        <p className="mt-1 text-xs text-gray-500">
                          {getSubjectLabel(assignment.subject_id)}
                        </p>
                      </div>
                      <BookOpen size={17} className="shrink-0 text-blue-600" />
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => {
                setProfileTeacher(null);
                openEditTeacher(profileTeacher);
              }}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-800"
            >
              <Pencil size={16} />
              Edit teacher profile
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
