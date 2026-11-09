"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  GraduationCap,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  School,
  Users,
  X,
} from "lucide-react";

type SchoolClass = {
  id: string;
  class_name: string;
  section: string;
  created_at: string | null;
  student_count: number;
};

type StudentRow = {
  id: string;
  class_id: string | null;
};

const inputClass =
  "w-full rounded-xl border border-emerald-100 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10";

export default function ClassesPage() {
  const router = useRouter();

  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [schoolId, setSchoolId] = useState("");
  const [className, setClassName] = useState("");
  const [section, setSection] = useState("");
  const [search, setSearch] = useState("");
  const [editingClass, setEditingClass] = useState<SchoolClass | null>(null);
  const [editClassName, setEditClassName] = useState("");
  const [editSection, setEditSection] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [editError, setEditError] = useState("");

  const loadClasses = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    else setLoading(true);
    setError("");

    const { data: userData, error: authError } = await supabase.auth.getUser();

    if (authError || !userData.user) {
      router.replace("/login");
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("school_id, role")
      .eq("user_id", userData.user.id)
      .single();

    if (profileError || !profile?.school_id) {
      setError("Your school profile could not be found. Please contact your school administrator.");
      setLoading(false);
      setRefreshing(false);
      return;
    }

    if (profile.role !== "school_admin") {
      setError("Only school administrators can manage classes.");
      setLoading(false);
      setRefreshing(false);
      return;
    }

    setSchoolId(profile.school_id);

    const [{ data: classRows, error: classesError }, { data: studentRows, error: studentsError }] =
      await Promise.all([
        supabase
          .from("classes")
          .select("id, class_name, section, created_at")
          .eq("school_id", profile.school_id)
          .order("class_name", { ascending: true })
          .order("section", { ascending: true }),
        supabase
          .from("students")
          .select("id, class_id")
          .eq("school_id", profile.school_id),
      ]);

    if (classesError) {
      setError(classesError.message);
      setClasses([]);
    } else if (studentsError) {
      setError(`Classes loaded, but student counts could not be retrieved: ${studentsError.message}`);
      setClasses((classRows || []).map((item) => ({ ...item, student_count: 0 })));
    } else {
      const counts = new Map<string, number>();
      (studentRows as StudentRow[] | null)?.forEach((student) => {
        if (student.class_id) {
          counts.set(student.class_id, (counts.get(student.class_id) || 0) + 1);
        }
      });

      setClasses(
        (classRows || []).map((item) => ({
          ...item,
          student_count: counts.get(item.id) || 0,
        }))
      );
    }

    setLoading(false);
    setRefreshing(false);
  }, [router]);

  useEffect(() => {
    void loadClasses();
  }, [loadClasses]);

  const filteredClasses = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return classes;
    return classes.filter(
      (item) =>
        item.class_name.toLowerCase().includes(term) ||
        item.section.toLowerCase().includes(term) ||
        `${item.class_name} ${item.section}`.toLowerCase().includes(term)
    );
  }, [classes, search]);

  const totalStudents = classes.reduce((sum, item) => sum + item.student_count, 0);
  const classGroups = new Set(classes.map((item) => item.class_name.toLowerCase())).size;

  async function handleAddClass(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");

    const cleanName = className.trim();
    const cleanSection = section.trim().toUpperCase();

    if (!cleanName || !cleanSection) {
      setError("Please enter both a class name and a section.");
      return;
    }
    if (!schoolId) {
      setError("Your school could not be identified. Refresh the page and try again.");
      return;
    }

    setSaving(true);
    const { error: insertError } = await supabase.from("classes").insert({
      school_id: schoolId,
      class_name: cleanName,
      section: cleanSection,
    });

    if (insertError) {
      setError(
        insertError.code === "23505"
          ? "This class and section already exist in your school."
          : insertError.message
      );
    } else {
      setClassName("");
      setSection("");
      setMessage(`${cleanName} – Section ${cleanSection} was added successfully.`);
      await loadClasses(true);
    }
    setSaving(false);
  }

  function openEdit(item: SchoolClass) {
    setEditingClass(item);
    setEditError("");
    setEditClassName(item.class_name);
    setEditSection(item.section);
    setError("");
    setMessage("");
  }

  async function handleEditClass(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingClass) return;

    const cleanName = editClassName.trim();
    const cleanSection = editSection.trim().toUpperCase();

    if (!cleanName || !cleanSection) {
      setEditError("Please enter both a class name and a section.");
      return;
    }

    setSaving(true);
    setEditError("");
    setMessage("");

    // Update the existing row only. Its UUID remains unchanged, preserving
    // student and teacher-assignment relationships.
    const { error: updateError } = await supabase
      .from("classes")
      .update({ class_name: cleanName, section: cleanSection })
      .eq("id", editingClass.id)
      .eq("school_id", schoolId);

    if (updateError) {
      setEditError(
        updateError.code === "23505"
          ? "Another class already uses this class name and section."
          : updateError.message
      );
    } else {
      setMessage("Class details updated successfully. Existing student and teacher assignments are preserved.");
      setEditingClass(null);
      await loadClasses(true);
    }
    setSaving(false);
  }

  return (
    <main className="min-h-screen bg-[#F3F8F5] px-4 py-6 sm:px-7 sm:py-9">
      <div className="mx-auto max-w-7xl">
        <Link
          href="/dashboard"
          className="mb-6 inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-white px-4 py-2 text-sm font-semibold text-emerald-800 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
        >
          <ArrowLeft size={16} /> Back to Dashboard
        </Link>

        <section className="relative mb-7 overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#075B46] via-[#087F5B] to-[#19A875] p-6 text-white shadow-xl shadow-emerald-900/10 sm:p-9">
          <div className="pointer-events-none absolute -right-12 -top-20 h-64 w-64 rounded-full bg-white/10 blur-2xl" />
          <div className="pointer-events-none absolute -bottom-28 right-1/3 h-64 w-64 rounded-full bg-lime-300/10 blur-3xl" />
          <div className="relative flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
            <div>
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-white/20 bg-white/15">
                <School size={25} />
              </div>
              <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-emerald-100">Academic management</p>
              <h1 className="text-3xl font-black tracking-tight sm:text-4xl">Class & Section Management</h1>
              <p className="mt-2 max-w-xl text-sm leading-6 text-emerald-50/90 sm:text-base">
                Organise your school&apos;s classes, manage sections, and keep student and teacher assignments connected.
              </p>
            </div>
            <button
              type="button"
              onClick={() => void loadClasses(true)}
              disabled={refreshing || loading}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-white/25 bg-white/15 px-4 py-3 text-sm font-bold text-white transition hover:bg-white/25 disabled:opacity-60"
            >
              <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
              Refresh data
            </button>
          </div>
        </section>

        <section className="mb-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <div className="rounded-2xl border border-emerald-100/80 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Class & section entries</p>
                <p className="mt-2 text-3xl font-black text-slate-800">{loading ? "—" : classes.length}</p>
              </div>
              <div className="rounded-2xl bg-emerald-50 p-3 text-emerald-700"><School size={23} /></div>
            </div>
          </div>
          <div className="rounded-2xl border border-sky-100/80 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Class groups</p>
                <p className="mt-2 text-3xl font-black text-slate-800">{loading ? "—" : classGroups}</p>
              </div>
              <div className="rounded-2xl bg-sky-50 p-3 text-sky-700"><BookOpen size={23} /></div>
            </div>
          </div>
          <div className="rounded-2xl border border-violet-100/80 bg-white p-5 shadow-sm sm:col-span-2 xl:col-span-1">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Students assigned</p>
                <p className="mt-2 text-3xl font-black text-slate-800">{loading ? "—" : totalStudents}</p>
              </div>
              <div className="rounded-2xl bg-violet-50 p-3 text-violet-700"><Users size={23} /></div>
            </div>
          </div>
        </section>

        {error && (
          <div className="mb-5 flex items-start gap-3 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">
            <span className="font-bold">Error:</span><span className="break-words">{error}</span>
          </div>
        )}
        {message && (
          <div className="mb-5 flex items-start gap-3 rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-sm text-emerald-800">
            <CheckCircle2 size={18} className="mt-0.5 shrink-0" /><span>{message}</span>
            <button type="button" onClick={() => setMessage("")} className="ml-auto text-emerald-700"><X size={17} /></button>
          </div>
        )}

        <div className="grid items-start gap-6 xl:grid-cols-[0.85fr_1.5fr]">
          <section className="rounded-3xl border border-emerald-100 bg-white p-5 shadow-sm sm:p-6">
            <div className="mb-5 flex items-center gap-3">
              <div className="rounded-xl bg-emerald-100 p-2.5 text-emerald-800"><Plus size={20} /></div>
              <div>
                <h2 className="font-bold text-slate-800">Add a new class</h2>
                <p className="text-xs text-slate-500">Create a class and its section</p>
              </div>
            </div>
            <form onSubmit={handleAddClass} className="space-y-4">
              <div>
                <label htmlFor="className" className="mb-2 block text-sm font-semibold text-slate-700">Class name</label>
                <input id="className" value={className} onChange={(e) => setClassName(e.target.value)} placeholder="e.g. Grade 10" className={inputClass} maxLength={80} required />
              </div>
              <div>
                <label htmlFor="section" className="mb-2 block text-sm font-semibold text-slate-700">Section</label>
                <input id="section" value={section} onChange={(e) => setSection(e.target.value)} placeholder="e.g. A" className={inputClass} maxLength={30} required />
                <p className="mt-1.5 text-xs text-slate-400">Section names are saved in uppercase.</p>
              </div>
              <button type="submit" disabled={saving || !schoolId} className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-700 to-emerald-500 px-4 py-3 font-bold text-white shadow-lg shadow-emerald-900/10 transition hover:-translate-y-0.5 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-60">
                {saving ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
                {saving ? "Saving..." : "Create class"}
              </button>
            </form>
            <div className="mt-5 rounded-2xl bg-emerald-50/80 p-4">
              <p className="text-xs font-bold text-emerald-900">Good to know</p>
              <p className="mt-1 text-xs leading-5 text-emerald-800/80">Each class and section combination must be unique within your school. You can edit its name later without changing its class ID.</p>
            </div>
          </section>

          <section className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm sm:p-6">
            <div className="mb-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <div>
                <h2 className="text-lg font-bold text-slate-800">Your classes</h2>
                <p className="mt-1 text-sm text-slate-500">Browse and update registered class sections.</p>
              </div>
              <div className="relative w-full sm:max-w-xs">
                <Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search class or section..." className={`${inputClass} pl-10`} />
              </div>
            </div>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-16 text-emerald-700">
                <Loader2 size={27} className="animate-spin" />
                <p className="mt-3 text-sm text-slate-500">Loading your classes...</p>
              </div>
            ) : filteredClasses.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 px-5 py-14 text-center">
                <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700"><School size={27} /></div>
                <p className="font-bold text-slate-700">{search ? "No matching classes found" : "No classes added yet"}</p>
                <p className="mt-1 text-sm text-slate-500">{search ? "Try another class name or section." : "Create your first class using the form."}</p>
              </div>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {filteredClasses.map((item) => (
                  <article key={item.id} className="group rounded-2xl border border-slate-100 bg-gradient-to-br from-white to-emerald-50/40 p-4 transition hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-md">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800"><GraduationCap size={22} /></div>
                        <div className="min-w-0">
                          <h3 className="truncate font-bold text-slate-800">{item.class_name}</h3>
                          <p className="mt-0.5 text-xs text-slate-500">Section {item.section}</p>
                        </div>
                      </div>
                      <button type="button" onClick={() => openEdit(item)} className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-emerald-100 bg-white px-3 py-2 text-xs font-bold text-emerald-800 transition hover:bg-emerald-50" aria-label={`Edit ${item.class_name} section ${item.section}`}>
                        <Pencil size={13} /> Edit
                      </button>
                    </div>
                    <div className="mt-4 flex items-center justify-between border-t border-emerald-100/80 pt-3">
                      <span className="text-xs text-slate-500">Enrolled students</span>
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-xs font-bold text-emerald-800"><Users size={13} /> {item.student_count}</span>
                    </div>
                  </article>
                ))}
              </div>
            )}
            {!loading && classes.length > 0 && (
              <p className="mt-4 text-xs text-slate-400">Showing {filteredClasses.length} of {classes.length} class-section entries. Class records are never deleted from this page.</p>
            )}
          </section>
        </div>
      </div>

      {editingClass && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) setEditingClass(null); }}>
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
            <div className="mb-5 flex items-start justify-between">
              <div>
                <div className="mb-3 inline-flex rounded-xl bg-emerald-100 p-2.5 text-emerald-800"><Pencil size={19} /></div>
                <h2 className="text-xl font-bold text-slate-800">Edit class details</h2>
                <p className="mt-1 text-sm text-slate-500">Update the class name or section.</p>
              </div>
              <button type="button" disabled={saving} onClick={() => setEditingClass(null)} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><X size={19} /></button>
            </div>
            <form onSubmit={handleEditClass} className="space-y-4">
              <div>
                <label htmlFor="editClassName" className="mb-2 block text-sm font-semibold text-slate-700">Class name</label>
                <input id="editClassName" value={editClassName} onChange={(e) => setEditClassName(e.target.value)} className={inputClass} maxLength={80} required />
              </div>
              <div>
                <label htmlFor="editSection" className="mb-2 block text-sm font-semibold text-slate-700">Section</label>
                <input id="editSection" value={editSection} onChange={(e) => setEditSection(e.target.value)} className={inputClass} maxLength={30} required />
              </div>
              {editError && <p className="rounded-xl border border-red-100 bg-red-50 p-3 text-sm text-red-700">{editError}</p>}
              <div className="rounded-xl bg-sky-50 p-3 text-xs leading-5 text-sky-800">
                Saving updates this existing class record. Its ID stays the same, so linked students and teacher assignments remain connected.
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" disabled={saving} onClick={() => setEditingClass(null)} className="flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50">Cancel</button>
                <button type="submit" disabled={saving} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-3 text-sm font-bold text-white transition hover:bg-emerald-800 disabled:opacity-60">
                  {saving ? <Loader2 size={17} className="animate-spin" /> : <CheckCircle2 size={17} />}
                  {saving ? "Saving..." : "Save changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
