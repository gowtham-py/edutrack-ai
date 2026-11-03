"use client";

import { useEffect, useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { ArrowLeft, Plus, School, Loader2 } from "lucide-react";

type SchoolClass = {
  id: string;
  class_name: string;
  section: string;
};

export default function ClassesPage() {
  const router = useRouter();

  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [className, setClassName] = useState("");
  const [section, setSection] = useState("");
  const [schoolId, setSchoolId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function loadClasses() {
    setLoading(true);
    setError("");

    const { data: userData } = await supabase.auth.getUser();

    if (!userData.user) {
      router.replace("/login");
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("school_id, role")
      .eq("user_id", userData.user.id)
      .single();

    if (profileError || !profile?.school_id) {
      setError("Your school profile could not be found.");
      setLoading(false);
      return;
    }

    setSchoolId(profile.school_id);

    const { data, error: classesError } = await supabase
      .from("classes")
      .select("id, class_name, section")
      .eq("school_id", profile.school_id)
      .order("class_name", { ascending: true });

    if (classesError) {
      setError(classesError.message);
    } else {
      setClasses(data || []);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadClasses();
  }, []);

  async function handleAddClass(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setError("");

    if (!className.trim() || !section.trim()) {
      setError("Please enter both class name and section.");
      return;
    }

    setSaving(true);

    const { error: insertError } = await supabase.from("classes").insert({
      school_id: schoolId,
      class_name: className.trim(),
      section: section.trim().toUpperCase(),
    });

    if (insertError) {
      setError(
        insertError.code === "23505"
          ? "This class and section already exist."
          : insertError.message
      );
    } else {
      setMessage("Class added successfully!");
      setClassName("");
      setSection("");
      await loadClasses();
    }

    setSaving(false);
  }

  return (
    <main className="min-h-screen bg-[#F4F8F5] px-5 py-8 sm:px-8">
      <div className="mx-auto max-w-5xl">
        <Link
          href="/dashboard"
          className="mb-8 inline-flex items-center gap-2 text-sm font-semibold text-[#087F5B] hover:text-[#123C35]"
        >
          <ArrowLeft size={17} />
          Back to Dashboard
        </Link>

        <div className="mb-8">
          <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#DDF4E9] text-[#087F5B]">
            <School size={28} />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-[#123C35]">
            Class Management
          </h1>
          <p className="mt-2 text-[#71827A]">
            Create and manage your school's classes and sections.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-[1fr_1.3fr]">
          <section className="rounded-3xl border border-[#E4EEE7] bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-[#123C35]">
              Add a New Class
            </h2>
            <p className="mb-6 mt-1 text-sm text-[#829188]">
              Enter a class name and its section.
            </p>

            <form onSubmit={handleAddClass} className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-semibold text-[#34564A]">
                  Class Name
                </label>
                <input
                  value={className}
                  onChange={(e) => setClassName(e.target.value)}
                  placeholder="e.g. Grade 10"
                  className="w-full rounded-xl border border-[#DCE8DF] bg-[#FAFCFA] px-4 py-3 text-sm text-[#123C35] outline-none transition focus:border-[#087F5B] focus:ring-4 focus:ring-[#087F5B]/10"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-[#34564A]">
                  Section
                </label>
                <input
                  value={section}
                  onChange={(e) => setSection(e.target.value)}
                  placeholder="e.g. A"
                  className="w-full rounded-xl border border-[#DCE8DF] bg-[#FAFCFA] px-4 py-3 text-sm text-[#123C35] outline-none transition focus:border-[#087F5B] focus:ring-4 focus:ring-[#087F5B]/10"
                />
              </div>

              {error && (
                <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">
                  {error}
                </p>
              )}

              {message && (
                <p className="rounded-xl bg-green-50 p-3 text-sm text-green-700">
                  {message}
                </p>
              )}

              <button
                type="submit"
                disabled={saving || !schoolId}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#087F5B] to-[#10A878] px-4 py-3 font-semibold text-white shadow-lg shadow-green-900/10 transition hover:-translate-y-0.5 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <Plus size={18} />
                )}
                {saving ? "Adding..." : "Add Class"}
              </button>
            </form>
          </section>

          <section className="rounded-3xl border border-[#E4EEE7] bg-white p-6 shadow-sm">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-[#123C35]">
                  Your Classes
                </h2>
                <p className="mt-1 text-sm text-[#829188]">
                  Classes registered in your school.
                </p>
              </div>
              <span className="rounded-full bg-[#E5F5EC] px-3 py-1 text-sm font-bold text-[#087F5B]">
                {classes.length} total
              </span>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-16 text-[#087F5B]">
                <Loader2 className="animate-spin" size={25} />
              </div>
            ) : classes.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[#CFE1D5] py-14 text-center">
                <School className="mx-auto mb-3 text-[#9BB8A6]" size={35} />
                <p className="font-semibold text-[#34564A]">
                  No classes added yet
                </p>
                <p className="mt-1 text-sm text-[#829188]">
                  Add your first class using the form.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {classes.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between rounded-2xl border border-[#E8F0EA] bg-[#FBFDFC] p-4 transition hover:border-[#A8D8BC] hover:shadow-sm"
                  >
                    <div>
                      <p className="font-bold text-[#123C35]">
                        {item.class_name}
                      </p>
                      <p className="mt-1 text-xs text-[#829188]">
                        Section {item.section}
                      </p>
                    </div>
                    <span className="rounded-xl bg-[#E5F5EC] px-3 py-2 text-sm font-bold text-[#087F5B]">
                      {item.section}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
