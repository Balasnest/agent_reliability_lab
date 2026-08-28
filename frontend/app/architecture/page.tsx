import Link from "next/link";
import type { ReactNode } from "react";
import { ChevronDown, Send } from "@/components/icons";

function FlowArrow({ label }: { label?: string }) {
  return (
    <div className="flex items-center gap-3 py-1 pl-6">
      <div className="flex flex-col items-center text-faint shrink-0">
        <div className="w-px h-3 bg-border" />
        <ChevronDown className="w-3.5 h-3.5 -my-0.5" />
        <div className="w-px h-3 bg-border" />
      </div>
      {label && <span className="text-[11px] text-muted">{label}</span>}
    </div>
  );
}

function Pill({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "accent" | "rust";
}) {
  const tones = {
    neutral: "bg-surface-alt border-border text-ink",
    accent: "bg-accent-soft border-accent text-accent-deep",
    rust: "bg-rust-bg border-rust-bg text-rust-ink",
  } as const;
  return (
    <span
      className={`inline-flex items-center justify-center whitespace-nowrap px-3 py-1.5 rounded-full border text-[10.5px] font-bold font-mono ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

export default function Architecture() {
  return (
    <div className="min-h-full flex flex-col bg-bg text-ink">
      {/* Header */}
      <header className="flex-shrink-0 flex items-center justify-between px-6 sm:px-16 h-20 bg-surface border-b border-border">
        <Link
          href="/"
          className="text-[13px] font-semibold text-muted hover:text-ink underline underline-offset-4 transition-colors"
        >
          &larr; Back to overview
        </Link>
        <Link
          href="/console"
          className="flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-full bg-accent text-white hover:bg-accent-deep transition-colors"
        >
          <span className="text-[13px] font-bold">Explore the console</span>
          <Send className="w-3.5 h-3.5" />
        </Link>
      </header>

      <div className="px-6 sm:px-16 pt-10 sm:pt-12 pb-4 flex flex-col gap-3 max-w-3xl">
        <span className="text-[11px] font-bold tracking-[0.12em] uppercase text-accent-deep">
          System architecture
        </span>
        <h1 className="font-serif text-[30px] sm:text-[34px] font-medium tracking-tight">
          How the pieces fit together
        </h1>
        <p className="text-[13.5px] sm:text-sm leading-relaxed text-muted">
          One LangGraph agent, two ways to put it through its paces: a live reviewer console for talking to
          it directly, and an offline evaluation harness for scoring it at scale — both run the exact same
          graph and tools.
        </p>
      </div>

      {/* Diagram */}
      <div className="px-6 sm:px-16 pb-16 pt-6">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-10">
          {/* Main pipeline */}
          <div className="flex flex-col">
            <div className="rounded-[13px] border border-dashed border-border bg-surface-alt px-5 py-3 text-center">
              <span className="text-xs font-semibold text-muted">
                nginx reverse proxy &middot; <span className="text-ink">/api/*</span> &rarr; backend &middot;
                everything else &rarr; frontend
              </span>
            </div>

            <FlowArrow />

            {/* Reviewer Console */}
            <div className="rounded-[13px] border border-border bg-surface px-6 py-5">
              <div className="flex items-baseline justify-between gap-3 flex-wrap">
                <span className="font-serif text-[16px] font-semibold">Next.js — Reviewer Console</span>
                <span className="text-[11px] text-faint font-mono">frontend/app</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
                <div className="rounded-[10px] border border-border bg-surface-alt px-3.5 py-3 flex flex-col gap-1">
                  <span className="text-[12.5px] font-bold">TopBar</span>
                  <span className="text-[10.5px] text-muted">customer &amp; docs switcher</span>
                </div>
                <div className="rounded-[10px] border border-border bg-surface-alt px-3.5 py-3 flex flex-col gap-1">
                  <span className="text-[12.5px] font-bold">ScenarioRail</span>
                  <span className="text-[10.5px] text-muted">scenario library</span>
                </div>
                <div className="rounded-[10px] border border-border bg-surface-alt px-3.5 py-3 flex flex-col gap-1">
                  <span className="text-[12.5px] font-bold">ChatPanel</span>
                  <span className="text-[10.5px] text-muted">streamed conversation</span>
                </div>
                <div className="rounded-[10px] border border-accent bg-accent-soft px-3.5 py-3 flex flex-col gap-1">
                  <span className="text-[12.5px] font-bold text-accent-deep">AgentTracePanel</span>
                  <span className="text-[10.5px] text-accent-deep">live trace + eval score</span>
                </div>
              </div>
            </div>

            <FlowArrow label="SSE stream + REST · /api/chat/stream, /api/customers, /api/scenarios, /api/kb/documents" />

            {/* FastAPI */}
            <div className="rounded-[13px] border border-border bg-surface px-6 py-5">
              <div className="flex items-baseline justify-between gap-3 flex-wrap">
                <span className="font-serif text-[16px] font-semibold">FastAPI backend</span>
                <span className="text-[11px] text-faint font-mono">backend/api/main.py</span>
              </div>
              <p className="text-xs leading-relaxed text-muted mt-2 max-w-xl">
                Streams model tokens and tool-call events over SSE for a chat turn; serves REST for
                customer, order and knowledge-base lookups used by the console chrome.
              </p>
              <div className="flex flex-wrap gap-2 mt-3.5">
                <Pill>POST /api/chat/stream (SSE)</Pill>
                <Pill>GET /api/customers</Pill>
                <Pill>GET /api/customers/{"{email}"}/orders</Pill>
                <Pill>GET /api/scenarios</Pill>
                <Pill>GET /api/kb/documents</Pill>
                <Pill>GET /api/health</Pill>
              </div>
            </div>

            <FlowArrow label="graph.astream_events() per turn" />

            {/* LangGraph agent loop */}
            <div className="rounded-[13px] border border-border bg-surface px-6 py-5">
              <div className="flex items-baseline justify-between gap-3 flex-wrap">
                <span className="font-serif text-[16px] font-semibold">LangGraph — agent loop</span>
                <span className="text-[11px] text-faint font-mono">backend/agent/graph.py</span>
              </div>

              <div className="overflow-x-auto mt-5">
                <div className="relative" style={{ width: 640, height: 176, minWidth: 640 }}>
                  <svg width={640} height={176} className="absolute inset-0 pointer-events-none">
                    <defs>
                      <marker id="arch-arrow" markerWidth="9" markerHeight="9" refX="6" refY="4" orient="auto">
                        <path d="M0,0 L8,4 L0,8 z" fill="#B5AD9C" />
                      </marker>
                      <marker id="arch-arrow-accent" markerWidth="9" markerHeight="9" refX="6" refY="4" orient="auto">
                        <path d="M0,0 L8,4 L0,8 z" fill="#9C5A38" />
                      </marker>
                    </defs>
                    <line x1={172} y1={48} x2={218} y2={48} stroke="#9C5A38" strokeWidth={1.5} markerEnd="url(#arch-arrow-accent)" />
                    <line x1={362} y1={48} x2={408} y2={48} stroke="#9C5A38" strokeWidth={1.5} markerEnd="url(#arch-arrow-accent)" />
                    <line x1={102} y1={76} x2={102} y2={94} stroke="#B5AD9C" strokeWidth={1.5} markerEnd="url(#arch-arrow)" />
                    <path
                      d="M 502 76 C 502 132, 102 132, 102 96"
                      fill="none"
                      stroke="#9C5A38"
                      strokeWidth={1.5}
                      strokeDasharray="1 5"
                      strokeLinecap="round"
                      markerEnd="url(#arch-arrow-accent)"
                    />
                  </svg>

                  <div
                    className="absolute rounded-[11px] border-[1.5px] border-accent bg-accent-soft flex flex-col items-center justify-center text-center gap-0.5"
                    style={{ left: 32, top: 20, width: 140, height: 56 }}
                  >
                    <span className="text-[13px] font-bold text-accent-deep">agent</span>
                    <span className="text-[9.5px] text-accent-deep">GPT-5.4-mini + tools</span>
                  </div>

                  <div
                    className="absolute rounded-[11px] border border-border bg-surface-alt flex flex-col items-center justify-center text-center gap-0.5"
                    style={{ left: 222, top: 20, width: 140, height: 56 }}
                  >
                    <span className="text-[13px] font-bold">tools</span>
                    <span className="text-[9.5px] text-muted">ToolNode executes call</span>
                  </div>

                  <div
                    className="absolute rounded-[11px] border border-border bg-surface-alt flex flex-col items-center justify-center text-center gap-0.5"
                    style={{ left: 412, top: 20, width: 180, height: 56 }}
                  >
                    <span className="text-[13px] font-bold">update_tracking</span>
                    <span className="text-[9.5px] text-muted">records retrieval + escalation</span>
                  </div>

                  <div
                    className="absolute rounded-full border border-sage bg-sage-bg flex items-center justify-center"
                    style={{ left: 32, top: 108, width: 140, height: 34 }}
                  >
                    <span className="text-[11px] font-bold text-sage-ink">END — reply sent</span>
                  </div>

                  <span
                    className="absolute text-[10px] font-bold text-accent-deep bg-surface px-1"
                    style={{ left: 180, top: 34 }}
                  >
                    tool_calls?
                  </span>
                  <span className="absolute text-[9.5px] text-faint" style={{ left: 178, top: 100 }}>
                    no tool calls
                  </span>
                  <span className="absolute text-[9.5px] text-faint" style={{ left: 200, top: 150, width: 260 }}>
                    loops back to agent until the model stops calling tools
                  </span>
                </div>
              </div>
            </div>

            <FlowArrow label="invokes the selected tool function" />

            {/* Tools */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="rounded-[13px] border border-border bg-surface px-4 py-4 flex flex-col gap-1">
                <span className="text-[12px] font-bold font-mono">order_tools</span>
                <span className="text-[10.5px] text-muted leading-relaxed">
                  lookup_order, check_return_window
                </span>
              </div>
              <div className="rounded-[13px] border border-border bg-surface px-4 py-4 flex flex-col gap-1">
                <span className="text-[12px] font-bold font-mono">customer_tools</span>
                <span className="text-[10.5px] text-muted leading-relaxed">get_customer_profile</span>
              </div>
              <div className="rounded-[13px] border border-border bg-surface px-4 py-4 flex flex-col gap-1">
                <span className="text-[12px] font-bold font-mono">escalation_tools</span>
                <span className="text-[10.5px] text-muted leading-relaxed">create_escalation_ticket</span>
              </div>
              <div className="rounded-[13px] border border-accent bg-surface px-4 py-4 flex flex-col gap-1">
                <span className="text-[12px] font-bold font-mono text-accent-deep">kb_tools</span>
                <span className="text-[10.5px] text-muted leading-relaxed">search_knowledge_base</span>
              </div>
            </div>

            <FlowArrow />

            {/* Data layer */}
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_260px] gap-5 mt-3">
              <div className="relative rounded-[13px] border border-border bg-surface px-6 py-6 flex flex-col gap-3 justify-center">
                <div
                  className="absolute left-0 right-0 rounded-full border border-border bg-surface-alt"
                  style={{ top: -13, height: 26 }}
                  aria-hidden
                />
                <div className="flex items-baseline gap-2.5">
                  <span className="font-serif text-[16px] font-semibold">Postgres</span>
                  <span className="text-[10.5px] text-faint font-mono">+ pgvector</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Pill>customers</Pill>
                  <Pill>orders</Pill>
                  <Pill>escalation_tickets</Pill>
                  <Pill>documents (384-dim embeddings)</Pill>
                </div>
              </div>
              <div className="rounded-[13px] border border-accent bg-surface px-5 py-5 flex flex-col gap-2 justify-center">
                <span className="font-serif text-[14.5px] font-semibold text-accent-deep">Knowledge base</span>
                <span className="text-[10.5px] text-muted leading-relaxed">
                  all-MiniLM-L6-v2 embeddings via sentence-transformers &middot; cosine search over pgvector
                </span>
              </div>
            </div>
          </div>

          {/* Evaluation harness lane */}
          <div className="flex flex-col">
            <div className="flex flex-col gap-1 mb-1">
              <span className="text-[11px] font-bold tracking-[0.1em] uppercase text-muted">
                Evaluation harness
              </span>
              <span className="text-[11px] text-faint">runs offline / in CI — not behind nginx</span>
            </div>

            <FlowArrow />

            <div className="rounded-[13px] border border-border bg-surface px-5 py-4 flex flex-col gap-1">
              <span className="text-[13px] font-bold font-mono">scenarios.json</span>
              <span className="text-[10.5px] text-faint leading-relaxed">
                backend/data/scenarios — scripted conversations + expected outcomes
              </span>
            </div>

            <FlowArrow />

            <div className="rounded-[13px] border border-border bg-surface px-5 py-4 flex flex-col gap-1">
              <span className="text-[13px] font-bold font-mono">runner.py</span>
              <span className="text-[10.5px] text-muted leading-relaxed">
                Replays every scenario through the same LangGraph agent loop above and collects tool calls,
                retrievals and replies — it does not score.
              </span>
            </div>

            <FlowArrow />

            <div className="rounded-[13px] border border-border bg-surface px-5 py-5">
              <span className="text-[11.5px] font-bold text-muted">5 evaluators score the run</span>
              <div className="flex flex-wrap gap-2.5 mt-3.5">
                <Pill tone="rust">tool_selection</Pill>
                <Pill tone="rust">retrieval</Pill>
                <Pill tone="rust">escalation</Pill>
                <Pill tone="rust">decision_correctness</Pill>
                <Pill tone="rust">response</Pill>
              </div>
            </div>

            <FlowArrow />

            <div className="rounded-[13px] border border-border bg-surface px-5 py-4 flex flex-col gap-1">
              <span className="text-[13px] font-bold font-mono">evaluation_report.json</span>
              <span className="text-[10.5px] text-faint leading-relaxed">
                per-scenario scores + aggregate pass rate
              </span>
            </div>

            <div className="mt-4 rounded-[11px] border border-dashed border-border bg-surface-alt px-[18px] py-3.5">
              <span className="text-[11px] leading-relaxed text-muted">
                <strong className="text-ink">Same evaluators, live:</strong> when a scenario is opened in
                the console, <span className="font-mono">main.py</span> runs the identical scoring inline
                and streams it back as an <span className="font-mono">evaluation</span> SSE event — that
                fills the AgentTracePanel score above.
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="flex-shrink-0 flex items-center justify-between px-6 sm:px-16 py-5 border-t border-border">
        <span className="text-xs text-faint">Agent Reliability Lab — reviewer console for LLM support agents</span>
        <span className="hidden sm:inline text-xs text-faint">
          Docker Compose &middot; nginx &middot; FastAPI &middot; LangGraph &middot; Next.js &middot; Postgres
        </span>
      </footer>
    </div>
  );
}
