
"use client";

import { useState } from "react";
import {
  Bot,
  Send,
  Sparkles,
  User,
  Loader2,
  Wallet,
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

  async function sendMessage(value?: string) {
    const text = (value ?? question).trim();

    if (!text || loading) return;

    setMessages((previous) => [
      ...previous,
      { role: "user", content: text },
    ]);

    setQuestion("");
    setLoading(true);

    try {
      const response = await fetch("/api/fee-assistant", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: text }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Unable to get a response.");
      }

      setMessages((previous) => [
        ...previous,
        {
          role: "assistant",
          content: result.reply,
        },
      ]);
    } catch {
      setMessages((previous) => [
        ...previous,
        {
          role: "assistant",
          content:
            "I'm having trouble connecting right now. Please try again shortly.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="mt-8 overflow-hidden rounded-3xl border border-emerald-100 bg-white shadow-lg">
      <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 p-6 text-white">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-white/20 p-3">
            <Bot size={28} />
          </div>
          <div>
            <h2 className="text-xl font-bold">EduTrack Fee Assistant</h2>
            <p className="text-sm text-white/80">
              Your smart fee and payment helper
            </p>
          </div>
          <Sparkles className="ml-auto" size={24} />
        </div>
      </div>

      <div className="space-y-4 bg-slate-50 p-5">
        <div className="flex flex-wrap gap-2">
          {[
            "Show my pending fees",
            "Explain my invoice",
            "How do I get a receipt?",
          ].map((item) => (
            <button
              key={item}
              onClick={() => sendMessage(item)}
              disabled={loading}
              className="rounded-full border border-emerald-200 bg-white px-3 py-2 text-xs font-medium text-emerald-700 transition hover:bg-emerald-50 disabled:opacity-50"
            >
              {item}
            </button>
          ))}
        </div>

        <div className="max-h-[420px] min-h-[220px] space-y-4 overflow-y-auto rounded-2xl bg-white p-4">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex gap-3 ${
                message.role === "user" ? "justify-end" : "justify-start"
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
              <Loader2 size={17} className="animate-spin" />
              Assistant is thinking...
            </div>
          )}
        </div>

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
          />

          <button
            onClick={() => sendMessage()}
            disabled={!question.trim() || loading}
            className="rounded-xl bg-emerald-600 p-3 text-white transition hover:bg-emerald-700 disabled:opacity-40"
            aria-label="Send message"
          >
            <Send size={18} />
          </button>
        </div>

        <p className="flex items-center justify-center gap-2 text-xs text-slate-400">
          <Wallet size={14} />
          Fee information will be retrieved securely from your account.
        </p>
      </div>
    </section>
  );
}
