
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
      typeof body.password === "string" ? body.password : "";

    if (!schoolCode || !admissionNumber || !password) {
      return NextResponse.json(
        {
          error:
            "School code, admission number and password are required.",
        },
        { status: 400 }
      );
    }

    if (
      schoolCode.length > 100 ||
      admissionNumber.length > 100 ||
      password.length > 72
    ) {
      return NextResponse.json(
        { error: "Invalid login details." },
        { status: 400 }
      );
    }

    // Server-side privileged client.
    const admin = createClient(supabaseUrl, secretKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }) as AdminClient;

    // Find school.
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

    // Find student using the normalized admission number.
    const { data: students, error: studentError } = await admin
      .from("students")
      .select("id, school_id, admission_number, full_name")
      .eq("school_id", school.id);

    if (studentError || !students) {
      console.error("Student lookup error:", studentError);

      return NextResponse.json(
        { error: "Unable to verify student details." },
        { status: 500 }
      );
    }

    const student = students.find(
      (item: any) =>
        String(item.admission_number).trim().toUpperCase() ===
        admissionNumber
    );

    if (!student) {
      return NextResponse.json(
        { error: "Invalid school code, admission number or password." },
        { status: 401 }
      );
    }

    // Confirm linked student account.
    const { data: account, error: accountError } = await admin
      .from("student_accounts")
      .select("auth_user_id")
      .eq("student_id", student.id)
      .eq("school_id", school.id)
      .maybeSingle();

    if (accountError) {
      console.error("Student account lookup error:", accountError);

      return NextResponse.json(
        { error: "Unable to verify student account." },
        { status: 500 }
      );
    }

    if (!account?.auth_user_id) {
      return NextResponse.json(
        { error: "No login account exists for this student." },
        { status: 401 }
      );
    }

    // Generate the same synthetic email used during account creation.
    const emailHash = createHash("sha256")
      .update(`${school.id}:${admissionNumber}`)
      .digest("hex");

    const syntheticEmail =
      `student-${emailHash}@students.edutrack.invalid`;

    // Authenticate student.
    const authClient = createClient(supabaseUrl, publishableKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

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

    // Verify authenticated user belongs to this student.
    if (authData.user.id !== account.auth_user_id) {
      await authClient.auth.signOut();

      return NextResponse.json(
        { error: "Invalid login details." },
        { status: 401 }
      );
    }

    // Return tokens at the top level for the unified login page.
    return NextResponse.json({
      success: true,
      message: "Student login successful.",

      student: {
        id: student.id,
        fullName: student.full_name,
        admissionNumber: student.admission_number,
        schoolName: school.name,
      },

      access_token: authData.session.access_token,
      refresh_token: authData.session.refresh_token,

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
