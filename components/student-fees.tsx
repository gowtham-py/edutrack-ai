
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  Wallet,
  CreditCard,
  RefreshCw,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Receipt,
} from "lucide-react";

type FeeInvoice = {
  id: string;
  invoice_number: string;
  academic_year: string;
  billing_period: string;
  total_amount: number;
  paid_amount: number;
  due_date: string | null;
  status: string;
};

const money = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value || 0);

export default function StudentFees() {
  const [invoices, setInvoices] = useState<FeeInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [payingId, setPayingId] = useState<string | null>(null);
  const [paymentAmounts, setPaymentAmounts] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error" | "info">("info");
  const captureStarted = useRef(false);

  const loadInvoices = useCallback(async (studentId: string) => {
    const { data, error } = await supabase
      .from("fee_invoices")
      .select(
        "id, invoice_number, academic_year, billing_period, total_amount, paid_amount, due_date, status"
      )
      .eq("student_id", studentId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    const rows = (data ?? []) as FeeInvoice[];
    setInvoices(rows);

    setPaymentAmounts((previous) => {
      const next = { ...previous };

      rows.forEach((invoice) => {
        const outstanding = Math.max(
          0,
          Number(invoice.total_amount) - Number(invoice.paid_amount)
        );

        if (!(invoice.id in next)) {
          next[invoice.id] = outstanding.toFixed(2);
        }
      });

      return next;
    });
  }, []);

  useEffect(() => {
    async function initialize() {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const session = sessionData.session;

        if (!session) {
          setMessage("Please log in again to view your fees.");
          setMessageType("error");
          return;
        }

        const { data: account, error: accountError } = await supabase
          .from("student_accounts")
          .select("student_id")
          .maybeSingle();

        if (accountError) throw accountError;

        if (!account?.student_id) {
          setMessage("Student account could not be found.");
          setMessageType("error");
          return;
        }

        await loadInvoices(account.student_id);

        const params = new URLSearchParams(window.location.search);
        const paypalStatus = params.get("paypal");
        const orderId = params.get("token");

        if (paypalStatus === "cancel") {
          setMessage("Payment was cancelled. Your invoice has not been changed.");
          setMessageType("info");
          window.history.replaceState({}, "", window.location.pathname);
        }

        if (paypalStatus === "success" && orderId && !captureStarted.current) {
          captureStarted.current = true;
          setMessage("Verifying your PayPal payment...");
          setMessageType("info");

          const response = await fetch("/api/paypal/capture-order", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({ orderId }),
          });

          const result = await response.json();

          if (!response.ok) {
            throw new Error(result.error || "Payment verification failed.");
          }

          setMessage(
            `Payment successful! Receipt: ${result.receiptNumber || "Generated"}`
          );
          setMessageType("success");

          await loadInvoices(account.student_id);
          window.history.replaceState({}, "", window.location.pathname);
        }
      } catch (error) {
        setMessage(
          error instanceof Error
            ? error.message
            : "Could not load fee information."
        );
        setMessageType("error");
      } finally {
        setLoading(false);
      }
    }

    initialize();
  }, [loadInvoices]);

  async function handlePay(invoice: FeeInvoice) {
    try {
      const total = Number(invoice.total_amount);
      const paid = Number(invoice.paid_amount);
      const outstanding = Math.max(0, total - paid);
      const paymentAmount = Number(paymentAmounts[invoice.id]);

      if (
        !Number.isFinite(paymentAmount) ||
        paymentAmount <= 0 ||
        paymentAmount > outstanding
      ) {
        throw new Error(
          `Enter an amount greater than ₹0 and no more than ${money(outstanding)}.`
        );
      }

      setPayingId(invoice.id);
      setMessage("");

      const { data } = await supabase.auth.getSession();
      const session = data.session;

      if (!session) throw new Error("Please log in again.");

      const response = await fetch("/api/paypal/create-order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          invoiceId: invoice.id,
          paymentAmount,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Could not start PayPal checkout.");
      }

      if (!result.approvalUrl) {
        throw new Error("PayPal approval link was not returned. Please try again.");
      }

      window.location.href = result.approvalUrl;
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Unable to start payment."
      );
      setMessageType("error");
      setPayingId(null);
    }
  }

  const outstandingTotal = invoices.reduce(
    (sum, invoice) =>
      sum + Math.max(0, Number(invoice.total_amount) - Number(invoice.paid_amount)),
    0
  );

  return (
    <section className="mt-8 space-y-6">
      <div className="overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 p-6 text-white shadow-lg">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-white/80">My Fees</p>
            <h2 className="mt-2 text-3xl font-bold">{money(outstandingTotal)}</h2>
            <p className="mt-1 text-sm text-white/80">Total outstanding balance</p>
          </div>
          <div className="rounded-2xl bg-white/15 p-4">
            <Wallet size={32} />
          </div>
        </div>
      </div>

      {message && (
        <div
          className={`flex items-start gap-3 rounded-2xl border p-4 text-sm ${
            messageType === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : messageType === "error"
              ? "border-red-200 bg-red-50 text-red-700"
              : "border-blue-200 bg-blue-50 text-blue-800"
          }`}
        >
          {messageType === "success" ? (
            <CheckCircle2 size={19} />
          ) : (
            <AlertCircle size={19} />
          )}
          <span>{message}</span>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold text-gray-900">Fee invoices</h3>
          <p className="mt-1 text-sm text-gray-500">
            Pay the full balance or choose a partial payment.
          </p>
        </div>
        <button
          onClick={() => window.location.reload()}
          className="rounded-xl border border-gray-200 p-3 text-gray-600 hover:bg-gray-50"
          title="Refresh"
        >
          <RefreshCw size={18} />
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center rounded-2xl border border-gray-100 p-10">
          <Loader2 className="animate-spin text-emerald-600" size={28} />
        </div>
      ) : invoices.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 p-10 text-center">
          <Receipt className="mx-auto text-gray-400" size={36} />
          <p className="mt-3 font-semibold text-gray-700">No fee invoices yet</p>
          <p className="mt-1 text-sm text-gray-500">
            Your invoices will appear here when the school creates them.
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {invoices.map((invoice) => {
            const total = Number(invoice.total_amount);
            const paid = Number(invoice.paid_amount);
            const outstanding = Math.max(0, total - paid);
            const isCancelled = invoice.status === "cancelled";
            const isPaid = outstanding <= 0 || invoice.status === "paid";

            return (
              <div
                key={invoice.id}
                className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:shadow-md"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                      Invoice
                    </p>
                    <h4 className="mt-1 text-lg font-bold text-gray-900">
                      {invoice.invoice_number}
                    </h4>
                    <p className="mt-1 text-sm text-gray-500">
                      {invoice.billing_period} · {invoice.academic_year}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      isCancelled
                        ? "bg-red-100 text-red-700"
                        : isPaid
                        ? "bg-emerald-100 text-emerald-700"
                        : paid > 0
                        ? "bg-blue-100 text-blue-700"
                        : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    {isCancelled
                      ? "Cancelled"
                      : isPaid
                      ? "Paid / Fee Cleared"
                      : paid > 0
                      ? "Partially Paid"
                      : invoice.status.replace("_", " ")}
                  </span>
                </div>

                <div className="mt-5 grid grid-cols-3 gap-3 rounded-xl bg-gray-50 p-4">
                  <div>
                    <p className="text-xs text-gray-500">Total</p>
                    <p className="mt-1 text-sm font-bold text-gray-900">
                      {money(total)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Paid</p>
                    <p className="mt-1 text-sm font-bold text-emerald-700">
                      {money(paid)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Remaining</p>
                    <p className="mt-1 text-sm font-bold text-red-600">
                      {money(outstanding)}
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
                  <div>
                    <p className="text-xs text-gray-500">
                      Due date: {invoice.due_date || "Not specified"}
                    </p>
                  </div>

                  {!isPaid && !isCancelled && (
                    <div className="w-full space-y-3 sm:w-auto sm:min-w-72">
                      <label className="block text-sm font-medium text-gray-700">
                        Amount to pay (INR)
                      </label>
                      <input
                        type="number"
                        min="0.01"
                        max={outstanding}
                        step="0.01"
                        value={paymentAmounts[invoice.id] ?? ""}
                        onChange={(event) =>
                          setPaymentAmounts((previous) => ({
                            ...previous,
                            [invoice.id]: event.target.value,
                          }))
                        }
                        className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                        placeholder="Enter payment amount"
                      />
                      <p className="text-xs text-gray-500">
                        Maximum payment: {money(outstanding)}
                      </p>
                      <button
                        onClick={() => handlePay(invoice)}
                        disabled={payingId !== null}
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {payingId === invoice.id ? (
                          <Loader2 className="animate-spin" size={17} />
                        ) : (
                          <CreditCard size={17} />
                        )}
                        {payingId === invoice.id
                          ? "Connecting..."
                          : "Pay with PayPal"}
                      </button>
                    </div>
                  )}

                  {isPaid && (
                    <span className="flex items-center gap-2 text-sm font-semibold text-emerald-700">
                      <CheckCircle2 size={17} /> Fee fully cleared
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <p className="text-xs leading-relaxed text-gray-400">
        PayPal Sandbox is currently used for demo payments. Invoice amounts are
        displayed in INR; checkout uses the configured USD demo conversion rate.
      </p>
    </section>
  );
}
