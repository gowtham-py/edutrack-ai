"use client";

import { useEffect, useState } from "react";
import type { ElementType } from "react";
import Link from "next/link";
import {
  Users,
  GraduationCap,
  BookOpen,
  CalendarCheck,
  ArrowUpRight,
  Sparkles,
  ClipboardList,
  Clock,
  TrendingUp,
  UserCheck,
  UserX,
  AlertCircle,
  RefreshCw,
  School,
  BookMarked,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

type Assignment = {
  id: string;
  class_id: string;
  subject_id: string;
};

type ClassItem = {
  id: string;
  class_name: string;
  section: string;
};

type Subject = {
  id: string;
  subject_name: string;
};

type AttendanceSession = {
  id: string;
  session_date: string;
  started_at: string;
  ended_at: string | null;
  class_id: string;
  subject_id: string;
  teacher_id: string;
};

type AttendanceRecord = {
  id: string;
  session_id: string;
  student_id: string;
  status: string;
};

type DaySummary = {
  date: string;
  label: string;
  attended: number;
  absent: number;
  total: number;
};

type DashboardStats = {
  students: number;
  teachers: number;
  classes: number;
  subjects: number;
  sessionsToday: number;
  totalMarked: number;
  present: number;
  absent: number;
  late: number;
  halfDay: number;
  approvedLeave: number;
  attendanceRate: number;
};

const emptyStats: DashboardStats = {
  students: 0,
  teachers: 0,
  classes: 0,
  subjects: 0,
  sessionsToday: 0,
  totalMarked: 0,
  present: 0,
  absent: 0,
  late: 0,
  halfDay: 0,
  approvedLeave: 0,
  attendanceRate: 0,
};

function getDateInIndia(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  return `${year}-${month}-${day}`;
}

function getDateDaysAgo(daysAgo: number) {
  const [year, month, day] = getDateInIndia().split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day - daysAgo));
  return date.toISOString().slice(0, 10);
}

