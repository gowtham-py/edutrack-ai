
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";

const PAYPAL_BASE = "https://api-m.sandbox.paypal.com";

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
    `${PAYPAL_BASE}/v1/oauth2/token`,
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
    throw new Error("Unable to authenticate with PayPal.");
  }

  return data.access_token as string;
}

export async function POST(request: NextRequest) {
  try {
    // 1. Verify the student's authenticated session.
    const authorization = request.headers.get("authorization");
    const accessToken = authorization?.replace(/^Bearer\s+/i, "");

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

    const body = await request.json();
    const orderId = body.orderId;

    if (
      typeof orderId !== "string" ||
      !/^[A-Z0-9-]{10,50}$/i.test(orderId)
    ) {
      return NextResponse.json(
        { error: "Invalid PayPal order ID." },
        { status: 400 }
      );
    }

    // 2. Resolve the authenticated student's account.
    const { data: account, error: accountError } =
      await supabaseAdmin
        .from("student_accounts")
        .select("student_id, school_id")
        .eq("auth_user_id", user.id)
        .maybeSingle();

    if (accountError || !account) {
      return NextResponse.json(
        { error: "Student account not found." },
        { status: 403 }
      );
    }

    // 3. Confirm that this order belongs to this student.
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
      return NextResponse.json(
        { error: "Payment order not found or access denied." },
        { status: 404 }
      );
    }

    // 4. Authenticate with PayPal.
    const paypalToken = await getPayPalToken();

    // 5. Retrieve the actual PayPal order.
    const orderResponse = await fetch(
      `${PAYPAL_BASE}/v2/checkout/orders/${encodeURIComponent(orderId)}`,
      {
        headers: {
          Authorization: `Bearer ${paypalToken}`,
          "Content-Type": "application/json",
        },
        cache: "no-store",
      }
    );

    let paypalOrder = await orderResponse.json();

    if (!orderResponse.ok) {
      console.error("PayPal order lookup error:", paypalOrder);

      return NextResponse.json(
        { error: "Unable to verify PayPal order." },
        { status: 502 }
      );
    }

    // 6. Capture only an approved order.
    if (paypalOrder.status === "APPROVED") {
      const captureResponse = await fetch(
        `${PAYPAL_BASE}/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`,
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

        // Re-fetch in case PayPal completed the capture
        // but the original response was interrupted.
        const retryResponse = await fetch(
          `${PAYPAL_BASE}/v2/checkout/orders/${encodeURIComponent(orderId)}`,
          {
            headers: {
              Authorization: `Bearer ${paypalToken}`,
            },
            cache: "no-store",
          }
        );

        if (!retryResponse.ok) {
          return NextResponse.json(
            { error: "Payment capture could not be verified." },
            { status: 502 }
          );
        }

        paypalOrder = await retryResponse.json();
      } else {
        paypalOrder = captureData;
      }
    }

    // 7. Only accept a completed PayPal order.
    if (paypalOrder.status !== "COMPLETED") {
      return NextResponse.json(
        {
          error:
            "PayPal has not confirmed a completed payment.",
          paypalStatus: paypalOrder.status,
        },
        { status: 400 }
      );
    }

    // 8. Verify the invoice reference and captured amount.
    const purchaseUnit = paypalOrder.purchase_units?.find(
      (unit: {
        reference_id?: string;
        custom_id?: string;
      }) =>
        unit.reference_id === trackedOrder.invoice_id &&
        unit.custom_id === trackedOrder.invoice_id
    );

    if (!purchaseUnit) {
      return NextResponse.json(
        { error: "PayPal invoice reference does not match." },
        { status: 400 }
      );
    }

    const capture = purchaseUnit.payments?.captures?.find(
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

    const capturedAmount = Number(capture.amount.value);
    const expectedAmount = Number(trackedOrder.amount_usd);

    if (
      capture.amount.currency_code !== "USD" ||
      !Number.isFinite(capturedAmount) ||
      capturedAmount.toFixed(2) !== expectedAmount.toFixed(2)
    ) {
      return NextResponse.json(
        { error: "PayPal captured amount does not match the order." },
        { status: 400 }
      );
    }

    // 9. Record the verified payment and update the invoice
    // through the protected database transaction.
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
