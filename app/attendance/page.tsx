"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { supabase } from "@/lib/supabase";
import {
  CalendarCheck,
  Play,
  Loader2,
  School,
  Save,
  Users,
  Lock,
  Unlock,
  ShieldCheck,
  History,
  CheckCircle2,
  XCircle,
  RefreshCw,
} from "lucide-react";

type SchoolClass = {
  id: string;
  class_name: string;
  section: string;
};

type Subject = {
  id: string;
  subject_name: string;
};

type Assignment = {
  id: string;
  class_id: string;
  subject_id: string;
};

type AttendanceStatus =
  | "present"
  | "absent"
  | "late"
  | "half_day"
  | "approved_leave";

type Session = {
  id: string;
  session_date: string;
  started_at: string;
  ended_at: string | null;
  class_id: string;
  subject_id: string;
  is_locked: boolean;
  locked_at: string | null;
  locked_by: string | null;
  lock_reason: string | null;
};

type Student = {
  id: string;
  full_name: string;
  admission_number: string;
};

type CorrectionRequest = {
  id: string;
  session_id: string;
  student_id: string;
  requested_by: string;
  old_status: string | null;
  requested_status: AttendanceStatus;
  reason: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  reviewed_at: string | null;
  review_note: string | null;
};

type AuditLog = {
  id: string;
  session_id: string;
  student_id: string;
  changed_by: string;
  old_status: string | null;
  new_status: string | null;
  action: string;
  changed_at: string;
};

const statusOptions: {
  value: AttendanceStatus;
  label: string;
}[] = [
  { value: "present", label: "Present" },
  { value: "absent", label: "Absent" },
  { value: "late", label: "Late" },
  { value: "half_day", label: "Half-day" },
  { value: "approved_leave", label: "Approved Leave" },
];

