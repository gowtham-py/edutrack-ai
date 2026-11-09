
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createHash } from "node:crypto";

export const runtime = "nodejs";

type AdminClient = any;

export async function POST(request: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const secretKey = process.env.SUPABASE_SECRET_KEY;
    const publishableKey =
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

    if (!supabaseUrl || !secretKey || !publishableKey) {
      return NextResponse.json(
        { error: "Server authentication configuration is missing." },
        { status: 500 }
      );
    }

    const body = await request.json();

    const schoolCode =
      typeof body.schoolCode === "string"
        ? body.schoolCode.trim().toUpperCase()
        : "";

    const admissionNumber =
      typeof body.admissionNumber === "string"
        ? body.admissionNumber.trim().toUpperCase()
        : "";

    const password =
      typeof body.password === "string"
        ? body.password
        : "";

    if (!schoolCode || !admissionNumber || !password) {
      return NextResponse.json(
        { error: "School code, admission number and password are required." },
        { status: 400 }
      );
    }

    if (schoolCode.length > 100 || admissionNumber.length > 100) {
      return NextResponse.json(
        { error: "Invalid login details." },
        { status: 400 }
      );
    }

    // Privileged client: used only for server-side record lookup.
    const admin = createClient(
      supabaseUrl,
      secretKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    ) as AdminClient;

    // Find the school using its school code.
    const { data: school, error: schoolError } = await admin
      .from("schools")
      .select("id, name, school_code")
      .eq("school_code", schoolCode)
      .maybeSingle();

    if (schoolError || !school) {
      return NextResponse.json(
        { error: "Invalid school code, admission number or password." },
        { status: 401 }
      );
    }

    // Find the student inside that school.
    const { data: student, error: studentError } = await admin
      .from("students")
      .select("id, school_id, admission_number, full_name")
      .eq("school_id", school.id)
      .eq("admission_number", admissionNumber)
      .maybeSingle();

    if (studentError || !student) {
      return NextResponse.json(
        { error: "Invalid school code, admission number or password." },
        { status: 401 }
      );
    }

    // Confirm that this student has an account.
    const { data: account, error: accountError } = await admin
      .from("student_accounts")
      .select("auth_user_id")
      .eq("student_id", student.id)
      .eq("school_id", school.id)
      .maybeSingle();

    if (accountError || !account?.auth_user_id) {
      return NextResponse.json(
        { error: "Invalid school code, admission number or password." },
        { status: 401 }
      );
    }

    // Recreate the same synthetic email used during account creation.
    const emailHash = createHash("sha256")
      .update(`${school.id}:${admissionNumber}`)
      .digest("hex");

    const syntheticEmail =
      `student-${emailHash}@students.edutrack.invalid`;

    // Authenticate using the public Supabase key.
    const authClient = createClient(
      supabaseUrl,
      publishableKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    const {
      data: authData,
      error: loginError,
    } = await authClient.auth.signInWithPassword({
      email: syntheticEmail,
      password,
    });

    if (loginError || !authData.session || !authData.user) {
      return NextResponse.json(
        { error: "Invalid school code, admission number or password." },
        { status: 401 }
      );
    }

    // Ensure the authenticated user matches the linked student account.
    if (authData.user.id !== account.auth_user_id) {
      await authClient.auth.signOut();

      return NextResponse.json(
        { error: "Invalid login details." },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Student login successful.",
      student: {
        id: student.id,
        fullName: student.full_name,
        admissionNumber: student.admission_number,
        schoolName: school.name,
      },
      session: {
        access_token: authData.session.access_token,
        refresh_token: authData.session.refresh_token,
      },
    });
  } catch (error) {
    console.error("Student login error:", error);

    return NextResponse.json(
      { error: "An unexpected login error occurred." },
      { status: 500 }
    );
  }
}
