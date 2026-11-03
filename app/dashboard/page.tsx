
"use client";

import {
  Users,
  GraduationCap,
  BookOpen,
  CalendarCheck,
  ArrowUpRight,
  Sparkles,
} from "lucide-react";

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
