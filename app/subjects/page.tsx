"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { supabase } from "@/lib/supabase";
import {
  BookOpen,
  Search,
  Plus,
  Loader2,
  X,
  Pencil,
  Users,
  Layers3,
  RefreshCw,
  GraduationCap,
  CheckCircle2,
  AlertCircle,
  BookMarked,
  Sparkles,
} from "lucide-react";

type Subject = {
  id: string;
  subject_name: string;
  created_at: string | null;
};

type Assignment = {
  teacher_id: string;
  class_id: string;
  subject_id: string;
};

type SchoolClass = {
  id: string;
  class_name: string;
  section: string;
};

type SubjectSummary = {
  teacherCount: number;
  classCount: number;
  classes: string[];
};

export default function SubjectsPage() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [summaries, setSummaries] = useState<Record<string, SubjectSummary>>({});
  const [schoolId, setSchoolId] = useState("");
  const [subjectName, setSubjectName] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error" | "info">("info");
  const [formError, setFormError] = useState("");

  const notify = (text: string, type: "success" | "error" | "info" = "info") => {
    setMessage(text);
    setMessageType(type);
  };

  const loadSubjects = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setMessage("");

    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData.user) {
        notify("Your session may have expired. Please log in again.", "error");
        setSubjects([]);
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("school_id, role")
        .eq("user_id", authData.user.id)
        .maybeSingle();

      if (profileError || !profile?.school_id) {
        notify("We couldn't find your school profile. Please contact your school administrator.", "error");
        setSubjects([]);
        return;
      }

      if (profile.role !== "school_admin") {
        notify("Only school administrators can manage subjects.", "error");
        setSubjects([]);
        return;
      }

      const currentSchoolId = profile.school_id as string;
      setSchoolId(currentSchoolId);

      const { data: subjectRows, error: subjectError } = await supabase
        .from("subjects")
        .select("id, subject_name, created_at")
        .eq("school_id", currentSchoolId)
        .order("subject_name", { ascending: true });

      if (subjectError) throw subjectError;

      const subjectList = (subjectRows || []) as Subject[];
      setSubjects(subjectList);

      // Assignment summaries are read-only. If the current RLS setup does not
      // permit this query, the subject directory still remains usable.
      const [{ data: assignmentRows, error: assignmentError }, { data: classRows, error: classError }] =
        await Promise.all([
          supabase
            .from("teacher_assignments")
            .select("teacher_id, class_id, subject_id")
            .eq("school_id", currentSchoolId),
          supabase
            .from("classes")
            .select("id, class_name, section")
            .eq("school_id", currentSchoolId),
        ]);

      if (assignmentError) {
        setSummaries({});
        notify("Subjects loaded. Assignment summaries aren't available with the current permissions.", "info");
        return;
      }

      const classMap = new Map<string, string>();
      if (!classError) {
        ((classRows || []) as SchoolClass[]).forEach((item) => {
          classMap.set(item.id, `${item.class_name} - ${item.section}`);
        });
      }

      const nextSummaries: Record<string, SubjectSummary> = {};
      subjectList.forEach((subject) => {
        const matching = ((assignmentRows || []) as Assignment[]).filter(
          (item) => item.subject_id === subject.id
        );
        const teacherIds = new Set(matching.map((item) => item.teacher_id));
        const classIds = new Set(matching.map((item) => item.class_id));
        const classNames = Array.from(classIds)
          .map((id) => classMap.get(id))
          .filter((name): name is string => Boolean(name))
          .sort((a, b) => a.localeCompare(b));

        nextSummaries[subject.id] = {
          teacherCount: teacherIds.size,
          classCount: classIds.size,
          classes: classNames,
        };
      });
      setSummaries(nextSummaries);
    } catch (error) {
      const description = error instanceof Error ? error.message : "Something went wrong while loading subjects.";
      notify(description, "error");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadSubjects();
  }, [loadSubjects]);

  const openAddForm = () => {
    setEditingSubject(null);
    setSubjectName("");
    setFormError("");
    setMessage("");
    setShowForm(true);
  };

  const openEditForm = (subject: Subject) => {
    setEditingSubject(subject);
    setSubjectName(subject.subject_name);
    setFormError("");
    setMessage("");
    setShowForm(true);
  };

  const closeForm = () => {
    if (saving) return;
    setShowForm(false);
    setEditingSubject(null);
    setSubjectName("");
    setFormError("");
  };

  async function saveSubject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleanName = subjectName.trim().replace(/\s+/g, " ");

    if (!schoolId || !cleanName) {
      setFormError("Please enter a subject name.");
      return;
    }

    const duplicate = subjects.some(
      (subject) =>
        subject.subject_name.trim().toLocaleLowerCase() === cleanName.toLocaleLowerCase() &&
        subject.id !== editingSubject?.id
    );

    if (duplicate) {
      setFormError("A subject with this name already exists in your subject list.");
      return;
    }

    setSaving(true);
    setFormError("");
    setMessage("");

    try {
      if (editingSubject) {
        const { error } = await supabase
          .from("subjects")
          .update({ subject_name: cleanName })
          .eq("id", editingSubject.id)
          .eq("school_id", schoolId);

        if (error) throw error;
        setShowForm(false);
        setEditingSubject(null);
        setSubjectName("");
        await loadSubjects(true);
        notify("Subject updated successfully. Existing teacher assignments are preserved.", "success");
      } else {
        const { error } = await supabase.from("subjects").insert({
          school_id: schoolId,
          subject_name: cleanName,
        });

        if (error) throw error;
        setShowForm(false);
        setSubjectName("");
        await loadSubjects(true);
        notify("Subject added successfully.", "success");
      }
    } catch (error) {
      const description = error instanceof Error ? error.message : "Unable to save this subject.";
      setFormError(description);
    } finally {
      setSaving(false);
    }
  }

  const filteredSubjects = useMemo(() => {
    const term = search.trim().toLowerCase();
    return subjects.filter((subject) =>
      subject.subject_name.toLowerCase().includes(term)
    );
  }, [subjects, search]);

  const assignedSubjectCount = subjects.filter(
    (subject) => (summaries[subject.id]?.teacherCount || 0) > 0
  ).length;
  const totalTeacherAssignments = subjects.reduce(
    (total, subject) => total + (summaries[subject.id]?.teacherCount || 0),
    0
  );
  const totalClassLinks = subjects.reduce(
    (total, subject) => total + (summaries[subject.id]?.classCount || 0),
    0
  );

  return (
    <div className="min-h-full space-y-7 pb-8">
      <section className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-[#075B45] via-[#087F5B] to-[#19A779] p-6 text-white shadow-xl shadow-emerald-900/10 sm:p-8">
        <div className="pointer-events-none absolute -right-12 -top-16 h-64 w-64 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-24 right-1/3 h-48 w-48 rounded-full bg-lime-200/10 blur-2xl" />
        <div className="relative flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
          <div className="max-w-2xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold text-emerald-50">
              <Sparkles size={14} />
              Academic workspace
            </div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Subject Management</h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-emerald-50/90 sm:text-base">
              Organise your institution&apos;s curriculum and keep track of the classes and teachers connected to each subject.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => void loadSubjects(true)}
              disabled={loading || refreshing}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/25 bg-white/10 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/20 disabled:opacity-60"
            >
              <RefreshCw size={17} className={refreshing ? "animate-spin" : ""} />
              Refresh
            </button>
            <button
              type="button"
              onClick={openAddForm}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-[#087F5B] shadow-lg transition hover:-translate-y-0.5 hover:bg-emerald-50"
            >
              <Plus size={18} />
              Add subject
            </button>
          </div>
        </div>
      </section>

      {message && (
        <div className={`flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm ${
          messageType === "success"
            ? "border-emerald-200 bg-emerald-50 text-emerald-800"
            : messageType === "error"
              ? "border-rose-200 bg-rose-50 text-rose-800"
              : "border-sky-200 bg-sky-50 text-sky-800"
        }`}>
          {messageType === "success" ? <CheckCircle2 size={18} className="mt-0.5 shrink-0" /> :
           messageType === "error" ? <AlertCircle size={18} className="mt-0.5 shrink-0" /> :
           <BookOpen size={18} className="mt-0.5 shrink-0" />}
          <span>{message}</span>
        </div>
      )}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Total subjects", value: subjects.length, icon: BookOpen, tone: "bg-amber-100 text-amber-700", note: "In your curriculum" },
          { label: "Assigned subjects", value: assignedSubjectCount, icon: CheckCircle2, tone: "bg-emerald-100 text-emerald-700", note: "Connected to teachers" },
          { label: "Teacher links", value: totalTeacherAssignments, icon: Users, tone: "bg-sky-100 text-sky-700", note: "Distinct teacher links" },
          { label: "Class links", value: totalClassLinks, icon: Layers3, tone: "bg-violet-100 text-violet-700", note: "Distinct class links" },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="rounded-2xl border border-[#E7EEE9] bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-slate-500">{item.label}</p>
                  <p className="mt-2 text-3xl font-bold tracking-tight text-[#193B32]">
                    {loading ? "—" : item.value}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">{item.note}</p>
                </div>
                <div className={`rounded-xl p-3 ${item.tone}`}>
                  <Icon size={22} />
                </div>
              </div>
            </div>
          );
        })}
      </section>

      {showForm && (
        <div className="rounded-2xl border border-emerald-200 bg-white p-5 shadow-lg shadow-emerald-900/5 sm:p-6">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-700">
                {editingSubject ? "Update curriculum" : "New curriculum entry"}
              </p>
              <h2 className="mt-1 text-xl font-bold text-[#193B32]">
                {editingSubject ? "Edit subject" : "Add a new subject"}
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                {editingSubject
                  ? "The subject ID stays unchanged, so existing teacher assignments remain connected."
                  : "Add a subject to make it available for teacher and class assignments."}
              </p>
            </div>
            <button type="button" onClick={closeForm} disabled={saving} aria-label="Close form" className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50">
              <X size={20} />
            </button>
          </div>
          <form onSubmit={saveSubject} className="space-y-4">
            <label className="block space-y-2 text-sm font-semibold text-slate-700">
              Subject name
              <input
                autoFocus
                required
                maxLength={100}
                value={subjectName}
                onChange={(event) => setSubjectName(event.target.value)}
                placeholder="e.g. Mathematics"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-100"
              />
            </label>
            {formError && (
              <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                <AlertCircle size={17} className="mt-0.5 shrink-0" />
                <span>{formError}</span>
              </div>
            )}
            <div className="flex flex-wrap gap-3">
              <button type="submit" disabled={saving || !schoolId} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#087F5B] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#066B4D] disabled:cursor-not-allowed disabled:opacity-60">
                {saving ? <Loader2 size={17} className="animate-spin" /> : <CheckCircle2 size={17} />}
                {saving ? "Saving..." : editingSubject ? "Save changes" : "Save subject"}
              </button>
              <button type="button" onClick={closeForm} disabled={saving} className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <section className="overflow-hidden rounded-[24px] border border-[#E7EEE9] bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div>
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-emerald-100 p-2 text-emerald-700"><BookMarked size={18} /></div>
              <h2 className="text-lg font-bold text-[#193B32]">Your subjects</h2>
            </div>
            <p className="mt-2 text-sm text-slate-500">
              Showing {filteredSubjects.length} of {subjects.length} subject{subjects.length === 1 ? "" : "s"}
            </p>
          </div>
          <div className="relative w-full sm:max-w-sm">
            <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by subject name..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-100"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-3 p-14 text-sm text-slate-500">
            <Loader2 className="animate-spin text-emerald-600" size={21} />
            Loading your subjects...
          </div>
        ) : filteredSubjects.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
              <BookOpen size={30} />
            </div>
            <h3 className="mt-4 font-bold text-[#193B32]">
              {search ? "No matching subjects" : "No subjects added yet"}
            </h3>
            <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">
              {search ? "Try another search term." : "Add your first subject to start organising your institution's curriculum."}
            </p>
            {!search && (
              <button type="button" onClick={openAddForm} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#087F5B] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#066B4D]">
                <Plus size={17} /> Add first subject
              </button>
            )}
          </div>
        ) : (
          <div className="grid gap-4 p-5 sm:grid-cols-2 xl:grid-cols-3 sm:p-6">
            {filteredSubjects.map((subject, index) => {
              const summary = summaries[subject.id];
              return (
                <article key={subject.id} className="group rounded-2xl border border-slate-100 bg-white p-5 transition duration-200 hover:-translate-y-1 hover:border-emerald-200 hover:shadow-lg hover:shadow-emerald-900/5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-100 to-lime-100 text-emerald-700">
                        <BookOpen size={22} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">Subject {String(index + 1).padStart(2, "0")}</p>
                        <h3 className="mt-0.5 break-words font-bold text-[#193B32]">{subject.subject_name}</h3>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => openEditForm(subject)}
                      aria-label={`Edit ${subject.subject_name}`}
                      title="Edit subject"
                      className="rounded-xl border border-slate-200 p-2 text-slate-500 transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700"
                    >
                      <Pencil size={16} />
                    </button>
                  </div>

                  <div className="mt-5 grid grid-cols-2 gap-3">
                    <div className="rounded-xl bg-sky-50 px-3 py-3">
                      <div className="flex items-center gap-1.5 text-xs font-medium text-sky-700"><Users size={14} /> Teachers</div>
                      <p className="mt-1 text-xl font-bold text-sky-900">{summary ? summary.teacherCount : "—"}</p>
                    </div>
                    <div className="rounded-xl bg-violet-50 px-3 py-3">
                      <div className="flex items-center gap-1.5 text-xs font-medium text-violet-700"><GraduationCap size={14} /> Classes</div>
                      <p className="mt-1 text-xl font-bold text-violet-900">{summary ? summary.classCount : "—"}</p>
                    </div>
                  </div>

                  <div className="mt-4 border-t border-slate-100 pt-3">
                    <p className="text-xs font-semibold text-slate-500">Assigned classes</p>
                    {summary && summary.classes.length > 0 ? (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {summary.classes.slice(0, 4).map((className) => (
                          <span key={className} className="rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-800">{className}</span>
                        ))}
                        {summary.classes.length > 4 && (
                          <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">+{summary.classes.length - 4} more</span>
                        )}
                      </div>
                    ) : (
                      <p className="mt-2 text-xs text-slate-400">
                        {summary ? "Not assigned to a class yet" : "Assignment details unavailable"}
                      </p>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-900">
        <AlertCircle size={19} className="mt-0.5 shrink-0 text-amber-700" />
        <p><strong>Safe management:</strong> Subject deletion is intentionally unavailable. Editing changes only the subject name and keeps its existing ID, so teacher assignments remain connected.</p>
      </div>
    </div>
  );
}
