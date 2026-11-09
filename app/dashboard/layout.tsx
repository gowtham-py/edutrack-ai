"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  BookOpen,
  CalendarCheck,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  X,
  School,
  ClipboardList,
  Wallet,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

const navigation = [
  { name: "Overview", href: "/dashboard", icon: LayoutDashboard, roles: ["school_admin", "super_admin", "teacher"] },
  { name: "Students", href: "/dashboard/students", icon: GraduationCap, roles: ["school_admin", "super_admin"] },
  { name: "Teachers", href: "/dashboard/teachers", icon: Users, roles: ["school_admin", "super_admin"] },
  {
    name: "Teacher Assignments",
    href: "/dashboard/teacher-assignments",
    icon: ClipboardList,
    roles: ["school_admin", "super_admin"],
  },
  { name: "Classes", href: "/dashboard/classes", icon: School, roles: ["school_admin", "super_admin"] },
  { name: "Subjects", href: "/dashboard/subjects", icon: BookOpen, roles: ["school_admin", "super_admin"] },
  {
    name: "Fees",
    href: "/dashboard/fees",
    icon: Wallet,
    roles: ["school_admin", "super_admin"],
  },
  { name: "Attendance", href: "/dashboard/attendance", icon: CalendarCheck, roles: ["school_admin", "super_admin", "teacher"] },
  { name: "Reports", href: "/dashboard/reports", icon: BarChart3, roles: ["school_admin", "super_admin", "teacher"] },
  { name: "Settings", href: "/dashboard/settings", icon: Settings, roles: ["school_admin", "super_admin"] },
];

export default function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  const [fullName, setFullName] = useState("User");
  const [schoolName, setSchoolName] = useState("EduTrack AI");
  const [userRole, setUserRole] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadUser() {
      const { data: authData } = await supabase.auth.getUser();

      if (!authData.user) {
        router.replace("/login");
        return;
      }

      const { data: profile, error } = await supabase
        .from("profiles")
        .select("full_name, school_id, role")
        .eq("user_id", authData.user.id)
        .maybeSingle();

      if (error || !profile) {
        await supabase.auth.signOut();
        router.replace("/login");
        return;
      }

      setFullName(profile.full_name || "User");
      setUserRole(profile.role || "");

      if (profile.school_id) {
        const { data: school } = await supabase
          .from("schools")
          .select("name")
          .eq("id", profile.school_id)
          .maybeSingle();

        if (school?.name) {
          setSchoolName(school.name);
        }
      }

      setLoading(false);
    }

    loadUser();
  }, [router]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  const visibleNavigation = navigation.filter((item) =>
    item.roles.includes(userRole)
  );

  const pageTitle =
    visibleNavigation.find((item) =>
      item.href === "/dashboard"
        ? pathname === item.href
        : pathname.startsWith(item.href)
    )?.name ?? "Dashboard";

  return (
    <div className="min-h-screen bg-[#F4F7F5] text-[#193B32]">
      {mobileOpen && (
        <button
          aria-label="Close menu"
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-[#123C35] text-white shadow-2xl transition-transform duration-300 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0`}
      >
        <div className="flex items-center gap-3 border-b border-white/10 px-6 py-6">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-400 text-[#123C35]">
            <School size={24} />
          </div>

          <div className="min-w-0">
            <h1 className="text-lg font-bold tracking-wide">EduTrack AI</h1>
            <p className="truncate text-xs text-emerald-100/70">
              {schoolName}
            </p>
          </div>

          <button
            onClick={() => setMobileOpen(false)}
            className="ml-auto rounded-lg p-2 hover:bg-white/10 lg:hidden"
            aria-label="Close sidebar"
          >
            <X size={20} />
          </button>
        </div>

        <div className="px-5 pt-7 pb-3 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-100/50">
          Workspace
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-4">
          {visibleNavigation.map((item) => {
            const Icon = item.icon;
            const active =
              item.href === "/dashboard"
                ? pathname === item.href
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={`group flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200 ${
                  active
                    ? "bg-emerald-400 text-[#123C35] shadow-lg shadow-emerald-950/20"
                    : "text-emerald-50/75 hover:translate-x-1 hover:bg-white/10 hover:text-white"
                }`}
              >
                <Icon size={19} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-white/10 p-4">
          <div className="mb-3 flex items-center gap-3 rounded-xl bg-white/5 p-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-400/20 font-bold text-violet-200">
              {fullName.charAt(0).toUpperCase()}
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{fullName}</p>
              <p className="text-xs capitalize text-emerald-100/60">
                {userRole.replaceAll("_", " ")}
              </p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm text-emerald-50/75 transition hover:bg-red-400/10 hover:text-red-200"
          >
            <LogOut size={18} />
            Sign out
          </button>
        </div>
      </aside>

      <div className="min-h-screen lg:pl-72">
        <header className="sticky top-0 z-30 flex h-[76px] items-center justify-between border-b border-[#E5ECE7] bg-white/90 px-5 backdrop-blur-xl sm:px-8">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="rounded-xl p-2 hover:bg-[#F0F5F1] lg:hidden"
              aria-label="Open menu"
            >
              <Menu size={22} />
            </button>

            <div>
              <h2 className="text-xl font-bold text-[#193B32]">
                {pageTitle}
              </h2>
              <p className="hidden text-xs text-gray-500 sm:block">
                Welcome to your EduTrack AI workspace
              </p>
            </div>
          </div>

          <div className="hidden items-center gap-3 sm:flex">
            <div className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
            <span className="text-sm font-medium text-gray-600">
              Workspace
            </span>
          </div>
        </header>

        <main className="p-5 sm:p-8">
          {loading ? (
            <div className="flex min-h-[50vh] items-center justify-center">
              <div className="h-9 w-9 animate-spin rounded-full border-4 border-emerald-100 border-t-emerald-600" />
            </div>
          ) : (
            children
          )}
        </main>
      </div>
    </div>
  );
}
