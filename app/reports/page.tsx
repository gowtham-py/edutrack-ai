
"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  BarChart3,
  CalendarCheck,
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
} from "lucide-react";

type ReportStats = {
  sessions: number;
  present: number;
  absent: number;
  late: number;
  halfDay: number;
  leave: number;
};

type AttendanceDetail = {
  id: string;
  studentName: string;
  admissionNumber: string;
  className: string;
  subjectName: string;
  teacherName: string;
  status: string;
  markedAt: string;
  sessionDate: string;
};

const initialStats: ReportStats = {
  sessions: 0,
  present: 0,
  absent: 0,
  late: 0,
  halfDay: 0,
  leave: 0,
};

export default function ReportsPage() {
  const [stats, setStats] = useState(initialStats);
  const [details, setDetails] = useState<AttendanceDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function loadReports() {
      setLoading(true);
      setMessage("");

      const { data: authData } = await supabase.auth.getUser();

      if (!authData.user) {
        setMessage("Please log in again.");
        setLoading(false);
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("school_id, role")
        .eq("user_id", authData.user.id)
        .maybeSingle();

      if (profileError || !profile?.school_id) {
        setMessage("We couldn't find your school profile.");
        setLoading(false);
        return;
      }

      let sessionQuery = supabase
        .from("attendance_sessions")
        .select(
          "id, session_date, started_at, class_id, subject_id, teacher_id"
        )
        .eq("school_id", profile.school_id)
        .order("started_at", { ascending: false })
        .limit(200);

      if (profile.role === "teacher") {
        sessionQuery = sessionQuery.eq("teacher_id", authData.user.id);
      }

      const { data: sessions, error: sessionError } = await sessionQuery;

      if (sessionError) {
        setMessage(sessionError.message);
        setLoading(false);
        return;
      }

      const sessionList = sessions || [];
      const sessionIds = sessionList.map((session) => session.id);

      if (sessionIds.length === 0) {
        setStats(initialStats);
        setDetails([]);
        setLoading(false);
        return;
      }

      const { data: records, error: recordsError } = await supabase
        .from("attendance_records")
        .select("id, session_id, student_id, status, marked_by, marked_at")
        .in("session_id", sessionIds);

      if (recordsError) {
        setMessage(recordsError.message);
        setLoading(false);
        return;
      }

      const rows = records || [];

      const studentIds = [...new Set(rows.map((row) => row.student_id))];
      const teacherIds = [
        ...new Set(
          rows
            .map((row) => row.marked_by)
            .filter((id): id is string => Boolean(id))
        ),
      ];
      const classIds = [
        ...new Set(sessionList.map((session) => session.class_id)),
      ];
      const subjectIds = [
        ...new Set(sessionList.map((session) => session.subject_id)),
      ];

      const [
        studentsResult,
        teachersResult,
        classesResult,
        subjectsResult,
      ] = await Promise.all([
        studentIds.length
          ? supabase
              .from("students")
              .select("id, full_name, admission_number")
              .in("id", studentIds)
          : Promise.resolve({ data: [], error: null }),

        teacherIds.length
          ? supabase
              .from("profiles")
              .select("user_id, full_name")
              .in("user_id", teacherIds)
          : Promise.resolve({ data: [], error: null }),

        classIds.length
          ? supabase
              .from("classes")
              .select("id, class_name, section")
              .in("id", classIds)
          : Promise.resolve({ data: [], error: null }),

        subjectIds.length
          ? supabase
              .from("subjects")
              .select("id, subject_name")
              .in("id", subjectIds)
          : Promise.resolve({ data: [], error: null }),
      ]);

      if (
        studentsResult.error ||
        teachersResult.error ||
        classesResult.error ||
        subjectsResult.error
      ) {
        setMessage(
          studentsResult.error?.message ||
            teachersResult.error?.message ||
            classesResult.error?.message ||
            subjectsResult.error?.message ||
            "Unable to load report details."
        );
        setLoading(false);
        return;
      }

      const studentMap = new Map(
        (studentsResult.data || []).map((student) => [
          student.id,
          student,
        ])
      );

      const teacherMap = new Map(
        (teachersResult.data || []).map((teacher) => [
          teacher.user_id,
          teacher.full_name,
        ])
      );

      const classMap = new Map(
        (classesResult.data || []).map((item) => [
          item.id,
          `${item.class_name} - ${item.section}`,
        ])
      );

      const subjectMap = new Map(
        (subjectsResult.data || []).map((item) => [
          item.id,
          item.subject_name,
        ])
      );

      const sessionMap = new Map(
        sessionList.map((session) => [session.id, session])
      );

      const reportDetails: AttendanceDetail[] = rows.map((record) => {
        const student = studentMap.get(record.student_id);
        const session = sessionMap.get(record.session_id);

        return {
          id: record.id,
          studentName: student?.full_name || "Unknown student",
          admissionNumber: student?.admission_number || "—",
          className: session
            ? classMap.get(session.class_id) || "Unknown class"
            : "Unknown class",
          subjectName: session
            ? subjectMap.get(session.subject_id) || "Unknown subject"
            : "Unknown subject",
          teacherName: record.marked_by
            ? teacherMap.get(record.marked_by) || "Unknown teacher"
            : "—",
          status: record.status,
          markedAt: record.marked_at,
          sessionDate: session?.session_date || "—",
        };
      });

      setDetails(reportDetails);

      setStats({
        sessions: sessionIds.length,
        present: rows.filter((row) => row.status === "present").length,
        absent: rows.filter((row) => row.status === "absent").length,
        late: rows.filter((row) => row.status === "late").length,
        halfDay: rows.filter((row) => row.status === "half_day").length,
        leave: rows.filter((row) => row.status === "approved_leave").length,
      });

      setLoading(false);
    }

    loadReports();
  }, []);

  const totalRecords =
    stats.present +
    stats.absent +
    stats.late +
    stats.halfDay +
    stats.leave;

  const eligibleRecords = totalRecords - stats.leave;

  const attendanceRate =
    eligibleRecords > 0
      ? Math.round(
          ((stats.present + stats.late + stats.halfDay * 0.5) /
            eligibleRecords) *
            100
        )
      : 0;

  const cards = [
    {
      label: "Present",
      value: stats.present,
      icon: CheckCircle2,
      color: "bg-emerald-100 text-emerald-700",
    },
    {
      label: "Absent",
      value: stats.absent,
      icon: XCircle,
      color: "bg-red-100 text-red-700",
    },
    {
      label: "Late",
      value: stats.late,
      icon: Clock,
      color: "bg-amber-100 text-amber-700",
    },
    {
      label: "Half-day",
      value: stats.halfDay,
      icon: Users,
      color: "bg-violet-100 text-violet-700",
    },
    {
      label: "Approved leave",
      value: stats.leave,
      icon: CalendarCheck,
      color: "bg-sky-100 text-sky-700",
    },
  ];

  function statusStyle(status: string) {
    switch (status) {
      case "present":
        return "bg-emerald-100 text-emerald-700";
      case "absent":
        return "bg-red-100 text-red-700";
      case "late":
        return "bg-amber-100 text-amber-700";
      case "half_day":
        return "bg-violet-100 text-violet-700";
      case "approved_leave":
        return "bg-sky-100 text-sky-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  }

  function statusLabel(status: string) {
    return status.replaceAll("_", " ").replace(/\b\w/g, (letter) =>
      letter.toUpperCase()
    );
  }

  return (
    <div className="space-y-7">
      <section>
        <h1 className="text-2xl font-bold text-[#193B32]">
          Attendance Reports
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          A summary and detailed view of saved attendance records.
        </p>
      </section>

      {message && (
        <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
          {message}
        </div>
      )}

      {loading ? (
        <div className="flex min-h-60 items-center justify-center gap-3 text-sm text-gray-500">
          <Loader2 className="animate-spin" size={20} />
          Loading reports...
        </div>
      ) : (
        <>
          <section className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-[#E8EEE9] bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">
                    Attendance sessions
                  </p>
                  <p className="mt-2 text-3xl font-bold text-[#193B32]">
                    {stats.sessions}
                  </p>
                </div>
                <div className="rounded-xl bg-emerald-100 p-3 text-emerald-700">
                  <CalendarCheck size={25} />
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-[#E8EEE9] bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">
                    Overall attendance rate
                  </p>
                  <p className="mt-2 text-3xl font-bold text-[#193B32]">
                    {attendanceRate}%
                  </p>
                </div>
                <div className="rounded-xl bg-violet-100 p-3 text-violet-700">
                  <BarChart3 size={25} />
                </div>
              </div>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-gray-100">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all"
                  style={{ width: `${attendanceRate}%` }}
                />
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-[#E8EEE9] bg-white p-6 shadow-sm">
            <h2 className="font-bold text-[#193B32]">
              Attendance breakdown
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Counts from saved attendance records.
            </p>

            <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {cards.map((card) => {
                const Icon = card.icon;

                return (
                  <div
                    key={card.label}
                    className="flex items-center gap-4 rounded-xl border border-gray-100 p-4"
                  >
                    <div className={`rounded-xl p-3 ${card.color}`}>
                      <Icon size={21} />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">{card.label}</p>
                      <p className="text-2xl font-bold text-[#193B32]">
                        {card.value}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="overflow-hidden rounded-2xl border border-[#E8EEE9] bg-white shadow-sm">
            <div className="border-b border-gray-100 p-5">
              <h2 className="font-bold text-[#193B32]">
                Detailed attendance records
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Student names, admission numbers, teachers and attendance status.
              </p>
            </div>

            {details.length === 0 ? (
              <div className="p-10 text-center text-sm text-gray-500">
                No detailed attendance records found yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px] text-left text-sm">
                  <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                    <tr>
                      <th className="px-5 py-4">Student</th>
                      <th className="px-5 py-4">Admission No.</th>
                      <th className="px-5 py-4">Class</th>
                      <th className="px-5 py-4">Subject</th>
                      <th className="px-5 py-4">Status</th>
                      <th className="px-5 py-4">Marked by</th>
                      <th className="px-5 py-4">Date & time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {details.map((record) => (
                      <tr key={record.id} className="hover:bg-gray-50">
                        <td className="px-5 py-4 font-semibold text-[#193B32]">
                          {record.studentName}
                        </td>
                        <td className="px-5 py-4 text-gray-600">
                          {record.admissionNumber}
                        </td>
                        <td className="px-5 py-4 text-gray-600">
                          {record.className}
                        </td>
                        <td className="px-5 py-4 text-gray-600">
                          {record.subjectName}
                        </td>
                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusStyle(record.status)}`}
                          >
                            {statusLabel(record.status)}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-gray-600">
                          {record.teacherName}
                        </td>
                        <td className="px-5 py-4 text-gray-600">
                          <p>{record.sessionDate}</p>
                          <p className="mt-1 text-xs text-gray-400">
                            {record.markedAt
                              ? new Date(record.markedAt).toLocaleString()
                              : "—"}
                          </p>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="border-t border-gray-100 px-5 py-3 text-xs text-gray-400">
              Showing records from the latest 200 attendance sessions.
            </div>
          </section>

          <p className="text-xs leading-5 text-gray-400">
            Approved leave is excluded from the attendance-rate calculation.
            Detailed reports currently show the latest 200 sessions. Date
            filters and PDF/Excel exports can be added later.
          </p>
        </>
      )}
    </div>
  );
}
