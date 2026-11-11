
"use client";

import { useCallback, useState } from "react";
import {
  Sparkles,
  X,
  Send,
  RefreshCw,
  Loader2,
  TrendingUp,
  Users,
  AlertTriangle,
  CheckCircle2,
  MessageCircle,
  BarChart3,
  Lightbulb,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

type ClassInsight = {
  className: string;
  attendanceRate: number;
  totalRecords: number;
};

type InsightData = {
  attendanceRate: number;
  totalRecords: number;
  present: number;
  absent: number;
  late: number;
  halfDay: number;
  shortageCount: number;
  previousRate: number | null;
  recentRate?: number | null;
  classInsights: ClassInsight[];
  summary: string;
  recommendations: string[];
  aiPowered: boolean;
  dataNote?: string;
};

type Props = {
  fullName: string;
  userRole: string;
};

const roleLabels: Record<string, string> = {
  school_admin: "School Admin",
  super_admin: "Super Admin",
  teacher: "Teacher",
};

const roleQuestions: Record<string, string[]> = {
  school_admin: [
    "How is our overall attendance?",
    "Which classes need attention?",
    "How can we improve attendance?",
  ],
  super_admin: [
    "Show the latest attendance insights.",
    "Which attendance areas need attention?",
    "What improvements do you recommend?",
  ],
  teacher: [
    "How is attendance in my classes?",
    "Are there any attendance concerns?",
    "How can I improve class attendance?",
  ],
};

export default function AICopilot({ fullName, userRole }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [insights, setInsights] = useState<InsightData | null>(null);

  const loadInsights = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const { data: sessionData, error: sessionError } =
        await supabase.auth.getSession();

      if (sessionError || !sessionData.session?.access_token) {
        throw new Error("Please sign in again to use AI Copilot.");
      }

      const response = await fetch("/api/education-insights", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${sessionData.session.access_token}`,
        },
        cache: "no-store",
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.error || "Unable to load education insights."
        );
      }

      setInsights(result.data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  function toggleCopilot() {
    const nextOpen = !open;
    setOpen(nextOpen);

    if (nextOpen && !insights) {
      void loadInsights();
    }
  }

  const questions = roleQuestions[userRole] || [
    "Show my latest education insights.",
  ];

  return (
    <>
      {open && (
        <div className="fixed bottom-24 right-4 z-[100] flex max-h-[min(720px,calc(100vh-120px))] w-[calc(100vw-32px)] max-w-[410px] flex-col overflow-hidden rounded-3xl border border-emerald-100 bg-white shadow-2xl shadow-emerald-950/20 sm:right-7">
          <div className="bg-gradient-to-br from-[#123C35] via-[#17634E] to-emerald-600 p-5 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15">
                  <Sparkles size={23} />
                </div>
                <div>
                  <h3 className="font-bold">EduTrack AI Copilot</h3>
                  <p className="text-xs text-emerald-100">
                    Your intelligent education assistant
                  </p>
                </div>
              </div>

              <button
                onClick={() => setOpen(false)}
                className="rounded-xl p-2 transition hover:bg-white/15"
                aria-label="Close AI Copilot"
              >
                <X size={20} />
              </button>
            </div>

            <div className="mt-5">
              <p className="text-sm text-emerald-100">
                Hello, {fullName}!
              </p>
              <h4 className="mt-1 text-xl font-bold">
                What can I help you understand today?
              </h4>
              <p className="mt-2 text-xs text-emerald-100/80">
                {roleLabels[userRole] || "EduTrack User"} workspace
              </p>
            </div>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto p-5">
            <div>
              <div className="mb-3 flex items-center justify-between">
                <h4 className="flex items-center gap-2 text-sm font-bold text-[#193B32]">
                  <BarChart3 size={17} className="text-emerald-600" />
                  Education Insights
                </h4>

                <button
                  onClick={() => void loadInsights()}
                  disabled={loading}
                  className="rounded-lg p-2 text-gray-500 transition hover:bg-emerald-50 hover:text-emerald-700 disabled:opacity-50"
                  aria-label="Refresh insights"
                >
                  <RefreshCw
                    size={16}
                    className={loading ? "animate-spin" : ""}
                  />
                </button>
              </div>

              {loading && !insights && (
                <div className="flex flex-col items-center justify-center rounded-2xl bg-emerald-50 p-8 text-center">
                  <Loader2
                    size={28}
                    className="animate-spin text-emerald-600"
                  />
                  <p className="mt-3 text-sm font-medium text-[#193B32]">
                    Analyzing your attendance data...
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    Please wait a moment.
                  </p>
                </div>
              )}

              {error && (
                <div className="rounded-2xl border border-red-100 bg-red-50 p-4">
                  <p className="text-sm text-red-700">{error}</p>
                  <button
                    onClick={() => void loadInsights()}
                    className="mt-3 text-xs font-bold text-red-700 underline"
                  >
                    Try again
                  </button>
                </div>
              )}

              {insights && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-2xl bg-emerald-50 p-3">
                      <div className="flex items-center gap-2 text-emerald-700">
                        <TrendingUp size={17} />
                        <span className="text-xs font-semibold">
                          Attendance
                        </span>
                      </div>
                      <p className="mt-2 text-2xl font-bold text-[#123C35]">
                        {insights.attendanceRate}%
                      </p>
                    </div>

                    <div className="rounded-2xl bg-amber-50 p-3">
                      <div className="flex items-center gap-2 text-amber-700">
                        <AlertTriangle size={17} />
                        <span className="text-xs font-semibold">
                          Below threshold
                        </span>
                      </div>
                      <p className="mt-2 text-2xl font-bold text-amber-900">
                        {insights.shortageCount}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-blue-50 p-3">
                      <div className="flex items-center gap-2 text-blue-700">
                        <Users size={17} />
                        <span className="text-xs font-semibold">
                          Present
                        </span>
                      </div>
                      <p className="mt-2 text-2xl font-bold text-blue-900">
                        {insights.present}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-rose-50 p-3">
                      <div className="flex items-center gap-2 text-rose-700">
                        <AlertTriangle size={17} />
                        <span className="text-xs font-semibold">
                          Absent
                        </span>
                      </div>
                      <p className="mt-2 text-2xl font-bold text-rose-900">
                        {insights.absent}
                      </p>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-emerald-100 p-4">
                    <div className="mb-2 flex items-center gap-2">
                      <Sparkles
                        size={17}
                        className="text-emerald-600"
                      />
                      <h5 className="text-sm font-bold text-[#193B32]">
                        AI Analysis
                      </h5>
                      <span
                        className={`ml-auto rounded-full px-2 py-1 text-[10px] font-semibold ${
                          insights.aiPowered
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {insights.aiPowered ? "Gemini AI" : "Basic insights"}
                      </span>
                    </div>

                    <p className="text-sm leading-6 text-gray-600">
                      {insights.summary}
                    </p>
                  </div>

                  {insights.classInsights.length > 0 && (
                    <div className="rounded-2xl border border-gray-100 p-4">
                      <h5 className="mb-3 text-sm font-bold text-[#193B32]">
                        Class Attendance
                      </h5>

                      <div className="space-y-3">
                        {insights.classInsights.map((item) => (
                          <div key={item.className}>
                            <div className="mb-1 flex justify-between gap-3 text-xs">
                              <span className="font-medium text-gray-700">
                                {item.className}
                              </span>
                              <span className="font-bold text-[#193B32]">
                                {item.attendanceRate}%
                              </span>
                            </div>

                            <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                              <div
                                className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400"
                                style={{
                                  width: `${Math.min(
                                    100,
                                    Math.max(0, item.attendanceRate)
                                  )}%`,
                                }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {insights.recommendations.length > 0 && (
                    <div className="rounded-2xl bg-violet-50 p-4">
                      <h5 className="mb-3 flex items-center gap-2 text-sm font-bold text-violet-900">
                        <Lightbulb size={17} />
                        AI Recommendations
                      </h5>

                      <div className="space-y-3">
                        {insights.recommendations.map((item, index) => (
                          <div
                            key={index}
                            className="flex items-start gap-2 text-sm leading-5 text-violet-900"
                          >
                            <CheckCircle2
                              size={16}
                              className="mt-0.5 shrink-0 text-violet-600"
                            />
                            <span>{item}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {insights.dataNote && (
                    <p className="text-[11px] leading-5 text-gray-400">
                      {insights.dataNote}
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="rounded-2xl bg-gray-50 p-4">
              <h5 className="mb-3 text-xs font-bold uppercase tracking-wide text-gray-500">
                Suggested questions
              </h5>

              <div className="space-y-2">
                {questions.map((question) => (
                  <div
                    key={question}
                    className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-xs text-gray-600"
                  >
                    {question}
                  </div>
                ))}
              </div>
              <p className="mt-3 text-[11px] text-gray-400">
                Interactive question answering will be connected in the next
                implementation step.
              </p>
            </div>
          </div>
        </div>
      )}

      <button
        onClick={toggleCopilot}
        className="fixed bottom-5 right-5 z-[100] flex items-center gap-3 rounded-full bg-gradient-to-r from-[#123C35] to-emerald-600 px-5 py-4 text-white shadow-xl shadow-emerald-900/25 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl sm:bottom-7 sm:right-7"
        aria-label="Open EduTrack AI Copilot"
      >
        {open ? <X size={21} /> : <Sparkles size={21} />}
        <span className="text-sm font-bold">
          {open ? "Close Copilot" : "Ask AI Copilot"}
        </span>
      </button>
    </>
  );
}
