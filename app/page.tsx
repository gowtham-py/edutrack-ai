
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function HomePage() {
  const router = useRouter();
  const [choice, setChoice] = useState<"create" | "login" | null>(null);

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-5 md:px-12">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600 text-xl font-bold text-white">
            E
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              EduTrack AI
            </h1>
            <p className="text-[10px] font-semibold tracking-[0.2em] text-blue-600">
              SMART CAMPUS MANAGEMENT
            </p>
          </div>
        </div>
        <span className="hidden text-sm text-slate-500 md:block">
          Intelligent attendance. Better education.
        </span>
      </header>

      <section className="mx-auto grid min-h-[calc(100vh-81px)] max-w-7xl items-center gap-12 px-6 py-16 md:grid-cols-2 md:px-12">
        <div>
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700">
            <span className="h-2 w-2 rounded-full bg-blue-600" />
            Intelligent campus platform
          </div>

          <h2 className="max-w-xl text-5xl font-bold leading-tight tracking-tight text-slate-900 md:text-6xl">
            A smarter way to manage your
            <span className="text-blue-600"> institution.</span>
          </h2>

          <p className="mt-6 max-w-lg text-lg leading-8 text-slate-500">
            Simplify attendance, connect teachers and parents, and gain
            meaningful insights with intelligent campus management.
          </p>

          <div className="mt-10 grid max-w-md grid-cols-2 gap-4">
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="mb-2 text-xl text-blue-600">01</div>
              <p className="font-semibold">Smart Attendance</p>
              <p className="mt-1 text-sm text-slate-500">
                Faster attendance management
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="mb-2 text-xl text-blue-600">02</div>
              <p className="font-semibold">Campus Insights</p>
              <p className="mt-1 text-sm text-slate-500">
                Clear institutional reports
              </p>
            </div>
          </div>
        </div>

        <div className="mx-auto w-full max-w-md">
          <div className="rounded-3xl border border-slate-200 bg-white p-7 shadow-xl shadow-slate-200/60 md:p-9">
            <p className="text-sm font-semibold uppercase tracking-wider text-blue-600">
              Get started
            </p>
            <h3 className="mt-3 text-3xl font-bold text-slate-900">
              Welcome to EduTrack AI
            </h3>
            <p className="mt-3 leading-6 text-slate-500">
              Choose how you would like to access your institution.
            </p>

            <div className="mt-8 space-y-4">
              <button
                onClick={() => router.push("/register")}
                className="group w-full rounded-xl bg-blue-600 p-5 text-left text-white transition hover:bg-blue-700"
              >
                <span className="flex items-center justify-between">
                  <span>
                    <span className="block text-lg font-semibold">
                      Create your school
                    </span>
                    <span className="mt-1 block text-sm text-blue-100">
                      Register a new institution
                    </span>
                  </span>
                  <span className="text-2xl">→</span>
                </span>
              </button>

              <button
                onClick={() => router.push("/login")}
                className="group w-full rounded-xl border border-slate-200 bg-white p-5 text-left transition hover:border-blue-300 hover:bg-blue-50"
              >
                <span className="flex items-center justify-between">
                  <span>
                    <span className="block text-lg font-semibold text-slate-900">
                      Login to your school
                    </span>
                    <span className="mt-1 block text-sm text-slate-500">
                      Access your existing workspace
                    </span>
                  </span>
                  <span className="text-2xl text-blue-600">→</span>
                </span>
              </button>
            </div>

            <p className="mt-7 text-center text-xs leading-5 text-slate-400">
              Secure access for school administrators, teachers, students
              and parents.
            </p>
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-200 bg-white px-6 py-5 text-center text-sm text-slate-400">
        © 2026 EduTrack AI. Smart Campus Management.
      </footer>
    </main>
  );
}
