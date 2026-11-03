
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
        .select("school_id")
        .eq("user_id", authData.user.id)
        .maybeSingle();

      if (profileError || !profile?.school_id) {
        setMessage("We couldn't find your school profile.");
        setLoading(false);
        return;
      }

      const { data: sessions, error: sessionError } = await supabase
        .from("attendance_sessions")
        .select("id")
        .eq("school_id", profile.school_id);

      if (sessionError) {
        setMessage(sessionError.message);
        setLoading(false);
        return;
      }

      const sessionIds = (sessions || []).map((session) => session.id);

      if (sessionIds.length === 0) {
        setStats(initialStats);
        setLoading(false);
        return;
      }

      const { data: records, error: recordsError } = await supabase
        .from("attendance_records")
        .select("status")
        .in("session_id", sessionIds);

      if (recordsError) {
        setMessage(recordsError.message);
        setLoading(false);
        return;
      }

      const rows = records || [];

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
    stats.present + stats.absent + stats.late + stats.halfDay + stats.leave;

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

  return (
    <div className="space-y-7">
      <section>
        <h1 className="text-2xl font-bold text-[#193B32]">
          Attendance Reports
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          A summary of attendance records across your school.
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
                  <p className="text-sm text-gray-500">Attendance sessions</p>
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
                  <p className="text-sm text-gray-500">Overall attendance rate</p>
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

          <p className="text-xs leading-5 text-gray-400">
            This is a school-wide summary of saved attendance records, not a
            student-level percentage report. Approved leave is excluded from
            the attendance-rate calculation. Detailed date, class and student
            filters and PDF/Excel exports will be added later.
          </p>
        </>
      )}
    </div>
  );
}
