
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

type Session = {
  id: string;
  session_date: string;
  started_at: string;
  ended_at: string | null;
  class_id: string;
  subject_id: string;
};

type Student = {
  id: string;
  full_name: string;
  admission_number: string;
};

type AttendanceStatus =
  | "present"
  | "absent"
  | "late"
  | "half_day"
  | "approved_leave";

const statusOptions: { value: AttendanceStatus; label: string }[] = [
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
  const [activeSession, setActiveSession] = useState<Session | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadingStudents, setLoadingStudents] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

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
        "id, session_date, started_at, ended_at, class_id, subject_id"
      )
      .eq("school_id", profile.school_id)
      .order("started_at", { ascending: false })
      .limit(20);

    if (profile.role === "teacher") {
      sessionQuery = sessionQuery.eq("teacher_id", currentUserId);
    }

    const { data: sessionData, error: sessionError } = await sessionQuery;

    if (sessionError) {
      setError(sessionError.message);
    } else {
      setSessions(sessionData || []);
    }

    setLoading(false);
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
        "id, session_date, started_at, ended_at, class_id, subject_id"
      )
      .single();

    if (insertError) {
      setError(insertError.message);
      setSaving(false);
      return;
    }

    setActiveSession(sessionData);
    setMessage("Attendance session started successfully!");

    await loadStudents(classId);

    setSaving(false);
    await loadData();
  }

  async function loadStudents(selectedClassId: string) {
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

    const studentList = data || [];
    setStudents(studentList);

    const initialStatuses: Record<string, AttendanceStatus> = {};

    studentList.forEach((student) => {
      initialStatuses[student.id] = "present";
    });

    setStudentStatuses(initialStatuses);
    setLoadingStudents(false);

    if (studentList.length === 0) {
      setMessage("No students are registered in this class yet.");
    }
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
      <section>
        <h1 className="text-2xl font-bold text-[#193B32]">
          Attendance Management
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          {role === "teacher"
            ? "Manage attendance for your assigned classes and subjects."
            : "Create and manage class-wise, subject-wise attendance sessions."}
        </p>
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
            <h2 className="font-bold text-[#193B32]">Start attendance</h2>
            <p className="text-sm text-gray-500">
              Choose the class and subject for this session.
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
                onChange={(event) => handleClassChange(event.target.value)}
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
            disabled={
              saving ||
              !classes.length ||
              !classId ||
              !subjectId
            }
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
              <h2 className="font-bold text-[#193B32]">
                Mark student attendance
              </h2>
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

              <div className="flex flex-col gap-3 border-t border-gray-100 bg-gray-50 p-5 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-gray-500">
                  Review each student's status before saving.
                </p>
                <button
                  type="button"
                  onClick={saveAttendance}
                  disabled={saving || !students.length}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#087F5B] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#066B4D] disabled:opacity-50"
                >
                  {saving ? (
                    <Loader2 className="animate-spin" size={18} />
                  ) : (
                    <Save size={18} />
                  )}
                  {saving ? "Saving..." : "Save attendance"}
                </button>
              </div>
            </>
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
            <CalendarCheck
              className="mx-auto text-gray-300"
              size={38}
            />
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
                  </div>
                </div>
                <div className="text-sm sm:text-right">
                  <p className="font-medium text-gray-700">
                    {session.session_date}
                  </p>
                  <p className="text-xs text-gray-500">
                    {session.ended_at ? "Completed" : "Session created"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
