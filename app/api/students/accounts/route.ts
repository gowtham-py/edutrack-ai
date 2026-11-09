
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createHash } from "node:crypto";

export const runtime = "nodejs";

// Keep the server-side Supabase client independent of
// incomplete or outdated generated database types.
type StudentAdminClient = any;

type AdminProfile = {
  user_id: string;
  school_id: string | null;
  role: string;
};

type StudentRecord = {
  id: string;
  school_id: string;
  admission_number: string;
  full_name: string;
};

export async function POST(request: Request) {
  let supabase: StudentAdminClient = null;
  let createdUserId: string | null = null;

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const secretKey = process.env.SUPABASE_SECRET_KEY;

    if (!supabaseUrl || !secretKey) {
      return NextResponse.json(
        { error: "Server Supabase configuration is missing." },
        { status: 500 }
      );
    }

    supabase = createClient(supabaseUrl, secretKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }) as StudentAdminClient;

    // 1. Verify the logged-in user.
    const authorization = request.headers.get("Authorization");

    const accessToken = authorization?.startsWith("Bearer ")
      ? authorization.slice(7)
      : null;

    if (!accessToken) {
      return NextResponse.json(
        { error: "You must be logged in." },
        { status: 401 }
      );
    }

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(accessToken);

    if (authError || !user) {
      return NextResponse.json(
        { error: "Your login session is invalid." },
        { status: 401 }
      );
    }

    // 2. Verify the school administrator.
    const {
      data: profileData,
      error: profileError,
    } = await supabase
      .from("profiles")
      .select("user_id, school_id, role")
      .eq("user_id", user.id)
      .single();

    const adminProfile = profileData as AdminProfile | null;

    if (
      profileError ||
      !adminProfile ||
      adminProfile.role !== "school_admin" ||
      !adminProfile.school_id
    ) {
      return NextResponse.json(
        {
          error: "Only a School Admin can create student accounts.",
        },
        { status: 403 }
      );
    }

    // 3. Read and validate the request.
    const body = await request.json();

    const studentId =
      typeof body.studentId === "string"
        ? body.studentId.trim()
        : "";

    const password =
      typeof body.password === "string"
        ? body.password
        : "";

    if (!studentId || !password) {
      return NextResponse.json(
        {
          error: "Student ID and initial password are required.",
        },
        { status: 400 }
      );
    }

    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        studentId
      )
    ) {
      return NextResponse.json(
        { error: "Invalid student ID." },
        { status: 400 }
      );
    }

    if (password.length < 8 || password.length > 72) {
      return NextResponse.json(
        {
          error: "Password must contain between 8 and 72 characters.",
        },
        { status: 400 }
      );
    }

    // 4. Find the student within this administrator's school.
    const {
      data: studentData,
      error: studentError,
    } = await supabase
      .from("students")
      .select("id, school_id, admission_number, full_name")
      .eq("id", studentId)
      .eq("school_id", adminProfile.school_id)
      .single();

    const student = studentData as StudentRecord | null;

    if (studentError || !student) {
      return NextResponse.json(
        {
          error: "Student not found in your school.",
        },
        { status: 404 }
      );
    }

    // 5. Check whether this student already has an account.
    const {
      data: existingAccount,
      error: existingError,
    } = await supabase
      .from("student_accounts")
      .select("id")
      .eq("student_id", student.id)
      .maybeSingle();

    if (existingError) {
      return NextResponse.json(
        {
          error: "Could not check existing student accounts.",
        },
        { status: 500 }
      );
    }

    if (existingAccount) {
      return NextResponse.json(
        {
          error: "This student already has a login account.",
        },
        { status: 409 }
      );
    }

    // 6. Generate a deterministic private authentication email.
    // Students will never need to enter this email.
    const admissionKey = student.admission_number
      .trim()
      .toUpperCase();

    const emailHash = createHash("sha256")
      .update(`${student.school_id}:${admissionKey}`)
      .digest("hex");

    const syntheticEmail =
      `student-${emailHash}@students.edutrack.invalid`;

    // 7. Create the student's Supabase Auth account.
    const {
      data: authData,
      error: createError,
    } = await supabase.auth.admin.createUser({
      email: syntheticEmail,
      password,
      email_confirm: true,
      user_metadata: {
        role: "student",
        student_id: student.id,
        school_id: student.school_id,
      },
    });

    if (createError || !authData?.user) {
      return NextResponse.json(
        {
          error:
            createError?.message ||
            "Could not create the student login account.",
        },
        { status: 400 }
      );
    }

    createdUserId = authData.user.id;

    // 8. Link the authentication account to the student.
    const { error: linkError } = await supabase
      .from("student_accounts")
      .insert({
        school_id: student.school_id,
        student_id: student.id,
        auth_user_id: authData.user.id,
        created_by: user.id,
      });

    if (linkError) {
      // Roll back the Auth account if linking fails.
      await supabase.auth.admin.deleteUser(authData.user.id);
      createdUserId = null;

      return NextResponse.json(
        {
          error: `Student account linking failed: ${linkError.message}`,
        },
        { status: 500 }
      );
    }

    // Account creation completed.
    createdUserId = null;

    return NextResponse.json({
      success: true,
      message: "Student login account created successfully.",
      student: {
        id: student.id,
        fullName: student.full_name,
        admissionNumber: student.admission_number,
      },
    });
  } catch (error) {
    // Best-effort cleanup after an unexpected failure.
    if (supabase && createdUserId) {
      await supabase.auth.admin.deleteUser(createdUserId);
    }

    console.error("Student account creation error:", error);

    return NextResponse.json(
      {
        error: "An unexpected server error occurred.",
      },
      { status: 500 }
    );
  }
}
