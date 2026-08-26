import { CheckCircle, ChevronUp } from "./icons";

export default function MobileTraceBar() {
  return (
    <div className="md:hidden flex-shrink-0 px-4 py-[11px] bg-surface-alt border-t border-border flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <ChevronUp className="w-[15px] h-[15px]" />
          <span className="text-[13px] font-semibold">Agent Trace</span>
        </div>
        <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-sage-bg">
          <CheckCircle className="w-[11px] h-[11px] text-sage-ink" />
          <span className="text-[11px] font-semibold text-sage-ink">Resolved</span>
        </div>
      </div>
      <span className="text-[11px] text-muted truncate">
        2 tools called · lookup_order, check_return_window · 2 docs
      </span>
    </div>
  );
}
