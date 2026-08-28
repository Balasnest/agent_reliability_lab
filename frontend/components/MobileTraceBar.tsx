import { CheckCircle, ChevronUp, Flag } from "./icons";
import type { ChatTrace } from "@/lib/api";

type MobileTraceBarProps = {
  trace: ChatTrace | null;
  sending: boolean;
};

export default function MobileTraceBar({ trace, sending }: MobileTraceBarProps) {
  const summary = trace
    ? `${trace.tool_calls.length} tool${trace.tool_calls.length === 1 ? "" : "s"} called${
        trace.tool_calls.length ? ` · ${trace.tool_calls.map((c) => c.tool).join(", ")}` : ""
      } · ${trace.retrieved_docs.length} doc${trace.retrieved_docs.length === 1 ? "" : "s"}`
    : "No agent turn yet";

  return (
    <div className="md:hidden flex-shrink-0 px-4 py-[11px] bg-surface-alt border-t border-border flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <ChevronUp className="w-[15px] h-[15px]" />
          <span className="text-[13px] font-semibold">Agent Trace</span>
        </div>
        {sending ? (
          <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-accent-soft">
            <span className="w-[7px] h-[7px] rounded-full bg-accent-deep animate-pulse" />
            <span className="text-[11px] font-semibold text-accent-deep">Working…</span>
          </div>
        ) : trace?.escalated ? (
          <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rust-bg">
            <Flag className="w-[11px] h-[11px] text-rust-ink" />
            <span className="text-[11px] font-semibold text-rust-ink">Escalated</span>
          </div>
        ) : trace ? (
          <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-sage-bg">
            <CheckCircle className="w-[11px] h-[11px] text-sage-ink" />
            <span className="text-[11px] font-semibold text-sage-ink">Resolved</span>
          </div>
        ) : (
          <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-surface">
            <span className="text-[11px] font-semibold text-muted">Waiting</span>
          </div>
        )}
      </div>
      <span className="text-[11px] text-muted truncate">{summary}</span>
    </div>
  );
}