function formatDate(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatTime(value: string | null) {
  if (!value) return "In progress";

  return new Date(value).toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function getAttendanceSummary(records: AttendanceRecord[]) {
  const summary = {
    totalMarked: records.length,
    present: 0,
    absent: 0,
    late: 0,
    halfDay: 0,
    approvedLeave: 0,
  };

  records.forEach((record) => {
    switch (record.status) {
      case "present":
        summary.present += 1;
        break;
      case "absent":
        summary.absent += 1;
        break;
      case "late":
        summary.late += 1;
        break;
      case "half_day":
        summary.halfDay += 1;
        break;
      case "approved_leave":
        summary.approvedLeave += 1;
        break;
    }
  });

  return summary;
}

function StatCard({
  title,
  value,
  description,
  icon: Icon,
  tone,
}: {
  title: string;
  value: string | number;
  description: string;
  icon: ElementType;
  tone: string;
}) {
  return (
    <div className="group rounded-2xl border border-[#E8EEE9] bg-white p-5 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-lg">
      <div className="flex items-center justify-between">
        <div className={`rounded-xl p-3 ${tone}`}>
          <Icon size={22} />
        </div>
        <ArrowUpRight
          size={18}
          className="text-gray-300 transition group-hover:text-emerald-600"
        />
      </div>
      <p className="mt-5 text-sm font-medium text-gray-500">{title}</p>
      <p className="mt-1 text-3xl font-bold text-[#193B32]">{value}</p>
      <p className="mt-2 text-xs text-gray-400">{description}</p>
    </div>
  );
}

function QuickAction({
  href,
  icon: Icon,
  title,
  description,
}: {
  href: string;
  icon: ElementType;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-4 rounded-2xl border border-[#E8EEE9] bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-md"
    >
      <div className="rounded-xl bg-emerald-50 p-3 text-emerald-700 transition group-hover:bg-emerald-100">
        <Icon size={21} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-[#193B32]">{title}</p>
        <p className="mt-1 text-xs text-gray-500">{description}</p>
      </div>
      <ArrowUpRight
        size={18}
        className="shrink-0 text-gray-300 transition group-hover:text-emerald-600"
      />
    </Link>
  );
}

export default function DashboardPage() {
  const [role, setRole] = useState("");
  const [fullName, setFullName] = useState("User");
  const [schoolName, setSchoolName] = useState("Your institution");
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [stats, setStats] = useState<DashboardStats>(emptyStats);
  const [weeklySummary, setWeeklySummary] = useState<DaySummary[]>([]);
  const [recentSessions, setRecentSessions] = useState<AttendanceSession[]>([]);
  const [recentRecords, setRecentRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  async function loadDashboard(isRefresh = false) {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    setError("");

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) throw authError;

      if (!user) {
        window.location.href = "/login";
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("full_name, role, school_id")
        .eq("user_id", user.id)
        .single();

      if (profileError || !profile) {
        throw new Error("Unable to load your profile. Please sign in again.");
      }

      setRole(profile.role);
      setFullName(profile.full_name || "User");

      if (profile.role === "teacher") {
        const { data: assignmentData, error: assignmentError } = await supabase
          .from("teacher_assignments")
          .select("id, class_id, subject_id")
          .eq("teacher_id", user.id)
          .eq("school_id", profile.school_id);

        if (assignmentError) throw assignmentError;

        const teacherAssignments = assignmentData || [];
        setAssignments(teacherAssignments);

        const classIds = [
          ...new Set(teacherAssignments.map((item) => item.class_id)),
        ];
        const subjectIds = [
          ...new Set(teacherAssignments.map((item) => item.subject_id)),
        ];

        if (classIds.length > 0) {
          const { data: classData, error: classError } = await supabase
            .from("classes")
            .select("id, class_name, section")
            .in("id", classIds);

          if (classError) throw classError;
          setClasses(classData || []);
        } else {
          setClasses([]);
        }

        if (subjectIds.length > 0) {
          const { data: subjectData, error: subjectError } = await supabase
            .from("subjects")
            .select("id, subject_name")
            .in("id", subjectIds);

          if (subjectError) throw subjectError;
          setSubjects(subjectData || []);
        } else {
          setSubjects([]);
        }

        return;
      }

      if (!profile.school_id) {
        throw new Error("Your account is not linked to a school.");
      }

      const schoolId = profile.school_id;
      const today = getDateInIndia();
      const weekStart = getDateDaysAgo(6);

      const [
        studentCountResult,
        teacherCountResult,
        classCountResult,
        subjectCountResult,
        sessionsResult,
        classListResult,
        subjectListResult,
      ] = await Promise.all([
        supabase
          .from("students")
          .select("id", { count: "exact", head: true })
          .eq("school_id", schoolId),
        supabase
          .from("profiles")
          .select("user_id", { count: "exact", head: true })
          .eq("school_id", schoolId)
          .eq("role", "teacher"),
        supabase
          .from("classes")
          .select("id", { count: "exact", head: true })
          .eq("school_id", schoolId),
        supabase
          .from("subjects")
          .select("id", { count: "exact", head: true })
          .eq("school_id", schoolId),
        supabase
          .from("attendance_sessions")
          .select(
            "id, session_date, started_at, ended_at, class_id, subject_id, teacher_id"
          )
          .eq("school_id", schoolId)
          .gte("session_date", weekStart)
          .lte("session_date", today)
          .order("started_at", { ascending: false }),
        supabase
          .from("classes")
          .select("id, class_name, section")
          .eq("school_id", schoolId),
        supabase
          .from("subjects")
          .select("id, subject_name")
          .eq("school_id", schoolId),
      ]);

      const queryErrors = [
        studentCountResult.error,
        teacherCountResult.error,
        classCountResult.error,
        subjectCountResult.error,
        sessionsResult.error,
        classListResult.error,
        subjectListResult.error,
      ].filter(Boolean);

      if (queryErrors.length > 0) {
        throw queryErrors[0];
      }

      const allSessions = (sessionsResult.data || []) as AttendanceSession[];
      const sessionIds = allSessions.map((session) => session.id);

      let allRecords: AttendanceRecord[] = [];

      if (sessionIds.length > 0) {
        const { data: recordData, error: recordError } = await supabase
          .from("attendance_records")
          .select("id, session_id, student_id, status")
          .in("session_id", sessionIds);

        if (recordError) throw recordError;
        allRecords = (recordData || []) as AttendanceRecord[];
      }

      const todaySessions = allSessions.filter(
        (session) => session.session_date === today
      );
      const todaySessionIds = new Set(todaySessions.map((session) => session.id));
      const todayRecords = allRecords.filter((record) =>
        todaySessionIds.has(record.session_id)
      );

      const todaySummary = getAttendanceSummary(todayRecords);
      const eligible =
        todaySummary.present +
        todaySummary.absent +
        todaySummary.late +
        todaySummary.halfDay;

      const attended =
        todaySummary.present + todaySummary.late + todaySummary.halfDay;

      const attendanceRate =
        eligible > 0 ? Math.round((attended / eligible) * 100) : 0;

      setStats({
        students: studentCountResult.count || 0,
        teachers: teacherCountResult.count || 0,
        classes: classCountResult.count || 0,
        subjects: subjectCountResult.count || 0,
        sessionsToday: todaySessions.length,
        ...todaySummary,
        attendanceRate,
      });

      setClasses((classListResult.data || []) as ClassItem[]);
      setSubjects((subjectListResult.data || []) as Subject[]);
      setRecentSessions(todaySessions.slice(0, 6));
      setRecentRecords(todayRecords);

      const summaries: DaySummary[] = [];

      for (let offset = 6; offset >= 0; offset -= 1) {
        const date = getDateDaysAgo(offset);
        const daySessions = allSessions.filter(
          (session) => session.session_date === date
        );
        const daySessionIds = new Set(daySessions.map((session) => session.id));
        const dayRecords = allRecords.filter((record) =>
          daySessionIds.has(record.session_id)
        );
        const dayStats = getAttendanceSummary(dayRecords);

        summaries.push({
          date,
          label: new Date(`${date}T00:00:00`).toLocaleDateString("en-IN", {
            weekday: "short",
          }),
          attended: dayStats.present + dayStats.late + dayStats.halfDay,
          absent: dayStats.absent,
          total: dayStats.present + dayStats.late + dayStats.halfDay + dayStats.absent,
        });
      }

      setWeeklySummary(summaries);

      const { data: schoolData } = await supabase
        .from("schools")
        .select("name")
        .eq("id", schoolId)
        .maybeSingle();

      setSchoolName(schoolData?.name || "Your institution");
    } catch (caughtError) {
      const message =
        caughtError instanceof Error
          ? caughtError.message
          : "Something went wrong while loading the dashboard.";
      setError(message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    void loadDashboard();
    // Load once when the dashboard opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-100 border-t-emerald-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">
        <div className="flex items-start gap-3">
          <AlertCircle className="mt-0.5 shrink-0" size={21} />
          <div>
            <h2 className="font-bold">Dashboard could not load</h2>
            <p className="mt-1 text-sm">{error}</p>
            <button
              onClick={() => void loadDashboard(true)}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-red-700 px-4 py-2 text-sm font-semibold text-white hover:bg-red-800"
            >
              <RefreshCw size={15} />
              Try again
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (role === "teacher") {
    return (
      <div className="space-y-8">
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#087F5B] via-[#11956C] to-[#36B98B] p-7 text-white shadow-xl shadow-emerald-900/10 sm:p-10">
          <div className="relative z-10 max-w-2xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold">
              <Sparkles size={14} />
              TEACHER WORKSPACE
            </div>
            <h1 className="text-3xl font-bold sm:text-4xl">
              Welcome, {fullName}!
            </h1>
            <p className="mt-3 text-sm leading-6 text-emerald-50 sm:text-base">
              Your teaching workspace is ready. View your assigned classes and
              subjects and manage attendance.
            </p>
          </div>
          <div className="pointer-events-none absolute -right-12 -top-24 h-72 w-72 rounded-full border-[35px] border-white/10" />
          <div className="pointer-events-none absolute -bottom-32 right-32 h-64 w-64 rounded-full bg-white/10 blur-2xl" />
        </section>

        <section className="grid gap-5 sm:grid-cols-2">
          <StatCard
            title="Assigned Classes"
            value={new Set(assignments.map((item) => item.class_id)).size}
            description="Classes assigned to you"
            icon={BookOpen}
            tone="bg-emerald-100 text-emerald-700"
          />
          <StatCard
            title="Teaching Assignments"
            value={assignments.length}
            description="Class and subject combinations"
            icon={ClipboardList}
            tone="bg-violet-100 text-violet-700"
          />
        </section>

        <section>
          <div className="mb-5">
            <h2 className="text-xl font-bold text-[#193B32]">
              My Classes and Subjects
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Classes and subjects assigned by your school administrator.
            </p>
          </div>

          {assignments.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-emerald-200 bg-white p-10 text-center">
              <Clock className="mx-auto text-emerald-600" size={32} />
              <h3 className="mt-3 font-bold text-[#193B32]">
                No assignments yet
              </h3>
              <p className="mt-2 text-sm text-gray-500">
                Your school administrator has not assigned any classes or
                subjects to you yet.
              </p>
            </div>
          ) : (
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {assignments.map((assignment) => {
                const classItem = classes.find(
                  (item) => item.id === assignment.class_id
                );
                const subject = subjects.find(
                  (item) => item.id === assignment.subject_id
                );

                return (
                  <div
                    key={assignment.id}
                    className="group rounded-2xl border border-[#E8EEE9] bg-white p-6 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-lg"
                  >
                    <div className="flex items-center justify-between">
                      <div className="rounded-xl bg-emerald-100 p-3 text-emerald-700">
                        <BookOpen size={22} />
                      </div>
                      <ArrowUpRight
                        size={19}
                        className="text-gray-300 transition group-hover:text-emerald-600"
                      />
                    </div>
                    <h3 className="mt-5 text-lg font-bold text-[#193B32]">
                      {classItem
                        ? `${classItem.class_name} - ${classItem.section}`
                        : "Class unavailable"}
                    </h3>
                    <p className="mt-1 text-sm text-gray-500">
                      {subject?.subject_name || "Subject unavailable"}
                    </p>
                    <Link
                      href="/dashboard/attendance"
                      className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-800"
                    >
                      <CalendarCheck size={17} />
                      Open Attendance
                    </Link>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    );
  }

  const maxWeeklyTotal = Math.max(1, ...weeklySummary.map((day) => day.total));

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#087F5B] via-[#11956C] to-[#36B98B] p-7 text-white shadow-xl shadow-emerald-900/10 sm:p-10">
        <div className="relative z-10 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold">
              <Sparkles size={14} />
              SMART SCHOOL MANAGEMENT
            </div>
            <h1 className="text-3xl font-bold leading-tight sm:text-4xl">
              Welcome, {fullName}!
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-emerald-50 sm:text-base">
              {schoolName} — your school management workspace, with live
              student, staff and attendance information.
            </p>
          </div>
          <button
            onClick={() => void loadDashboard(true)}
            disabled={refreshing}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-white/25 bg-white/15 px-4 py-3 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/25 disabled:cursor-not-allowed disabled:opacity-70"
          >
            <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
            {refreshing ? "Refreshing..." : "Refresh data"}
          </button>
        </div>
        <div className="pointer-events-none absolute -right-12 -top-24 h-72 w-72 rounded-full border-[35px] border-white/10" />
        <div className="pointer-events-none absolute -bottom-32 right-32 h-64 w-64 rounded-full bg-white/10 blur-2xl" />
      </section>

      <section>
        <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-xl font-bold text-[#193B32]">School Overview</h2>
            <p className="mt-1 text-sm text-gray-500">
              Live totals from your institution&apos;s database
            </p>
          </div>
          <span className="w-fit rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
            Live Supabase data
          </span>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Total Students"
            value={stats.students.toLocaleString("en-IN")}
            description="Registered students"
            icon={GraduationCap}
            tone="bg-emerald-100 text-emerald-700"
          />
          <StatCard
            title="Total Teachers"
            value={stats.teachers.toLocaleString("en-IN")}
            description="Teacher accounts in your school"
            icon={Users}
            tone="bg-violet-100 text-violet-700"
          />
          <StatCard
            title="Total Classes"
            value={stats.classes.toLocaleString("en-IN")}
            description={`${stats.subjects} subjects configured`}
            icon={BookOpen}
            tone="bg-amber-100 text-amber-700"
          />
          <StatCard
            title="Attendance Today"
            value={`${stats.attendanceRate}%`}
            description={`${stats.sessionsToday} sessions conducted today`}
            icon={CalendarCheck}
            tone="bg-sky-100 text-sky-700"
          />
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.35fr_0.65fr]">
        <div className="rounded-2xl border border-[#E8EEE9] bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-bold text-[#193B32]">
                Today&apos;s Attendance
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Based on attendance records marked in today&apos;s sessions
              </p>
            </div>
            <span className="w-fit rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
              {stats.totalMarked} records
            </span>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
            {[
              {
                label: "Present",
                value: stats.present,
                color: "text-emerald-700",
                bg: "bg-emerald-50",
              },
              {
                label: "Absent",
                value: stats.absent,
                color: "text-rose-700",
                bg: "bg-rose-50",
              },
              {
                label: "Late",
                value: stats.late,
                color: "text-amber-700",
                bg: "bg-amber-50",
              },
              {
                label: "Half-day",
                value: stats.halfDay,
                color: "text-sky-700",
                bg: "bg-sky-50",
              },
              {
                label: "Leave",
                value: stats.approvedLeave,
                color: "text-violet-700",
                bg: "bg-violet-50",
              },
            ].map((item) => (
              <div key={item.label} className={`rounded-xl ${item.bg} p-4`}>
                <p className={`text-2xl font-bold ${item.color}`}>
                  {item.value}
                </p>
                <p className="mt-1 text-xs font-medium text-gray-500">
                  {item.label}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-6">
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="font-semibold text-[#193B32]">
                Attendance completion rate
              </span>
              <span className="font-bold text-emerald-700">
                {stats.attendanceRate}%
              </span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-gray-100">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-600 to-teal-400 transition-all duration-700"
                style={{ width: `${stats.attendanceRate}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-gray-400">
              Present, late and half-day count as attended. Approved leave is
              excluded from the percentage denominator.
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-[#E8EEE9] bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-sky-100 p-3 text-sky-700">
              <TrendingUp size={22} />
            </div>
            <div>
              <h2 className="font-bold text-[#193B32]">Attendance snapshot</h2>
              <p className="text-xs text-gray-500">Today&apos;s activity</p>
            </div>
          </div>
          <div className="mt-6 space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-emerald-50 p-2 text-emerald-700">
                  <UserCheck size={18} />
                </div>
                <span className="text-sm text-gray-600">Attended</span>
              </div>
              <span className="font-bold text-[#193B32]">
                {stats.present + stats.late + stats.halfDay}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-rose-50 p-2 text-rose-700">
                  <UserX size={18} />
                </div>
                <span className="text-sm text-gray-600">Absent</span>
              </div>
              <span className="font-bold text-[#193B32]">{stats.absent}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-violet-50 p-2 text-violet-700">
                  <CalendarCheck size={18} />
                </div>
                <span className="text-sm text-gray-600">Sessions today</span>
              </div>
              <span className="font-bold text-[#193B32]">
                {stats.sessionsToday}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-amber-50 p-2 text-amber-700">
                  <GraduationCap size={18} />
                </div>
                <span className="text-sm text-gray-600">Total students</span>
              </div>
              <span className="font-bold text-[#193B32]">
                {stats.students}
              </span>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-[#E8EEE9] bg-white p-6 shadow-sm">
        <div className="mb-6">
          <h2 className="text-lg font-bold text-[#193B32]">
            7-Day Attendance Trend
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Daily attended and absent records across your school
          </p>
        </div>

        <div className="grid grid-cols-7 items-end gap-2 sm:gap-4">
          {weeklySummary.map((day) => {
            const attendedHeight =
              day.total > 0 ? (day.attended / maxWeeklyTotal) * 100 : 0;
            const absentHeight =
              day.total > 0 ? (day.absent / maxWeeklyTotal) * 100 : 0;

            return (
              <div key={day.date} className="flex min-w-0 flex-col items-center">
                <div className="mb-2 text-center text-[10px] font-semibold text-gray-500 sm:text-xs">
                  {day.total > 0 ? day.total : "—"}
                </div>
                <div className="flex h-36 w-full max-w-12 items-end overflow-hidden rounded-t-lg bg-gray-50">
                  <div className="flex w-full flex-col justify-end">
                    <div
                      className="w-full rounded-t-sm bg-rose-300"
                      style={{ height: `${absentHeight}%` }}
                      title={`${day.absent} absent`}
                    />
                    <div
                      className="w-full bg-emerald-500"
                      style={{ height: `${attendedHeight}%` }}
                      title={`${day.attended} attended`}
                    />
                  </div>
                </div>
                <span className="mt-2 text-[10px] font-medium text-gray-500 sm:text-xs">
                  {day.label}
                </span>
              </div>
            );
          })}
        </div>
        <div className="mt-5 flex flex-wrap gap-5 text-xs text-gray-500">
          <span className="inline-flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-sm bg-emerald-500" />
            Attended
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-sm bg-rose-300" />
            Absent
          </span>
        </div>
      </section>

      <section>
        <div className="mb-5 flex items-end justify-between">
          <div>
            <h2 className="text-lg font-bold text-[#193B32]">
              Recent Attendance Sessions
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Latest sessions recorded today
            </p>
          </div>
          <Link
            href="/dashboard/attendance"
            className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-700 hover:text-emerald-800"
          >
            View attendance <ArrowUpRight size={16} />
          </Link>
        </div>

        {recentSessions.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-emerald-200 bg-white p-9 text-center">
            <CalendarCheck className="mx-auto text-emerald-600" size={30} />
            <h3 className="mt-3 font-bold text-[#193B32]">
              No attendance sessions today
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Attendance sessions will appear here after teachers start
              marking attendance.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-[#E8EEE9] bg-white shadow-sm">
            <div className="divide-y divide-gray-100">
              {recentSessions.map((session) => {
                const classItem = classes.find(
                  (item) => item.id === session.class_id
                );
                const subject = subjects.find(
                  (item) => item.id === session.subject_id
                );
                const records = recentRecords.filter(
                  (record) => record.session_id === session.id
                );
                const summary = getAttendanceSummary(records);

                return (
                  <div
                    key={session.id}
                    className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5"
                  >
                    <div className="flex items-start gap-3">
                      <div className="rounded-xl bg-emerald-50 p-3 text-emerald-700">
                        <BookMarked size={20} />
                      </div>
                      <div>
                        <p className="font-semibold text-[#193B32]">
                          {classItem
                            ? `${classItem.class_name} - ${classItem.section}`
                            : "Class"}
                        </p>
                        <p className="mt-1 text-sm text-gray-500">
                          {subject?.subject_name || "Subject"} ·{" "}
                          {formatTime(session.started_at)}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="rounded-full bg-emerald-50 px-3 py-1.5 font-semibold text-emerald-700">
                        {summary.present} Present
                      </span>
                      <span className="rounded-full bg-rose-50 px-3 py-1.5 font-semibold text-rose-700">
                        {summary.absent} Absent
                      </span>
                      <span className="rounded-full bg-gray-100 px-3 py-1.5 font-semibold text-gray-600">
                        {records.length} Marked
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </section>

      <section>
        <div className="mb-5">
          <h2 className="text-lg font-bold text-[#193B32]">Quick Actions</h2>
          <p className="mt-1 text-sm text-gray-500">
            Jump directly to the areas you manage most.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <QuickAction
            href="/dashboard/students"
            icon={GraduationCap}
            title="Manage Students"
            description="View and manage student records"
          />
          <QuickAction
            href="/dashboard/teachers"
            icon={Users}
            title="Manage Teachers"
            description="View your teaching staff"
          />
          <QuickAction
            href="/dashboard/classes"
            icon={School}
            title="Manage Classes"
            description="Classes, sections and subjects"
          />
          <QuickAction
            href="/dashboard/reports"
            icon={ClipboardList}
            title="View Reports"
            description="Attendance reports and analytics"
          />
        </div>
      </section>

      <div className="rounded-2xl border border-emerald-100 bg-gradient-to-r from-emerald-50 to-teal-50 p-5">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-white p-2.5 text-emerald-700 shadow-sm">
            <Sparkles size={20} />
          </div>
          <div>
            <h3 className="font-bold text-[#193B32]">
              Your school data, in one place
            </h3>
            <p className="mt-1 text-sm leading-6 text-gray-600">
              Dashboard totals are loaded from your school&apos;s Supabase
              records. Attendance percentages are calculated from marked
              records; students without a marked record are not included.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
