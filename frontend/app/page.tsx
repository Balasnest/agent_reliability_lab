import Link from "next/link";
import { CheckCircle, Flag, MessageCircle, Send } from "@/components/icons";

const steps = [
  {
    icon: MessageCircle,
    iconBg: "bg-accent-soft",
    iconColor: "text-accent-deep",
    title: "Replay real conversations",
    body: "Pick a scenario from the library or chat live as any customer — every turn streams through the real agent, not a mock.",
  },
  {
    icon: Flag,
    iconBg: "bg-sage-bg",
    iconColor: "text-sage-ink",
    title: "Watch the trace live",
    body: "Tool calls, knowledge-base retrievals, and escalations surface as they happen, streamed straight from the agent graph.",
  },
  {
    icon: CheckCircle,
    iconBg: "bg-rust-bg",
    iconColor: "text-rust-ink",
    title: "Score it automatically",
    body: "Five evaluators grade tool selection, retrieval accuracy, escalation judgment, decision correctness, and response quality against a scenario library.",
  },
];

export default function Home() {
  return (
    <div className="min-h-full flex flex-col bg-bg text-ink">
      {/* Nav */}
      <header className="flex-shrink-0 flex items-center justify-between px-6 sm:px-16 h-20 bg-surface border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-[9px] bg-accent flex items-center justify-center shrink-0">
            <span className="font-serif text-lg font-medium text-white">R</span>
          </div>
          <div className="flex flex-col leading-tight">
            <span className="font-serif text-base sm:text-xl font-medium whitespace-nowrap">Agent Reliability Lab</span>
            <span className="hidden sm:block text-[10.5px] font-bold tracking-wider uppercase text-muted">
              Reliability Console
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3 sm:gap-5">
          <div className="hidden sm:flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-sage" />
            <span className="text-xs font-semibold text-muted">Live demo running</span>
          </div>
          <Link
            href="/console"
            className="px-3.5 sm:px-5 py-2 sm:py-2.5 rounded-full bg-accent text-white text-xs sm:text-[13px] font-bold whitespace-nowrap hover:bg-accent-deep transition-colors"
          >
            Explore the console
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="flex-shrink-0 px-6 sm:px-16 pt-20 sm:pt-28 pb-20 flex flex-col items-start gap-6 max-w-3xl">
        <span className="text-[11px] font-bold tracking-[0.14em] uppercase text-accent-deep">
          Agent Reliability Lab
        </span>
        <h1 className="font-serif text-[40px] sm:text-[52px] leading-[1.1] font-medium tracking-tight">
          See every decision your support agent makes — before your customers do.
        </h1>
        <p className="text-[16px] sm:text-[17px] leading-relaxed text-muted max-w-xl">
          A reliability console for LLM support agents. Replay live conversations turn by turn, watch tool
          calls and retrievals as they happen, and score every response against a scenario library with
          five automated evaluators.
        </p>
        <div className="flex flex-wrap items-center gap-6 mt-1">
          <Link
            href="/console"
            className="flex items-center gap-2.5 px-6 py-3.5 rounded-full bg-accent text-white hover:bg-accent-deep transition-colors"
          >
            <span className="text-[14.5px] font-bold">Explore the console</span>
            <Send className="w-4 h-4" />
          </Link>
          <Link
            href="/architecture"
            className="text-[13.5px] font-semibold text-muted hover:text-ink underline underline-offset-4 transition-colors"
          >
            See how it&rsquo;s built &rarr;
          </Link>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 text-[12.5px] text-faint">
          <span>Live demo agent:</span>
          <span className="font-bold text-ink">ShopNova Support</span>
          <span>— a fictional e-commerce brand</span>
        </div>
      </section>

      {/* How a review works */}
      <section className="flex-1 px-6 sm:px-16 pb-20 sm:pb-24 flex flex-col gap-8">
        <div className="h-px bg-border" />
        <div className="flex flex-col gap-1.5">
          <span className="text-[11px] font-bold tracking-[0.12em] uppercase text-muted">
            How a review works
          </span>
          <h2 className="font-serif text-2xl sm:text-[26px] font-medium">Three steps, one running agent</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {steps.map((step) => (
            <div
              key={step.title}
              className="flex flex-col gap-4 p-7 bg-surface border border-border rounded-[14px]"
            >
              <div className={`w-11 h-11 rounded-[11px] ${step.iconBg} flex items-center justify-center`}>
                <step.icon className={`w-[21px] h-[21px] ${step.iconColor}`} />
              </div>
              <div className="flex flex-col gap-1.5">
                <h3 className="text-[17px] font-semibold">{step.title}</h3>
                <p className="text-[13.5px] leading-relaxed text-muted">{step.body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="flex-shrink-0 flex items-center justify-between px-6 sm:px-16 py-5 border-t border-border">
        <span className="text-xs text-faint">Agent Reliability Lab — reviewer console for LLM support agents</span>
        <span className="hidden sm:inline text-xs text-faint">FastAPI · LangGraph · Postgres</span>
      </footer>
    </div>
  );
}
