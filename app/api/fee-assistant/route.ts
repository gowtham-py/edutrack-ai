
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";

function money(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value);
}

export async function POST(request: NextRequest) {
  try {
    // Authenticate the logged-in student.
    const authorization = request.headers.get("authorization");
    const accessToken = authorization
      ?.replace(/^Bearer\s+/i, "")
      .trim();

    if (!accessToken) {
      return NextResponse.json(
        { error: "Please log in to use the Fee Assistant." },
        { status: 401 }
      );
    }

    const {
      data: { user },
      error: authError,
    } = await supabaseAdmin.auth.getUser(accessToken);

    if (authError || !user) {
      return NextResponse.json(
        { error: "Your session is invalid. Please log in again." },
        { status: 401 }
      );
    }

    // Validate the question.
    const body = await request.json();
    const message =
      typeof body.message === "string"
        ? body.message.trim().slice(0, 500)
        : "";

    if (!message) {
      return NextResponse.json(
        { error: "Please enter a question." },
        { status: 400 }
      );
    }

    // Find this student's account only.
    const { data: account, error: accountError } =
      await supabaseAdmin
        .from("student_accounts")
        .select("student_id, school_id")
        .eq("auth_user_id", user.id)
        .maybeSingle();

    if (accountError || !account) {
      console.error("Fee assistant account error:", accountError);

      return NextResponse.json(
        { error: "Student account not found." },
        { status: 403 }
      );
    }

    // Retrieve only this student's invoices.
    const { data: invoices, error: invoiceError } =
      await supabaseAdmin
        .from("fee_invoices")
        .select(
          "invoice_number, academic_year, billing_period, total_amount, paid_amount, due_date, status"
        )
        .eq("student_id", account.student_id)
        .eq("school_id", account.school_id)
        .order("created_at", { ascending: false })
        .limit(20);

    if (invoiceError) {
      console.error("Fee assistant invoice error:", invoiceError);

      return NextResponse.json(
        { error: "Unable to retrieve your fee information." },
        { status: 500 }
      );
    }

    const records = invoices ?? [];

    const outstanding = records.reduce((sum, invoice) => {
      if (invoice.status === "cancelled") return sum;

      return sum + Math.max(
        0,
        Number(invoice.total_amount) - Number(invoice.paid_amount)
      );
    }, 0);

    const paidTotal = records.reduce(
      (sum, invoice) => sum + Number(invoice.paid_amount || 0),
      0
    );

    const pendingInvoices = records.filter(
      (invoice) =>
        invoice.status !== "cancelled" &&
        Number(invoice.total_amount) > Number(invoice.paid_amount)
    );

    const question = message.toLowerCase();
    let reply = "";

    if (
      question.includes("pending") ||
      question.includes("due") ||
      question.includes("outstanding")
    ) {
      if (pendingInvoices.length === 0) {
        reply = "Great news! You have no outstanding fee invoices.";
      } else {
        reply =
          `Your total outstanding balance is ${money(outstanding)}.\n\n` +
          pendingInvoices
            .map((invoice) => {
              const due =
                Number(invoice.total_amount) -
                Number(invoice.paid_amount);

              return (
                `Invoice: ${invoice.invoice_number}\n` +
                `Period: ${invoice.billing_period} (${invoice.academic_year})\n` +
                `Outstanding: ${money(due)}\n` +
                `Status: ${invoice.status}`
              );
            })
            .join("\n\n");
      }
    } else if (
      question.includes("history") ||
      question.includes("paid") ||
      question.includes("payment")
    ) {
      reply =
        `Your recorded payments total ${money(paidTotal)}.\n` +
        `Your current outstanding balance is ${money(outstanding)}.\n\n` +
        "Here is your recent invoice summary:\n\n" +
        (records.length
          ? records
              .slice(0, 10)
              .map(
                (invoice) =>
                  `${invoice.invoice_number}: Paid ${money(
                    Number(invoice.paid_amount)
                  )} of ${money(Number(invoice.total_amount))} (${invoice.status})`
              )
              .join("\n")
          : "No invoices were found.");
    } else if (
      question.includes("receipt") ||
      question.includes("invoice")
    ) {
      reply =
        "You can view your invoices in the My Fees section of your Student Portal.\n\n" +
        (records.length
          ? records
              .slice(0, 10)
              .map(
                (invoice) =>
                  `${invoice.invoice_number} — ${invoice.status}, total ${money(
                    Number(invoice.total_amount)
                  )}, paid ${money(Number(invoice.paid_amount))}`
              )
              .join("\n")
          : "There are no invoices on your account yet.") +
        "\n\nFor an official receipt, please use the receipt option provided by your school.";
    } else {
      reply =
        `I can help with your fee information.\n\n` +
        `Total recorded payments: ${money(paidTotal)}\n` +
        `Outstanding balance: ${money(outstanding)}\n` +
        `Invoices found: ${records.length}\n\n` +
        "Try asking me about your pending fees, payment history, invoices, or receipts.";
    }

    return NextResponse.json({ success: true, reply });
  } catch (error) {
    console.error("Fee assistant API error:", error);

    return NextResponse.json(
      { error: "Unable to answer right now. Please try again." },
      { status: 500 }
    );
  }
}
