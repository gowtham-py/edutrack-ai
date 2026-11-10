
"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  Bot,
  Send,
  Sparkles,
  User,
  Loader2,
  Wallet,
  AlertCircle,
} from "lucide-react";

type Message = {
  role: "assistant" | "user";
  content: string;
};

export default function FeeAssistant() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "Hi! I'm your EduTrack Fee Assistant. I can help you understand invoices, outstanding fees, payment history, and receipts. What would you like to know?",
    },
  ]);

  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function sendMessage(value?: string) {
    const text = (value ?? question).trim();

    if (!text || loading) return;

    setError("");
    setQuestion("");

    setMessages((previous) => [
      ...previous,
      { role: "user", content: text },
    ]);

    setLoading(true);

    try {
      // Get the current logged-in student's session.
      const { data: sessionData, error: sessionError } =
        await supabase.auth.getSession();

      if (sessionError) {
        throw new Error("Unable to verify your login session.");
      }

      const session = sessionData.session;

      if (!session?.access_token) {
        throw new Error("Your session has expired. Please log in again.");
      }

      // Send the question with the student's authentication token.
      const response = await fetch("/api/fee-assistant", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ message: text }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error || "Unable to get a response from the assistant."
        );
      }

      if (typeof result.reply !== "string") {
        throw new Error("The assistant returned an invalid response.");
      }

      setMessages((previous) => [
        ...previous,
        {
          role: "assistant",
          content: result.reply,
        },
      ]);
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again.";

      setError(errorMessage);

      setMessages((previous) => [
        ...previous,
        {
          role: "assistant",
          content:
            "Sorry, I couldn't process your request. Please check your connection and try again.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="mt-8 overflow-hidden rounded-3xl border border-emerald-100 bg-white shadow-lg">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 p-6 text-white">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-white/20 p-3">
            <Bot size={28} />
          </div>

          <div>
            <h2 className="text-xl font-bold">
              EduTrack Fee Assistant
            </h2>
            <p className="text-sm text-white/80">
              Your smart fee and payment helper
            </p>
          </div>

          <Sparkles className="ml-auto" size={24} />
        </div>
      </div>

      <div className="space-y-4 bg-slate-50 p-5">
        {/* Suggested questions */}
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Suggested questions
          </p>

          <div className="flex flex-wrap gap-2">
            {[
              "Show my pending fees",
              "Show my payment history",
              "Explain my invoice",
              "How do I get a receipt?",
            ].map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => sendMessage(item)}
                disabled={loading}
                className="rounded-full border border-emerald-200 bg-white px-3 py-2 text-xs font-medium text-emerald-700 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        {/* Chat messages */}
        <div className="max-h-[420px] min-h-[220px] space-y-4 overflow-y-auto rounded-2xl bg-white p-4">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex gap-3 ${
                message.role === "user"
                  ? "justify-end"
                  : "justify-start"
              }`}
            >
              {message.role === "assistant" && (
                <div className="h-fit rounded-xl bg-emerald-100 p-2 text-emerald-700">
                  <Bot size={18} />
                </div>
              )}

              <div
                className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                  message.role === "user"
                    ? "bg-emerald-600 text-white"
                    : "bg-slate-100 text-slate-800"
                }`}
              >
                {message.content}
              </div>

              {message.role === "user" && (
                <div className="h-fit rounded-xl bg-slate-200 p-2 text-slate-600">
                  <User size={18} />
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Loader2
                size={17}
                className="animate-spin text-emerald-600"
              />
              Assistant is thinking...
            </div>
          )}
        </div>

        {/* Error message */}
        {error && (
          <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            <AlertCircle size={18} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Message input */}
        <div className="flex gap-2 rounded-2xl border border-slate-200 bg-white p-2">
          <input
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                sendMessage();
              }
            }}
            placeholder="Ask about your fees..."
            className="min-w-0 flex-1 bg-transparent px-3 text-sm text-slate-800 outline-none"
            disabled={loading}
            maxLength={500}
          />

          <button
            type="button"
            onClick={() => sendMessage()}
            disabled={!question.trim() || loading}
            className="rounded-xl bg-emerald-600 p-3 text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Send message"
          >
            {loading ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <Send size={18} />
            )}
          </button>
        </div>

        <p className="flex items-center justify-center gap-2 text-xs text-slate-400">
          <Wallet size={14} />
          Your fee information is retrieved securely from your account.
        </p>
      </div>
    </section>
  );
}
