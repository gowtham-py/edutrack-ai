
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";

const GEMINI_MODEL = "gemini-3.5-flash-lite";

type UserContext = {
  role: string;
  name: string;
  schoolId: string;
  data: Record<string, unknown>;
};

function errorResponse(message: string, status = 400) {
  return NextResponse.json({ success: false, error: message }, { status });
}

async function getUserContext(userId: string): Promise<UserContext | null> {
  const { data: profile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("user_id, school_id, full_name, role")
    .eq("user_id", userId)
    .maybeSingle();

  if (profileError) throw profileError;

  // Admin access: only the user's own school.
  if (
    profile &&
    ["school_admin", "principal"].includes(profile.role) &&
    profile.school_id
  ) {
    const schoolId = profile.school_id;

    const [
      studentsResult,
      teachersResult,
      classesResult,
      invoicesResult,
      sessionsResult,
    ] = await Promise.all([
      supabaseAdmin
        .from("students")
        .select("id", { count: "exact", head: true })
        .eq("school_id", schoolId),

      supabaseAdmin
        .from("profiles")
        .select("user_id", { count: "exact", head: true })
        .eq("school_id", schoolId)
        .eq("role", "teacher"),

      supabaseAdmin
        .from("classes")
        .select("id, class_name, section")
        .eq("school_id", schoolId),

      supabaseAdmin
        .from("fee_invoices")
        .select("total_amount, paid_amount, status, due_date")
        .eq("school_id", schoolId)
        .limit(500),

      supabaseAdmin
        .from("attendance_sessions")
        .select("id, session_date, class_id, subject_id, teacher_id, is_locked")
        .eq("school_id", schoolId)
        .order("session_date", { ascending: false })
        .limit(300),
    ]);

    if (
      studentsResult.error ||
      teachersResult.error ||
      classesResult.error ||
      invoicesResult.error ||
      sessionsResult.error
    ) {
      throw new Error("Unable to retrieve school information.");
    }

    const sessionIds = (sessionsResult.data || []).map((s) => s.id);

    const { data: attendanceRecords, error: attendanceError } =
      sessionIds.length > 0
        ? await supabaseAdmin
            .from("attendance_records")
            .select("session_id, student_id, status")
            .in("session_id", sessionIds)
            .limit(5000)
        : { data: [], error: null };

    if (attendanceError) throw attendanceError;

    const invoices = invoicesResult.data || [];
    const totalFees = invoices.reduce(
      (sum, item) => sum + Number(item.total_amount || 0),
      0
    );
    const paidFees = invoices.reduce(
      (sum, item) => sum + Number(item.paid_amount || 0),
      0
    );

    return {
      role: profile.role,
      name: profile.full_name || "School Admin",
      schoolId,
      data: {
        totalStudents: studentsResult.count || 0,
        totalTeachers: teachersResult.count || 0,
        classes: classesResult.data || [],
        totalInvoices: invoices.length,
        totalFees,
        paidFees,
        outstandingFees: Math.max(0, totalFees - paidFees),
        recentInvoices: invoices.slice(0, 100),
        attendanceSessions: sessionsResult.data || [],
        attendanceRecords: attendanceRecords || [],
        attendanceRecordsRetrieved: (attendanceRecords || []).length,
      },
    };
  }

  // Teacher access: only assigned classes and subjects.
  if (profile?.role === "teacher" && profile.school_id) {
    const schoolId = profile.school_id;

    const { data: assignments, error: assignmentError } =
      await supabaseAdmin
        .from("teacher_assignments")
        .select("class_id, subject_id")
        .eq("teacher_id", userId)
        .eq("school_id", schoolId);

    if (assignmentError) throw assignmentError;

    const classIds = [...new Set((assignments || []).map((a) => a.class_id))];

    const { data: sessions, error: sessionError } =
      classIds.length > 0
        ? await supabaseAdmin
            .from("attendance_sessions")
            .select("id, session_date, class_id, subject_id, is_locked")
            .eq("school_id", schoolId)
            .eq("teacher_id", userId)
            .in("class_id", classIds)
            .order("session_date", { ascending: false })
            .limit(200)
        : { data: [], error: null };

    if (sessionError) throw sessionError;

    const sessionIds = (sessions || []).map((s) => s.id);

    const { data: records, error: recordsError } =
      sessionIds.length > 0
        ? await supabaseAdmin
            .from("attendance_records")
            .select("session_id, student_id, status")
            .in("session_id", sessionIds)
            .limit(3000)
        : { data: [], error: null };

    if (recordsError) throw recordsError;

    const [{ data: classes }, { data: subjects }] = await Promise.all([
      classIds.length > 0
        ? supabaseAdmin
            .from("classes")
            .select("id, class_name, section")
            .eq("school_id", schoolId)
            .in("id", classIds)
        : Promise.resolve({ data: [] }),

      assignments?.length
        ? supabaseAdmin
            .from("subjects")
            .select("id, subject_name")
            .eq("school_id", schoolId)
            .in("id", [...new Set(assignments.map((a) => a.subject_id))])
        : Promise.resolve({ data: [] }),
    ]);

    return {
      role: "teacher",
      name: profile.full_name || "Teacher",
      schoolId,
      data: {
        assignments,
        classes: classes || [],
        subjects: subjects || [],
        attendanceSessions: sessions || [],
        attendanceRecords: records || [],
      },
    };
  }

  // Student access: authenticate through student_accounts.
  const { data: studentAccount, error: studentError } =
    await supabaseAdmin
      .from("student_accounts")
      .select("student_id, school_id")
      .eq("auth_user_id", userId)
      .maybeSingle();

  if (studentError) throw studentError;
  if (!studentAccount) return null;

  const { data: student, error: studentDetailsError } =
    await supabaseAdmin
      .from("students")
      .select("id, full_name, admission_number, class_id")
      .eq("id", studentAccount.student_id)
      .eq("school_id", studentAccount.school_id)
      .maybeSingle();

  if (studentDetailsError) throw studentDetailsError;
  if (!student) return null;

  const [
    invoicesResult,
    recordsResult,
    classResult,
  ] = await Promise.all([
    supabaseAdmin
      .from("fee_invoices")
      .select("invoice_number, academic_year, billing_period, total_amount, paid_amount, due_date, status")
      .eq("student_id", student.id)
      .eq("school_id", studentAccount.school_id)
      .order("created_at", { ascending: false })
      .limit(100),

    supabaseAdmin
      .from("attendance_records")
      .select("session_id, status, marked_at")
      .eq("student_id", student.id)
      .order("marked_at", { ascending: false })
      .limit(500),

    supabaseAdmin
      .from("classes")
      .select("class_name, section")
      .eq("id", student.class_id)
      .eq("school_id", studentAccount.school_id)
      .maybeSingle(),
  ]);

  if (invoicesResult.error || recordsResult.error || classResult.error) {
    throw new Error("Unable to retrieve student information.");
  }

  const records = recordsResult.data || [];
  const sessionIds = [...new Set(records.map((r) => r.session_id))];

  const { data: sessions, error: studentSessionsError } =
    sessionIds.length > 0
      ? await supabaseAdmin
          .from("attendance_sessions")
          .select("id, session_date, subject_id")
          .eq("school_id", studentAccount.school_id)
          .in("id", sessionIds)
        : { data: [], error: null };

  if (studentSessionsError) throw studentSessionsError;

  const subjectIds = [...new Set((sessions || []).map((s) => s.subject_id))];

  const { data: subjects, error: subjectsError } =
    subjectIds.length > 0
      ? await supabaseAdmin
          .from("subjects")
          .select("id, subject_name")
          .eq("school_id", studentAccount.school_id)
          .in("id", subjectIds)
      : { data: [], error: null };

  if (subjectsError) throw subjectsError;

  return {
    role: "student",
    name: student.full_name,
    schoolId: studentAccount.school_id,
    data: {
      student: {
        name: student.full_name,
        admissionNumber: student.admission_number,
        class: classResult.data,
      },
      invoices: invoicesResult.data || [],
      attendanceRecords: records,
      attendanceSessions: sessions || [],
      subjects: subjects || [],
    },
  };
}

export async function POST(request: NextRequest) {
  try {
    const authorization = request.headers.get("authorization");
    const accessToken = authorization?.startsWith("Bearer ")
      ? authorization.slice(7)
      : null;

    if (!accessToken) {
      return errorResponse("Please log in to use the AI Copilot.", 401);
    }

    const { data: authData, error: authError } =
      await supabaseAdmin.auth.getUser(accessToken);

    if (authError || !authData.user) {
      return errorResponse("Your session is invalid. Please log in again.", 401);
    }

    const body = await request.json();
    const message =
      typeof body.message === "string" ? body.message.trim() : "";

    if (!message || message.length > 1000) {
      return errorResponse("Please enter a message (maximum 1000 characters).");
    }

    const context = await getUserContext(authData.user.id);

    if (!context) {
      return errorResponse("Your account does not have an active Copilot profile.", 403);
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return errorResponse("AI service is not configured.", 500);
    }

    const systemInstruction = `
You are EduTrack AI Copilot, an educational institution assistant.

The authenticated user:
- Name: ${context.name}
- Role: ${context.role}

You must follow these rules:
1. Answer only using the verified information in the supplied data.
2. Never invent student names, fees, payments, attendance, or school statistics.
3. Never reveal information about other schools.
4. Students can only receive information about themselves.
5. Teachers can only receive information from their assigned classes and subjects.
6. School admins can receive information about their own school.
7. Do not claim that you performed an action, changed attendance, or processed a payment.
8. If information is unavailable, explain that clearly.
9. Use Indian Rupees (₹) for fee amounts.
10. Be friendly, clear, and concise. Use tables or bullet points when helpful.

Verified database information:
${JSON.stringify(context.data)}
`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: systemInstruction }],
          },
          contents: [
            {
              role: "user",
              parts: [{ text: message }],
            },
          ],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 1200,
          },
        }),
        signal: AbortSignal.timeout(30000),
      }
    );

    if (!response.ok) {
      console.error("Gemini API error:", await response.text());
      return errorResponse("The AI assistant could not respond right now. Please try again.", 502);
    }

    const result = await response.json();
    const reply =
      result.candidates?.[0]?.content?.parts
        ?.map((part: { text?: string }) => part.text || "")
        .join("")
        .trim() || "";

    if (!reply) {
      return errorResponse("The AI assistant returned an empty response. Please try again.", 502);
    }

    return NextResponse.json({
      success: true,
      reply,
      role: context.role,
      aiPowered: true,
      model: GEMINI_MODEL,
    });
  } catch (error) {
    console.error("AI Copilot error:", error);
    return errorResponse("Something went wrong while processing your request.", 500);
  }
}
