
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";

const GEMINI_MODEL = "gemini-3.8-flash";

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

    // Validate the student's question.
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

    // Check Gemini configuration.
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      console.error("GEMINI_API_KEY is missing.");

      return NextResponse.json(
        { error: "AI assistant is not configured yet." },
        { status: 503 }
      );
    }

    // Find only this logged-in student's account.
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

    const invoiceSummary = records.map((invoice) => {
      const total = Number(invoice.total_amount || 0);
      const paid = Number(invoice.paid_amount || 0);
      const balance =
        invoice.status === "cancelled"
          ? 0
          : Math.max(0, total - paid);

      return {
        invoiceNumber: invoice.invoice_number,
        academicYear: invoice.academic_year,
        billingPeriod: invoice.billing_period,
        totalAmount: total,
        paidAmount: paid,
        remainingBalance: balance,
        dueDate: invoice.due_date,
        status: invoice.status,
      };
    });

    const outstanding = invoiceSummary.reduce(
      (sum, invoice) => sum + invoice.remainingBalance,
      0
    );

    const paidTotal = invoiceSummary.reduce(
      (sum, invoice) => sum + invoice.paidAmount,
      0
    );

    // Give Gemini verified database information.
    const studentFeeContext = {
      currency: "INR",
      totalRecordedPayments: money(paidTotal),
      totalOutstandingBalance: money(outstanding),
      invoiceCount: invoiceSummary.length,
      invoices: invoiceSummary,
    };

    const systemInstruction = `
You are EduTrack AI's intelligent Student Fee Assistant.

Your job is to help students understand their school or college fee information.

Use ONLY the verified invoice information supplied in the conversation.

Rules:
1. Answer naturally, politely and clearly.
2. Explain full payments, partial payments and remaining balances.
3. Use Indian Rupees (₹) for all monetary amounts.
4. When explaining a balance, use the supplied remainingBalance.
5. Never invent invoices, payments, receipts, dates or payment confirmations.
6. Never claim that a payment succeeded unless the supplied database information confirms it.
7. You cannot process payments or issue official receipts.
8. For payment instructions, direct students to the My Fees section of their Student Portal.
9. For official receipts or invoice corrections, direct students to their school administration.
10. If information is missing, clearly say that you cannot verify it.
11. Do not reveal information about other students.
12. Keep answers friendly, helpful and reasonably concise.

You are an assistant, not the payment authority.
The database and PayPal verification are the sources of truth.
`;

    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: systemInstruction }],
          },
          contents: [
            {
              role: "user",
              parts: [
                {
                  text:
                    "Verified student fee information:\n" +
                    JSON.stringify(studentFeeContext, null, 2) +
                    "\n\nStudent question:\n" +
                    message,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 700,
          },
        }),
        signal: AbortSignal.timeout(30000),
      }
    );

    const result = (await geminiResponse.json()) as {
      candidates?: Array<{
        content?: {
          parts?: Array<{ text?: string }>;
        };
      }>;
      error?: {
        message?: string;
      };
    };

    if (!geminiResponse.ok) {
      console.error(
        "Gemini API error:",
        geminiResponse.status,
        result.error?.message
      );

      return NextResponse.json(
        {
          error:
            "The AI assistant could not respond right now. Please try again.",
        },
        { status: 502 }
      );
    }

    const reply =
      result.candidates?.[0]?.content?.parts
        ?.map((part) => part.text || "")
        .join("")
        .trim() || "";

    if (!reply) {
      return NextResponse.json(
        { error: "The AI assistant returned an empty response. Please try again." },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      reply,
      aiPowered: true,
      model: GEMINI_MODEL,
    });
  } catch (error) {
    console.error("Fee assistant API error:", error);

    return NextResponse.json(
      { error: "Unable to answer right now. Please try again." },
      { status: 500 }
    );
  }
}
