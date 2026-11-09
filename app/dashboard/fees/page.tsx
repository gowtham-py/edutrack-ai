
"use client";

import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { supabase } from "@/lib/supabase";
import {
  Wallet,
  Plus,
  Search,
  RefreshCw,
  Loader2,
  BookOpen,
  CalendarDays,
  IndianRupee,
  Layers,
  Tag,
  X,
  CheckCircle2,
  AlertCircle,
  GraduationCap,
} from "lucide-react";

type FeeCategory = {
  id: string;
  category_name: string;
  description: string | null;
};

type SchoolClass = {
  id: string;
  class_name: string;
  section: string | null;
};

type FeeStructure = {
  id: string;
  class_id: string | null;
  category_id: string;
  amount: number;
  academic_year: string;
  due_date: string | null;
  created_at: string;
};

export default function FeesPage() {
  const [schoolId, setSchoolId] = useState("");
  const [categories, setCategories] = useState<FeeCategory[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [structures, setStructures] = useState<FeeStructure[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingCategory, setSavingCategory] = useState(false);
  const [savingStructure, setSavingStructure] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [search, setSearch] = useState("");
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [showStructureForm, setShowStructureForm] = useState(false);

  const [categoryName, setCategoryName] = useState("");
  const [categoryDescription, setCategoryDescription] = useState("");

  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedClass, setSelectedClass] = useState("");
  const [amount, setAmount] = useState("");
  const [academicYear, setAcademicYear] = useState("2026-2027");
  const [dueDate, setDueDate] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        throw new Error("Please log in to access Fee Management.");
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("school_id, role")
        .eq("user_id", user.id)
        .maybeSingle();

      if (profileError) throw profileError;

      if (!profile?.school_id || profile.role !== "school_admin") {
        throw new Error("Only school administrators can access Fee Management.");
      }

      setSchoolId(profile.school_id);

      const [
        { data: categoryData, error: categoryError },
        { data: classData, error: classError },
        { data: structureData, error: structureError },
      ] = await Promise.all([
        supabase
          .from("fee_categories")
          .select("id, category_name, description")
          .eq("school_id", profile.school_id)
          .order("category_name"),
        supabase
          .from("classes")
          .select("id, class_name, section")
          .eq("school_id", profile.school_id)
          .order("class_name"),
        supabase
          .from("fee_structures")
          .select("id, class_id, category_id, amount, academic_year, due_date, created_at")
          .eq("school_id", profile.school_id)
          .order("created_at", { ascending: false }),
      ]);

      if (categoryError) throw categoryError;
      if (classError) throw classError;
      if (structureError) throw structureError;

      setCategories(categoryData || []);
      setClasses(classData || []);
      setStructures((structureData || []) as FeeStructure[]);
    } catch (err: unknown) {
      console.error("Fee management loading error:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load Fee Management."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function addCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!schoolId || !categoryName.trim()) return;

    setSavingCategory(true);
    setError("");
    setSuccess("");

    try {
      const { error: insertError } = await supabase
        .from("fee_categories")
        .insert({
          school_id: schoolId,
          category_name: categoryName.trim(),
          description: categoryDescription.trim() || null,
        });

      if (insertError) throw insertError;

      setCategoryName("");
      setCategoryDescription("");
      setShowCategoryForm(false);
      setSuccess("Fee category created successfully.");
      await loadData();
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to create fee category."
      );
    } finally {
      setSavingCategory(false);
    }
  }

  async function addStructure(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!schoolId || !selectedCategory || !amount || !academicYear.trim()) {
      setError("Please complete all required fee structure fields.");
      return;
    }

    const numericAmount = Number(amount);

    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setError("Enter a valid fee amount greater than zero.");
      return;
    }

    setSavingStructure(true);
    setError("");
    setSuccess("");

    try {
      const { error: insertError } = await supabase
        .from("fee_structures")
        .insert({
          school_id: schoolId,
          class_id: selectedClass || null,
          category_id: selectedCategory,
          amount: numericAmount,
          academic_year: academicYear.trim(),
          due_date: dueDate || null,
        });

      if (insertError) throw insertError;

      setSelectedCategory("");
      setSelectedClass("");
      setAmount("");
      setDueDate("");
      setShowStructureForm(false);
      setSuccess("Fee structure created successfully.");
      await loadData();
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to create fee structure."
      );
    } finally {
      setSavingStructure(false);
    }
  }

  const filteredStructures = structures.filter((item) => {
    const category = categories.find((c) => c.id === item.category_id);
    const schoolClass = classes.find((c) => c.id === item.class_id);
    const classLabel = schoolClass
      ? `${schoolClass.class_name} ${schoolClass.section || ""}`
      : "All classes";

    const searchable = [
      category?.category_name || "",
      classLabel,
      item.academic_year,
    ]
      .join(" ")
      .toLowerCase();

    return searchable.includes(search.toLowerCase());
  });

  const totalConfigured = structures.reduce(
    (sum, item) => sum + Number(item.amount || 0),
    0
  );

  const formatMoney = (value: number) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    }).format(value);

  if (loading) {
    return (
      <div className="flex min-h-[65vh] items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto h-10 w-10 animate-spin text-emerald-600" />
          <p className="mt-4 text-sm font-medium text-slate-500">
            Loading Fee Management...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen space-y-7 bg-slate-50/70 p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-700 via-teal-700 to-cyan-800 p-6 text-white shadow-xl shadow-emerald-900/10 sm:p-8">
        <div className="pointer-events-none absolute -right-10 -top-20 h-64 w-64 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-28 right-1/3 h-64 w-64 rounded-full bg-cyan-300/10 blur-3xl" />

        <div className="relative flex flex-col justify-between gap-6 md:flex-row md:items-center">
          <div>
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-emerald-100">
              <Wallet size={17} />
              SCHOOL FINANCE
            </div>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Fee Management
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-emerald-50/90 sm:text-base">
              Organize fee categories and class-wise fee structures in one place.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => {
                setError("");
                setSuccess("");
                setShowCategoryForm(true);
              }}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/30 bg-white/10 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/20"
            >
              <Tag size={17} />
              Add Category
            </button>
            <button
              onClick={() => {
                setError("");
                setSuccess("");
                setShowStructureForm(true);
              }}
              disabled={categories.length === 0}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-bold text-emerald-800 shadow-lg transition hover:-translate-y-0.5 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Plus size={18} />
              Create Fee Structure
            </button>
          </div>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle className="mt-0.5 shrink-0" size={18} />
          <span>{error}</span>
          <button onClick={() => setError("")} className="ml-auto">
            <X size={17} />
          </button>
        </div>
      )}

      {success && (
        <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-800">
          <CheckCircle2 size={18} />
          {success}
          <button onClick={() => setSuccess("")} className="ml-auto">
            <X size={17} />
          </button>
        </div>
      )}

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          icon={<Tag size={21} />}
          label="Fee Categories"
          value={String(categories.length)}
          color="emerald"
        />
        <SummaryCard
          icon={<Layers size={21} />}
          label="Fee Structures"
          value={String(structures.length)}
          color="blue"
        />
        <SummaryCard
          icon={<GraduationCap size={21} />}
          label="Classes"
          value={String(classes.length)}
          color="violet"
        />
        <SummaryCard
          icon={<IndianRupee size={21} />}
          label="Configured Fee Total"
          value={formatMoney(totalConfigured)}
          color="amber"
        />
      </div>

      {/* Categories */}
      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Fee Categories
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              The different types of fees configured for your school.
            </p>
          </div>
          <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
            {categories.length} categories
          </span>
        </div>

        {categories.length === 0 ? (
          <EmptyState
            icon={<Tag size={25} />}
            title="No fee categories yet"
            description="Create your first category, such as Tuition Fee or Transport Fee."
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {categories.map((category) => (
              <div
                key={category.id}
                className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-slate-50/80 p-4 transition hover:border-emerald-200 hover:bg-emerald-50/40"
              >
                <div className="rounded-xl bg-emerald-100 p-2.5 text-emerald-700">
                  <Tag size={19} />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-slate-800">
                    {category.category_name}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    {category.description || "No description added"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Fee structures */}
      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Class-wise Fee Structures
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              View the fees configured for each class and academic year.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <div className="relative min-w-[190px] flex-1 sm:flex-none">
              <Search
                size={17}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search fee structures..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
              />
            </div>
            <button
              onClick={loadData}
              className="rounded-xl border border-slate-200 p-2.5 text-slate-600 transition hover:bg-slate-50"
              title="Refresh"
            >
              <RefreshCw size={18} />
            </button>
          </div>
        </div>

        {filteredStructures.length === 0 ? (
          <EmptyState
            icon={<BookOpen size={25} />}
            title={search ? "No matching fee structures" : "No fee structures created"}
            description={
              search
                ? "Try another search term."
                : "Create a fee structure to assign an amount to a class and fee category."
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left">
              <thead>
                <tr className="border-b border-slate-100 text-xs uppercase tracking-wider text-slate-400">
                  <th className="px-4 py-3 font-semibold">Fee Category</th>
                  <th className="px-4 py-3 font-semibold">Class / Section</th>
                  <th className="px-4 py-3 font-semibold">Academic Year</th>
                  <th className="px-4 py-3 font-semibold">Due Date</th>
                  <th className="px-4 py-3 text-right font-semibold">Amount</th>
                </tr>
              </thead>
              <tbody>
                {filteredStructures.map((item) => {
                  const category = categories.find(
                    (c) => c.id === item.category_id
                  );
                  const schoolClass = classes.find(
                    (c) => c.id === item.class_id
                  );

                  return (
                    <tr
                      key={item.id}
                      className="border-b border-slate-50 transition hover:bg-slate-50/80"
                    >
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className="rounded-lg bg-emerald-50 p-2 text-emerald-700">
                            <Wallet size={17} />
                          </div>
                          <span className="font-semibold text-slate-800">
                            {category?.category_name || "Unknown category"}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-sm text-slate-600">
                        {schoolClass
                          ? `${schoolClass.class_name}${schoolClass.section ? ` - ${schoolClass.section}` : ""}`
                          : "All classes"}
                      </td>
                      <td className="px-4 py-4 text-sm text-slate-600">
                        {item.academic_year}
                      </td>
                      <td className="px-4 py-4 text-sm text-slate-600">
                        {item.due_date
                          ? new Date(`${item.due_date}T00:00:00`).toLocaleDateString("en-IN")
                          : "Not set"}
                      </td>
                      <td className="px-4 py-4 text-right font-bold text-slate-900">
                        {formatMoney(Number(item.amount))}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Category modal */}
      {showCategoryForm && (
        <Modal
          title="Add Fee Category"
          subtitle="Create a new fee type for your school."
          onClose={() => setShowCategoryForm(false)}
        >
          <form onSubmit={addCategory} className="space-y-4">
            <FormField label="Category Name">
              <input
                required
                value={categoryName}
                onChange={(e) => setCategoryName(e.target.value)}
                placeholder="e.g. Tuition Fee"
                className="form-input"
              />
            </FormField>

            <FormField label="Description (optional)">
              <textarea
                value={categoryDescription}
                onChange={(e) => setCategoryDescription(e.target.value)}
                placeholder="Brief description of this fee category"
                rows={3}
                className="form-input resize-none"
              />
            </FormField>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowCategoryForm(false)}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={savingCategory}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-60"
              >
                {savingCategory && <Loader2 size={16} className="animate-spin" />}
                Create Category
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Fee structure modal */}
      {showStructureForm && (
        <Modal
          title="Create Fee Structure"
          subtitle="Set the fee amount for a class and academic year."
          onClose={() => setShowStructureForm(false)}
        >
          <form onSubmit={addStructure} className="space-y-4">
            <FormField label="Fee Category">
              <select
                required
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="form-input"
              >
                <option value="">Select fee category</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.category_name}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField label="Class">
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="form-input"
              >
                <option value="">All classes</option>
                {classes.map((schoolClass) => (
                  <option key={schoolClass.id} value={schoolClass.id}>
                    {schoolClass.class_name}
                    {schoolClass.section ? ` - ${schoolClass.section}` : ""}
                  </option>
                ))}
              </select>
              <p className="mt-1.5 text-xs text-slate-500">
                Choose All classes to create a school-wide fee structure.
              </p>
            </FormField>

            <FormField label="Fee Amount (INR)">
              <div className="relative">
                <IndianRupee
                  size={17}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  required
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="Enter amount"
                  className="form-input pl-9"
                />
              </div>
            </FormField>

            <FormField label="Academic Year">
              <input
                required
                value={academicYear}
                onChange={(e) => setAcademicYear(e.target.value)}
                placeholder="e.g. 2026-2027"
                className="form-input"
              />
            </FormField>

            <FormField label="Due Date (optional)">
              <div className="relative">
                <CalendarDays
                  size={17}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="form-input pl-9"
                />
              </div>
            </FormField>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowStructureForm(false)}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={savingStructure}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-60"
              >
                {savingStructure && <Loader2 size={16} className="animate-spin" />}
                Save Fee Structure
              </button>
            </div>
          </form>
        </Modal>
      )}

      <style jsx>{`
        .form-input {
          width: 100%;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          background: #f8fafc;
          padding: 11px 13px;
          color: #0f172a;
          font-size: 14px;
          outline: none;
          transition: all 0.2s ease;
        }
        .form-input:focus {
          border-color: #10b981;
          background: white;
          box-shadow: 0 0 0 4px rgba(16, 185, 129, 0.1);
        }
      `}</style>
    </div>
  );
}

function SummaryCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: "emerald" | "blue" | "violet" | "amber";
}) {
  const styles = {
    emerald: "bg-emerald-50 text-emerald-700",
    blue: "bg-blue-50 text-blue-700",
    violet: "bg-violet-50 text-violet-700",
    amber: "bg-amber-50 text-amber-700",
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium text-slate-500">{label}</div>
        <div className={`rounded-xl p-2.5 ${styles[color]}`}>{icon}</div>
      </div>
      <div className="mt-4 break-words text-2xl font-bold tracking-tight text-slate-900">
        {value}
      </div>
    </div>
  );
}

function EmptyState({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 px-5 py-12 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
        {icon}
      </div>
      <h3 className="mt-4 font-bold text-slate-800">{title}</h3>
      <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">
        {description}
      </p>
    </div>
  );
}

function Modal({
  title,
  subtitle,
  onClose,
  children,
}: {
  title: string;
  subtitle: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/50 p-4 backdrop-blur-sm">
      <div className="my-8 w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-100 p-5 sm:p-6">
          <div>
            <h2 className="text-xl font-bold text-slate-900">{title}</h2>
            <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>
        <div className="p-5 sm:p-6">{children}</div>
      </div>
    </div>
  );
}

function FormField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-semibold text-slate-700">
        {label}
      </label>
      {children}
    </div>
  );
}
