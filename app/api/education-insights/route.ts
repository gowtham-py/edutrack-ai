
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";

const GEMINI_MODEL = "gemini-3.5-flash-lite";
const SESSION_LIMIT = 1000;
const ATTENDANCE_THRESHOLD = 75;

type AttendanceRecord = {
  id: string;
  session_id: string;
  student_id: string;
  status: string;
  marked_at: string | null;
};

type AttendanceSession = {
  id: string;
  session_date: string;
  class_id: string;
  subject_id: string;
  teacher_id: string;
};

function attendanceWeight(status: string): number | null {
  switch (status.toLowerCase()) {
    case "present":
      return 1;
    case "late":
      return 1;
    case "half_day":
    case "halfday":
      return 0.5;
    case "absent":
      return 0;
    default:
      return null;
  }
}

function calculateRate(records: AttendanceRecord[]) {
  let earned = 0;
  let eligible = 0;

  for (const record of records) {
    const weight = attendanceWeight(record.status);

    if (weight === null) continue;

    earned += weight;
    eligible += 1;
  }

  return eligible > 0 ? Math.round((earned / eligible) * 100) : 0;
}

async function generateAIInsights(data: {
  role: string;
  attendanceRate: number;
  totalRecords: number;
  present: number;
  absent: number;
  late: number;
  halfDay: number;
  previousRate: number | null;
  shortageCount: number;
  classInsights: {
    className: string;
    attendanceRate: number;
    totalRecords: number;
  }[];
}) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return {
      summary: "Your attendance insights are ready. Gemini AI is currently not configured.",
      recommendations: [
        "Review classes with lower attendance.",
        "Follow up on students with attendance below the configured threshold.",
        "Compare recent attendance with previous periods.",
      ],
      aiPowered: false,
    };
  }

  const prompt = `
You are EduTrack AI, an education analytics assistant.

Analyze the following verified, aggregated attendance information.

USER ROLE: ${data.role}

ATTENDANCE:
Overall attendance rate: ${data.attendanceRate}%
Total attendance records: ${data.totalRecords}
Present: ${data.present}
Absent: ${data.absent}
Late: ${data.late}
Half-day: ${data.halfDay}
Previous-period attendance rate: ${data.previousRate === null ? "Unavailable" : `${data.previousRate}%`}
Students below the provisional ${ATTENDANCE_THRESHOLD}% attendance threshold: ${data.shortageCount}

CLASS INSIGHTS:
${JSON.stringify(data.classInsights)}

Instructions:
1. Explain the attendance situation clearly.
2. Identify positive and concerning trends.
3. Suggest practical actions.
4. Never invent facts or figures.
5. Do not identify individual students.
6. Do not claim a prediction is certain.
7. If previous-period data is unavailable, say so.
8. Return valid JSON only, using this structure:
{
  "summary": "A concise explanation",
  "recommendations": ["Recommendation 1", "Recommendation 2", "Recommendation 3"]
}
`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: {
            parts: [
              {
                text: "You are a careful school attendance analytics assistant. Use only the supplied data.",
              },
            ],
          },
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.3,
            responseMimeType: "application/json",
          },
        }),
        signal: AbortSignal.timeout(45000),
      }
    );

    if (!response.ok) {
      throw new Error(`Gemini returned ${response.status}`);
    }

    const result = await response.json();
    const text = result.candidates?.[0]?.content?.parts
      ?.map((part: { text?: string }) => part.text || "")
      .join("");

    if (!text) throw new Error("Gemini returned an empty response");

    const parsed = JSON.parse(text);

    return {
      summary:
        typeof parsed.summary === "string"
          ? parsed.summary
          : "Attendance analysis completed.",
      recommendations: Array.isArray(parsed.recommendations)
        ? parsed.recommendations.filter(
            (item: unknown): item is string => typeof item === "string"
          ).slice(0, 5)
        : [],
      aiPowered: true,
    };
  } catch (error) {
    console.error("Education insights Gemini error:", error);

    return {
      summary:
        "Attendance statistics were calculated successfully, but AI recommendations are temporarily unavailable.",
      recommendations: [
        "Review classes with lower attendance.",
        "Follow up on students below the attendance threshold.",
        "Monitor attendance regularly.",
      ],
      aiPowered: false,
    };
  }
}

export async function GET(request: NextRequest) {
  return POST(request);
}

