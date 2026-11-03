"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  BookOpen,
  ClipboardCheck,
  BarChart3,
  Settings,
  LogOut,
  Bell,
  Search,
  ArrowUpRight,
  School,
  Menu,
  X,
} from "lucide-react";

const navigation = [
  { name: "Overview", icon: LayoutDashboard },
  { name: "Students", icon: GraduationCap },
  { name: "Teachers", icon: Users },
  { name: "Classes", icon: School },
  { name: "Subjects", icon: BookOpen },
  { name: "Attendance", icon: ClipboardCheck },
  { name: "Reports", icon: BarChart3 },
  { name: "Settings", icon: Settings },
];

export default function DashboardPage() {
  const router = useRouter();

  const [schoolName, setSchoolName] = useState("");
  const [adminName, setAdminName] = useState("");
  const [active, setActive] = useState("Overview");
  const [loading, setLoading] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    async function loadDashboard() {
      const { data } = await supabase.auth.getUser();

      if (!data.user) {
        router.replace("/login");
        return;
      }

      const { data: profile, error } = await supabase
        .from("profiles")
        .select("full_name, school_id")
        .eq("user_id", data.user.id)
        .single();

      if (error || !profile) {
        router.replace("/login");
        return;
      }

      const { data: school } = await supabase
        .from("schools")
        .select("name")
        .eq("id", profile.school_id)
        .single();

      setAdminName(profile.full_name);
      setSchoolName(school?.name || "Your Institution");
      setLoading(false);
    }

    loadDashboard();
  }, [router]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F5F8F6]">
        <p className="font-medium text-emerald-800 animate-pulse">
          Preparing your workspace...
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F5F8F6] text-slate-800">

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[260px] flex-col bg-[#123C35] text-white transition-transform duration-300 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-6">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-400 text-xl font-black text-[#123C35]">
              E
            </div>
            <div>
              <h1 className="text-lg font-bold">EduTrack AI</h1>
              <p className="text-[9px] tracking-[2px] text-emerald-300">
                SMART CAMPUS
              </p>
            </div>
          </div>

          <button
            className="lg:hidden"
            onClick={() => setMobileOpen(false)}
          >
            <X size={20} />
          </button>
        </div>

        <div className="px-5 pt-8 pb-3 text-[10px] font-bold tracking-[2px] text-emerald-300/60">
          MAIN MENU
        </div>

        <nav className="flex-1 space-y-1 px-3">
          {navigation.map((item) => {
            const Icon = item.icon;
            const selected = active === item.name;

            return (
              <button
                key={item.name}
                onClick={() => {
                  setActive(item.name);
                  setMobileOpen(false);
                }}
                className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200 ${
                  selected
                    ? "bg-emerald-400 text-[#123C35] shadow-lg shadow-black/10"
                    : "text-emerald-50/70 hover:bg-white/10 hover:text-white"
                }`}
              >
                <Icon size={19} />
                {item.name}
                {selected && (
                  <span className="ml-auto h-2 w-2 rounded-full bg-[#123C35]" />
                )}
              </button>
            );
          })}
        </nav>

        <div className="m-4 rounded-2xl border border-white/10 bg-white/5 p-4">
          <p className="text-xs font-semibold text-emerald-200">
            Your institution
          </p>
          <p className="mt-2 text-sm font-bold">{schoolName}</p>
          <p className="mt-2 text-[11px] text-emerald-100/50">
            EduTrack AI workspace
          </p>
        </div>

        <button
          onClick={handleLogout}
          className="mx-4 mb-5 flex items-center gap-3 rounded-xl px-4 py-3 text-sm text-emerald-100/70 transition hover:bg-red-500/20 hover:text-white"
        >
          <LogOut size={18} />
          Log out
        </button>
      </aside>

      {/* Main content */}
      <div className="min-h-screen lg:ml-[260px]">

        {/* Topbar */}
        <header className="sticky top-0 z-30 flex h-[76px] items-center justify-between border-b border-emerald-900/5 bg-white/90 px-5 backdrop-blur-xl sm:px-8">

          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="rounded-lg p-2 hover:bg-emerald-50 lg:hidden"
            >
              <Menu size={22} />
            </button>

            <div>
              <p className="text-xs text-slate-400">Institution workspace</p>
              <p className="text-sm font-bold text-[#123C35]">
                {active}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 sm:gap-5">
            <button className="rounded-xl border border-slate-100 p-2.5 text-slate-500 transition hover:bg-emerald-50 hover:text-emerald-700">
              <Search size={18} />
            </button>

            <button className="relative rounded-xl border border-slate-100 p-2.5 text-slate-500 transition hover:bg-emerald-50 hover:text-emerald-700">
              <Bell size={18} />
            </button>

            <div className="flex items-center gap-3 border-l border-slate-100 pl-4">
              <div className="hidden text-right sm:block">
                <p className="text-sm font-bold text-slate-800">
                  {adminName}
                </p>
                <p className="text-[11px] text-emerald-700">
                  School Administrator
                </p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-teal-700 font-bold text-white shadow-md">
                {adminName.charAt(0).toUpperCase()}
              </div>
            </div>
          </div>
        </header>

        {/* Dashboard */}
        <section className="mx-auto max-w-[1450px] px-5 py-9 sm:px-8">

          <div className="mb-9 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-[2px] text-emerald-700">
                Welcome to your workspace
              </p>
              <h2 className="text-3xl font-bold tracking-tight text-[#123C35] sm:text-4xl">
                Hello, {adminName}!
              </h2>
              <p className="mt-2 text-sm text-slate-500">
                Manage your institution from one intelligent workspace.
              </p>
            </div>

            <div className="rounded-xl border border-emerald-100 bg-white px-4 py-3 shadow-sm">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Institution
              </p>
              <p className="mt-1 text-sm font-bold text-emerald-800">
                {schoolName}
              </p>
            </div>
          </div>

          {/* Welcome banner */}
          <div className="relative mb-9 overflow-hidden rounded-3xl bg-gradient-to-r from-[#087F5B] via-[#13866B] to-[#256D72] p-7 text-white shadow-xl shadow-emerald-900/10 sm:p-9">
            <div className="relative z-10 max-w-xl">
              <p className="text-xs font-bold uppercase tracking-[2px] text-emerald-100">
                EduTrack AI
              </p>
              <h3 className="mt-3 text-2xl font-bold sm:text-3xl">
                Your campus, connected.
              </h3>
              <p className="mt-3 text-sm leading-7 text-emerald-50/80">
                Bring students, teachers, classes and attendance together
                in one organised digital workspace.
              </p>
              <button
                onClick={() => setActive("Students")}
                className="mt-6 inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-emerald-800 transition duration-300 hover:-translate-y-1 hover:shadow-lg"
              >
                Explore workspace <ArrowUpRight size={17} />
              </button>
            </div>

            <div className="pointer-events-none absolute -right-12 -top-24 h-72 w-72 rounded-full border-[35px] border-white/10" />
            <div className="pointer-events-none absolute -bottom-32 right-36 h-64 w-64 rounded-full bg-white/10 blur-2xl" />
          </div>

          {/* Overview cards */}
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-bold text-[#123C35]">
              Institution overview
            </h3>
            <span className="text-xs text-slate-400">
              Live data will appear as you add records
            </span>
          </div>

          <div className="mb-9 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            {[
              {
                title: "Total Students",
                value: "—",
                detail: "Student records",
                icon: GraduationCap,
                color: "bg-emerald-50 text-emerald-700",
              },
              {
                title: "Total Teachers",
                value: "—",
                detail: "Teaching staff",
                icon: Users,
                color: "bg-violet-50 text-violet-700",
              },
              {
                title: "Classes",
                value: "—",
                detail: "Class and sections",
                icon: School,
                color: "bg-amber-50 text-amber-700",
              },
              {
                title: "Attendance",
                value: "—",
                detail: "Attendance records",
                icon: ClipboardCheck,
                color: "bg-sky-50 text-sky-700",
              },
            ].map((item) => {
              const Icon = item.icon;

              return (
                <div
                  key={item.title}
                  className="group rounded-2xl border border-slate-100 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-emerald-900/5"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-500">
                        {item.title}
                      </p>
                      <p className="mt-4 text-3xl font-bold text-[#123C35]">
                        {item.value}
                      </p>
                      <p className="mt-2 text-xs text-slate-400">
                        {item.detail}
                      </p>
                    </div>

                    <div className={`rounded-xl p-3 ${item.color} transition-transform duration-300 group-hover:scale-110`}>
                      <Icon size={21} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Management section */}
          <h3 className="mb-4 text-lg font-bold text-[#123C35]">
            Manage your institution
          </h3>

          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {[
              {
                name: "Student Management",
                description: "Add students and manage student profiles.",
                icon: GraduationCap,
                color: "bg-emerald-50 text-emerald-700",
                target: "Students",
              },
              {
                name: "Teacher Management",
                description: "Manage teachers and staff accounts.",
                icon: Users,
                color: "bg-violet-50 text-violet-700",
                target: "Teachers",
              },
              {
                name: "Class Management",
                description: "Organise classes, grades and sections.",
                icon: School,
                color: "bg-amber-50 text-amber-700",
                target: "Classes",
              },
              {
                name: "Subject Management",
                description: "Organise subjects across classes.",
                icon: BookOpen,
                color: "bg-sky-50 text-sky-700",
                target: "Subjects",
              },
              {
                name: "Attendance",
                description: "Manage attendance sessions and records.",
                icon: ClipboardCheck,
                color: "bg-rose-50 text-rose-700",
                target: "Attendance",
              },
              {
                name: "Reports & Analytics",
                description: "View institutional reports and insights.",
                icon: BarChart3,
                color: "bg-indigo-50 text-indigo-700",
                target: "Reports",
              },
            ].map((item) => {
              const Icon = item.icon;

              return (
                <button
                  key={item.name}
                  onClick={() => setActive(item.target)}
                  className="group flex items-start gap-4 rounded-2xl border border-slate-100 bg-white p-5 text-left shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-emerald-200 hover:shadow-xl hover:shadow-emerald-900/5"
                >
                  <div className={`rounded-xl p-3 ${item.color} transition-transform duration-300 group-hover:scale-110`}>
                    <Icon size={23} />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-[#123C35]">
                      {item.name}
                    </h4>
                    <p className="mt-2 text-xs leading-5 text-slate-500">
                      {item.description}
                    </p>
                  </div>
                  <ArrowUpRight
                    size={17}
                    className="text-slate-300 transition-all group-hover:-translate-y-1 group-hover:translate-x-1 group-hover:text-emerald-600"
                  />
                </button>
              );
            })}
          </div>

          <footer className="mt-12 border-t border-emerald-900/10 py-6 text-center text-xs text-slate-400">
            © 2026 EduTrack AI · Intelligent Campus Management
          </footer>
        </section>
      </div>
    </main>
  );
}
