
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const secretKey = process.env.SUPABASE_SECRET_KEY;

    if (!supabaseUrl || !secretKey) {
      return NextResponse.json(
        { error: "Server Supabase configuration is missing." },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, secretKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Verify the logged-in user.
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

    // Confirm the user is a School Admin.
    const { data: adminProfile, error: profileError } = await supabase
      .from("profiles")
      .select("user_id, school_id, role")
      .eq("user_id", user.id)
      .single();

    if (
      profileError ||
      !adminProfile ||
      adminProfile.role !== "school_admin" ||
      !adminProfile.school_id
    ) {
      return NextResponse.json(
        { error: "Only a School Admin can invite teachers." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const fullName =
      typeof body.fullName === "string" ? body.fullName.trim() : "";
    const email =
      typeof body.email === "string" ? body.email.trim().toLowerCase() : "";

    if (!fullName || !email) {
      return NextResponse.json(
        { error: "Teacher name and email are required." },
        { status: 400 }
      );
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: "Please enter a valid email address." },
        { status: 400 }
      );
    }

    // Generate a unique Teacher Key.
    const teacherKey = `TCH-${crypto.randomUUID()
      .replaceAll("-", "")
      .slice(0, 8)
      .toUpperCase()}`;

    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL ||
      "https://edutrack-ai-98ka.vercel.app";

    // Invite the teacher through Supabase Auth.
    const { data: inviteData, error: inviteError } =
      await supabase.auth.admin.inviteUserByEmail(email, {
        data: {
          full_name: fullName,
          role: "teacher",
          school_id: adminProfile.school_id,
          teacher_key: teacherKey,
        },
        redirectTo: `${siteUrl}/teacher-setup`,
      });

    if (inviteError || !inviteData.user) {
      return NextResponse.json(
        { error: inviteError?.message || "Could not invite the teacher." },
        { status: 400 }
      );
    }

    // Create the teacher's school profile.
    const { error: insertError } = await supabase
      .from("profiles")
      .insert({
        user_id: inviteData.user.id,
        school_id: adminProfile.school_id,
        full_name: fullName,
        role: "teacher",
        teacher_key: teacherKey,
      });

    if (insertError) {
      // Remove the invited Auth user if profile creation fails.
      await supabase.auth.admin.deleteUser(inviteData.user.id);

      return NextResponse.json(
        { error: `Teacher profile could not be created: ${insertError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Teacher invitation sent successfully.",
      teacher: {
        fullName,
        email,
        teacherKey,
      },
    });
  } catch {
    return NextResponse.json(
      { error: "An unexpected server error occurred." },
      { status: 500 }
    );
  }
}
