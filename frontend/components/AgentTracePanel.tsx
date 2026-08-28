import { Box, Book, CheckCircle, Flag } from "./icons";
import type { ChatTrace, Evaluation } from "@/lib/api";

function ToolCallCard({ name, args }: { name: string; args: string[] }) {
  return (
    <div className="bg-surface border border-border rounded-[10px] px-[13px] py-[11px] flex flex-col gap-2">
      <div className="flex items-center gap-1.5">
        <Box className="w-[15px] h-[15px] text-accent-deep" />
        <span className="font-mono text-[12.5px] font-semibold">{name}</span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {args.map((a) => (
          <span
            key={a}
            className="font-mono text-[10.5px] text-muted bg-surface-alt rounded px-2 py-0.5"
          >
            {a}
          </span>
        ))}
      </div>
    </div>
  );
}

function KbCard({ id, title }: { id: string; title: string }) {
  return (
    <div className="flex items-center gap-2.5 px-[11px] py-[9px] bg-surface border border-border rounded-[9px]">
      <Book className="w-[14px] h-[14px] text-accent-deep shrink-0" />
      <div className="flex flex-col min-w-0">
        <span className="font-mono text-xs font-semibold">{id}</span>
        <span className="text-[11px] text-muted">{title}</span>
      </div>
    </div>
  );
}

function EscalationBanner({ trace }: { trace: ChatTrace }) {
  return (
    <div className="mx-6 mb-[22px] p-4 bg-rust-bg border border-[#DCB393] rounded-[12px] flex flex-col gap-2.5">
      <div className="flex items-center gap-2">
        <Flag className="w-[17px] h-[17px] text-rust-ink" />
        <span className="text-[13px] font-bold text-rust-ink">Escalation Triggered</span>
      </div>
      <div className="flex flex-col gap-2 text-xs">
        <div className="flex items-center justify-between">
          <span className="text-[#8C6A50]">Priority</span>
          <span className="px-[11px] py-0.5 rounded-full bg-rust text-white text-[11px] font-bold capitalize">
            {trace.escalation_priority ?? "—"}
          </span>
        </div>
        {trace.escalation_reason && (
          <div className="flex flex-col gap-0.5">
            <span className="text-[#8C6A50]">Reason</span>
            <span className="text-rust-ink leading-relaxed">{trace.escalation_reason}</span>
          </div>
        )}
        <div className="flex items-center justify-between pt-1 border-t border-[#E3C3A4]">
          <span className="text-[#8C6A50]">Ticket ID</span>
          <span className="font-mono font-bold text-rust-ink">{trace.escalation_ticket_id ?? "—"}</span>
        </div>
      </div>
    </div>
  );
}

function EvaluationSection({ evaluation }: { evaluation: Evaluation }) {
  return (
    <>
      <div className="h-px bg-border mx-6" />
      <div className="px-6 pt-5 pb-[22px] flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold tracking-wider uppercase text-muted">
            Harness Evaluation
          </span>
          <span
            className={`text-[11px] font-bold ${evaluation.overall_passed ? "text-sage-ink" : "text-rust-ink"}`}
          >
            {Math.round(evaluation.overall_score * 100)}%
          </span>
        </div>
        <span className="text-[11px] text-faint -mt-1">{evaluation.scenario_name}</span>

        {evaluation.evaluations.map((e) => (
          <div
            key={e.dimension}
            className="bg-surface border border-border rounded-[10px] px-[13px] py-[10px] flex flex-col gap-1"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 min-w-0">
                {e.passed ? (
                  <CheckCircle className="w-[13px] h-[13px] text-sage-ink shrink-0" />
                ) : (
                  <Flag className="w-[13px] h-[13px] text-rust-ink shrink-0" />
                )}
                <span className="text-[12px] font-semibold capitalize truncate">
                  {e.dimension.replace(/_/g, " ")}
                </span>
              </div>
              <span className="font-mono text-[11px] text-muted shrink-0">{e.score.toFixed(2)}</span>
            </div>
            <span className="text-[11px] text-muted leading-snug">{e.reason}</span>
            {e.judge && <span className="text-[10px] text-faint">judged by {e.judge}</span>}
          </div>
        ))}
      </div>
    </>
  );
}

function StatusBadge({ trace, sending }: { trace: ChatTrace | null; sending: boolean }) {
  if (sending) {
    return (
      <span className="inline-flex items-center gap-1.5 self-start px-[13px] py-[6px] rounded-full bg-accent-soft">
        <span className="w-[7px] h-[7px] rounded-full bg-accent-deep animate-pulse" />
        <span className="text-[12.5px] font-semibold text-accent-deep">Working…</span>
      </span>
    );
  }
  if (!trace) {
    return (
      <span className="inline-flex items-center gap-1.5 self-start px-[13px] py-[6px] rounded-full bg-surface-alt">
        <span className="text-[12.5px] font-semibold text-muted">Waiting for a message</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 self-start px-[13px] py-[6px] rounded-full bg-sage-bg">
      <CheckCircle className="w-[13px] h-[13px] text-sage-ink" />
      <span className="text-[12.5px] font-semibold text-sage-ink">Resolved</span>
    </span>
  );
}

type AgentTracePanelProps = {
  trace: ChatTrace | null;
  evaluation: Evaluation | null;
  sending: boolean;
};

export default function AgentTracePanel({ trace, evaluation, sending }: AgentTracePanelProps) {
  return (
    <aside className="hidden md:flex md:w-[340px] shrink-0 border-l border-border bg-surface-alt flex-col overflow-y-auto">
      <div className="px-6 pt-[22px] pb-4">
        <span className="font-serif text-[17px] font-medium">Agent Trace</span>
        <div className="text-xs text-muted mt-0.5">What the agent did this turn</div>
      </div>

      {trace?.escalated && <EscalationBanner trace={trace} />}

      <div className="px-6 pb-[22px] flex flex-col gap-2">
        <span className="text-[11px] font-bold tracking-wider uppercase text-muted">
          Tools Called
        </span>
        {trace === null && <span className="text-xs text-faint">No turn yet</span>}
        {trace?.tool_calls.length === 0 && (
          <span className="text-xs text-faint">No tools called this turn</span>
        )}
        {trace?.tool_calls.map((c, i) => (
          <ToolCallCard
            key={`${c.tool}-${i}`}
            name={c.tool}
            args={Object.entries(c.args).map(([k, v]) => `${k}: ${v}`)}
          />
        ))}
      </div>

      <div className="h-px bg-border mx-6" />

      <div className="px-6 pt-5 pb-[22px] flex flex-col gap-2">
        <span className="text-[11px] font-bold tracking-wider uppercase text-muted">
          Knowledge Base
        </span>
        {trace === null && <span className="text-xs text-faint">No turn yet</span>}
        {trace?.retrieved_docs.length === 0 && (
          <span className="text-xs text-faint">No documents retrieved this turn</span>
        )}
        {trace?.retrieved_docs.map((d) => (
          <KbCard key={d.id} id={d.id} title={d.title} />
        ))}
      </div>

      {evaluation && <EvaluationSection evaluation={evaluation} />}

      {!trace?.escalated && (
        <>
          <div className="h-px bg-border mx-6" />
          <div className="px-6 py-5 flex flex-col gap-2">
            <span className="text-[11px] font-bold tracking-wider uppercase text-muted">
              Status
            </span>
            <StatusBadge trace={trace} sending={sending} />
          </div>
        </>
      )}
    </aside>
  );
}
