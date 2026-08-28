"use client";

import { useState } from "react";
import MessageBubble, { type Message } from "./MessageBubble";
import MobileTraceBar from "./MobileTraceBar";
import { Send } from "./icons";
import type { ChatTrace } from "@/lib/api";

type ChatPanelProps = {
  sessionId: string;
  customerEmail: string;
  messages: Message[];
  onSend: (text: string) => void;
  sending: boolean;
  trace: ChatTrace | null;
};

export default function ChatPanel({ sessionId, customerEmail, messages, onSend, sending, trace }: ChatPanelProps) {
  const [draft, setDraft] = useState("");

  function handleSend() {
    const text = draft.trim();
    if (!text || sending) return;
    setDraft("");
    onSend(text);
  }

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <div className="flex-1 overflow-y-auto px-4 sm:px-10 py-5 sm:py-7 flex flex-col gap-[18px]">
        <span className="self-center px-[14px] py-[5px] rounded-full bg-surface-alt text-[11px] font-semibold text-muted">
          Today · Session {sessionId.slice(-6)}
        </span>

        {messages.map((m, i) => (
          <MessageBubble key={i} role={m.role} text={m.text} time={m.time} />
        ))}
      </div>

      <MobileTraceBar trace={trace} sending={sending} />

      <div className="flex-shrink-0 flex items-center gap-3 px-4 sm:px-10 py-3 sm:py-4 border-t border-border bg-surface">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder={sending ? "Waiting for agent…" : `Message as ${customerEmail}…`}
          disabled={sending}
          className="flex-1 border border-border rounded-full px-5 py-[13px] text-sm bg-bg placeholder:text-faint outline-none focus:border-accent disabled:opacity-60"
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
