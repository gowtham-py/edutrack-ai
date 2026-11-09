"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  Activity,
  BarChart3,
  CalendarCheck,
  CheckCircle2,
  Clock3,
  Download,
  FileSpreadsheet,
  Filter,
  GraduationCap,
  Loader2,
  Printer,
  RefreshCw,
  Search,
  Users,
  XCircle,
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
  studentId: string;
  studentName: string;
  admissionNumber: string;
  className: string;
  classId: string;
  subjectName: string;
  subjectId: string;
  teacherName: string;
  status: string;
  markedAt: string | null;
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

type SummaryRow = {
  id: string;
  name: string;
  records: number;
  present: number;
  absent: number;
  late: number;
  halfDay: number;
  leave: number;
  rate: number;
};

const EMPTY_STATS: ReportStats = {
  sessions: 0,
  present: 0,
  absent: 0,
  late: 0,
  halfDay: 0,
  leave: 0,
};

function calculateRate(stats: Pick<ReportStats, "present" | "absent" | "late" | "halfDay" | "leave">) {
  const eligible = stats.present + stats.absent + stats.late + stats.halfDay;
  return eligible > 0
    ? Math.round(((stats.present + stats.late + stats.halfDay * 0.5) / eligible) * 100)
    : 0;
}

function displayStatus(status: string) {
  return status.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function statusClasses(status: string) {
  switch (status) {
    case "present":
      return "bg-emerald-50 text-emerald-700 ring-emerald-200";
    case "absent":
      return "bg-rose-50 text-rose-700 ring-rose-200";
    case "late":
      return "bg-amber-50 text-amber-700 ring-amber-200";
    case "half_day":
      return "bg-violet-50 text-violet-700 ring-violet-200";
    case "approved_leave":
      return "bg-sky-50 text-sky-700 ring-sky-200";
    default:
      return "bg-slate-50 text-slate-600 ring-slate-200";
  }
}

function makeSummary(rows: AttendanceDetail[], key: "classId" | "subjectId" | "studentId", label: (row: AttendanceDetail) => string): SummaryRow[] {
  const grouped = new Map<string, { name: string; stats: ReportStats }>();
  rows.forEach((row) => {
    const id = row[key] || "unknown";
    const current = grouped.get(id) || { name: label(row), stats: { ...EMPTY_STATS } };
    current.stats.sessions += 1;
    if (row.status === "present") current.stats.present += 1;
    else if (row.status === "absent") current.stats.absent += 1;
    else if (row.status === "late") current.stats.late += 1;
    else if (row.status === "half_day") current.stats.halfDay += 1;
    else if (row.status === "approved_leave") current.stats.leave += 1;
    grouped.set(id, current);
  });

  return Array.from(grouped.entries())
    .map(([id, value]) => ({
      id,
      name: value.name,
      records: value.stats.sessions,
      present: value.stats.present,
      absent: value.stats.absent,
      late: value.stats.late,
      halfDay: value.stats.halfDay,
      leave: value.stats.leave,
      rate: calculateRate(value.stats),
    }))
    .sort((a, b) => b.records - a.records || a.name.localeCompare(b.name));
}

export default function ReportsPage() {
  const [details, setDetails] = useState<AttendanceDetail[]>([]);
  const [classes, setClasses] = useState<{ id: string; label: string }[]>([]);
  const [subjects, setSubjects] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [classFilter, setClassFilter] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sortBy, setSortBy] = useState<SortKey>("sessionDate");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [activeView, setActiveView] = useState<"overview" | "classes" | "subjects" | "students">("overview");

  const loadReports = useCallback(async () => {
    setLoading(true);
    setMessage("");
    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData.user) {
        setMessage("Your session has expired. Please log in again.");
        setDetails([]);
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("school_id, role")
        .eq("user_id", authData.user.id)
        .maybeSingle();

      if (profileError || !profile?.school_id) {
        setMessage("We couldn't find your school profile. Please contact your school administrator.");
        setDetails([]);
        return;
      }

      let sessionQuery = supabase
        .from("attendance_sessions")
        .select("id, session_date, started_at, class_id, subject_id, teacher_id")
        .eq("school_id", profile.school_id)
        .order("session_date", { ascending: false })
        .limit(1000);

      if (profile.role === "teacher") {
        sessionQuery = sessionQuery.eq("teacher_id", authData.user.id);
      }

      const [sessionsResult, classesResult, subjectsResult] = await Promise.all([
        sessionQuery,
        supabase.from("classes").select("id, class_name, section").eq("school_id", profile.school_id),
        supabase.from("subjects").select("id, subject_name").eq("school_id", profile.school_id),
      ]);

      if (sessionsResult.error) throw sessionsResult.error;
      if (classesResult.error) throw classesResult.error;
      if (subjectsResult.error) throw subjectsResult.error;

      const sessionList = sessionsResult.data || [];
      const classList = classesResult.data || [];
      const subjectList = subjectsResult.data || [];
      setClasses(classList.map((item) => ({ id: item.id, label: `${item.class_name}${item.section ? ` - ${item.section}` : ""}` })));
      setSubjects(subjectList.map((item) => ({ id: item.id, name: item.subject_name })));

      if (sessionList.length === 0) {
        setDetails([]);
        return;
      }

      const sessionIds = sessionList.map((session) => session.id);
      const { data: records, error: recordsError } = await supabase
        .from("attendance_records")
        .select("id, session_id, student_id, status, marked_by, marked_at")
        .in("session_id", sessionIds);
      if (recordsError) throw recordsError;

      const recordList = records || [];
      const studentIds = [...new Set(recordList.map((row) => row.student_id).filter(Boolean))];
      const teacherIds = [...new Set(recordList.map((row) => row.marked_by).filter((id): id is string => Boolean(id)))];

      const [studentsResult, teachersResult] = await Promise.all([
        studentIds.length
          ? supabase.from("students").select("id, full_name, admission_number").eq("school_id", profile.school_id).in("id", studentIds)
          : Promise.resolve({ data: [], error: null }),
        teacherIds.length
          ? supabase.from("profiles").select("user_id, full_name").eq("school_id", profile.school_id).in("user_id", teacherIds)
          : Promise.resolve({ data: [], error: null }),
      ]);
      if (studentsResult.error) throw studentsResult.error;
      if (teachersResult.error) throw teachersResult.error;

      const studentMap = new Map((studentsResult.data || []).map((student) => [student.id, student]));
      const teacherMap = new Map((teachersResult.data || []).map((teacher) => [teacher.user_id, teacher.full_name]));
      const classMap = new Map(classList.map((item) => [item.id, `${item.class_name}${item.section ? ` - ${item.section}` : ""}`]));
      const subjectMap = new Map(subjectList.map((item) => [item.id, item.subject_name]));
      const sessionMap = new Map(sessionList.map((session) => [session.id, session]));

      const mapped: AttendanceDetail[] = recordList.map((record) => {
        const student = studentMap.get(record.student_id);
        const session = sessionMap.get(record.session_id);
        return {
          id: record.id,
          sessionId: record.session_id,
          studentId: record.student_id,
          studentName: student?.full_name || "Unknown student",
          admissionNumber: student?.admission_number || "—",
          classId: session?.class_id || "",
          className: session ? classMap.get(session.class_id) || "Unknown class" : "Unknown class",
          subjectId: session?.subject_id || "",
          subjectName: session ? subjectMap.get(session.subject_id) || "Unknown subject" : "Unknown subject",
          teacherName: record.marked_by ? teacherMap.get(record.marked_by) || "Unknown user" : "—",
          status: record.status,
          markedAt: record.marked_at,
          sessionDate: session?.session_date || "—",
        };
      });
      setDetails(mapped);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Something went wrong while loading reports.");
      setDetails([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadReports();
  }, [loadReports]);

  const filteredDetails = useMemo(() => {
    const term = search.trim().toLowerCase();
    const filtered = details.filter((record) => {
      const matchesSearch = !term || record.studentName.toLowerCase().includes(term) || record.admissionNumber.toLowerCase().includes(term);
      return matchesSearch && (!startDate || record.sessionDate >= startDate) && (!endDate || record.sessionDate <= endDate) && (!classFilter || record.classId === classFilter) && (!subjectFilter || record.subjectId === subjectFilter) && (!statusFilter || record.status === statusFilter);
    });
    filtered.sort((a, b) => {
      const comparison = String(a[sortBy] || "").toLowerCase().localeCompare(String(b[sortBy] || "").toLowerCase(), undefined, { numeric: true });
      return sortDirection === "asc" ? comparison : -comparison;
    });
    return filtered;
  }, [details, search, startDate, endDate, classFilter, subjectFilter, statusFilter, sortBy, sortDirection]);

  const stats = useMemo<ReportStats>(() => {
    const sessionIds = new Set(filteredDetails.map((row) => row.sessionId));
    return {
      sessions: sessionIds.size,
      present: filteredDetails.filter((row) => row.status === "present").length,
      absent: filteredDetails.filter((row) => row.status === "absent").length,
      late: filteredDetails.filter((row) => row.status === "late").length,
      halfDay: filteredDetails.filter((row) => row.status === "half_day").length,
      leave: filteredDetails.filter((row) => row.status === "approved_leave").length,
    };
  }, [filteredDetails]);

  const attendanceRate = calculateRate(stats);
  const classSummary = useMemo(() => makeSummary(filteredDetails, "classId", (row) => row.className), [filteredDetails]);
  const subjectSummary = useMemo(() => makeSummary(filteredDetails, "subjectId", (row) => row.subjectName), [filteredDetails]);
  const studentSummary = useMemo(() => makeSummary(filteredDetails, "studentId", (row) => `${row.studentName} (${row.admissionNumber})`), [filteredDetails]);

  function handleSort(key: SortKey) {
    if (sortBy === key) setSortDirection((current) => current === "asc" ? "desc" : "asc");
    else { setSortBy(key); setSortDirection("asc"); }
  }

  function resetFilters() {
    setSearch(""); setStartDate(""); setEndDate(""); setClassFilter(""); setSubjectFilter(""); setStatusFilter("");
  }

  function exportCSV() {
    const headers = ["Student", "Admission Number", "Class", "Subject", "Status", "Marked By", "Session Date", "Marked At"];
    const quote = (value: unknown) => `"${String(value ?? "").replace(/"/g, '""')}"`;
    const rows = filteredDetails.map((row) => [row.studentName, row.admissionNumber, row.className, row.subjectName, displayStatus(row.status), row.teacherName, row.sessionDate, row.markedAt ? new Date(row.markedAt).toLocaleString() : "—"]);
    const csv = [headers, ...rows].map((row) => row.map(quote).join(",")).join("\r\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url; link.download = "EduTrack-AI-Attendance-Report.csv"; link.click();
    URL.revokeObjectURL(url);
  }

  const cards = [
    { label: "Present", value: stats.present, icon: CheckCircle2, tone: "bg-emerald-50 text-emerald-700", bar: "bg-emerald-500" },
    { label: "Absent", value: stats.absent, icon: XCircle, tone: "bg-rose-50 text-rose-700", bar: "bg-rose-500" },
    { label: "Late", value: stats.late, icon: Clock3, tone: "bg-amber-50 text-amber-700", bar: "bg-amber-500" },
    { label: "Half-day", value: stats.halfDay, icon: Users, tone: "bg-violet-50 text-violet-700", bar: "bg-violet-500" },
    { label: "Approved leave", value: stats.leave, icon: CalendarCheck, tone: "bg-sky-50 text-sky-700", bar: "bg-sky-500" },
  ];

  const sortHeader = (label: string, key: SortKey) => (
    <th className="whitespace-nowrap px-4 py-3 text-left">
      <button type="button" onClick={() => handleSort(key)} className="inline-flex items-center gap-1.5 font-semibold hover:text-emerald-700">
        {label}<span className="text-[10px] text-emerald-700">{sortBy === key ? (sortDirection === "asc" ? "↑" : "↓") : "↕"}</span>
      </button>
    </th>
  );

  function SummaryTable({ rows, firstHeading }: { rows: SummaryRow[]; firstHeading: string }) {
    if (!rows.length) return <div className="p-8 text-center text-sm text-slate-500">No data available for the selected filters.</div>;
    return (
      <div className="overflow-x-auto">
        <table className="w-full min-w-[680px] text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr>
            <th className="px-4 py-3 text-left">{firstHeading}</th><th className="px-4 py-3 text-right">Records</th><th className="px-4 py-3 text-right">Present</th><th className="px-4 py-3 text-right">Absent</th><th className="px-4 py-3 text-right">Late</th><th className="px-4 py-3 text-right">Rate</th>
          </tr></thead>
          <tbody className="divide-y divide-slate-100">{rows.map((row) => (
            <tr key={row.id} className="hover:bg-emerald-50/40"><td className="px-4 py-3 font-semibold text-[#193B32]">{row.name}</td><td className="px-4 py-3 text-right tabular-nums">{row.records}</td><td className="px-4 py-3 text-right text-emerald-700">{row.present}</td><td className="px-4 py-3 text-right text-rose-700">{row.absent}</td><td className="px-4 py-3 text-right text-amber-700">{row.late}</td><td className="px-4 py-3 text-right"><span className="font-bold text-[#193B32]">{row.rate}%</span></td></tr>
          ))}</tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      <style jsx global>{`@media print { aside, nav, header, .no-print { display:none !important; } body { background:#fff !important; } main { margin:0 !important; padding:0 !important; } .print-card { box-shadow:none !important; break-inside:avoid; } table { width:100% !important; min-width:0 !important; font-size:9px !important; } th,td { padding:5px !important; } }`}</style>

      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#123c32] via-[#17634c] to-[#26966b] p-6 text-white shadow-lg sm:p-8">
        <div className="pointer-events-none absolute -right-10 -top-16 h-56 w-56 rounded-full bg-white/10 blur-2xl" />
        <div className="relative flex flex-col justify-between gap-5 md:flex-row md:items-center">
          <div><div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold text-emerald-50"><Activity size={14}/> LIVE SCHOOL ANALYTICS</div><h1 className="text-2xl font-bold sm:text-3xl">Attendance Reports</h1><p className="mt-2 max-w-xl text-sm text-emerald-50/85">Understand attendance performance across students, classes and subjects. Filter your data and export reports.</p></div>
          <div className="no-print flex flex-wrap gap-2"><button onClick={() => void loadReports()} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border border-white/25 bg-white/10 px-4 py-2.5 text-sm font-semibold hover:bg-white/20 disabled:opacity-50"><RefreshCw size={16} className={loading ? "animate-spin" : ""}/>Refresh</button><button onClick={exportCSV} disabled={loading || !filteredDetails.length} className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-emerald-800 hover:bg-emerald-50 disabled:opacity-50"><Download size={16}/>Export CSV</button><button onClick={() => window.print()} disabled={loading || !filteredDetails.length} className="inline-flex items-center gap-2 rounded-xl bg-[#092d25] px-4 py-2.5 text-sm font-semibold text-white hover:bg-black disabled:opacity-50"><Printer size={16}/>Save PDF</button></div>
        </div>
      </section>

      {message && <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{message}</div>}

      {loading ? <div className="flex min-h-72 items-center justify-center gap-3 rounded-2xl border border-emerald-100 bg-white text-sm text-slate-500"><Loader2 size={21} className="animate-spin text-emerald-700"/>Loading attendance analytics...</div> : <>
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="print-card rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><div><p className="text-sm text-slate-500">Attendance sessions</p><p className="mt-2 text-3xl font-bold text-[#193B32]">{stats.sessions}</p></div><span className="rounded-xl bg-emerald-50 p-3 text-emerald-700"><CalendarCheck size={23}/></span></div><p className="mt-2 text-xs text-slate-400">Sessions represented in current results</p></div>
          <div className="print-card rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><div><p className="text-sm text-slate-500">Attendance rate</p><p className="mt-2 text-3xl font-bold text-[#193B32]">{attendanceRate}%</p></div><span className="rounded-xl bg-violet-50 p-3 text-violet-700"><BarChart3 size={23}/></span></div><div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all" style={{width:`${attendanceRate}%`}}/></div></div>
          <div className="print-card rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><div><p className="text-sm text-slate-500">Students represented</p><p className="mt-2 text-3xl font-bold text-[#193B32]">{studentSummary.length}</p></div><span className="rounded-xl bg-sky-50 p-3 text-sky-700"><GraduationCap size={23}/></span></div><p className="mt-2 text-xs text-slate-400">Unique students in filtered records</p></div>
          <div className="print-card rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><div><p className="text-sm text-slate-500">Total attendance records</p><p className="mt-2 text-3xl font-bold text-[#193B32]">{filteredDetails.length}</p></div><span className="rounded-xl bg-amber-50 p-3 text-amber-700"><FileSpreadsheet size={23}/></span></div><p className="mt-2 text-xs text-slate-400">Across the selected date and filters</p></div>
        </section>

        <section className="no-print rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2"><div className="flex items-center gap-2"><span className="rounded-lg bg-emerald-50 p-2 text-emerald-700"><Filter size={18}/></span><div><h2 className="font-bold text-[#193B32]">Report filters</h2><p className="text-xs text-slate-500">All analytics update when filters change.</p></div></div><button onClick={resetFilters} className="text-sm font-semibold text-emerald-700 hover:text-emerald-900">Clear filters</button></div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <label className="text-sm font-medium text-slate-600">From date<input type="date" value={startDate} max={endDate || undefined} onChange={(e)=>setStartDate(e.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"/></label>
            <label className="text-sm font-medium text-slate-600">To date<input type="date" value={endDate} min={startDate || undefined} onChange={(e)=>setEndDate(e.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"/></label>
            <label className="text-sm font-medium text-slate-600">Class and section<select value={classFilter} onChange={(e)=>setClassFilter(e.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 outline-none focus:border-emerald-600"><option value="">All classes</option>{classes.map((item)=><option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
            <label className="text-sm font-medium text-slate-600">Subject<select value={subjectFilter} onChange={(e)=>setSubjectFilter(e.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 outline-none focus:border-emerald-600"><option value="">All subjects</option>{subjects.map((item)=><option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
            <label className="text-sm font-medium text-slate-600">Attendance status<select value={statusFilter} onChange={(e)=>setStatusFilter(e.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 outline-none focus:border-emerald-600"><option value="">All statuses</option><option value="present">Present</option><option value="absent">Absent</option><option value="late">Late</option><option value="half_day">Half-day</option><option value="approved_leave">Approved leave</option></select></label>
            <label className="text-sm font-medium text-slate-600">Search student<span className="relative mt-1.5 block"><Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/><input value={search} onChange={(e)=>setSearch(e.target.value)} placeholder="Name or admission number" className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-3 outline-none focus:border-emerald-600"/></span></label>
          </div>
          <p className="mt-4 text-xs text-slate-500">Showing <strong className="text-[#193B32]">{filteredDetails.length}</strong> of {details.length} loaded records</p>
        </section>

        <section className="print-card rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm"><div className="mb-4"><h2 className="font-bold text-[#193B32]">Attendance breakdown</h2><p className="text-xs text-slate-500">Status distribution for the current selection.</p></div><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">{cards.map((card)=>{const Icon=card.icon;const denominator=filteredDetails.length||1;const percent=Math.round((card.value/denominator)*100);return <div key={card.label} className="rounded-xl border border-slate-100 p-4"><div className="flex items-center justify-between"><span className={`rounded-lg p-2 ${card.tone}`}><Icon size={19}/></span><span className="text-xs font-semibold text-slate-400">{percent}%</span></div><p className="mt-3 text-sm text-slate-500">{card.label}</p><p className="text-2xl font-bold text-[#193B32]">{card.value}</p><div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${card.bar}`} style={{width:`${percent}%`}}/></div></div>})}</div></section>

        <section className="print-card overflow-hidden rounded-2xl border border-emerald-100 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-5"><div><h2 className="font-bold text-[#193B32]">Performance analytics</h2><p className="mt-1 text-xs text-slate-500">Compare attendance performance by class, subject or student.</p></div><div className="no-print flex flex-wrap gap-1 rounded-xl bg-slate-100 p-1">{([ ["overview","Overview"],["classes","Classes"],["subjects","Subjects"],["students","Students"] ] as const).map(([key,label])=><button key={key} onClick={()=>setActiveView(key)} className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${activeView===key?"bg-white text-emerald-800 shadow-sm":"text-slate-500 hover:text-slate-800"}`}>{label}</button>)}</div></div>
          {activeView==="overview" && <div className="grid gap-5 p-5 lg:grid-cols-2"><div><h3 className="mb-3 text-sm font-bold text-[#193B32]">Class-wise attendance rate</h3>{classSummary.length? <div className="space-y-4">{classSummary.slice(0,8).map((row)=><div key={row.id}><div className="mb-1.5 flex justify-between gap-3 text-sm"><span className="truncate font-medium text-slate-700">{row.name}</span><span className="font-bold text-emerald-700">{row.rate}%</span></div><div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-emerald-500" style={{width:`${row.rate}%`}}/></div></div>)}</div>:<p className="text-sm text-slate-400">No class data for these filters.</p>}</div><div><h3 className="mb-3 text-sm font-bold text-[#193B32]">Subject-wise attendance rate</h3>{subjectSummary.length?<div className="space-y-4">{subjectSummary.slice(0,8).map((row)=><div key={row.id}><div className="mb-1.5 flex justify-between gap-3 text-sm"><span className="truncate font-medium text-slate-700">{row.name}</span><span className="font-bold text-violet-700">{row.rate}%</span></div><div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-violet-500" style={{width:`${row.rate}%`}}/></div></div>)}</div>:<p className="text-sm text-slate-400">No subject data for these filters.</p>}</div></div>}
          {activeView==="classes" && <SummaryTable rows={classSummary} firstHeading="Class / section"/>}
          {activeView==="subjects" && <SummaryTable rows={subjectSummary} firstHeading="Subject"/>}
          {activeView==="students" && <SummaryTable rows={studentSummary} firstHeading="Student (admission no.)"/>}
        </section>

        <section className="print-card overflow-hidden rounded-2xl border border-emerald-100 bg-white shadow-sm"><div className="border-b border-slate-100 p-5"><h2 className="font-bold text-[#193B32]">Detailed attendance records</h2><p className="mt-1 text-xs text-slate-500">Choose a column heading to sort. Export CSV or use Save PDF for a printable report.</p></div>{filteredDetails.length===0?<div className="p-10 text-center"><CalendarCheck size={36} className="mx-auto mb-3 text-slate-300"/><p className="font-semibold text-slate-600">No attendance records found</p><p className="mt-1 text-sm text-slate-400">Try changing the selected dates or filters.</p></div>:<div className="overflow-x-auto"><table className="w-full min-w-[1000px] text-sm text-left"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr>{sortHeader("Student","studentName")}{sortHeader("Admission no.","admissionNumber")}{sortHeader("Class","className")}{sortHeader("Subject","subjectName")}{sortHeader("Status","status")}{sortHeader("Marked by","teacherName")}{sortHeader("Date","sessionDate")}<th className="px-4 py-3 text-left">Time</th></tr></thead><tbody className="divide-y divide-slate-100">{filteredDetails.map((row)=><tr key={row.id} className="hover:bg-emerald-50/30"><td className="px-4 py-3 font-semibold text-[#193B32]">{row.studentName}</td><td className="px-4 py-3 text-slate-600">{row.admissionNumber}</td><td className="px-4 py-3 text-slate-600">{row.className}</td><td className="px-4 py-3 text-slate-600">{row.subjectName}</td><td className="px-4 py-3"><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${statusClasses(row.status)}`}>{displayStatus(row.status)}</span></td><td className="px-4 py-3 text-slate-600">{row.teacherName}</td><td className="px-4 py-3 text-slate-600">{row.sessionDate}</td><td className="px-4 py-3 text-slate-500">{row.markedAt?new Date(row.markedAt).toLocaleTimeString():"—"}</td></tr>)}</tbody></table></div>}<div className="border-t border-slate-100 px-5 py-3 text-xs text-slate-400">Data is limited to the latest 1,000 attendance sessions available to your account. Approved leave is excluded from the attendance-rate denominator. Half-day attendance counts as 0.5.</div></section>
      </>}
    </div>
  );
}
