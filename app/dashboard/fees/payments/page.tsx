
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Wallet,
  IndianRupee,
  Receipt,
  TrendingUp,
  Search,
  RefreshCw,
  Loader2,
  CheckCircle2,
  AlertCircle,
  CreditCard,
  CalendarDays,
  ArrowUpRight,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

type Payment = {
  id: string;
  school_id: string;
  invoice_id: string;
  student_id: string;
  amount: number;
  payment_method: string | null;
  transaction_reference: string | null;
  status: string;
  paid_at: string | null;
  created_at: string;
  receipt_number: string | null;
  notes: string | null;
};

type Invoice = {
  id: string;
  invoice_number: string;
  total_amount: number;
  paid_amount: number;
  status: string;
};

type Student = {
  id: string;
  full_name: string;
  admission_number: string;
};

const money = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value || 0);

const dateLabel = (value: string | null) => {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [methodFilter, setMethodFilter] = useState("all");

  const loadData = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true);
    else setLoading(true);

    setError("");

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        throw new Error("Please log in to access Payment Management.");
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
        throw new Error("You do not have permission to access Payments.");
      }

      const schoolId = profile.school_id;

      const [
        { data: paymentData, error: paymentError },
        { data: invoiceData, error: invoiceError },
        { data: studentData, error: studentError },
      ] = await Promise.all([
        supabase
          .from("fee_payments")
          .select(
            "id, school_id, invoice_id, student_id, amount, payment_method, transaction_reference, status, paid_at, created_at, receipt_number, notes"
          )
          .eq("school_id", schoolId)
          .eq("status", "completed")
          .order("paid_at", { ascending: false }),

        supabase
          .from("fee_invoices")
          .select("id, invoice_number, total_amount, paid_amount, status")
          .eq("school_id", schoolId),

        supabase
          .from("students")
          .select("id, full_name, admission_number")
          .eq("school_id", schoolId),
      ]);

      if (paymentError) throw paymentError;
      if (invoiceError) throw invoiceError;
      if (studentError) throw studentError;

      setPayments((paymentData || []) as Payment[]);
      setInvoices((invoiceData || []) as Invoice[]);
      setStudents((studentData || []) as Student[]);
    } catch (err: unknown) {
      console.error("Payment management loading error:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load payment information."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const invoiceMap = useMemo(
    () => new Map(invoices.map((invoice) => [invoice.id, invoice])),
    [invoices]
  );

  const studentMap = useMemo(
    () => new Map(students.map((student) => [student.id, student])),
    [students]
  );

  const totalCollected = payments.reduce(
    (sum, payment) => sum + Number(payment.amount || 0),
    0
  );

  const totalOutstanding = invoices.reduce(
    (sum, invoice) =>
      sum +
      Math.max(
        0,
        Number(invoice.total_amount || 0) -
          Number(invoice.paid_amount || 0)
      ),
    0
  );

  const paypalCollected = payments
    .filter(
      (payment) =>
        payment.payment_method?.toLowerCase() === "paypal"
    )
    .reduce((sum, payment) => sum + Number(payment.amount || 0), 0);

  const filteredPayments = payments.filter((payment) => {
    const student = studentMap.get(payment.student_id);
    const invoice = invoiceMap.get(payment.invoice_id);

    const searchable = [
      student?.full_name || "",
      student?.admission_number || "",
      invoice?.invoice_number || "",
      payment.receipt_number || "",
      payment.transaction_reference || "",
      payment.payment_method || "",
    ]
      .join(" ")
      .toLowerCase();

    const matchesSearch = searchable.includes(search.toLowerCase());

    const matchesMethod =
      methodFilter === "all" ||
      payment.payment_method?.toLowerCase() === methodFilter;

    return matchesSearch && matchesMethod;
  });

  const monthlyCollections = useMemo(() => {
    const months: {
      key: string;
      label: string;
      amount: number;
    }[] = [];

    const now = new Date();

    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${date.getFullYear()}-${String(
        date.getMonth() + 1
      ).padStart(2, "0")}`;

      months.push({
        key,
        label: date.toLocaleDateString("en-IN", {
          month: "short",
          year: "2-digit",
        }),
        amount: 0,
      });
    }

    for (const payment of payments) {
      const date = new Date(payment.paid_at || payment.created_at);
      if (Number.isNaN(date.getTime())) continue;

      const key = `${date.getFullYear()}-${String(
        date.getMonth() + 1
      ).padStart(2, "0")}`;

      const month = months.find((item) => item.key === key);
      if (month) month.amount += Number(payment.amount || 0);
    }

    return months;
  }, [payments]);

  const maxMonthlyAmount = Math.max(
    ...monthlyCollections.map((item) => item.amount),
    1
  );

  const todayCollected = payments.reduce((sum, payment) => {
    const date = new Date(payment.paid_at || payment.created_at);
    const now = new Date();

    const isToday =
      date.getDate() === now.getDate() &&
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear();

    return isToday ? sum + Number(payment.amount || 0) : sum;
  }, 0);

  const averagePayment =
    payments.length > 0 ? totalCollected / payments.length : 0;

  if (loading) {
    return (
      <div className="flex min-h-[65vh] items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto h-10 w-10 animate-spin text-emerald-600" />
          <p className="mt-4 text-sm font-medium text-slate-500">
            Loading Payment Intelligence...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen space-y-7 bg-slate-50/70 p-4 sm:p-6 lg:p-8">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-700 via-teal-700 to-cyan-800 p-6 text-white shadow-xl sm:p-8">
        <div className="pointer-events-none absolute -right-10 -top-20 h-64 w-64 rounded-full bg-white/10 blur-2xl" />

        <div className="relative flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
          <div>
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-emerald-100">
              <Wallet size={17} />
              SCHOOL FINANCE
            </div>

            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Payment Management
            </h1>

            <p className="mt-2 max-w-xl text-sm leading-6 text-emerald-50/90">
              Track verified collections, PayPal transactions, receipts and
              outstanding student fees.
            </p>
          </div>

          <button
            onClick={() => void loadData(true)}
            disabled={refreshing}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-bold text-emerald-800 shadow-lg transition hover:bg-emerald-50 disabled:opacity-60"
          >
            <RefreshCw
              size={17}
              className={refreshing ? "animate-spin" : ""}
            />
            Refresh Payments
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle size={18} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          icon={<IndianRupee size={21} />}
          label="Total Successful Collections"
          value={money(totalCollected)}
          color="emerald"
        />
        <SummaryCard
          icon={<CreditCard size={21} />}
          label="PayPal Collections"
          value={money(paypalCollected)}
          color="blue"
        />
        <SummaryCard
          icon={<AlertCircle size={21} />}
          label="Outstanding Fees"
          value={money(totalOutstanding)}
          color="amber"
        />
        <SummaryCard
          icon={<Receipt size={21} />}
          label="Successful Transactions"
          value={String(payments.length)}
          color="violet"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-500">
              Today's Collections
            </p>
            <div className="rounded-xl bg-emerald-50 p-2.5 text-emerald-700">
              <CalendarDays size={20} />
            </div>
          </div>
          <p className="mt-3 text-2xl font-bold text-slate-900">
            {money(todayCollected)}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Based on successful payments recorded today
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-500">
              Average Payment
            </p>
            <div className="rounded-xl bg-blue-50 p-2.5 text-blue-700">
              <TrendingUp size={20} />
            </div>
          </div>
          <p className="mt-3 text-2xl font-bold text-slate-900">
            {money(averagePayment)}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Average amount per successful transaction
          </p>
        </div>
      </div>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-6">
          <div className="flex items-center gap-2">
            <TrendingUp size={20} className="text-emerald-600" />
            <h2 className="text-lg font-bold text-slate-900">
              Monthly Collection Trends
            </h2>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Successful payment collections over the last six months.
          </p>
        </div>

        <div className="space-y-5">
          {monthlyCollections.map((month) => (
            <div key={month.key}>
              <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                <span className="font-semibold text-slate-700">
                  {month.label}
                </span>
                <span className="font-bold text-slate-900">
                  {money(month.amount)}
                </span>
              </div>

              <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-700"
                  style={{
                    width: `${(month.amount / maxMonthlyAmount) * 100}%`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-5 flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
              <Receipt size={20} className="text-emerald-600" />
              Successful Payment History
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Verified completed payments and their receipt references.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <div className="relative min-w-[190px] flex-1">
              <Search
                size={17}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search student, receipt..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm text-slate-800 outline-none focus:border-emerald-400 focus:bg-white focus:ring-4 focus:ring-emerald-100"
              />
            </div>

            <select
              value={methodFilter}
              onChange={(event) => setMethodFilter(event.target.value)}
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-emerald-400"
            >
              <option value="all">All methods</option>
              <option value="paypal">PayPal</option>
            </select>
          </div>
        </div>

        {filteredPayments.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 px-5 py-12 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
              <Receipt size={25} />
            </div>
            <h3 className="mt-4 font-bold text-slate-800">
              No successful payments found
            </h3>
            <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">
              Completed payments will appear here after they are successfully
              recorded in the school's payment ledger.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[950px] text-left">
              <thead>
                <tr className="border-b border-slate-100 text-xs uppercase tracking-wider text-slate-400">
                  <th className="px-4 py-3">Receipt</th>
                  <th className="px-4 py-3">Student</th>
                  <th className="px-4 py-3">Invoice</th>
                  <th className="px-4 py-3">Payment Method</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>

              <tbody>
                {filteredPayments.map((payment) => {
                  const student = studentMap.get(payment.student_id);
                  const invoice = invoiceMap.get(payment.invoice_id);

                  return (
                    <tr
                      key={payment.id}
                      className="border-b border-slate-50 transition hover:bg-slate-50/80"
                    >
                      <td className="px-4 py-4">
                        <p className="font-bold text-slate-800">
                          {payment.receipt_number || "Receipt pending"}
                        </p>
                        <p className="mt-1 max-w-[180px] truncate text-xs text-slate-400">
                          {payment.transaction_reference || "No transaction ID"}
                        </p>
                      </td>

                      <td className="px-4 py-4">
                        <p className="font-semibold text-slate-800">
                          {student?.full_name || "Unknown student"}
                        </p>
                        <p className="text-xs text-slate-400">
                          {student?.admission_number || "—"}
                        </p>
                      </td>

                      <td className="px-4 py-4 text-sm text-slate-600">
                        {invoice?.invoice_number || "—"}
                      </td>

                      <td className="px-4 py-4">
                        <span className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 px-2.5 py-1.5 text-xs font-bold capitalize text-blue-700">
                          <CreditCard size={13} />
                          {payment.payment_method || "Other"}
                        </span>
                      </td>

                      <td className="px-4 py-4 text-sm text-slate-600">
                        {dateLabel(payment.paid_at || payment.created_at)}
                      </td>

                      <td className="px-4 py-4 text-right font-bold text-emerald-700">
                        {money(Number(payment.amount))}
                      </td>

                      <td className="px-4 py-4">
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">
                          <CheckCircle2 size={13} />
                          Successful
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-4 text-sm">
          <span className="text-slate-500">
            Showing {filteredPayments.length} of {payments.length} successful
            transactions
          </span>
          <span className="font-bold text-slate-900">
            Filtered total:{" "}
            {money(
              filteredPayments.reduce(
                (sum, payment) => sum + Number(payment.amount || 0),
                0
              )
            )}
          </span>
        </div>
      </section>

      <div className="flex items-start gap-3 rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-800">
        <ArrowUpRight size={18} className="mt-0.5 shrink-0" />
        <p>
          <strong>Payment accounting:</strong> This dashboard uses completed
          fee payment records as its collection source. Uncaptured PayPal
          orders are not treated as revenue, and PayPal captures are not added
          separately on top of their corresponding fee payment records.
        </p>
      </div>
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
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-slate-500">{label}</p>
        <div className={`rounded-xl p-2.5 ${styles[color]}`}>{icon}</div>
      </div>
      <p className="mt-4 break-words text-2xl font-bold tracking-tight text-slate-900">
        {value}
      </p>
    </div>
  );
}
