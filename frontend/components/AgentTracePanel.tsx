import { Box, Book, CheckCircle } from "./icons";

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

export default function AgentTracePanel() {
  return (
    <aside className="hidden md:flex md:w-[340px] shrink-0 border-l border-border bg-surface-alt flex-col overflow-y-auto">
      <div className="px-6 pt-[22px] pb-4">
        <span className="font-serif text-[17px] font-medium">Agent Trace</span>
        <div className="text-xs text-muted mt-0.5">What the agent did this turn</div>
      </div>

      <div className="px-6 pb-[22px] flex flex-col gap-2">
        <span className="text-[11px] font-bold tracking-wider uppercase text-muted">
          Tools Called
        </span>
        <ToolCallCard name="lookup_order" args={["order_id: SN-10001"]} />
        <ToolCallCard
          name="check_return_window"
          args={["order_id: SN-10001", "category: electronics"]}
        />
      </div>

      <div className="h-px bg-border mx-6" />

      <div className="px-6 pt-5 pb-[22px] flex flex-col gap-2">
        <span className="text-[11px] font-bold tracking-wider uppercase text-muted">
          Knowledge Base
        </span>
        <KbCard id="POL-002" title="Return Window Policy" />
        <KbCard id="SHP-001" title="Free Shipping Eligibility" />
      </div>

      <div className="h-px bg-border mx-6" />

      <div className="px-6 py-5 flex flex-col gap-2">
        <span className="text-[11px] font-bold tracking-wider uppercase text-muted">
          Status
        </span>
        <div className="inline-flex items-center gap-1.5 self-start px-[13px] py-[6px] rounded-full bg-sage-bg">
          <CheckCircle className="w-[13px] h-[13px] text-sage-ink" />
          <span className="text-[12.5px] font-semibold text-sage-ink">Resolved</span>
        </div>
      </div>
    </aside>
  );
}
