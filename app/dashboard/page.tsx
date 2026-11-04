
"use client";

import { useEffect, useState } from "react";
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

const overviewCards = [
  {
    title: "Total Students",
    value: "—",
    description: "Registered students",
    icon: GraduationCap,
    color: "bg-emerald-100 text-emerald-700",
  },
  {
    title: "Total Teachers",
    value: "—",
    description: "Active teachers",
    icon: Users,
    color: "bg-violet-100 text-violet-700",
  },
  {
    title: "Total Classes",
    value: "—",
    description: "Classes and sections",
    icon: BookOpen,
    color: "bg-amber-100 text-amber-700",
  },
  {
    title: "Attendance Today",
    value: "—",
    description: "Today's attendance",
    icon: CalendarCheck,
    color: "bg-sky-100 text-sky-700",
  },
];

export default function DashboardPage() {
  const [role, setRole] = useState("");
  const [fullName, setFullName] = useState("User");
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadDashboard() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

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
        setError("Unable to load your profile.");
        setLoading(false);
        return;
      }

      setRole(profile.role);
      setFullName(profile.full_name || "User");

      if (profile.role === "teacher") {
        const { data: assignmentData, error: assignmentError } =
          await supabase
            .from("teacher_assignments")
            .select("id, class_id, subject_id")
            .eq("teacher_id", user.id)
            .eq("school_id", profile.school_id);

        if (assignmentError) {
          setError("Unable to load your teaching assignments.");
          setLoading(false);
          return;
        }

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

          if (classError) {
            setError("Unable to load your assigned classes.");
            setLoading(false);
            return;
          }

          setClasses(classData || []);
        }

        if (subjectIds.length > 0) {
          const { data: subjectData, error: subjectError } = await supabase
            .from("subjects")
            .select("id, subject_name")
            .in("id", subjectIds);

          if (subjectError) {
            setError("Unable to load your assigned subjects.");
            setLoading(false);
            return;
          }

          setSubjects(subjectData || []);
        }
      }

      setLoading(false);
    }

    loadDashboard();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-9 w-9 animate-spin rounded-full border-4 border-emerald-100 border-t-emerald-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">
        {error}
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
              Your teaching workspace is ready. View your assigned classes
              and subjects and manage attendance.
            </p>
          </div>

          <div className="pointer-events-none absolute -right-12 -top-24 h-72 w-72 rounded-full border-[35px] border-white/10" />
          <div className="pointer-events-none absolute -bottom-32 right-32 h-64 w-64 rounded-full bg-white/10 blur-2xl" />
        </section>

        <section className="grid gap-5 sm:grid-cols-2">
          <div className="rounded-2xl border border-[#E8EEE9] bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-emerald-100 p-3 text-emerald-700">
                <BookOpen size={23} />
              </div>
              <div>
                <p className="text-sm text-gray-500">Assigned Classes</p>
                <p className="text-3xl font-bold text-[#193B32]">
                  {new Set(assignments.map((item) => item.class_id)).size}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-[#E8EEE9] bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-violet-100 p-3 text-violet-700">
                <ClipboardList size={23} />
              </div>
              <div>
                <p className="text-sm text-gray-500">Teaching Assignments</p>
                <p className="text-3xl font-bold text-[#193B32]">
                  {assignments.length}
                </p>
              </div>
            </div>
          </div>
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

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#087F5B] via-[#11956C] to-[#36B98B] p-7 text-white shadow-xl shadow-emerald-900/10 sm:p-10">
        <div className="relative z-10 max-w-2xl">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold">
            <Sparkles size={14} />
            SMART SCHOOL MANAGEMENT
          </div>

          <h1 className="text-3xl font-bold leading-tight sm:text-4xl">
            Welcome to EduTrack AI
          </h1>

          <p className="mt-3 max-w-xl text-sm leading-6 text-emerald-50 sm:text-base">
            Your school management workspace. Manage students, teachers,
            classes and attendance from one place.
          </p>
        </div>

        <div className="pointer-events-none absolute -right-12 -top-24 h-72 w-72 rounded-full border-[35px] border-white/10" />
        <div className="pointer-events-none absolute -bottom-32 right-32 h-64 w-64 rounded-full bg-white/10 blur-2xl" />
      </section>

      <section>
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-[#193B32]">
              School Overview
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Your institution at a glance
            </p>
          </div>
          <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
            Live workspace
          </span>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {overviewCards.map((card) => {
            const Icon = card.icon;

            return (
              <div
                key={card.title}
                className="group rounded-2xl border border-[#E8EEE9] bg-white p-5 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-lg"
              >
                <div className="flex items-center justify-between">
                  <div className={`rounded-xl p-3 ${card.color}`}>
                    <Icon size={22} />
                  </div>
                  <ArrowUpRight
                    size={18}
                    className="text-gray-300 transition group-hover:text-emerald-600"
                  />
                </div>

                <p className="mt-5 text-sm font-medium text-gray-500">
                  {card.title}
                </p>
                <p className="mt-1 text-3xl font-bold text-[#193B32]">
                  {card.value}
                </p>
                <p className="mt-2 text-xs text-gray-400">
                  {card.description}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="rounded-2xl border border-[#E8EEE9] bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-[#193B32]">
          Getting started
        </h2>
        <p className="mt-2 text-sm leading-6 text-gray-500">
          Your dashboard is ready. Start by setting up your classes and
          adding your school data. More management features will appear
          here as we build them.
        </p>
      </section>
    </div>
  );
}
