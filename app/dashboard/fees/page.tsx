
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { supabase } from "@/lib/supabase";
import {
  Wallet, Plus, Search, RefreshCw, Loader2, BookOpen,
  CalendarDays, IndianRupee, Layers, Tag, X, CheckCircle2,
  AlertCircle, GraduationCap, FileText, Printer, Eye,
  Users, Receipt, Filter, ChevronDown,
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

type Student = {
  id: string;
  full_name: string;
  admission_number: string;
  class_id: string | null;
};

type Invoice = {
  id: string;
  student_id: string;
  invoice_number: string;
  academic_year: string;
  billing_period: string;
  total_amount: number;
  paid_amount: number;
  due_date: string | null;
  status: string;
  created_at: string;
};

type InvoiceItem = {
  id: string;
  invoice_id: string;
  category_id: string | null;
  description: string;
  amount: number;
};

type PreviewItem = {
  category_id: string;
  description: string;
  amount: number;
};

const inputClass =
  "form-input w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-emerald-400 focus:bg-white focus:ring-4 focus:ring-emerald-100";

export default function FeesPage() {
  const [schoolId, setSchoolId] = useState("");
  const [categories, setCategories] = useState<FeeCategory[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [structures, setStructures] = useState<FeeStructure[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingCategory, setSavingCategory] = useState(false);
  const [savingStructure, setSavingStructure] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [showStructureForm, setShowStructureForm] = useState(false);
  const [showInvoiceForm, setShowInvoiceForm] = useState(false);

  const [categoryName, setCategoryName] = useState("");
  const [categoryDescription, setCategoryDescription] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedClass, setSelectedClass] = useState("");
  const [amount, setAmount] = useState("");
  const [academicYear, setAcademicYear] = useState("2026-2027");
  const [dueDate, setDueDate] = useState("");

  // Invoice generator
  const [invoiceYear, setInvoiceYear] = useState("2026-2027");
  const [billingType, setBillingType] = useState("Annual");
  const [customPeriod, setCustomPeriod] = useState("");
  const [invoiceMode, setInvoiceMode] = useState("class");
  const [invoiceClass, setInvoiceClass] = useState("");
  const [invoiceStudent, setInvoiceStudent] = useState("");
  const [invoiceDueDate, setInvoiceDueDate] = useState("");

  // Invoice details
  const [viewInvoice, setViewInvoice] = useState<Invoice | null>(null);
  const [viewItems, setViewItems] = useState<InvoiceItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);

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

      if (
        !profile?.school_id ||
        !["school_admin", "super_admin"].includes(profile.role)
      ) {
        throw new Error("You do not have permission to access Fee Management.");
      }

      setSchoolId(profile.school_id);

      const [
        { data: categoryData, error: categoryError },
        { data: classData, error: classError },
        { data: structureData, error: structureError },
        { data: studentData, error: studentError },
        { data: invoiceData, error: invoiceError },
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
        supabase
          .from("students")
          .select("id, full_name, admission_number, class_id")
          .eq("school_id", profile.school_id)
          .order("full_name"),
        supabase
          .from("fee_invoices")
          .select("id, student_id, invoice_number, academic_year, billing_period, total_amount, paid_amount, due_date, status, created_at")
          .eq("school_id", profile.school_id)
          .order("created_at", { ascending: false }),
      ]);

      if (categoryError) throw categoryError;
      if (classError) throw classError;
      if (structureError) throw structureError;
      if (studentError) throw studentError;
      if (invoiceError) throw invoiceError;

      setCategories(categoryData || []);
      setClasses(classData || []);
      setStructures((structureData || []) as FeeStructure[]);
      setStudents((studentData || []) as Student[]);
      setInvoices((invoiceData || []) as Invoice[]);
    } catch (err: unknown) {
      console.error("Fee management loading error:", err);
      setError(
        err instanceof Error ? err.message : "Unable to load Fee Management."
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
      setError(err instanceof Error ? err.message : "Unable to create category.");
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
      setError(err instanceof Error ? err.message : "Unable to create fee structure.");
    } finally {
      setSavingStructure(false);
    }
  }

  const selectedPeriod =
    billingType === "Custom" ? customPeriod.trim() : billingType;

  const targetStudents = useMemo(() => {
    if (invoiceMode === "student") {
      return students.filter((student) => student.id === invoiceStudent);
    }
    if (!invoiceClass) return [];
    return students.filter((student) => student.class_id === invoiceClass);
  }, [students, invoiceMode, invoiceStudent, invoiceClass]);

  const invoicePreviews = useMemo(() => {
    return targetStudents.map((student) => {
      const applicable = structures.filter(
        (fee) =>
          fee.academic_year === invoiceYear &&
          (fee.class_id === null || fee.class_id === student.class_id)
      );

      const items: PreviewItem[] = applicable.map((fee) => ({
        category_id: fee.category_id,
        description:
          categories.find((category) => category.id === fee.category_id)
            ?.category_name || "Fee",
        amount: Number(fee.amount),
      }));

      const existing = invoices.some(
        (invoice) =>
          invoice.student_id === student.id &&
          invoice.academic_year === invoiceYear &&
          invoice.billing_period === selectedPeriod
      );

      return {
        student,
        items,
        total: items.reduce((sum, item) => sum + item.amount, 0),
        dueDate:
          invoiceDueDate ||
          applicable
            .map((fee) => fee.due_date)
            .filter((date): date is string => Boolean(date))
            .sort()[0] ||
          null,
        existing,
      };
    });
  }, [
    targetStudents,
    structures,
    categories,
    invoices,
    invoiceYear,
    selectedPeriod,
    invoiceDueDate,
  ]);

  const eligiblePreviews = invoicePreviews.filter(
    (preview) => preview.items.length > 0 && !preview.existing
  );

  const formatMoney = (value: number) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    }).format(value);

  async function generateInvoices() {
    if (!schoolId) return;

    if (!selectedPeriod) {
      setError("Enter a billing period.");
      return;
    }

    if (invoicePreviews.length === 0) {
      setError("Select a student or class first.");
      return;
    }

    if (eligiblePreviews.length === 0) {
      setError("No eligible invoices. Check fee structures or existing invoices.");
      return;
    }

    setGenerating(true);
    setError("");
    setSuccess("");

    let created = 0;
    let failed = 0;

    try {
      for (const preview of eligiblePreviews) {
        const invoiceNumber =
          `EDU-${new Date().getFullYear()}-${Date.now().toString().slice(-7)}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

        const { data: invoice, error: invoiceError } = await supabase
          .from("fee_invoices")
          .insert({
            school_id: schoolId,
            student_id: preview.student.id,
            invoice_number: invoiceNumber,
            academic_year: invoiceYear.trim(),
            billing_period: selectedPeriod,
            total_amount: preview.total,
            paid_amount: 0,
            due_date: preview.dueDate,
            status: "pending",
          })
          .select("id")
          .single();

        if (invoiceError || !invoice) {
          console.error("Invoice creation failed:", invoiceError);
          failed++;
          continue;
        }

        const itemRows = preview.items.map((item) => ({
          invoice_id: invoice.id,
          category_id: item.category_id,
          description: item.description,
          amount: item.amount,
        }));

        const { error: itemsError } = await supabase
          .from("fee_invoice_items")
          .insert(itemRows);

        if (itemsError) {
          console.error("Invoice items save failed:", itemsError);

          // Clean up the incomplete invoice if its items could not be saved.
          const { error: cleanupError } = await supabase
            .from("fee_invoices")
            .delete()
            .eq("id", invoice.id)
            .eq("school_id", schoolId);

          if (cleanupError) {
            console.error("Incomplete invoice cleanup failed:", cleanupError);
          }

          failed++;
          continue;
        }

        created++;
      }

      await loadData();

      if (created > 0) {
        setSuccess(
          `${created} invoice${created === 1 ? "" : "s"} generated successfully.` +
            (failed ? ` ${failed} could not be generated.` : "")
        );
        setShowInvoiceForm(false);
        setInvoiceStudent("");
        setInvoiceDueDate("");
      } else {
        setError(
          `No invoices were generated. ${failed} attempt(s) failed. Check the console and Supabase policies.`
        );
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Invoice generation failed.");
    } finally {
      setGenerating(false);
    }
  }

  async function openInvoice(invoice: Invoice) {
    setViewInvoice(invoice);
    setViewItems([]);
    setLoadingItems(true);

    const { data, error: itemsError } = await supabase
      .from("fee_invoice_items")
      .select("id, invoice_id, category_id, description, amount")
      .eq("invoice_id", invoice.id);

    if (itemsError) {
      setError(itemsError.message);
    } else {
      setViewItems((data || []) as InvoiceItem[]);
    }

    setLoadingItems(false);
  }

  const filteredStructures = structures.filter((item) => {
    const category = categories.find((c) => c.id === item.category_id);
    const schoolClass = classes.find((c) => c.id === item.class_id);
    const classLabel = schoolClass
      ? `${schoolClass.class_name} ${schoolClass.section || ""}`
      : "All classes";

    return [
      category?.category_name || "",
      classLabel,
      item.academic_year,
    ]
      .join(" ")
      .toLowerCase()
      .includes(search.toLowerCase());
  });

  const filteredInvoices = invoices.filter((invoice) => {
    const student = students.find((s) => s.id === invoice.student_id);
    const searchable = [
      invoice.invoice_number,
      invoice.academic_year,
      invoice.billing_period,
      student?.full_name || "",
      student?.admission_number || "",
    ]
      .join(" ")
      .toLowerCase();

    return (
      searchable.includes(search.toLowerCase()) &&
      (statusFilter === "all" || invoice.status === statusFilter)
    );
  });

  const totalConfigured = structures.reduce(
    (sum, item) => sum + Number(item.amount || 0),
    0
  );

  const totalInvoiced = invoices.reduce(
    (sum, invoice) => sum + Number(invoice.total_amount || 0),
    0
  );

  const totalOutstanding = invoices.reduce(
    (sum, invoice) =>
      sum +
      Math.max(
        0,
        Number(invoice.total_amount || 0) - Number(invoice.paid_amount || 0)
      ),
    0
  );

  const studentLabel = (studentId: string) => {
    const student = students.find((s) => s.id === studentId);
    if (!student) return "Unknown student";
    return `${student.full_name} (${student.admission_number})`;
  };

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
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-700 via-teal-700 to-cyan-800 p-6 text-white shadow-xl sm:p-8">
        <div className="pointer-events-none absolute -right-10 -top-20 h-64 w-64 rounded-full bg-white/10 blur-2xl" />
        <div className="relative flex flex-col justify-between gap-6 md:flex-row md:items-center">
          <div>
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-emerald-100">
              <Wallet size={17} /> SCHOOL FINANCE
            </div>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Fee Management
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-emerald-50/90">
              Manage fee categories, class-wise structures and student invoices.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => {
                setError("");
                setSuccess("");
                setShowCategoryForm(true);
              }}
              className="inline-flex items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-4 py-3 text-sm font-semibold hover:bg-white/20"
            >
              <Tag size={17} /> Add Category
            </button>
            <button
              onClick={() => {
                setError("");
                setSuccess("");
                setShowStructureForm(true);
              }}
              disabled={categories.length === 0}
              className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-bold text-emerald-800 shadow-lg hover:bg-emerald-50 disabled:opacity-50"
            >
              <Plus size={18} /> Create Fee Structure
            </button>
            <button
              onClick={() => {
                setError("");
                setSuccess("");
                setShowInvoiceForm(true);
              }}
              disabled={students.length === 0 || structures.length === 0}
              className="inline-flex items-center gap-2 rounded-xl bg-amber-300 px-4 py-3 text-sm font-bold text-amber-950 shadow-lg hover:bg-amber-200 disabled:opacity-50"
            >
              <Receipt size={18} /> Generate Invoices
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle className="mt-0.5 shrink-0" size={18} />
          <span className="min-w-0 flex-1">{error}</span>
          <button onClick={() => setError("")}><X size={17} /></button>
        </div>
      )}

      {success && (
        <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-800">
          <CheckCircle2 size={18} />
          <span className="flex-1">{success}</span>
          <button onClick={() => setSuccess("")}><X size={17} /></button>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard icon={<Tag size={21} />} label="Fee Categories" value={String(categories.length)} color="emerald" />
        <SummaryCard icon={<Layers size={21} />} label="Fee Structures" value={String(structures.length)} color="blue" />
        <SummaryCard icon={<FileText size={21} />} label="Invoices Generated" value={String(invoices.length)} color="violet" />
        <SummaryCard icon={<IndianRupee size={21} />} label="Outstanding Balance" value={formatMoney(totalOutstanding)} color="amber" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Total configured fee amount</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">{formatMoney(totalConfigured)}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Total invoiced amount</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">{formatMoney(totalInvoiced)}</p>
        </div>
      </div>

      {/* Fee categories */}
      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-5 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Fee Categories</h2>
            <p className="mt-1 text-sm text-slate-500">Fee types configured for your school.</p>
          </div>
          <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
            {categories.length} categories
          </span>
        </div>

        {categories.length === 0 ? (
          <EmptyState icon={<Tag size={25} />} title="No fee categories yet" description="Create categories such as Tuition Fee or Transport Fee." />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {categories.map((category) => (
              <div key={category.id} className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
                <div className="rounded-xl bg-emerald-100 p-2.5 text-emerald-700"><Tag size={19} /></div>
                <div className="min-w-0">
                  <p className="font-semibold text-slate-800">{category.category_name}</p>
                  <p className="mt-1 text-sm text-slate-500">{category.description || "No description added"}</p>
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
            <h2 className="text-lg font-bold text-slate-900">Class-wise Fee Structures</h2>
            <p className="mt-1 text-sm text-slate-500">Fees used to calculate student invoices.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <div className="relative min-w-[190px] flex-1">
              <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search fee structures or invoices..." className={`${inputClass} pl-9`} />
            </div>
            <button onClick={loadData} className="rounded-xl border border-slate-200 p-2.5 text-slate-600 hover:bg-slate-50" title="Refresh">
              <RefreshCw size={18} />
            </button>
          </div>
        </div>

        {filteredStructures.length === 0 ? (
          <EmptyState icon={<BookOpen size={25} />} title="No matching fee structures" description="Create a fee structure to assign an amount to a class and fee category." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left">
              <thead>
                <tr className="border-b border-slate-100 text-xs uppercase tracking-wider text-slate-400">
                  <th className="px-4 py-3">Fee Category</th>
                  <th className="px-4 py-3">Class / Section</th>
                  <th className="px-4 py-3">Academic Year</th>
                  <th className="px-4 py-3">Due Date</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {filteredStructures.map((item) => {
                  const category = categories.find((c) => c.id === item.category_id);
                  const schoolClass = classes.find((c) => c.id === item.class_id);
                  return (
                    <tr key={item.id} className="border-b border-slate-50 hover:bg-slate-50/80">
                      <td className="px-4 py-4 font-semibold text-slate-800">{category?.category_name || "Unknown category"}</td>
                      <td className="px-4 py-4 text-sm text-slate-600">{schoolClass ? `${schoolClass.class_name}${schoolClass.section ? ` - ${schoolClass.section}` : ""}` : "All classes"}</td>
                      <td className="px-4 py-4 text-sm text-slate-600">{item.academic_year}</td>
                      <td className="px-4 py-4 text-sm text-slate-600">{item.due_date ? new Date(`${item.due_date}T00:00:00`).toLocaleDateString("en-IN") : "Not set"}</td>
                      <td className="px-4 py-4 text-right font-bold text-slate-900">{formatMoney(Number(item.amount))}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Invoice management */}
      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-5 flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900"><Receipt size={20} className="text-emerald-600" /> Student Invoices</h2>
            <p className="mt-1 text-sm text-slate-500">Search, filter, view and print generated invoices.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <div className="relative min-w-[190px] flex-1">
              <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search student or invoice..." className={`${inputClass} pl-9`} />
            </div>
            <div className="relative">
              <Filter size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={`${inputClass} min-w-[145px] pl-9`}>
                <option value="all">All statuses</option>
                <option value="pending">Pending</option>
                <option value="partially_paid">Partially paid</option>
                <option value="paid">Paid</option>
                <option value="overdue">Overdue</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>
        </div>

        {filteredInvoices.length === 0 ? (
          <EmptyState icon={<Receipt size={25} />} title="No invoices found" description="Generate an invoice for a student or an entire class to see it here." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] text-left">
              <thead>
                <tr className="border-b border-slate-100 text-xs uppercase tracking-wider text-slate-400">
                  <th className="px-4 py-3">Invoice</th>
                  <th className="px-4 py-3">Student</th>
                  <th className="px-4 py-3">Billing Period</th>
                  <th className="px-4 py-3">Due Date</th>
                  <th className="px-4 py-3 text-right">Total</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredInvoices.map((invoice) => (
                  <tr key={invoice.id} className="border-b border-slate-50 hover:bg-slate-50/80">
                    <td className="px-4 py-4">
                      <p className="font-bold text-slate-800">{invoice.invoice_number}</p>
                      <p className="text-xs text-slate-400">{invoice.academic_year}</p>
                    </td>
                    <td className="px-4 py-4 text-sm text-slate-700">{studentLabel(invoice.student_id)}</td>
                    <td className="px-4 py-4 text-sm text-slate-600">{invoice.billing_period}</td>
                    <td className="px-4 py-4 text-sm text-slate-600">{invoice.due_date ? new Date(`${invoice.due_date}T00:00:00`).toLocaleDateString("en-IN") : "Not set"}</td>
                    <td className="px-4 py-4 text-right font-bold text-slate-900">{formatMoney(Number(invoice.total_amount))}</td>
                    <td className="px-4 py-4"><StatusBadge status={invoice.status} /></td>
                    <td className="px-4 py-4 text-right">
                      <button onClick={() => openInvoice(invoice)} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-emerald-50 hover:text-emerald-700">
                        <Eye size={15} /> View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Category modal */}
      {showCategoryForm && (
        <Modal title="Add Fee Category" subtitle="Create a new fee type for your school." onClose={() => setShowCategoryForm(false)}>
          <form onSubmit={addCategory} className="space-y-4">
            <FormField label="Category Name">
              <input required value={categoryName} onChange={(e) => setCategoryName(e.target.value)} placeholder="e.g. Tuition Fee" className={inputClass} />
            </FormField>
            <FormField label="Description (optional)">
              <textarea value={categoryDescription} onChange={(e) => setCategoryDescription(e.target.value)} rows={3} placeholder="Brief description" className={inputClass} />
            </FormField>
            <ModalActions onCancel={() => setShowCategoryForm(false)} saving={savingCategory} label="Create Category" />
          </form>
        </Modal>
      )}

      {/* Fee structure modal */}
      {showStructureForm && (
        <Modal title="Create Fee Structure" subtitle="Set the fee amount for a class and academic year." onClose={() => setShowStructureForm(false)}>
          <form onSubmit={addStructure} className="space-y-4">
            <FormField label="Fee Category">
              <select required value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} className={inputClass}>
                <option value="">Select fee category</option>
                {categories.map((category) => <option key={category.id} value={category.id}>{category.category_name}</option>)}
              </select>
            </FormField>
            <FormField label="Class">
              <select value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)} className={inputClass}>
                <option value="">All classes</option>
                {classes.map((item) => <option key={item.id} value={item.id}>{item.class_name}{item.section ? ` - ${item.section}` : ""}</option>)}
              </select>
              <p className="mt-1 text-xs text-slate-500">All classes applies this fee to every class.</p>
            </FormField>
            <FormField label="Fee Amount (INR)">
              <input required type="number" min="0.01" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Enter amount" className={inputClass} />
            </FormField>
            <FormField label="Academic Year">
              <input required value={academicYear} onChange={(e) => setAcademicYear(e.target.value)} placeholder="e.g. 2026-2027" className={inputClass} />
            </FormField>
            <FormField label="Due Date (optional)">
              <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className={inputClass} />
            </FormField>
            <ModalActions onCancel={() => setShowStructureForm(false)} saving={savingStructure} label="Save Fee Structure" />
          </form>
        </Modal>
      )}

      {/* Invoice generator modal */}
      {showInvoiceForm && (
        <Modal title="Generate Student Invoices" subtitle="Create annual, term-wise or custom invoices." onClose={() => !generating && setShowInvoiceForm(false)} wide>
          <div className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Academic Year">
                <input value={invoiceYear} onChange={(e) => setInvoiceYear(e.target.value)} placeholder="2026-2027" className={inputClass} />
              </FormField>
              <FormField label="Billing Period">
                <select value={billingType} onChange={(e) => setBillingType(e.target.value)} className={inputClass}>
                  <option value="Annual">Annual</option>
                  <option value="Term 1">Term 1</option>
                  <option value="Term 2">Term 2</option>
                  <option value="Term 3">Term 3</option>
                  <option value="Custom">Custom period</option>
                </select>
              </FormField>
            </div>

            {billingType === "Custom" && (
              <FormField label="Custom Billing Period">
                <input value={customPeriod} onChange={(e) => setCustomPeriod(e.target.value)} placeholder="e.g. Quarterly 1 or Transport - June" className={inputClass} />
              </FormField>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Invoice For">
                <select value={invoiceMode} onChange={(e) => { setInvoiceMode(e.target.value); setInvoiceStudent(""); setInvoiceClass(""); }} className={inputClass}>
                  <option value="class">Entire class / section</option>
                  <option value="student">Individual student</option>
                </select>
              </FormField>
              <FormField label="Invoice Due Date (optional)">
                <input type="date" value={invoiceDueDate} onChange={(e) => setInvoiceDueDate(e.target.value)} className={inputClass} />
              </FormField>
            </div>

            {invoiceMode === "class" ? (
              <FormField label="Select Class / Section">
                <select value={invoiceClass} onChange={(e) => setInvoiceClass(e.target.value)} className={inputClass}>
                  <option value="">Choose a class</option>
                  {classes.map((item) => <option key={item.id} value={item.id}>{item.class_name}{item.section ? ` - ${item.section}` : ""}</option>)}
                </select>
              </FormField>
            ) : (
              <FormField label="Select Student">
                <select value={invoiceStudent} onChange={(e) => setInvoiceStudent(e.target.value)} className={inputClass}>
                  <option value="">Choose a student</option>
                  {students.map((student) => <option key={student.id} value={student.id}>{student.full_name} — {student.admission_number}</option>)}
                </select>
              </FormField>
            )}

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="font-bold text-slate-900">Invoice Preview</h3>
                  <p className="text-xs text-slate-500">Applicable class fees plus school-wide fees for {invoiceYear || "selected year"}.</p>
                </div>
                <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-600">{invoicePreviews.length} students</span>
              </div>

              {invoicePreviews.length === 0 ? (
                <p className="py-6 text-center text-sm text-slate-500">Select a class or student to preview invoices.</p>
              ) : (
                <div className="mt-4 space-y-3">
                  {invoicePreviews.map((preview) => (
                    <div key={preview.student.id} className="rounded-xl border border-slate-200 bg-white p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="font-semibold text-slate-800">{preview.student.full_name}</p>
                          <p className="text-xs text-slate-500">{preview.student.admission_number}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-slate-900">{formatMoney(preview.total)}</p>
                          {preview.existing ? (
                            <p className="text-xs font-semibold text-amber-700">Already invoiced</p>
                          ) : preview.items.length === 0 ? (
                            <p className="text-xs font-semibold text-red-600">No applicable fees</p>
                          ) : (
                            <p className="text-xs font-semibold text-emerald-700">Ready to generate</p>
                          )}
                        </div>
                      </div>
                      {preview.items.length > 0 && (
                        <div className="mt-2 space-y-1 border-t border-slate-100 pt-2">
                          {preview.items.map((item, index) => (
                            <div key={`${item.category_id}-${index}`} className="flex justify-between gap-3 text-xs text-slate-500">
                              <span>{item.description}</span>
                              <span>{formatMoney(item.amount)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-4 flex flex-wrap justify-between gap-2 border-t border-slate-200 pt-3 text-sm">
                <span className="font-semibold text-slate-600">Eligible invoices: {eligiblePreviews.length}</span>
                <span className="font-bold text-slate-900">Total: {formatMoney(eligiblePreviews.reduce((sum, item) => sum + item.total, 0))}</span>
              </div>
            </div>

            <div className="flex flex-wrap justify-end gap-3">
              <button type="button" disabled={generating} onClick={() => setShowInvoiceForm(false)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50">Cancel</button>
              <button
                type="button"
                disabled={generating || eligiblePreviews.length === 0 || !invoiceYear.trim() || !selectedPeriod}
                onClick={generateInvoices}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {generating ? <Loader2 size={16} className="animate-spin" /> : <Receipt size={16} />}
                {generating ? "Generating..." : `Generate ${eligiblePreviews.length} Invoice(s)`}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Invoice details / print */}
      {viewInvoice && (
        <Modal title="Invoice Details" subtitle={viewInvoice.invoice_number} onClose={() => setViewInvoice(null)} wide>
          <div className="print-invoice space-y-5">
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-emerald-700">EduTrack AI · Fee Invoice</p>
                <h3 className="mt-1 text-xl font-bold text-slate-900">{viewInvoice.invoice_number}</h3>
                <p className="mt-1 text-sm text-slate-500">{viewInvoice.academic_year} · {viewInvoice.billing_period}</p>
              </div>
              <StatusBadge status={viewInvoice.status} />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs text-slate-500">Student</p>
                <p className="mt-1 font-bold text-slate-900">{studentLabel(viewInvoice.student_id)}</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs text-slate-500">Due Date</p>
                <p className="mt-1 font-bold text-slate-900">{viewInvoice.due_date ? new Date(`${viewInvoice.due_date}T00:00:00`).toLocaleDateString("en-IN") : "Not set"}</p>
              </div>
            </div>

            <div>
              <h4 className="mb-3 font-bold text-slate-800">Fee Breakdown</h4>
              {loadingItems ? (
                <div className="flex justify-center py-6"><Loader2 className="animate-spin text-emerald-600" /></div>
              ) : viewItems.length === 0 ? (
                <p className="text-sm text-slate-500">No invoice items found.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead><tr className="border-b text-xs uppercase text-slate-400"><th className="py-2">Description</th><th className="py-2 text-right">Amount</th></tr></thead>
                    <tbody>
                      {viewItems.map((item) => (
                        <tr key={item.id} className="border-b border-slate-100">
                          <td className="py-3 text-sm text-slate-700">{item.description}</td>
                          <td className="py-3 text-right text-sm font-semibold text-slate-800">{formatMoney(Number(item.amount))}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="ml-auto max-w-sm space-y-2 rounded-xl bg-slate-50 p-4">
              <div className="flex justify-between text-sm text-slate-600"><span>Total Amount</span><span className="font-bold">{formatMoney(Number(viewInvoice.total_amount))}</span></div>
              <div className="flex justify-between text-sm text-slate-600"><span>Paid Amount</span><span className="font-semibold">{formatMoney(Number(viewInvoice.paid_amount))}</span></div>
              <div className="flex justify-between border-t border-slate-200 pt-2 text-base font-bold text-slate-900"><span>Balance Due</span><span>{formatMoney(Math.max(0, Number(viewInvoice.total_amount) - Number(viewInvoice.paid_amount)))}</span></div>
            </div>
          </div>
          <div className="mt-5 flex justify-end gap-3 border-t border-slate-100 pt-4">
            <button onClick={() => setViewInvoice(null)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">Close</button>
            <button onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-emerald-700"><Printer size={16} /> Print Invoice</button>
          </div>
        </Modal>
      )}

      <style jsx global>{`
        @media print {
          body * { visibility: hidden !important; }
          .print-invoice, .print-invoice * { visibility: visible !important; }
          .print-invoice {
            position: absolute !important;
            inset: 0 !important;
            width: 100% !important;
            padding: 24px !important;
            background: white !important;
          }
        }
      `}</style>
    </div>
  );
}

function SummaryCard({
  icon, label, value, color,
}: {
  icon: ReactNode;
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
      <div className="mt-4 break-words text-2xl font-bold tracking-tight text-slate-900">{value}</div>
    </div>
  );
}

function EmptyState({
  icon, title, description,
}: {
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 px-5 py-12 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">{icon}</div>
      <h3 className="mt-4 font-bold text-slate-800">{title}</h3>
      <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">{description}</p>
    </div>
  );
}

function Modal({
  title, subtitle, onClose, children, wide = false,
}: {
  title: string;
  subtitle: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/50 p-4 backdrop-blur-sm">
      <div className={`my-8 w-full ${wide ? "max-w-3xl" : "max-w-lg"} overflow-hidden rounded-3xl bg-white shadow-2xl`}>
        <div className="flex items-start justify-between border-b border-slate-100 p-5 sm:p-6">
          <div>
            <h2 className="text-xl font-bold text-slate-900">{title}</h2>
            <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
          </div>
          <button onClick={onClose} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Close"><X size={20} /></button>
        </div>
        <div className="max-h-[75vh] overflow-y-auto p-5 sm:p-6">{children}</div>
      </div>
    </div>
  );
}

function FormField({ label, children }: { label: string; children: ReactNode }) {
  return <div><label className="mb-2 block text-sm font-semibold text-slate-700">{label}</label>{children}</div>;
}

function ModalActions({
  onCancel, saving, label,
}: {
  onCancel: () => void;
  saving: boolean;
  label: string;
}) {
  return (
    <div className="flex justify-end gap-3 pt-2">
      <button type="button" onClick={onCancel} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancel</button>
      <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-60">
        {saving && <Loader2 size={16} className="animate-spin" />}{label}
      </button>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending: "bg-amber-50 text-amber-700",
    partially_paid: "bg-blue-50 text-blue-700",
    paid: "bg-emerald-50 text-emerald-700",
    overdue: "bg-red-50 text-red-700",
    cancelled: "bg-slate-100 text-slate-600",
  };

  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold capitalize ${styles[status] || "bg-slate-100 text-slate-600"}`}>
      {status.replaceAll("_", " ")}
    </span>
  );
}
