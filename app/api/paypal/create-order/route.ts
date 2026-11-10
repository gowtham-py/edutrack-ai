
import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    // 1. Verify the student's login session.
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

    // 2. Validate the requested invoice and payment amount.
    const body = await request.json();
    const invoiceId = body?.invoiceId;
    const requestedAmount = Number(body?.paymentAmount);

    if (typeof invoiceId !== "string" || !invoiceId.trim()) {
      return NextResponse.json(
        { error: "Invalid invoice." },
        { status: 400 }
      );
    }

    if (
      !Number.isFinite(requestedAmount) ||
      requestedAmount <= 0 ||
      Math.round(requestedAmount * 100) !== requestedAmount * 100
    ) {
      return NextResponse.json(
        { error: "Enter a valid payment amount with up to two decimal places." },
        { status: 400 }
      );
    }

    const paymentAmountINR = Number(requestedAmount.toFixed(2));

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

    // 4. Fetch only this student's invoice.
    const { data: invoice, error: invoiceError } =
      await supabaseAdmin
        .from("fee_invoices")
        .select(
          "id, school_id, student_id, invoice_number, total_amount, paid_amount, status"
        )
        .eq("id", invoiceId.trim())
        .eq("student_id", account.student_id)
        .eq("school_id", account.school_id)
        .maybeSingle();

    if (invoiceError || !invoice) {
      console.error("Invoice lookup error:", invoiceError);

      return NextResponse.json(
        { error: "Invoice not found or access denied." },
        { status: 404 }
      );
    }

    if (invoice.status === "cancelled") {
      return NextResponse.json(
        { error: "This invoice has been cancelled." },
        { status: 400 }
      );
    }

    // 5. Calculate the outstanding balance on the server.
    const totalAmount = Number(invoice.total_amount);
    const paidAmount = Number(invoice.paid_amount);

    if (
      !Number.isFinite(totalAmount) ||
      !Number.isFinite(paidAmount) ||
      totalAmount <= 0 ||
      paidAmount < 0
    ) {
      return NextResponse.json(
        { error: "Invalid invoice amount." },
        { status: 400 }
      );
    }

    const outstanding = Number(
      (totalAmount - paidAmount).toFixed(2)
    );

    if (outstanding <= 0) {
      return NextResponse.json(
        { error: "This invoice has no outstanding balance." },
        { status: 400 }
      );
    }

    if (paymentAmountINR > outstanding) {
      return NextResponse.json(
        {
          error: `Payment cannot exceed the remaining balance of ₹${outstanding.toFixed(2)}.`,
        },
        { status: 400 }
      );
    }

    // 6. Read the INR-to-USD exchange rate.
    const configuredRate = Number(
      process.env.PAYPAL_DEMO_INR_PER_USD
    );

    if (!Number.isFinite(configuredRate) || configuredRate <= 0) {
      return NextResponse.json(
        { error: "PayPal demo exchange rate is not configured." },
        { status: 500 }
      );
    }

    const exchangeRate = Number(configuredRate.toFixed(4));
    const usdAmount = (paymentAmountINR / exchangeRate).toFixed(2);

    if (Number(usdAmount) < 0.01) {
      return NextResponse.json(
        { error: "Converted payment is below PayPal's minimum." },
        { status: 400 }
      );
    }

    // 7. Configure PayPal Sandbox or Production.
    const clientId = process.env.PAYPAL_CLIENT_ID;
    const clientSecret = process.env.PAYPAL_CLIENT_SECRET;

    const paypalEnvironment = (
      process.env.PAYPAL_ENV || "sandbox"
    ).trim().toLowerCase();

    const paypalBase =
      paypalEnvironment === "production"
        ? "https://api-m.paypal.com"
        : "https://api-m.sandbox.paypal.com";

    if (!clientId || !clientSecret) {
      return NextResponse.json(
        { error: "PayPal server configuration is missing." },
        { status: 500 }
      );
    }

    // 8. Get PayPal access token.
    const credentials = Buffer.from(
      `${clientId}:${clientSecret}`
    ).toString("base64");

    const tokenResponse = await fetch(
      `${paypalBase}/v1/oauth2/token`,
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

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok || !tokenData.access_token) {
      console.error("PayPal token error:", tokenData);

      return NextResponse.json(
        { error: "Unable to connect to PayPal." },
        { status: 502 }
      );
    }

    // 9. Configure return URLs.
    const appUrl = (
      process.env.NEXT_PUBLIC_APP_URL ||
      "https://edutrack-ai-98ka.vercel.app"
    ).replace(/\/+$/, "");

    const returnUrl = `${appUrl}/student-portal?paypal=success`;
    const cancelUrl = `${appUrl}/student-portal?paypal=cancel`;

    // 10. Create a PayPal order for the selected amount.
    const orderResponse = await fetch(
      `${paypalBase}/v2/checkout/orders`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
          "Content-Type": "application/json",
          "PayPal-Request-Id": randomUUID(),
        },
        body: JSON.stringify({
          intent: "CAPTURE",
          purchase_units: [
            {
              reference_id: invoice.id,
              custom_id: invoice.id,
              invoice_id: invoice.invoice_number,
              description: `EduTrack AI fee payment for ${invoice.invoice_number}`,
              amount: {
                currency_code: "USD",
                value: usdAmount,
              },
            },
          ],
          application_context: {
            brand_name: "EduTrack AI",
            landing_page: "LOGIN",
            user_action: "PAY_NOW",
            return_url: returnUrl,
            cancel_url: cancelUrl,
          },
        }),
        cache: "no-store",
      }
    );

    const orderData = await orderResponse.json();

    if (!orderResponse.ok || !orderData.id) {
      console.error("PayPal order creation error:", orderData);

      return NextResponse.json(
        {
          error:
            orderData?.message ||
            "Unable to create PayPal order.",
        },
        { status: 502 }
      );
    }

    // 11. Find the PayPal approval URL.
    const approvalUrl = orderData.links?.find(
      (link: { rel: string; href: string }) =>
        link.rel === "approve"
    )?.href;

    if (!approvalUrl) {
      console.error("PayPal approval link missing:", orderData);

      return NextResponse.json(
        { error: "PayPal checkout link was not returned." },
        { status: 502 }
      );
    }

    // 12. Save the exact selected INR amount for verified capture.
    const { error: trackingError } = await supabaseAdmin
      .from("paypal_fee_orders")
      .insert({
        paypal_order_id: orderData.id,
        school_id: invoice.school_id,
        invoice_id: invoice.id,
        student_id: account.student_id,
        amount_inr: paymentAmountINR,
        amount_usd: Number(usdAmount),
        exchange_rate: exchangeRate,
        status: "created",
      });

    if (trackingError) {
      console.error("PayPal order tracking error:", trackingError);

      return NextResponse.json(
        { error: "Unable to securely save payment order." },
        { status: 500 }
      );
    }

    // 13. Return checkout details.
    return NextResponse.json({
      orderId: orderData.id,
      approvalUrl,
      amountINR: paymentAmountINR.toFixed(2),
      amountUSD: usdAmount,
      exchangeRate,
      currency: "USD",
    });
  } catch (error) {
    console.error("PayPal create order error:", error);

    return NextResponse.json(
      {
        error: "Something went wrong while creating the payment.",
      },
      { status: 500 }
    );
  }
}
