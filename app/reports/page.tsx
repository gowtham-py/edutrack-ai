
"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  BarChart3,
  CalendarCheck,
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  Download,
  Printer,
  Search,
  Filter,
  ArrowUpDown,
  RefreshCw,
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
  sessionId: string;
  studentName: string;
  admissionNumber: string;
  className: string;
  classId: string;
  subjectName: string;
  subjectId: string;
  teacherName: string;
  status: string;
  markedAt: string;
  sessionDate: string;
};

type SortKey =
  | "studentName"
  | "admissionNumber"
  | "className"
  | "subjectName"
  | "status"
  | "teacherName"
  | "sessionDate";

const initialStats: ReportStats = {
  sessions: 0,
  present: 0,
  absent: 0,
  late: 0,
  halfDay: 0,
  leave: 0,
};

export default function ReportsPage() {
  const [details, setDetails] = useState<AttendanceDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");

  const [classes, setClasses] = useState<
    { id: string; label: string }[]
  >([]);
  const [subjects, setSubjects] = useState<
    { id: string; name: string }[]
  >([]);

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [classFilter, setClassFilter] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const [sortBy, setSortBy] = useState<SortKey>("sessionDate");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  async function loadReports() {
    setLoading(true);
    setMessage("");

    try {
      const { data: authData, error: authError } =
        await supabase.auth.getUser();

      if (authError || !authData.user) {
        setMessage("Please log in again.");
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("school_id, role")
        .eq("user_id", authData.user.id)
        .maybeSingle();

      if (profileError || !profile?.school_id) {
        setMessage("We couldn't find your school profile.");
        return;
      }

      let sessionQuery = supabase
        .from("attendance_sessions")
        .select(
          "id, session_date, started_at, class_id, subject_id, teacher_id"
        )
        .eq("school_id", profile.school_id)
        .order("started_at", { ascending: false })
        .limit(1000);

      if (profile.role === "teacher") {
        sessionQuery = sessionQuery.eq("teacher_id", authData.user.id);
      }

      const { data: sessions, error: sessionError } = await sessionQuery;

      if (sessionError) {
        setMessage(sessionError.message);
        return;
      }

      const sessionList = sessions || [];
      const sessionIds = sessionList.map((session) => session.id);

      const [
        classesResult,
        subjectsResult,
      ] = await Promise.all([
        supabase
          .from("classes")
          .select("id, class_name, section")
          .eq("school_id", profile.school_id),
        supabase
          .from("subjects")
          .select("id, subject_name")
          .eq("school_id", profile.school_id),
      ]);

      if (classesResult.error || subjectsResult.error) {
        setMessage(
          classesResult.error?.message ||
            subjectsResult.error?.message ||
            "Unable to load filters."
        );
        return;
      }

      const classList = classesResult.data || [];
      const subjectList = subjectsResult.data || [];

      setClasses(
        classList.map((item) => ({
          id: item.id,
          label: `${item.class_name}${item.section ? ` - ${item.section}` : ""}`,
        }))
      );

      setSubjects(
        subjectList.map((item) => ({
          id: item.id,
          name: item.subject_name,
        }))
      );

      if (sessionIds.length === 0) {
        setDetails([]);
        return;
      }

      const { data: records, error: recordsError } = await supabase
        .from("attendance_records")
        .select("id, session_id, student_id, status, marked_by, marked_at")
        .in("session_id", sessionIds);

      if (recordsError) {
        setMessage(recordsError.message);
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

      const [
        studentsResult,
        teachersResult,
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
      ]);

      if (studentsResult.error || teachersResult.error) {
        setMessage(
          studentsResult.error?.message ||
            teachersResult.error?.message ||
            "Unable to load student and teacher details."
        );
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
        classList.map((item) => [
          item.id,
          `${item.class_name}${item.section ? ` - ${item.section}` : ""}`,
        ])
      );

      const subjectMap = new Map(
        subjectList.map((item) => [
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
          sessionId: record.session_id,
          studentName: student?.full_name || "Unknown student",
          admissionNumber: student?.admission_number || "—",
          classId: session?.class_id || "",
          className: session
            ? classMap.get(session.class_id) || "Unknown class"
            : "Unknown class",
          subjectId: session?.subject_id || "",
          subjectName: session
            ? subjectMap.get(session.subject_id) || "Unknown subject"
            : "Unknown subject",
          teacherName: record.marked_by
            ? teacherMap.get(record.marked_by) || "Unknown user"
            : "—",
          status: record.status,
          markedAt: record.marked_at,
          sessionDate: session?.session_date || "—",
        };
      });

      setDetails(reportDetails);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Something went wrong while loading reports."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadReports();
  }, []);

  const filteredDetails = useMemo(() => {
    const filtered = details.filter((record) => {
      const matchesSearch =
        record.studentName.toLowerCase().includes(search.toLowerCase()) ||
        record.admissionNumber.toLowerCase().includes(search.toLowerCase());

      const matchesStart =
        !startDate || record.sessionDate >= startDate;

      const matchesEnd =
        !endDate || record.sessionDate <= endDate;

      const matchesClass =
        !classFilter || record.classId === classFilter;

      const matchesSubject =
        !subjectFilter || record.subjectId === subjectFilter;

      const matchesStatus =
        !statusFilter || record.status === statusFilter;

      return (
        matchesSearch &&
        matchesStart &&
        matchesEnd &&
        matchesClass &&
        matchesSubject &&
        matchesStatus
      );
    });

    filtered.sort((a, b) => {
      const first = String(a[sortBy] || "").toLowerCase();
      const second = String(b[sortBy] || "").toLowerCase();

      const comparison = first.localeCompare(second, undefined, {
        numeric: true,
      });

      return sortDirection === "asc" ? comparison : -comparison;
    });

    return filtered;
  }, [
    details,
    search,
    startDate,
    endDate,
    classFilter,
    subjectFilter,
    statusFilter,
    sortBy,
    sortDirection,
  ]);

  const stats: ReportStats = useMemo(() => {
    const sessionIds = new Set(
      filteredDetails.map((record) => record.sessionId)
    );

    return {
      sessions: sessionIds.size,
      present: filteredDetails.filter((r) => r.status === "present").length,
      absent: filteredDetails.filter((r) => r.status === "absent").length,
      late: filteredDetails.filter((r) => r.status === "late").length,
      halfDay: filteredDetails.filter((r) => r.status === "half_day").length,
      leave: filteredDetails.filter((r) => r.status === "approved_leave").length,
    };
  }, [filteredDetails]);

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

  function handleSort(key: SortKey) {
    if (sortBy === key) {
      setSortDirection((current) =>
        current === "asc" ? "desc" : "asc"
      );
    } else {
      setSortBy(key);
      setSortDirection("asc");
    }
  }

  function resetFilters() {
    setSearch("");
    setStartDate("");
    setEndDate("");
    setClassFilter("");
    setSubjectFilter("");
    setStatusFilter("");
  }

  function exportCSV() {
    const headers = [
      "Student",
      "Admission Number",
      "Class",
      "Subject",
      "Status",
      "Marked By",
      "Session Date",
      "Marked At",
    ];

    const escapeCSV = (value: string) =>
      `"${String(value).replace(/"/g, '""')}"`;

    const csvRows = filteredDetails.map((record) => [
      record.studentName,
      record.admissionNumber,
      record.className,
      record.subjectName,
      statusLabel(record.status),
      record.teacherName,
      record.sessionDate,
      record.markedAt
        ? new Date(record.markedAt).toLocaleString()
        : "—",
    ]);

    const csv = [
      headers.map(escapeCSV).join(","),
      ...csvRows.map((row) => row.map(escapeCSV).join(",")),
    ].join("\r\n");

    const blob = new Blob(["\uFEFF" + csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "EduTrack-AI-Attendance-Report.csv";
    link.click();

    URL.revokeObjectURL(url);
  }

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

  const sortHeader = (label: string, key: SortKey) => (
    <th className="px-5 py-4">
      <button
        type="button"
        onClick={() => handleSort(key)}
        className="inline-flex items-center gap-2 hover:text-emerald-700"
      >
        {label}
        <ArrowUpDown size={13} />
      </button>
    </th>
  );

  return (
    <div className="space-y-7">
      <style jsx global>{`
        @media print {
          aside,
          nav,
          header,
          .no-print {
            display: none !important;
          }

          body {
            background: white !important;
          }

          main {
            margin: 0 !important;
            padding: 0 !important;
          }

          table {
            width: 100% !important;
            min-width: 0 !important;
            font-size: 10px !important;
          }

          th,
          td {
            padding: 6px !important;
          }
        }
      `}</style>

      <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-[#193B32]">
            Attendance Reports
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Analyse, filter and export your school's attendance records.
          </p>
        </div>

        <div className="no-print flex flex-wrap gap-2">
          <button
            onClick={loadReports}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw size={16} />
            Refresh
          </button>

          <button
            onClick={exportCSV}
            disabled={loading || filteredDetails.length === 0}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"
          >
            <Download size={16} />
            Export CSV
          </button>

          <button
            onClick={() => window.print()}
            disabled={loading || filteredDetails.length === 0}
            className="inline-flex items-center gap-2 rounded-xl bg-[#193B32] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#285548] disabled:opacity-50"
          >
            <Printer size={16} />
            Save as PDF
          </button>
        </div>
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

          <section className="no-print rounded-2xl border border-[#E8EEE9] bg-white p-5 shadow-sm">
            <div className="mb-5 flex items-center gap-2">
              <Filter className="text-emerald-700" size={20} />
              <div>
                <h2 className="font-bold text-[#193B32]">
                  Filter attendance
                </h2>
                <p className="text-xs text-gray-500">
                  All summary figures and records update with your filters.
                </p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-600">
                  From date
                </label>
                <input
                  type="date"
                  value={startDate}
                  max={endDate || undefined}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-emerald-600"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-600">
                  To date
                </label>
                <input
                  type="date"
                  value={endDate}
                  min={startDate || undefined}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-emerald-600"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-600">
                  Class and section
                </label>
                <select
                  value={classFilter}
                  onChange={(e) => setClassFilter(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-600"
                >
                  <option value="">All classes</option>
                  {classes.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-600">
                  Subject
                </label>
                <select
                  value={subjectFilter}
                  onChange={(e) => setSubjectFilter(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-600"
                >
                  <option value="">All subjects</option>
                  {subjects.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-600">
                  Attendance status
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-600"
                >
                  <option value="">All statuses</option>
                  <option value="present">Present</option>
                  <option value="absent">Absent</option>
                  <option value="late">Late</option>
                  <option value="half_day">Half-day</option>
                  <option value="approved_leave">Approved leave</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-600">
                  Search student
                </label>
                <div className="relative">
                  <Search
                    size={17}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Name or admission number"
                    className="w-full rounded-xl border border-gray-200 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-emerald-600"
                  />
                </div>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-gray-500">
                Showing{" "}
                <strong className="text-[#193B32]">
                  {filteredDetails.length}
                </strong>{" "}
                of {details.length} records
              </p>

              <button
                onClick={resetFilters}
                className="text-sm font-semibold text-emerald-700 hover:text-emerald-900"
              >
                Clear all filters
              </button>
            </div>
          </section>

          <section className="rounded-2xl border border-[#E8EEE9] bg-white p-5 shadow-sm">
            <h2 className="font-bold text-[#193B32]">
              Attendance breakdown
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Counts for the currently selected filters.
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
                Select a column heading to sort the records.
              </p>
            </div>

            {filteredDetails.length === 0 ? (
              <div className="p-10 text-center">
                <CalendarCheck
                  className="mx-auto mb-3 text-gray-300"
                  size={35}
                />
                <p className="font-semibold text-gray-600">
                  No attendance records found
                </p>
                <p className="mt-1 text-sm text-gray-400">
                  Try changing your filters or search.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[950px] text-left text-sm">
                  <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                    <tr>
                      {sortHeader("Student", "studentName")}
                      {sortHeader("Admission No.", "admissionNumber")}
                      {sortHeader("Class", "className")}
                      {sortHeader("Subject", "subjectName")}
                      {sortHeader("Status", "status")}
                      {sortHeader("Marked by", "teacherName")}
                      {sortHeader("Date", "sessionDate")}
                      <th className="px-5 py-4">Time</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-gray-100">
                    {filteredDetails.map((record) => (
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
                          {record.sessionDate}
                        </td>
                        <td className="px-5 py-4 text-gray-500">
                          {record.markedAt
                            ? new Date(record.markedAt).toLocaleTimeString()
                            : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="border-t border-gray-100 px-5 py-3 text-xs text-gray-400">
              Report data is limited to the latest 1,000 attendance sessions.
              Approved leave is excluded from the attendance-rate calculation.
            </div>
          </section>
        </>
      )}
    </div>
  );
}