export async function POST(request: NextRequest) {
  try {
    const authorization = request.headers.get("authorization");
    const accessToken = authorization?.startsWith("Bearer ")
      ? authorization.slice(7)
      : null;

    if (!accessToken) {
      return NextResponse.json(
        { success: false, error: "Authentication required." },
        { status: 401 }
      );
    }

    const { data: authData, error: authError } =
      await supabaseAdmin.auth.getUser(accessToken);

    if (authError || !authData.user) {
      return NextResponse.json(
        { success: false, error: "Invalid or expired session." },
        { status: 401 }
      );
    }

    const userId = authData.user.id;

    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("school_id, role")
      .eq("user_id", userId)
      .maybeSingle();

    if (profileError || !profile) {
      return NextResponse.json(
        { success: false, error: "User profile not found." },
        { status: 403 }
      );
    }

    const role = String(profile.role || "").toLowerCase();
    const isSuperAdmin = role === "super_admin";

    const allowedRoles = [
      "super_admin",
      "school_admin",
      "principal",
      "teacher",
    ];

    if (!allowedRoles.includes(role)) {
      return NextResponse.json(
        { success: false, error: "You do not have access to education insights." },
        { status: 403 }
      );
    }

    if (!isSuperAdmin && !profile.school_id) {
      return NextResponse.json(
        { success: false, error: "Your school account is not configured." },
        { status: 403 }
      );
    }

    let sessionQuery = supabaseAdmin
      .from("attendance_sessions")
      .select("id, session_date, class_id, subject_id, teacher_id")
      .order("session_date", { ascending: false })
      .limit(SESSION_LIMIT);

    if (!isSuperAdmin) {
      sessionQuery = sessionQuery.eq("school_id", profile.school_id);
    }

    if (role === "teacher") {
      sessionQuery = sessionQuery.eq("teacher_id", userId);
    }

    const { data: sessions, error: sessionError } = await sessionQuery;

    if (sessionError) {
      console.error("Education insights sessions error:", sessionError);
      return NextResponse.json(
        { success: false, error: "Could not load attendance sessions." },
        { status: 500 }
      );
    }

    const sessionRows = (sessions || []) as AttendanceSession[];
    const sessionIds = sessionRows.map((session) => session.id);

    if (sessionIds.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          attendanceRate: 0,
          totalRecords: 0,
          present: 0,
          absent: 0,
          late: 0,
          halfDay: 0,
          shortageCount: 0,
          previousRate: null,
          classInsights: [],
          summary: "There are no attendance sessions available yet.",
          recommendations: [
            "Start recording attendance to generate insights.",
          ],
          aiPowered: false,
        },
      });
    }

    const { data: records, error: recordError } = await supabaseAdmin
      .from("attendance_records")
      .select("id, session_id, student_id, status, marked_at")
      .in("session_id", sessionIds)
      .limit(10000);

    if (recordError) {
      console.error("Education insights records error:", recordError);
      return NextResponse.json(
        { success: false, error: "Could not load attendance records." },
        { status: 500 }
      );
    }

    const attendanceRecords = (records || []) as AttendanceRecord[];

    const present = attendanceRecords.filter(
      (r) => r.status.toLowerCase() === "present"
    ).length;

    const absent = attendanceRecords.filter(
      (r) => r.status.toLowerCase() === "absent"
    ).length;

    const late = attendanceRecords.filter(
      (r) => r.status.toLowerCase() === "late"
    ).length;

    const halfDay = attendanceRecords.filter(
      (r) =>
        r.status.toLowerCase() === "half_day" ||
        r.status.toLowerCase() === "halfday"
    ).length;

    const attendanceRate = calculateRate(attendanceRecords);

    const studentRecords = new Map<string, AttendanceRecord[]>();

    for (const record of attendanceRecords) {
      const existing = studentRecords.get(record.student_id) || [];
      existing.push(record);
      studentRecords.set(record.student_id, existing);
    }

    const shortageCount = Array.from(studentRecords.values()).filter(
      (studentAttendance) =>
        studentAttendance.length >= 3 &&
        calculateRate(studentAttendance) < ATTENDANCE_THRESHOLD
    ).length;

    const previousIds = new Set(
      sessionRows.slice(Math.floor(sessionRows.length / 2)).map((s) => s.id)
    );

    const recentIds = new Set(
      sessionRows.slice(0, Math.floor(sessionRows.length / 2)).map((s) => s.id)
    );

    const recentRecords = attendanceRecords.filter((r) =>
      recentIds.has(r.session_id)
    );

    const previousRecords = attendanceRecords.filter((r) =>
      previousIds.has(r.session_id)
    );

    const previousRate =
      previousRecords.length > 0 ? calculateRate(previousRecords) : null;

    const classIds = Array.from(
      new Set(sessionRows.map((session) => session.class_id).filter(Boolean))
    );

    const { data: classes } = classIds.length
      ? await supabaseAdmin
          .from("classes")
          .select("id, name")
          .in("id", classIds)
      : { data: [] };

    const classNames = new Map(
      (classes || []).map((item) => [item.id, item.name])
    );

const classGroups = new Map<
  string,
  { records: AttendanceRecord[]; name: string }
>();

for (const session of sessionRows) {
  const group: { records: AttendanceRecord[]; name: string } =
    classGroups.get(session.class_id) ?? {
      records: [],
      name: classNames.get(session.class_id) || "Class",
    };

  const sessionRecords: AttendanceRecord[] = attendanceRecords.filter(
    (record) => record.session_id === session.id
  );

  group.records.push(...sessionRecords);

  classGroups.set(session.class_id, group);
}

    const classInsights = Array.from(classGroups.values())
      .map((group) => ({
        className: group.name,
        attendanceRate: calculateRate(group.records),
        totalRecords: group.records.length,
      }))
      .sort((a, b) => a.attendanceRate - b.attendanceRate)
      .slice(0, 20);

    const ai = await generateAIInsights({
      role,
      attendanceRate,
      totalRecords: attendanceRecords.length,
      present,
      absent,
      late,
      halfDay,
      previousRate,
      shortageCount,
      classInsights,
    });

    return NextResponse.json({
      success: true,
      data: {
        attendanceRate,
        totalRecords: attendanceRecords.length,
        present,
        absent,
        late,
        halfDay,
        shortageCount,
        previousRate,
        recentRate: recentRecords.length
          ? calculateRate(recentRecords)
          : null,
        classInsights,
        ...ai,
        dataNote: `Based on the latest ${sessionRows.length} attendance sessions. The ${ATTENDANCE_THRESHOLD}% shortage threshold is currently a provisional default.`,
      },
    });
  } catch (error) {
    console.error("Education insights API error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Unable to generate education insights right now.",
      },
      { status: 500 }
    );
  }
}
