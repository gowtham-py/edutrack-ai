
"use client";

import { useCallback, useState } from "react";
import type { FormEvent } from "react";
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

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type Props = {
  fullName: string;
  userRole: string;
};

const roleLabels: Record<string, string> = {
  school_admin: "School Admin",
  super_admin: "Super Admin",
  principal: "Principal",
  teacher: "Teacher",
  student: "Student",
  parent: "Parent",
};

const roleQuestions: Record<string, string[]> = {
  school_admin: [
    "How is our school's overall attendance?",
    "What is our outstanding fee amount?",
    "Which areas need administrative attention?",
    "How can we improve school performance?",
  ],
  super_admin: [
    "Show me the latest platform insights.",
    "Which institutions need attention?",
    "What improvements do you recommend?",
  ],
  principal: [
    "How is our school's overall attendance?",
    "Which classes need attention?",
    "What should we improve?",
  ],
  teacher: [
    "How is attendance in my assigned classes?",
    "Are there any attendance concerns?",
    "How can I improve class attendance?",
  ],
  student: [
    "What is my current attendance percentage?",
    "Do I have any outstanding fees?",
    "Show me my recent attendance.",
    "What are my pending fee payments?",
  ],
  parent: [
    "Show my child's attendance.",
    "Are there any pending fees?",
    "How is my child's academic progress?",
  ],
};

export default function AICopilot({ fullName, userRole }: Props) {
  const [open, setOpen] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [insights, setInsights] = useState<InsightData | null>(null);

  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState("");

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

  async function sendMessage(question?: string) {
    const text = (question ?? message).trim();

    if (!text || chatLoading) return;

    if (text.length > 1000) {
      setChatError("Your message must be 1000 characters or fewer.");
      return;
    }

    setMessage("");
    setChatError("");
    setChatLoading(true);

    setMessages((previous) => [
      ...previous,
      { role: "user", content: text },
    ]);

    try {
      const { data: sessionData, error: sessionError } =
        await supabase.auth.getSession();

      if (sessionError || !sessionData.session?.access_token) {
        throw new Error("Please sign in again to continue.");
      }

      const response = await fetch("/api/ai-copilot", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sessionData.session.access_token}`,
        },
        body: JSON.stringify({ message: text }),
        cache: "no-store",
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.error || "The AI assistant could not respond."
        );
      }

      setMessages((previous) => [
        ...previous,
        { role: "assistant", content: result.reply },
      ]);
    } catch (err) {
      setChatError(
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again."
      );
    } finally {
      setChatLoading(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void sendMessage();
  }

  function toggleCopilot() {
    const nextOpen = !open;
    setOpen(nextOpen);

    if (nextOpen && !insights && userRole !== "student" && userRole !== "parent") {
      void loadInsights();
    }
  }

  const questions = roleQuestions[userRole] || [
    "How can you help me today?",
  ];

  return (
    <>
      {open && (
        <div className="fixed bottom-24 right-4 z-[100] flex max-h-[min(760px,calc(100vh-120px))] w-[calc(100vw-32px)] max-w-[430px] flex-col overflow-hidden rounded-3xl border border-emerald-100 bg-white shadow-2xl shadow-emerald-950/20 sm:right-7">

          {/* Header */}
          <div className="shrink-0 bg-gradient-to-br from-[#123C35] via-[#17634E] to-emerald-600 p-5 text-white">
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

          {/* Scrollable content */}
          <div className="flex-1 space-y-4 overflow-y-auto p-5">

            {/* Education Insights */}
            {userRole !== "student" && userRole !== "parent" && (
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
                        <Sparkles size={17} className="text-emerald-600" />
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
            )}

            {/* Chat */}
            <div className="rounded-2xl border border-emerald-100 bg-white p-4">
              <h4 className="mb-3 flex items-center gap-2 text-sm font-bold text-[#193B32]">
                <MessageCircle size={17} className="text-emerald-600" />
                Ask EduTrack AI
              </h4>

              {messages.length === 0 && (
                <div className="rounded-xl bg-emerald-50 p-3 text-sm text-gray-600">
                  Hi {fullName}! Ask me anything related to your
                  {` ${roleLabels[userRole] || "EduTrack"} `}
                  workspace.
                </div>
              )}

              <div className="mt-3 space-y-3">
                {messages.map((item, index) => (
                  <div
                    key={index}
                    className={`flex ${
                      item.role === "user" ? "justify-end" : "justify-start"
                    }`}
                  >
                    <div
                      className={`max-w-[90%] whitespace-pre-wrap rounded-2xl px-3 py-2.5 text-sm leading-6 ${
                        item.role === "user"
                          ? "rounded-br-md bg-emerald-600 text-white"
                          : "rounded-bl-md bg-gray-100 text-gray-700"
                      }`}
                    >
                      {item.content}
                    </div>
                  </div>
                ))}

                {chatLoading && (
                  <div className="flex items-center gap-2 rounded-xl bg-gray-50 p-3 text-xs text-gray-500">
                    <Loader2 size={16} className="animate-spin text-emerald-600" />
                    EduTrack AI is thinking...
                  </div>
                )}
              </div>

              {chatError && (
                <div className="mt-3 rounded-xl bg-red-50 p-3 text-xs text-red-700">
                  {chatError}
                </div>
              )}

              {/* Suggested questions */}
              <div className="mt-4">
                <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-gray-400">
                  Suggested questions
                </p>

                <div className="flex flex-wrap gap-2">
                  {questions.map((question) => (
                    <button
                      key={question}
                      type="button"
                      disabled={chatLoading}
                      onClick={() => void sendMessage(question)}
                      className="rounded-full border border-emerald-100 bg-emerald-50 px-3 py-2 text-left text-xs text-emerald-800 transition hover:bg-emerald-100 disabled:opacity-50"
                    >
                      {question}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Message input */}
          <form
            onSubmit={handleSubmit}
            className="shrink-0 border-t border-gray-100 bg-white p-4"
          >
            <div className="flex items-center gap-2 rounded-2xl border border-gray-200 bg-gray-50 p-2 focus-within:border-emerald-400 focus-within:bg-white">
              <input
                type="text"
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                placeholder="Ask EduTrack AI anything..."
                maxLength={1000}
                disabled={chatLoading}
                className="min-w-0 flex-1 bg-transparent px-2 py-2 text-sm text-gray-800 outline-none placeholder:text-gray-400 disabled:opacity-50"
              />

              <button
                type="submit"
                disabled={!message.trim() || chatLoading}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="Send message"
              >
                {chatLoading ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <Send size={18} />
                )}
              </button>
            </div>

            <p className="mt-2 text-center text-[10px] text-gray-400">
              AI responses are based on your authorized EduTrack data.
            </p>
          </form>
        </div>
      )}

      {/* Floating button */}
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
