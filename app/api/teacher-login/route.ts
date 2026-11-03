
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const secretKey = process.env.SUPABASE_SECRET_KEY;
    const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

    if (!supabaseUrl || !secretKey || !publishableKey) {
      return NextResponse.json(
        { error: "Server configuration is missing." },
        { status: 500 }
      );
    }

    const adminClient = createClient(supabaseUrl, secretKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const body = await request.json();

    const schoolCode =
      typeof body.schoolCode === "string"
        ? body.schoolCode.trim().toUpperCase()
        : "";

    const teacherKey =
      typeof body.teacherKey === "string"
        ? body.teacherKey.trim().toUpperCase()
        : "";

    const password =
      typeof body.password === "string" ? body.password : "";

    if (!schoolCode || !teacherKey || !password) {
      return NextResponse.json(
        { error: "School ID, Teacher Key and password are required." },
        { status: 400 }
      );
    }

    // Find the school.
    const { data: school } = await adminClient
      .from("schools")
      .select("id")
      .eq("school_code", schoolCode)
      .maybeSingle();

    if (!school) {
      return NextResponse.json(
        { error: "Invalid School ID, Teacher Key or password." },
        { status: 401 }
      );
    }

    // Find the teacher within that school.
    const { data: teacher } = await adminClient
      .from("profiles")
      .select("user_id")
      .eq("school_id", school.id)
      .eq("teacher_key", teacherKey)
      .eq("role", "teacher")
      .maybeSingle();

    if (!teacher) {
      return NextResponse.json(
        { error: "Invalid School ID, Teacher Key or password." },
        { status: 401 }
      );
    }

    // Get the teacher's email from their Auth account.
    const { data: authData, error: userError } =
      await adminClient.auth.admin.getUserById(teacher.user_id);

    const teacherEmail = authData.user?.email;

    if (userError || !teacherEmail) {
      return NextResponse.json(
        { error: "Teacher account could not be found." },
        { status: 401 }
      );
    }

    // Verify the password through Supabase Auth.
    const loginClient = createClient(supabaseUrl, publishableKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const { data: loginData, error: loginError } =
      await loginClient.auth.signInWithPassword({
        email: teacherEmail,
        password,
      });

    if (loginError || !loginData.session) {
      return NextResponse.json(
        { error: "Invalid School ID, Teacher Key or password." },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      session: loginData.session,
    });
  } catch {
    return NextResponse.json(
      { error: "An unexpected login error occurred." },
      { status: 500 }
    );
  }
}
