
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  AlertCircle,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Clock3,
  GraduationCap,
  LogOut,
  RefreshCw,
  ShieldCheck,
  TrendingUp,
  UserRound,
  XCircle,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import StudentFees from "@/components/student-fees";
import FeeAssistant from "@/components/fee-assistant";

type Student = {
  id: string;
  admission_number: string;
  full_name: string;
  class_id: string | null;
  classes:
    | { class_name: string; section: string }
    | { class_name: string; section: string }[]
    | null;
};

type AttendanceSession = {
  session_date: string;
  subjects:
    | { subject_name: string }
    | { subject_name: string }[]
    | null;
};

type AttendanceRecord = {
  id: string;
  status: string;
  marked_at: string | null;
  attendance_sessions:
    | AttendanceSession
    | AttendanceSession[]
    | null;
};

type AttendanceStats = {
  present: number;
  absent: number;
  late: number;
  halfDay: number;
  leave: number;
  total: number;
  percentage: number;
};

function first<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

function getStatus(status: string) {
  const value = status.toLowerCase().trim();

  if (value === "present") return "Present";
  if (value === "absent") return "Absent";
  if (value === "late") return "Late";
  if (value === "half_day") return "Half Day";
  if (value === "approved_leave") return "Approved Leave";

  return status.replaceAll("_", " ");
}

function getStatusStyle(status: string) {
  const value = status.toLowerCase();

  if (value === "present") return "bg-emerald-50 text-emerald-700";
  if (value === "absent") return "bg-red-50 text-red-700";
  if (value === "late") return "bg-amber-50 text-amber-700";
  if (value === "half_day") return "bg-blue-50 text-blue-700";
  if (value === "approved_leave") return "bg-purple-50 text-purple-700";

  return "bg-slate-100 text-slate-600";
}

function formatDate(date: string) {
  if (!date) return "—";

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(`${date.slice(0, 10)}T00:00:00`));
}

function calculateStats(records: AttendanceRecord[]): AttendanceStats {
  const stats = {
    present: 0,
    absent: 0,
    late: 0,
    halfDay: 0,
    leave: 0,
    total: 0,
    percentage: 0,
  };

  records.forEach((record) => {
    const status = record.status.toLowerCase();

    if (status === "present") stats.present++;
    else if (status === "absent") stats.absent++;
    else if (status === "late") stats.late++;
    else if (status === "half_day") stats.halfDay++;
    else if (status === "approved_leave") stats.leave++;
  });

  stats.total =
    stats.present + stats.absent + stats.late + stats.halfDay;

  stats.percentage =
    stats.total > 0
      ? Math.round(
          ((stats.present + stats.late + stats.halfDay) /
            stats.total) *
            100
        )
      : 0;

  return stats;
}

