"use client";

import { useEffect, useState } from "react";
import { getHealth } from "@/lib/api";
import { Book, ChevronDown } from "./icons";

export default function TopBar() {
  const [live, setLive] = useState<boolean | null>(null);

  useEffect(() => {
    getHealth().then(setLive);
  }, []);

  return (
    <header className="flex-shrink-0 h-[72px] flex items-center justify-between px-4 sm:px-8 bg-surface border-b border-border">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-9 h-9 rounded-[9px] bg-accent flex items-center justify-center shrink-0">
          <span className="font-serif text-lg font-medium text-white">S</span>
        </div>
        <div className="flex flex-col leading-tight min-w-0">
          <span className="font-serif text-xl font-medium truncate">ShopNova Support</span>
          <span className="hidden sm:block text-[11px] font-semibold tracking-wider uppercase text-muted">
            Reviewer Console
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-5 shrink-0">
        <div className="hidden sm:flex items-center gap-1.5">
          <span
            className={`w-1.5 h-1.5 rounded-full ${live ? "bg-sage" : "bg-faint"}`}
          />
          <span className="text-xs font-semibold text-muted">
            {live === null ? "Checking…" : live ? "Live session" : "API offline"}
          </span>
        </div>
        <span
          className={`sm:hidden w-1.5 h-1.5 rounded-full shrink-0 ${live ? "bg-sage" : "bg-faint"}`}
        />

        <div className="flex items-center gap-1.5 px-2.5 sm:px-3.5 py-2 border border-border rounded-full bg-surface">
          <Book className="w-[15px] h-[15px] text-muted" />
          <span className="hidden sm:inline text-[12.5px] font-semibold">Docs</span>
          <span className="hidden sm:inline text-[10.5px] font-bold text-muted bg-surface-alt rounded-full px-1.5 py-px">
            13
          </span>
        </div>

        <div className="flex items-center gap-2 pl-1.5 pr-1.5 sm:pr-3 py-1.5 border border-border rounded-full bg-surface">
          <div className="w-7 h-7 rounded-full bg-accent-soft flex items-center justify-center shrink-0">
            <span className="text-[11px] font-bold text-accent-deep">MC</span>
          </div>
          <div className="hidden sm:flex flex-col leading-tight">
            <span className="text-[13px] font-semibold">Maria Chen</span>
            <span className="text-[11px] text-muted">Standard tier</span>
          </div>
          <ChevronDown className="hidden sm:block w-4 h-4 text-muted ml-0.5" />
        </div>
      </div>
    </header>
  );
}
