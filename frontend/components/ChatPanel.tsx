"use client";

import { useState } from "react";
import MessageBubble, { type Message } from "./MessageBubble";
import MobileTraceBar from "./MobileTraceBar";
import { Send } from "./icons";
import { postChat } from "@/lib/api";

const initialMessages: Message[] = [
  {
    role: "customer",
    text: "Hi, I'd like to return the headphones from order SN-10001 — is that still possible?",
    time: "9:41 AM",
  },
  {
    role: "agent",
    text: "Hi Maria — order SN-10001 (Sony WH-1000XM5 Headphones) was delivered 10 days ago. Under POL-002, standard-tier electronics carry a 15-day return window, so you're inside it. I can start the return now — no restocking fee applies. Want me to send the return label?",
    time: "9:41 AM",
  },
];

function nowLabel() {
  return new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

export default function ChatPanel() {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);

  async function handleSend() {
    const text = draft.trim();
    if (!text || sending) return;

    setDraft("");
    setMessages((m) => [...m, { role: "customer", text, time: nowLabel() }]);
    setSending(true);

    try {
      const { reply } = await postChat({
        session_id: "dummy-session",
        customer_email: "maria.chen@email.com",
        message: text,
      });
      setMessages((m) => [...m, { role: "agent", text: reply, time: nowLabel() }]);
    } catch {
      setMessages((m) => [
        ...m,
        { role: "agent", text: "(couldn't reach the API — is it running on :8010?)", time: nowLabel() },
      ]);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <div className="flex-1 overflow-y-auto px-4 sm:px-10 py-5 sm:py-7 flex flex-col gap-[18px]">
        <span className="self-center px-[14px] py-[5px] rounded-full bg-surface-alt text-[11px] font-semibold text-muted">
          Today · Session #4821
        </span>

        {messages.map((m, i) => (
          <MessageBubble key={i} role={m.role} text={m.text} time={m.time} />
        ))}
      </div>

      <MobileTraceBar />

      <div className="flex-shrink-0 flex items-center gap-3 px-4 sm:px-10 py-3 sm:py-4 border-t border-border bg-surface">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder="Message as Maria Chen…"
          className="flex-1 border border-border rounded-full px-5 py-[13px] text-sm bg-bg placeholder:text-faint outline-none focus:border-accent"
        />
        <button
          onClick={handleSend}
          disabled={sending}
          className="w-11 h-11 rounded-full bg-accent flex items-center justify-center shrink-0 disabled:opacity-50 cursor-pointer"
        >
          <Send className="w-[18px] h-[18px] text-white" />
        </button>
      </div>
    </div>
  );
}