export default function StudentPortalPage() {
  const router = useRouter();

  const [student, setStudent] = useState<Student | null>(null);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const loadDashboard = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    setError("");

    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) throw sessionError;

      if (!session) {
        router.replace("/login");
        return;
      }

      const { data: accountData, error: accountError } =
        await supabase
          .from("student_accounts")
          .select("student_id")
          .maybeSingle();

      if (accountError) throw accountError;

      if (!accountData?.student_id) {
        throw new Error(
          "This account is not linked to a student record. Please sign in using the Student login option."
        );
      }

      const { data: studentData, error: studentError } =
        await supabase
          .from("students")
          .select(
            "id, admission_number, full_name, class_id, classes(class_name, section)"
          )
          .eq("id", accountData.student_id)
          .single();

      if (studentError) throw studentError;

      const { data: attendanceData, error: attendanceError } =
        await supabase
          .from("attendance_records")
          .select(
            "id, status, marked_at, attendance_sessions(session_date, subjects(subject_name))"
          )
          .eq("student_id", accountData.student_id)
          .limit(1000);

      if (attendanceError) throw attendanceError;

      const sortedRecords = (
        (attendanceData ?? []) as unknown as AttendanceRecord[]
      ).sort((a, b) => {
        const dateA =
          first(a.attendance_sessions)?.session_date ?? "";
        const dateB =
          first(b.attendance_sessions)?.session_date ?? "";

        return dateB.localeCompare(dateA);
      });

      setStudent(studentData as unknown as Student);
      setRecords(sortedRecords);
    } catch (err: unknown) {
      console.error("Student dashboard loading error:", err);

      let message = "Unable to load your student dashboard.";

      if (
        typeof err === "object" &&
        err !== null &&
        "message" in err
      ) {
        message = String(err.message);
      }

      setError(message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [router]);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  const stats = useMemo(
    () => calculateStats(records),
    [records]
  );

  const classInfo = first(student?.classes);

  const subjectStats = useMemo(() => {
    const map = new Map<
      string,
      { present: number; absent: number; late: number; halfDay: number }
    >();

    records.forEach((record) => {
      const session = first(record.attendance_sessions);
      const subject = first(session?.subjects)?.subject_name;

      if (!subject) return;

      if (!map.has(subject)) {
        map.set(subject, {
          present: 0,
          absent: 0,
          late: 0,
          halfDay: 0,
        });
      }

      const item = map.get(subject)!;
      const status = record.status.toLowerCase();

      if (status === "present") item.present++;
      else if (status === "absent") item.absent++;
      else if (status === "late") item.late++;
      else if (status === "half_day") item.halfDay++;
    });

    return Array.from(map.entries())
      .map(([name, item]) => {
        const total =
          item.present + item.absent + item.late + item.halfDay;

        return {
          name,
          ...item,
          total,
          percentage:
            total > 0
              ? Math.round(
                  ((item.present + item.late + item.halfDay) /
                    total) *
                    100
                )
              : 0,
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [records]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-emerald-100 border-t-emerald-600" />
          <p className="mt-4 text-sm font-semibold text-slate-500">
            Loading your student portal...
          </p>
        </div>
      </main>
    );
  }

  if (error && !student) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-5">
        <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-xl">
          <AlertCircle className="mx-auto h-12 w-12 text-red-500" />
          <h1 className="mt-5 text-xl font-bold text-slate-900">
            Unable to open student portal
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-500">
            {error}
          </p>
          <button
            onClick={() => router.push("/login")}
            className="mt-6 rounded-xl bg-emerald-600 px-6 py-3 font-bold text-white hover:bg-emerald-700"
          >
            Back to login
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f5f8f7] text-slate-900">
      <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 text-xl font-black text-white shadow-lg shadow-emerald-600/20">
              E
            </div>
            <div>
              <h1 className="text-lg font-black tracking-tight">
                EduTrack <span className="text-emerald-600">AI</span>
              </h1>
              <p className="text-[11px] font-medium text-slate-400">
                Student Portal
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => void loadDashboard(true)}
              disabled={refreshing}
              className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
            >
              <RefreshCw
                size={16}
                className={refreshing ? "animate-spin" : ""}
              />
              <span className="hidden sm:inline">Refresh</span>
            </button>

            <button
              onClick={handleLogout}
              className="flex items-center gap-2 rounded-xl bg-slate-900 px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700"
            >
              <LogOut size={16} />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8">
        <section className="relative overflow-hidden rounded-[28px] bg-gradient-to-r from-emerald-700 via-emerald-600 to-teal-600 p-7 text-white shadow-xl shadow-emerald-900/10 sm:p-9">
          <div className="pointer-events-none absolute -right-12 -top-24 h-72 w-72 rounded-full border-[35px] border-white/10" />
          <div className="pointer-events-none absolute -bottom-28 right-48 h-64 w-64 rounded-full bg-white/5 blur-2xl" />

          <div className="relative flex flex-col justify-between gap-7 sm:flex-row sm:items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold text-emerald-50">
                <ShieldCheck size={14} />
                Personal student workspace
              </div>

              <p className="mt-6 text-sm font-medium text-emerald-100">
                Welcome back,
              </p>

              <h2 className="mt-1 text-3xl font-black tracking-tight sm:text-4xl">
                {student?.full_name}
              </h2>

              <p className="mt-3 text-sm text-emerald-50">
                Track your attendance and academic activity in one place.
              </p>
            </div>

            <div className="flex items-center gap-4 rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-md sm:min-w-64">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15">
                <GraduationCap size={28} />
              </div>
              <div>
                <p className="text-xs font-medium text-emerald-100">
                  Class & Section
                </p>
                <p className="mt-1 text-xl font-black">
                  {classInfo
                    ? `${classInfo.class_name} - ${classInfo.section}`
                    : "Not assigned"}
                </p>
                <p className="mt-1 text-xs text-emerald-100">
                  Admission: {student?.admission_number}
                </p>
              </div>
            </div>
          </div>
        </section>

        {error && (
          <div className="mt-5 flex items-start gap-3 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">
            <AlertCircle size={18} className="mt-0.5 shrink-0" />
            {error}
          </div>
        )}

        {/* Attendance overview */}
        <section className="mt-8">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-black tracking-tight">
                Attendance Overview
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Your attendance performance at a glance.
              </p>
            </div>
            <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700">
              <Activity size={13} className="mr-1 inline" />
              Live data
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard
              title="Attendance"
              value={`${stats.percentage}%`}
              subtitle={`${stats.total} counted sessions`}
              icon={<TrendingUp size={21} />}
              color="emerald"
            />
            <StatCard
              title="Present"
              value={stats.present}
              subtitle="Present sessions"
              icon={<CheckCircle2 size={21} />}
              color="blue"
            />
            <StatCard
              title="Absent"
              value={stats.absent}
              subtitle="Absent sessions"
              icon={<XCircle size={21} />}
              color="red"
            />
            <StatCard
              title="Late / Half Day"
              value={stats.late + stats.halfDay}
              subtitle={`${stats.late} late · ${stats.halfDay} half day`}
              icon={<Clock3 size={21} />}
              color="amber"
            />
          </div>
        </section>

        {/* My Fees and PayPal Payments */}
        <StudentFees />
        {/* AI Fee Assistant */}
        <section className="mt-8">
          <FeeAssistant />
        </section>

        {/* Progress and profile */}
        <section className="mt-6 grid gap-5 lg:grid-cols-3">
          <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm lg:col-span-2">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-black text-slate-900">
                  Overall Attendance
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  Based on recorded attendance sessions.
                </p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                <TrendingUp size={23} />
              </div>
            </div>

            <div className="mt-7 flex items-end justify-between">
              <span className="text-5xl font-black tracking-tight text-slate-900">
                {stats.percentage}%
              </span>
              <span className="pb-1 text-xs font-semibold text-slate-400">
                {stats.total} sessions counted
              </span>
            </div>

            <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-700"
                style={{ width: `${stats.percentage}%` }}
              />
            </div>

            <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-xs font-semibold text-slate-500">
              <span>
                <span className="mr-1.5 inline-block h-2.5 w-2.5 rounded-full bg-emerald-500" />
                Present
              </span>
              <span>
                <span className="mr-1.5 inline-block h-2.5 w-2.5 rounded-full bg-red-500" />
                Absent
              </span>
              <span>
                <span className="mr-1.5 inline-block h-2.5 w-2.5 rounded-full bg-amber-500" />
                Late
              </span>
              <span>
                <span className="mr-1.5 inline-block h-2.5 w-2.5 rounded-full bg-blue-500" />
                Half Day
              </span>
            </div>

            <p className="mt-5 text-xs leading-5 text-slate-400">
              Approved leave is excluded from the attendance percentage
              calculation.
            </p>
          </div>

          <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
                <UserRound size={21} />
              </div>
              <div>
                <h3 className="font-black">My Profile</h3>
                <p className="text-xs text-slate-400">
                  Student information
                </p>
              </div>
            </div>

            <div className="mt-6 space-y-4">
              <ProfileRow label="Full Name" value={student?.full_name || "—"} />
              <ProfileRow
                label="Admission Number"
                value={student?.admission_number || "—"}
              />
              <ProfileRow
                label="Class"
                value={classInfo?.class_name || "Not assigned"}
              />
              <ProfileRow
                label="Section"
                value={classInfo?.section || "—"}
              />
            </div>
          </div>
        </section>

        {/* Subject attendance */}
        <section className="mt-8">
          <div className="mb-5">
            <h2 className="text-xl font-black tracking-tight">
              Subject-wise Attendance
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Attendance calculated separately for each subject.
            </p>
          </div>

          {subjectStats.length === 0 ? (
            <EmptyState message="No subject attendance records are available yet." />
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {subjectStats.map((subject) => (
                <div
                  key={subject.name}
                  className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                        <BookOpen size={19} />
                      </div>
                      <h3 className="truncate font-bold text-slate-800">
                        {subject.name}
                      </h3>
                    </div>
                    <span className="text-lg font-black text-emerald-700">
                      {subject.percentage}%
                    </span>
                  </div>

                  <div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500"
                      style={{ width: `${subject.percentage}%` }}
                    />
                  </div>

                  <div className="mt-4 flex justify-between text-xs text-slate-500">
                    <span>{subject.present} present</span>
                    <span>{subject.absent} absent</span>
                    <span>{subject.total} total</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Attendance history */}
        <section className="mt-8">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-black tracking-tight">
                Attendance History
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Your latest recorded attendance sessions.
              </p>
            </div>
            <CalendarDays className="text-emerald-600" size={23} />
          </div>

          <div className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-sm">
            {records.length === 0 ? (
              <EmptyState message="Your attendance history will appear here once attendance is recorded." />
            ) : (
              <>
                <div className="hidden grid-cols-4 gap-4 border-b border-slate-100 bg-slate-50 px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-400 sm:grid">
                  <span>Date</span>
                  <span>Subject</span>
                  <span>Status</span>
                  <span>Marked At</span>
                </div>

                <div className="divide-y divide-slate-100">
                  {records.slice(0, 100).map((record) => {
                    const session = first(record.attendance_sessions);
                    const subject = first(session?.subjects);

                    return (
                      <div
                        key={record.id}
                        className="grid gap-3 px-5 py-4 sm:grid-cols-4 sm:items-center sm:gap-4 sm:px-6"
                      >
                        <div>
                          <p className="text-[10px] font-bold uppercase text-slate-400 sm:hidden">
                            Date
                          </p>
                          <p className="text-sm font-semibold text-slate-800">
                            {formatDate(session?.session_date || "")}
                          </p>
                        </div>

                        <div>
                          <p className="text-[10px] font-bold uppercase text-slate-400 sm:hidden">
                            Subject
                          </p>
                          <p className="text-sm font-medium text-slate-600">
                            {subject?.subject_name || "—"}
                          </p>
                        </div>

                        <div>
                          <p className="text-[10px] font-bold uppercase text-slate-400 sm:hidden">
                            Status
                          </p>
                          <span
                            className={`inline-flex rounded-full px-3 py-1.5 text-xs font-bold ${getStatusStyle(
                              record.status
                            )}`}
                          >
                            {getStatus(record.status)}
                          </span>
                        </div>

                        <div>
                          <p className="text-[10px] font-bold uppercase text-slate-400 sm:hidden">
                            Marked At
                          </p>
                          <p className="text-sm text-slate-500">
                            {record.marked_at
                              ? new Intl.DateTimeFormat("en-IN", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                }).format(new Date(record.marked_at))
                              : "—"}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {records.length > 100 && (
                  <p className="border-t border-slate-100 px-6 py-3 text-center text-xs text-slate-400">
                    Showing the latest 100 of {records.length} records.
                  </p>
                )}
              </>
            )}
          </div>
        </section>

        {/* Leave information */}
        <section className="mt-6 rounded-2xl border border-purple-100 bg-purple-50/70 p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-purple-600">
              <CalendarDays size={20} />
            </div>
            <div>
              <h3 className="font-bold text-purple-900">
                Approved Leave
              </h3>
              <p className="mt-1 text-sm leading-6 text-purple-800/70">
                You currently have {stats.leave} approved leave
                {stats.leave === 1 ? " record" : " records"} in your
                attendance history. Approved leave is not counted as
                absence.
              </p>
            </div>
          </div>
        </section>

        <footer className="py-9 text-center text-xs text-slate-400">
          EduTrack AI · Secure Student Portal
        </footer>
      </div>
    </main>
  );
}

function StatCard({
  title,
  value,
  subtitle,
  icon,
  color,
}: {
  title: string;
  value: string | number;
  subtitle: string;
  icon: ReactNode;
  color: "emerald" | "blue" | "red" | "amber";
}) {
  const colors = {
    emerald: "bg-emerald-50 text-emerald-700",
    blue: "bg-blue-50 text-blue-700",
    red: "bg-red-50 text-red-700",
    amber: "bg-amber-50 text-amber-700",
  };

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-bold text-slate-500">{title}</p>
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-xl ${colors[color]}`}
        >
          {icon}
        </div>
      </div>
      <p className="mt-4 text-3xl font-black tracking-tight text-slate-900">
        {value}
      </p>
      <p className="mt-1 text-xs text-slate-400">{subtitle}</p>
    </div>
  );
}

function ProfileRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3 last:border-0 last:pb-0">
      <span className="text-xs font-medium text-slate-400">{label}</span>
      <span className="max-w-[60%] truncate text-right text-sm font-bold text-slate-700">
        {value}
      </span>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="px-6 py-12 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
        <CalendarDays size={22} />
      </div>
      <p className="mt-4 text-sm font-semibold text-slate-600">
        Nothing to display yet
      </p>
      <p className="mx-auto mt-1 max-w-sm text-xs leading-5 text-slate-400">
        {message}
      </p>
    </div>
  );
}