export default function AttendancePage() {
  const [schoolId, setSchoolId] = useState("");
  const [userId, setUserId] = useState("");
  const [role, setRole] = useState("");

  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);

  const [classId, setClassId] = useState("");
  const [subjectId, setSubjectId] = useState("");

  const [students, setStudents] = useState<Student[]>([]);
  const [studentStatuses, setStudentStatuses] = useState<
    Record<string, AttendanceStatus>
  >({});
  const [originalStatuses, setOriginalStatuses] = useState<
    Record<string, AttendanceStatus | null>
  >({});

  const [activeSession, setActiveSession] = useState<Session | null>(null);

  const [correctionReason, setCorrectionReason] = useState("");
  const [correctionRequests, setCorrectionRequests] = useState<
    CorrectionRequest[]
  >([]);
  const [myCorrectionRequests, setMyCorrectionRequests] = useState<
    CorrectionRequest[]
  >([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [studentNames, setStudentNames] = useState<Record<string, string>>({});

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadingStudents, setLoadingStudents] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const isAdmin = role === "school_admin";

  async function loadData() {
    setLoading(true);
    setMessage("");
    setError("");

    const { data: authData } = await supabase.auth.getUser();

    if (!authData.user) {
      window.location.href = "/login";
      return;
    }

    const currentUserId = authData.user.id;
    setUserId(currentUserId);

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("school_id, role")
      .eq("user_id", currentUserId)
      .maybeSingle();

    if (profileError || !profile?.school_id) {
      setError("We couldn't find your school profile.");
      setLoading(false);
      return;
    }

    setSchoolId(profile.school_id);
    setRole(profile.role);

    let assignedClassIds: string[] = [];
    let assignedSubjectIds: string[] = [];

    if (profile.role === "teacher") {
      const { data: assignmentData, error: assignmentError } =
        await supabase
          .from("teacher_assignments")
          .select("id, class_id, subject_id")
          .eq("school_id", profile.school_id)
          .eq("teacher_id", currentUserId);

      if (assignmentError) {
        setError("Unable to load your teaching assignments.");
        setLoading(false);
        return;
      }

      const teacherAssignments = assignmentData || [];
      setAssignments(teacherAssignments);

      assignedClassIds = [
        ...new Set(teacherAssignments.map((item) => item.class_id)),
      ];

      assignedSubjectIds = [
        ...new Set(teacherAssignments.map((item) => item.subject_id)),
      ];
    } else {
      setAssignments([]);
    }

    let classData: SchoolClass[] = [];
    let subjectData: Subject[] = [];

    if (profile.role !== "teacher" || assignedClassIds.length > 0) {
      let classQuery = supabase
        .from("classes")
        .select("id, class_name, section")
        .eq("school_id", profile.school_id)
        .order("class_name");

      if (profile.role === "teacher") {
        classQuery = classQuery.in("id", assignedClassIds);
      }

      const { data, error: classError } = await classQuery;

      if (classError) {
        setError(classError.message);
        setLoading(false);
        return;
      }

      classData = data || [];
    }

    if (profile.role !== "teacher" || assignedSubjectIds.length > 0) {
      let subjectQuery = supabase
        .from("subjects")
        .select("id, subject_name")
        .eq("school_id", profile.school_id)
        .order("subject_name");

      if (profile.role === "teacher") {
        subjectQuery = subjectQuery.in("id", assignedSubjectIds);
      }

      const { data, error: subjectError } = await subjectQuery;

      if (subjectError) {
        setError(subjectError.message);
        setLoading(false);
        return;
      }

      subjectData = data || [];
    }

    setClasses(classData);
    setSubjects(subjectData);

    let sessionQuery = supabase
      .from("attendance_sessions")
      .select(
        "id, session_date, started_at, ended_at, class_id, subject_id, is_locked, locked_at, locked_by, lock_reason"
      )
      .eq("school_id", profile.school_id)
      .order("started_at", { ascending: false })
      .limit(20);

    if (profile.role === "teacher") {
      sessionQuery = sessionQuery.eq("teacher_id", currentUserId);
    }

    const { data: sessionData, error: sessionError } =
      await sessionQuery;

    if (sessionError) {
      setError(sessionError.message);
    } else {
      setSessions((sessionData || []) as Session[]);
    }

    if (profile.role === "school_admin") {
      await loadAdminTools();
    }

    if (profile.role === "teacher") {
      await loadTeacherCorrectionRequests(currentUserId);
    }

    setLoading(false);
  }

  async function loadAdminTools() {
    const { data: requests, error: requestError } = await supabase
      .from("attendance_correction_requests")
      .select(
        "id, session_id, student_id, requested_by, old_status, requested_status, reason, status, created_at"
      )
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(50);

    if (requestError) {
      setError(requestError.message);
    } else {
      setCorrectionRequests((requests || []) as CorrectionRequest[]);
    }

    const { data: logs, error: auditError } = await supabase
      .from("attendance_audit_logs")
      .select(
        "id, session_id, student_id, changed_by, old_status, new_status, action, changed_at"
      )
      .order("changed_at", { ascending: false })
      .limit(30);

    if (auditError) {
      setError(auditError.message);
    } else {
      setAuditLogs((logs || []) as AuditLog[]);
    }
  }

  async function loadTeacherCorrectionRequests(teacherId: string) {
    const { data: requests, error: requestError } = await supabase
      .from("attendance_correction_requests")
      .select(
        "id, session_id, student_id, requested_by, old_status, requested_status, reason, status, created_at, reviewed_at, review_note"
      )
      .eq("requested_by", teacherId)
      .order("created_at", { ascending: false })
      .limit(50);

    if (requestError) {
      setError(requestError.message);
      return;
    }

    const requestList = (requests || []) as CorrectionRequest[];
    setMyCorrectionRequests(requestList);

    const studentIds = [...new Set(requestList.map((item) => item.student_id))];

    if (studentIds.length === 0) {
      setStudentNames({});
      return;
    }

    const { data: studentData, error: studentError } = await supabase
      .from("students")
      .select("id, full_name")
      .in("id", studentIds);

    if (studentError) {
      // Request status remains available even if student names are hidden by RLS.
      setStudentNames({});
      return;
    }

    const names: Record<string, string> = {};
    (studentData || []).forEach((student) => {
      names[student.id] = student.full_name;
    });
    setStudentNames(names);
  }

  useEffect(() => {
    loadData();
  }, []);

  const availableSubjects =
    role === "teacher"
      ? subjects.filter((subject) =>
          assignments.some(
            (assignment) =>
              assignment.class_id === classId &&
              assignment.subject_id === subject.id
          )
        )
      : subjects;

  function handleClassChange(value: string) {
    setClassId(value);
    setSubjectId("");
    setActiveSession(null);
    setStudents([]);
    setStudentStatuses({});
    setOriginalStatuses({});
  }

  async function startSession(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!schoolId || !userId || !classId || !subjectId) {
      setError("Please select both a class and a subject.");
      return;
    }

    if (
      role === "teacher" &&
      !assignments.some(
        (assignment) =>
          assignment.class_id === classId &&
          assignment.subject_id === subjectId
      )
    ) {
      setError("You are not assigned to this class and subject.");
      return;
    }

    setSaving(true);
    setMessage("");
    setError("");
    setStudents([]);
    setStudentStatuses({});
    setOriginalStatuses({});
    setActiveSession(null);

    const now = new Date();

    const { data: sessionData, error: insertError } = await supabase
      .from("attendance_sessions")
      .insert({
        school_id: schoolId,
        class_id: classId,
        subject_id: subjectId,
        teacher_id: userId,
        session_date: now.toLocaleDateString("en-CA"),
        started_at: now.toISOString(),
      })
      .select(
        "id, session_date, started_at, ended_at, class_id, subject_id, is_locked, locked_at, locked_by, lock_reason"
      )
      .single();

    if (insertError) {
      setError(insertError.message);
      setSaving(false);
      return;
    }

    const newSession = sessionData as Session;
    setActiveSession(newSession);
    setMessage("Attendance session started successfully!");

    await loadStudents(classId, newSession.id);

    setSaving(false);
    await loadData();
  }

  async function loadStudents(
    selectedClassId: string,
    sessionId?: string
  ) {
    setLoadingStudents(true);
    setError("");

    const { data, error: studentError } = await supabase
      .from("students")
      .select("id, full_name, admission_number")
      .eq("school_id", schoolId)
      .eq("class_id", selectedClassId)
      .order("full_name");

    if (studentError) {
      setError(studentError.message);
      setLoadingStudents(false);
      return;
    }

    const studentList = (data || []) as Student[];
    setStudents(studentList);

    const initialStatuses: Record<string, AttendanceStatus> = {};
    const initialOriginal: Record<string, AttendanceStatus | null> = {};

    let existingRecords: {
      student_id: string;
      status: AttendanceStatus;
    }[] = [];

    if (sessionId) {
      const { data: records, error: recordsError } = await supabase
        .from("attendance_records")
        .select("student_id, status")
        .eq("session_id", sessionId);

      if (recordsError) {
        setError(recordsError.message);
        setLoadingStudents(false);
        return;
      }

      existingRecords = (records || []) as typeof existingRecords;
    }

    studentList.forEach((student) => {
      const existing = existingRecords.find(
        (record) => record.student_id === student.id
      );

      initialStatuses[student.id] = existing?.status || "present";
      initialOriginal[student.id] = existing?.status || null;
    });

    setStudentStatuses(initialStatuses);
    setOriginalStatuses(initialOriginal);
    setLoadingStudents(false);

    if (studentList.length === 0) {
      setMessage("No students are registered in this class yet.");
    }
  }

  async function openSession(session: Session) {
    setError("");
    setMessage("");
    setClassId(session.class_id);
    setSubjectId(session.subject_id);
    setActiveSession(session);
    setCorrectionReason("");

    await loadStudents(session.class_id, session.id);
  }

  function updateStudentStatus(
    studentId: string,
    status: AttendanceStatus
  ) {
    setStudentStatuses((previous) => ({
      ...previous,
      [studentId]: status,
    }));
  }

  async function saveAttendance() {
    if (!activeSession || !students.length) {
      setError("Start a session and load students first.");
      return;
    }

    if (students.some((student) => !studentStatuses[student.id])) {
      setError("Please select a status for every student.");
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");

    if (activeSession.is_locked && !isAdmin) {
      const changedStudents = students.filter(
        (student) =>
          studentStatuses[student.id] !==
          (originalStatuses[student.id] || "present")
      );

      if (!changedStudents.length) {
        setError("No attendance changes were made.");
        setSaving(false);
        return;
      }

      if (!correctionReason.trim()) {
        setError("Please provide a reason for your correction request.");
        setSaving(false);
        return;
      }

      const requests = changedStudents.map((student) => ({
        session_id: activeSession.id,
        student_id: student.id,
        requested_by: userId,
        old_status: originalStatuses[student.id],
        requested_status: studentStatuses[student.id],
        reason: correctionReason.trim(),
      }));

      const { error: requestError } = await supabase
        .from("attendance_correction_requests")
        .insert(requests);

      if (requestError) {
        setError(requestError.message);
      } else {
        setMessage(
          "Correction request submitted. Your administrator must approve it."
        );
        setCorrectionReason("");
        await loadStudents(activeSession.class_id, activeSession.id);
        await loadTeacherCorrectionRequests(userId);
      }

      setSaving(false);
      return;
    }

    const now = new Date().toISOString();

    const records = students.map((student) => ({
      session_id: activeSession.id,
      student_id: student.id,
      status: studentStatuses[student.id],
      marked_by: userId,
      marked_at: now,
    }));

    const { error: saveError } = await supabase
      .from("attendance_records")
      .upsert(records, {
        onConflict: "session_id,student_id",
      });

    if (saveError) {
      setError(saveError.message);
    } else {
      setMessage("Student attendance saved successfully!");
      await loadStudents(activeSession.class_id, activeSession.id);

      if (isAdmin) {
        await loadAdminTools();
      }
    }

    setSaving(false);
  }

  async function toggleSessionLock(session: Session) {
    if (!isAdmin) return;

    const nextLocked = !session.is_locked;

    const confirmed = window.confirm(
      nextLocked
        ? "Lock this attendance session? Teachers will need administrator approval for corrections."
        : "Unlock this attendance session? Teachers will be able to edit attendance again."
    );

    if (!confirmed) return;

    setSaving(true);
    setError("");
    setMessage("");

    const { error: lockError } = await supabase
      .from("attendance_sessions")
      .update({
        is_locked: nextLocked,
        locked_at: nextLocked ? new Date().toISOString() : null,
        locked_by: nextLocked ? userId : null,
        lock_reason: nextLocked ? "Manually locked by administrator" : null,
      })
      .eq("id", session.id)
      .eq("school_id", schoolId);

    if (lockError) {
      setError(lockError.message);
    } else {
      setMessage(
        nextLocked
          ? "Attendance session locked successfully."
          : "Attendance session unlocked successfully."
      );

      if (activeSession?.id === session.id) {
        setActiveSession({
          ...session,
          is_locked: nextLocked,
          locked_at: nextLocked ? new Date().toISOString() : null,
          locked_by: nextLocked ? userId : null,
          lock_reason: nextLocked
            ? "Manually locked by administrator"
            : null,
        });
      }

      await loadData();
    }

    setSaving(false);
  }

  async function reviewCorrection(
    requestId: string,
    approve: boolean
  ) {
    if (!isAdmin) return;

    const reviewNote = window.prompt(
      approve
        ? "Optional approval note:"
        : "Please enter a reason for rejecting this request:"
    );

    if (!approve && !reviewNote?.trim()) {
      setError("A rejection reason is required.");
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");

    const { error: reviewError } = await supabase.rpc(
      "review_attendance_correction",
      {
        p_request_id: requestId,
        p_approve: approve,
        p_review_note: reviewNote?.trim() || null,
      }
    );

    if (reviewError) {
      setError(reviewError.message);
    } else {
      setMessage(
        approve
          ? "Correction approved and attendance updated."
          : "Correction request rejected."
      );
      await loadAdminTools();
      await loadData();
    }

    setSaving(false);
  }

  function classLabel(id: string) {
    const item = classes.find((item) => item.id === id);
    return item
      ? `${item.class_name} - ${item.section}`
      : "Unknown class";
  }

  function subjectLabel(id: string) {
    return (
      subjects.find((item) => item.id === id)?.subject_name ||
      "Unknown subject"
    );
  }

  function statusLabel(status: string | null) {
    if (!status) return "Not marked";
    return (
      statusOptions.find((option) => option.value === status)?.label ||
      status
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center gap-3 text-sm text-gray-500">
        <Loader2 className="animate-spin" size={22} />
        Loading attendance...
      </div>
    );
  }

  return (
    <div className="space-y-7">
      <section className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#193B32]">
            Attendance Management
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            {role === "teacher"
              ? "Manage attendance for your assigned classes and subjects."
              : "Create, lock and manage school attendance sessions."}
          </p>
        </div>

        <button
          type="button"
          onClick={loadData}
          className="inline-flex items-center justify-center gap-2 self-start rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
        >
          <RefreshCw size={16} />
          Refresh
        </button>
      </section>

      {message && (
        <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {message}
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <section className="rounded-2xl border border-[#E8EEE9] bg-white p-6 shadow-sm">
        <div className="mb-6 flex items-center gap-3">
          <div className="rounded-xl bg-emerald-100 p-3 text-emerald-700">
            <CalendarCheck size={24} />
          </div>
          <div>
            <h2 className="font-bold text-[#193B32]">
              Start attendance
            </h2>
            <p className="text-sm text-gray-500">
              Choose the class and subject for a new session.
            </p>
          </div>
        </div>

        <form onSubmit={startSession} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-2 text-sm font-medium text-gray-700">
              Class and section
              <select
                required
                value={classId}
                onChange={(event) =>
                  handleClassChange(event.target.value)
                }
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              >
                <option value="">Select a class</option>
                {classes.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.class_name} - {item.section}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-2 text-sm font-medium text-gray-700">
              Subject
              <select
                required
                value={subjectId}
                onChange={(event) => {
                  setSubjectId(event.target.value);
                  setActiveSession(null);
                  setStudents([]);
                  setStudentStatuses({});
                  setOriginalStatuses({});
                }}
                disabled={!classId}
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 disabled:bg-gray-50 disabled:text-gray-400"
              >
                <option value="">Select a subject</option>
                {availableSubjects.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.subject_name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <button
            type="submit"
            disabled={saving || !classes.length || !classId || !subjectId}
            className="inline-flex items-center gap-2 rounded-xl bg-[#087F5B] px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-900/10 transition hover:bg-[#066B4D] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="animate-spin" size={18} />
            ) : (
              <Play size={18} />
            )}
            {saving ? "Starting..." : "Start session"}
          </button>

          {!classes.length && (
            <p className="text-sm text-amber-700">
              {role === "teacher"
                ? "You don't have any class assignments yet. Contact your school administrator."
                : "Add at least one class before starting attendance."}
            </p>
          )}
        </form>
      </section>

      {activeSession && (
        <section className="overflow-hidden rounded-2xl border border-[#E8EEE9] bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-gray-100 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-bold text-[#193B32]">
                  Mark student attendance
                </h2>
                {activeSession.is_locked ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-700">
                    <Lock size={13} /> Locked
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                    <Unlock size={13} /> Open
                  </span>
                )}
              </div>
              <p className="mt-1 text-sm text-gray-500">
                {classLabel(activeSession.class_id)} ·{" "}
                {subjectLabel(activeSession.subject_id)}
              </p>
            </div>

            <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">
              <Users size={18} />
              {students.length} students
            </div>
          </div>

          {activeSession.is_locked && (
            <div className="border-b border-red-100 bg-red-50 px-5 py-3 text-sm text-red-800">
              This session is locked.
              {isAdmin
                ? " As administrator, you can still make approved changes or unlock it."
                : " Changes must be submitted as correction requests for administrator approval."}
            </div>
          )}

          {loadingStudents ? (
            <div className="flex items-center justify-center gap-3 p-10 text-sm text-gray-500">
              <Loader2 className="animate-spin" size={20} />
              Loading students...
            </div>
          ) : students.length === 0 ? (
            <div className="p-10 text-center text-sm text-gray-500">
              No students found in this class. Add students before marking attendance.
            </div>
          ) : (
            <>
              <div className="divide-y divide-gray-100">
                {students.map((student, index) => (
                  <div
                    key={student.id}
                    className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="font-semibold text-[#193B32]">
                        {index + 1}. {student.full_name}
                      </p>
                      <p className="mt-1 text-xs text-gray-500">
                        Admission No: {student.admission_number}
                      </p>
                    </div>

                    <select
                      value={studentStatuses[student.id] || "present"}
                      onChange={(event) =>
                        updateStudentStatus(
                          student.id,
                          event.target.value as AttendanceStatus
                        )
                      }
                      className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-emerald-500 sm:w-48"
                    >
                      {statusOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>

              {activeSession.is_locked && !isAdmin && (
                <div className="border-t border-gray-100 bg-amber-50 p-5">
                  <label className="block space-y-2 text-sm font-medium text-gray-700">
                    Reason for correction
                    <textarea
                      value={correctionReason}
                      onChange={(event) =>
                        setCorrectionReason(event.target.value)
                      }
                      rows={3}
                      placeholder="Explain why these attendance changes are needed..."
                      className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 outline-none focus:border-emerald-500"
                    />
                  </label>
                </div>
              )}

              <div className="flex flex-col gap-3 border-t border-gray-100 bg-gray-50 p-5 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-gray-500">
                  {activeSession.is_locked && !isAdmin
                    ? "Changes will be sent to your administrator for approval."
                    : "Review each student's status before saving."}
                </p>

                <button
                  type="button"
                  onClick={saveAttendance}
                  disabled={saving || !students.length}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#087F5B] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#066B4D] disabled:opacity-50"
                >
                  {saving ? (
                    <Loader2 className="animate-spin" size={18} />
                  ) : activeSession.is_locked && !isAdmin ? (
                    <ShieldCheck size={18} />
                  ) : (
                    <Save size={18} />
                  )}
                  {saving
                    ? "Saving..."
                    : activeSession.is_locked && !isAdmin
                      ? "Submit correction request"
                      : "Save attendance"}
                </button>
              </div>
            </>
          )}
        </section>
      )}

      {role === "teacher" && (
        <section className="overflow-hidden rounded-2xl border border-[#E8EEE9] bg-white shadow-sm">
          <div className="border-b border-gray-100 p-5">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-violet-100 p-3 text-violet-700">
                <History size={22} />
              </div>
              <div>
                <h2 className="font-bold text-[#193B32]">
                  My Correction Requests
                </h2>
                <p className="mt-1 text-xs text-gray-500">
                  Track administrator decisions on your attendance corrections.
                </p>
              </div>
            </div>
          </div>

          {myCorrectionRequests.length === 0 ? (
            <div className="p-10 text-center text-sm text-gray-500">
              You haven&apos;t submitted any correction requests yet.
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {myCorrectionRequests.map((request) => {
                const requestSession = sessions.find(
                  (session) => session.id === request.session_id
                );

                return (
                  <div key={request.id} className="space-y-3 p-5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="font-semibold text-[#193B32]">
                          {studentNames[request.student_id] ||
                            `Student ID: ${request.student_id}`}
                        </p>
                        <p className="mt-1 text-xs text-gray-500">
                          {requestSession
                            ? `${classLabel(requestSession.class_id)} · ${subjectLabel(requestSession.subject_id)}`
                            : `Session: ${request.session_id}`}
                        </p>
                      </div>

                      <span
                        className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                          request.status === "approved"
                            ? "bg-emerald-50 text-emerald-700"
                            : request.status === "rejected"
                              ? "bg-red-50 text-red-700"
                              : "bg-amber-50 text-amber-700"
                        }`}
                      >
                        {request.status === "approved"
                          ? "Approved"
                          : request.status === "rejected"
                            ? "Rejected"
                            : "Pending"}
                      </span>
                    </div>

                    <div className="grid gap-3 rounded-xl bg-gray-50 p-4 sm:grid-cols-2">
                      <p className="text-sm text-gray-600">
                        Original status: <strong>{statusLabel(request.old_status)}</strong>
                      </p>
                      <p className="text-sm text-gray-600">
                        Requested status: <strong>{statusLabel(request.requested_status)}</strong>
                      </p>
                    </div>

                    <p className="text-sm text-gray-600">
                      <strong>Your reason:</strong> {request.reason}
                    </p>

                    {request.status === "pending" && (
                      <p className="text-sm font-medium text-amber-700">
                        Waiting for your school administrator to review this request.
                      </p>
                    )}

                    {request.status === "approved" && (
                      <p className="text-sm font-medium text-emerald-700">
                        Your correction has been approved and attendance has been updated.
                      </p>
                    )}

                    {request.status === "rejected" && (
                      <div className="rounded-xl border border-red-100 bg-red-50 p-3">
                        <p className="text-sm font-semibold text-red-800">
                          Administrator&apos;s rejection reason
                        </p>
                        <p className="mt-1 text-sm text-red-700">
                          {request.review_note || "No additional note provided."}
                        </p>
                      </div>
                    )}

                    <div className="space-y-1 text-xs text-gray-400">
                      <p>
                        Submitted: {new Date(request.created_at).toLocaleString()}
                      </p>
                      {request.reviewed_at && (
                        <p>
                          Reviewed: {new Date(request.reviewed_at).toLocaleString()}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      <section className="overflow-hidden rounded-2xl border border-[#E8EEE9] bg-white shadow-sm">
        <div className="border-b border-gray-100 p-5">
          <h2 className="font-bold text-[#193B32]">Recent sessions</h2>
          <p className="mt-1 text-xs text-gray-500">
            {role === "teacher"
              ? "Your latest attendance sessions"
              : "Latest school attendance sessions"}
          </p>
        </div>

        {sessions.length === 0 ? (
          <div className="p-12 text-center">
            <CalendarCheck className="mx-auto text-gray-300" size={38} />
            <p className="mt-3 font-semibold text-gray-700">
              No attendance sessions yet
            </p>
            <p className="mt-1 text-sm text-gray-400">
              Your sessions will appear here after you start one.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {sessions.map((session) => (
              <div
                key={session.id}
                className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-emerald-50 p-3 text-emerald-700">
                    <School size={20} />
                  </div>
                  <div>
                    <p className="font-semibold text-[#193B32]">
                      {classLabel(session.class_id)}
                    </p>
                    <p className="text-sm text-gray-500">
                      {subjectLabel(session.subject_id)}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      {session.session_date}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {session.is_locked ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700">
                      <Lock size={13} /> Locked
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
                      <Unlock size={13} /> Open
                    </span>
                  )}

                  <button
                    type="button"
                    onClick={() => openSession(session)}
                    className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 transition hover:bg-gray-50"
                  >
                    View attendance
                  </button>

                  {isAdmin && (
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => toggleSessionLock(session)}
                      className={`inline-flex items-center gap-1 rounded-lg px-3 py-2 text-xs font-semibold transition disabled:opacity-50 ${
                        session.is_locked
                          ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                          : "bg-red-50 text-red-700 hover:bg-red-100"
                      }`}
                    >
                      {session.is_locked ? (
                        <Unlock size={14} />
                      ) : (
                        <Lock size={14} />
                      )}
                      {session.is_locked ? "Unlock" : "Lock"}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {isAdmin && (
        <>
          <section className="overflow-hidden rounded-2xl border border-[#E8EEE9] bg-white shadow-sm">
            <div className="border-b border-gray-100 p-5">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-amber-100 p-3 text-amber-700">
                  <ShieldCheck size={22} />
                </div>
                <div>
                  <h2 className="font-bold text-[#193B32]">
                    Correction approval requests
                  </h2>
                  <p className="mt-1 text-xs text-gray-500">
                    Review teacher requests for locked attendance sessions.
                  </p>
                </div>
              </div>
            </div>

            {correctionRequests.length === 0 ? (
              <div className="p-10 text-center text-sm text-gray-500">
                <CheckCircle2 className="mx-auto mb-2 text-emerald-500" size={30} />
                No pending correction requests.
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {correctionRequests.map((request) => (
                  <div key={request.id} className="space-y-3 p-5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-semibold text-[#193B32]">
                        Student ID: {request.student_id}
                      </p>
                      <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                        Pending
                      </span>
                    </div>

                    <p className="text-sm text-gray-600">
                      Session: {request.session_id}
                    </p>

                    <div className="grid gap-3 rounded-xl bg-gray-50 p-4 sm:grid-cols-2">
                      <p className="text-sm text-gray-600">
                        Current:{" "}
                        <strong>{statusLabel(request.old_status)}</strong>
                      </p>
                      <p className="text-sm text-gray-600">
                        Requested:{" "}
                        <strong>{statusLabel(request.requested_status)}</strong>
                      </p>
                    </div>

                    <p className="text-sm text-gray-700">
                      <strong>Reason:</strong> {request.reason}
                    </p>

                    <p className="text-xs text-gray-400">
                      Requested by: {request.requested_by}
                    </p>

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() =>
                          reviewCorrection(request.id, true)
                        }
                        className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
                      >
                        <CheckCircle2 size={16} />
                        Approve
                      </button>

                      <button
                        type="button"
                        disabled={saving}
                        onClick={() =>
                          reviewCorrection(request.id, false)
                        }
                        className="inline-flex items-center gap-2 rounded-xl bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700 transition hover:bg-red-100 disabled:opacity-50"
                      >
                        <XCircle size={16} />
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="overflow-hidden rounded-2xl border border-[#E8EEE9] bg-white shadow-sm">
            <div className="border-b border-gray-100 p-5">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-violet-100 p-3 text-violet-700">
                  <History size={22} />
                </div>
                <div>
                  <h2 className="font-bold text-[#193B32]">
                    Attendance audit history
                  </h2>
                  <p className="mt-1 text-xs text-gray-500">
                    Recent recorded attendance changes.
                  </p>
                </div>
              </div>
            </div>

            {auditLogs.length === 0 ? (
              <div className="p-10 text-center text-sm text-gray-500">
                No attendance changes have been recorded yet.
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {auditLogs.map((log) => (
                  <div
                    key={log.id}
                    className="space-y-1 px-5 py-4"
                  >
                    <p className="text-sm font-semibold text-[#193B32]">
                      {log.action}
                    </p>
                    <p className="text-sm text-gray-600">
                      {statusLabel(log.old_status)} →{" "}
                      {statusLabel(log.new_status)}
                    </p>
                    <p className="break-all text-xs text-gray-400">
                      Student: {log.student_id}
                    </p>
                    <p className="text-xs text-gray-400">
                      {new Date(log.changed_at).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
