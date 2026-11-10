
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";

function getPayPalBase() {
  return process.env.PAYPAL_ENV?.trim().toLowerCase() === "production"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";
}

async function getPayPalToken() {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("PayPal server configuration is missing.");
  }

  const credentials = Buffer.from(
    `${clientId}:${clientSecret}`
  ).toString("base64");

  const response = await fetch(
    `${getPayPalBase()}/v1/oauth2/token`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials",
      cache: "no-store",
    }
  );

  const data = await response.json();

  if (!response.ok || !data.access_token) {
    console.error("PayPal authentication error:", data);
    throw new Error("Unable to authenticate with PayPal.");
  }

  return data.access_token as string;
}

async function getPayPalOrder(orderId: string, token: string) {
  const response = await fetch(
    `${getPayPalBase()}/v2/checkout/orders/${encodeURIComponent(orderId)}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    }
  );

  const data = await response.json();

  if (!response.ok) {
    console.error("PayPal order lookup error:", data);
    throw new Error("Unable to retrieve PayPal order.");
  }

  return data;
}

export async function POST(request: NextRequest) {
  try {
    // 1. Verify the authenticated student session.
    const authorization = request.headers.get("authorization");
    const accessToken = authorization?.replace(/^Bearer\s+/i, "").trim();

    if (!accessToken) {
      return NextResponse.json(
        { error: "Please log in again." },
        { status: 401 }
      );
    }

    const {
      data: { user },
      error: authError,
    } = await supabaseAdmin.auth.getUser(accessToken);

    if (authError || !user) {
      return NextResponse.json(
        { error: "Invalid student session." },
        { status: 401 }
      );
    }

    // 2. Validate the PayPal order ID.
    const body = await request.json();
    const orderId = body?.orderId;

    if (
      typeof orderId !== "string" ||
      !/^[A-Z0-9-]{10,50}$/i.test(orderId)
    ) {
      return NextResponse.json(
        { error: "Invalid PayPal order ID." },
        { status: 400 }
      );
    }

    // 3. Find the authenticated student's account.
    const { data: account, error: accountError } =
      await supabaseAdmin
        .from("student_accounts")
        .select("student_id, school_id")
        .eq("auth_user_id", user.id)
        .maybeSingle();

    if (accountError || !account) {
      console.error("Student account lookup error:", accountError);

      return NextResponse.json(
        { error: "Student account not found." },
        { status: 403 }
      );
    }

    // 4. Confirm that this order belongs to this student.
    const { data: trackedOrder, error: trackingError } =
      await supabaseAdmin
        .from("paypal_fee_orders")
        .select(
          "id, paypal_order_id, invoice_id, student_id, school_id, amount_usd, status"
        )
        .eq("paypal_order_id", orderId)
        .eq("student_id", account.student_id)
        .eq("school_id", account.school_id)
        .maybeSingle();

    if (trackingError || !trackedOrder) {
      console.error("Tracked order lookup error:", trackingError);

      return NextResponse.json(
        { error: "Payment order not found or access denied." },
        { status: 404 }
      );
    }

    // 5. Retrieve the original invoice.
    const { data: invoice, error: invoiceError } =
      await supabaseAdmin
        .from("fee_invoices")
        .select("id, invoice_number, student_id, school_id")
        .eq("id", trackedOrder.invoice_id)
        .eq("student_id", account.student_id)
        .eq("school_id", account.school_id)
        .maybeSingle();

    if (invoiceError || !invoice) {
      console.error("Invoice verification error:", invoiceError);

      return NextResponse.json(
        { error: "Invoice not found or access denied." },
        { status: 404 }
      );
    }

    // 6. Authenticate with PayPal.
    const paypalToken = await getPayPalToken();

    // 7. Retrieve the original PayPal order BEFORE capture.
    const originalOrder = await getPayPalOrder(
      orderId,
      paypalToken
    );

    // 8. Verify the original invoice reference.
    // PayPal may omit some original reference fields from
    // its capture response, so validate them on the original order.
    const originalPurchaseUnits =
      originalOrder.purchase_units || [];

    const purchaseUnit = originalPurchaseUnits.find(
      (unit: {
        custom_id?: string;
        reference_id?: string;
        invoice_id?: string;
      }) => {
        const customIdMatches =
          unit.custom_id === trackedOrder.invoice_id;

        const referenceIdMatches =
          !unit.reference_id ||
          unit.reference_id === trackedOrder.invoice_id;

        const invoiceNumberMatches =
          !unit.invoice_id ||
          unit.invoice_id === invoice.invoice_number;

        return (
          customIdMatches &&
          referenceIdMatches &&
          invoiceNumberMatches
        );
      }
    );

    if (!purchaseUnit) {
      console.error("PayPal invoice reference mismatch:", {
        orderId,
        expectedInvoiceId: trackedOrder.invoice_id,
        expectedInvoiceNumber: invoice.invoice_number,
        receivedPurchaseUnits: originalPurchaseUnits,
      });

      return NextResponse.json(
        { error: "PayPal invoice reference does not match." },
        { status: 400 }
      );
    }

    // 9. Verify the original order amount.
    const orderAmount = Number(purchaseUnit.amount?.value);
    const expectedAmount = Number(trackedOrder.amount_usd);

    if (
      purchaseUnit.amount?.currency_code !== "USD" ||
      !Number.isFinite(orderAmount) ||
      !Number.isFinite(expectedAmount) ||
      orderAmount.toFixed(2) !== expectedAmount.toFixed(2)
    ) {
      return NextResponse.json(
        { error: "PayPal order amount does not match the invoice." },
        { status: 400 }
      );
    }

    // 10. Capture only an approved order.
    if (originalOrder.status === "APPROVED") {
      const captureResponse = await fetch(
        `${getPayPalBase()}/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${paypalToken}`,
            "Content-Type": "application/json",
            "PayPal-Request-Id": `capture-${orderId}`,
          },
          body: JSON.stringify({}),
          cache: "no-store",
        }
      );

      const captureData = await captureResponse.json();

      if (!captureResponse.ok) {
        console.error("PayPal capture response:", captureData);

        // The capture may have completed even if the
        // original response was interrupted. Verify below.
      }
    } else if (originalOrder.status !== "COMPLETED") {
      return NextResponse.json(
        {
          error: "PayPal has not approved this payment.",
          paypalStatus: originalOrder.status,
        },
        { status: 400 }
      );
    }

    // 11. Re-fetch the order to verify its final status.
    const completedOrder = await getPayPalOrder(
      orderId,
      paypalToken
    );

    if (completedOrder.status !== "COMPLETED") {
      return NextResponse.json(
        {
          error: "PayPal has not confirmed a completed payment.",
          paypalStatus: completedOrder.status,
        },
        { status: 400 }
      );
    }

    // 12. Get the completed capture.
    // Use the verified original purchase unit for invoice matching.
    const completedPurchaseUnit =
      completedOrder.purchase_units?.find(
        (unit: {
          custom_id?: string;
          reference_id?: string;
        }) =>
          unit.custom_id === trackedOrder.invoice_id ||
          (
            !unit.custom_id &&
            unit.reference_id === trackedOrder.invoice_id
          )
      );

    if (!completedPurchaseUnit) {
      return NextResponse.json(
        { error: "Completed PayPal invoice reference could not be verified." },
        { status: 400 }
      );
    }

    const captures =
      completedPurchaseUnit.payments?.captures || [];

    const capture = captures.find(
      (item: {
        status?: string;
        id?: string;
        amount?: {
          currency_code?: string;
          value?: string;
        };
      }) => item.status === "COMPLETED"
    );

    if (!capture?.id || !capture.amount) {
      return NextResponse.json(
        { error: "No completed PayPal capture was found." },
        { status: 400 }
      );
    }

    // 13. Verify the actual captured amount.
    const capturedAmount = Number(capture.amount.value);

    if (
      capture.amount.currency_code !== "USD" ||
      !Number.isFinite(capturedAmount) ||
      capturedAmount.toFixed(2) !== expectedAmount.toFixed(2)
    ) {
      console.error("PayPal captured amount mismatch:", {
        capturedAmount,
        expectedAmount,
        currency: capture.amount.currency_code,
      });

      return NextResponse.json(
        { error: "PayPal captured amount does not match the order." },
        { status: 400 }
      );
    }

    // 14. Record payment using the existing protected,
    // idempotent database transaction.
    const { data: result, error: paymentError } =
      await supabaseAdmin.rpc(
        "capture_paypal_fee_payment",
        {
          p_paypal_order_id: orderId,
          p_capture_id: capture.id,
        }
      );

    if (paymentError) {
      console.error("Payment recording error:", paymentError);

      return NextResponse.json(
        {
          error:
            "PayPal payment was completed, but invoice recording needs reconciliation. Please contact the school.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
  success: true,
  message: "PayPal payment verified successfully.",
  receipt: result,
  receiptNumber:
    result?.receipt_number || result?.receiptNumber || null,
  paidAmount: result?.paid_amount ?? null,
  invoiceStatus: result?.invoice_status ?? null,
  orderId,
  captureId: capture.id,
  amountUSD: capturedAmount.toFixed(2),
  currency: "USD",
});

  } catch (error) {
    console.error("PayPal capture API error:", error);

    return NextResponse.json(
      { error: "Unable to verify payment right now." },
      { status: 500 }
    );
  }
}
