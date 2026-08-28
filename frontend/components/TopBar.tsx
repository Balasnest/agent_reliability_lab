"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  getCustomerOrders,
  getHealth,
  getKbDocuments,
  type Customer,
  type KbDocument,
  type Order,
} from "@/lib/api";
import { Book, Box, ChevronDown } from "./icons";

type TopBarProps = {
  customer: Customer;
  customers: Customer[];
  onSwitchCustomer: (customer: Customer) => void;
  switchDisabled?: boolean;
};

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function monthYear(dateStr?: string) {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString([], { month: "short", year: "numeric" });
}

function orderStatusBadge(order: Order): { label: string; bg: string; fg: string } {
  if (order.is_delivered) return { label: "Delivered", bg: "bg-sage-bg", fg: "text-sage-ink" };
  if (order.status === "lost") return { label: "Lost", bg: "bg-rust-bg", fg: "text-rust-ink" };
  if (order.status === "in_transit") return { label: "In transit", bg: "bg-accent-soft", fg: "text-accent-deep" };
  return { label: order.status, bg: "bg-surface-alt", fg: "text-muted" };
}

function orderSubtext(order: Order): string {
  if (order.is_delivered && order.days_since_delivery != null) {
    return order.days_since_delivery === 0 ? "Delivered today" : `${order.days_since_delivery} days ago`;
  }
  if (order.status === "lost" && order.days_past_expected_delivery != null) {
    return `${order.days_past_expected_delivery} days overdue`;
  }
  if (!order.is_delivered) {
    return `Expected ${new Date(order.expected_delivery).toLocaleDateString([], { month: "short", day: "numeric" })}`;
  }
  return order.status;
}

export default function TopBar({
  customer,
  customers,
  onSwitchCustomer,
  switchDisabled = false,
}: TopBarProps) {
  const [live, setLive] = useState<boolean | null>(null);
  const [kbDocs, setKbDocs] = useState<KbDocument[] | null>(null);
  const [docsOpen, setDocsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [docsQuery, setDocsQuery] = useState("");
  const [customerQuery, setCustomerQuery] = useState("");
  const [orders, setOrders] = useState<Order[] | null>(null);

  const docsRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  const activeEmail = customer.email;

  useEffect(() => {
    getHealth().then(setLive);
    getKbDocuments()
      .then(setKbDocs)
      .catch(() => setKbDocs([]));
  }, []);

  useEffect(() => {
    if (!activeEmail) return;
    setOrders(null);
    getCustomerOrders(activeEmail)
      .then(setOrders)
      .catch(() => setOrders([]));
  }, [activeEmail]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (docsRef.current && !docsRef.current.contains(e.target as Node)) setDocsOpen(false);
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setProfileOpen(false);
    }
    function onEscape(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setDocsOpen(false);
        setProfileOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    document.addEventListener("keydown", onEscape);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("keydown", onEscape);
    };
  }, []);

  const filteredDocs = useMemo(() => {
    if (!kbDocs) return kbDocs;
    const q = docsQuery.trim().toLowerCase();
    if (!q) return kbDocs;
    return kbDocs.filter(
      (d) =>
        d.id.toLowerCase().includes(q) ||
        d.title.toLowerCase().includes(q) ||
        d.category.toLowerCase().includes(q) ||
        d.blurb.toLowerCase().includes(q)
    );
  }, [kbDocs, docsQuery]);

  const otherCustomers = useMemo(() => {
    const q = customerQuery.trim().toLowerCase();
    return customers
      .filter((c) => c.email.toLowerCase() !== activeEmail.toLowerCase())
      .filter(
        (c) => !q || c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q)
      );
  }, [customers, activeEmail, customerQuery]);

  return (
    <header className="flex-shrink-0 h-[72px] flex items-center justify-between px-4 sm:px-8 bg-surface border-b border-border relative z-20">
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

        {/* Docs popover — knowledge base browser */}
        <div ref={docsRef} className="relative">
          <button
            onClick={() => {
              setDocsOpen((v) => !v);
              setProfileOpen(false);
            }}
            className="flex items-center gap-1.5 px-2.5 sm:px-3.5 py-2 border border-border rounded-full bg-surface cursor-pointer hover:bg-surface-alt transition-colors"
          >
            <Book className="w-[15px] h-[15px] text-muted" />
            <span className="hidden sm:inline text-[12.5px] font-semibold">Docs</span>
            <span className="hidden sm:inline text-[10.5px] font-bold text-muted bg-surface-alt rounded-full px-1.5 py-px">
              {kbDocs?.length ?? "–"}
            </span>
          </button>

          {docsOpen && (
            <div className="absolute right-0 top-[calc(100%+8px)] w-[380px] sm:w-[460px] max-h-[560px] flex flex-col bg-surface border border-border rounded-[14px] shadow-lg z-30 overflow-hidden">
              <div className="px-[22px] pt-5 pb-3.5 shrink-0">
                <span className="font-serif text-[17px] font-medium">Knowledge Base</span>
                <div className="text-xs text-muted mt-0.5">
                  {kbDocs?.length ?? "…"} documents the agent can retrieve from — ask about anything here
                </div>
                <input
                  value={docsQuery}
                  onChange={(e) => setDocsQuery(e.target.value)}
                  placeholder="Search documents…"
                  className="mt-3.5 w-full border border-border rounded-full px-4 py-2 text-[12.5px] bg-bg placeholder:text-faint outline-none focus:border-accent"
                />
              </div>
              <div className="px-[18px] pb-5 overflow-y-auto">
                <div className="grid grid-cols-2 gap-2">
                  {filteredDocs === null && (
                    <span className="col-span-2 text-xs text-faint px-1 py-2">Loading…</span>
                  )}
                  {filteredDocs?.length === 0 && (
                    <span className="col-span-2 text-xs text-faint px-1 py-2">No documents match</span>
                  )}
                  {filteredDocs?.map((doc) => (
                    <div key={doc.id} className="border border-border rounded-[10px] px-3 py-2.5 flex flex-col gap-0.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-[11.5px] font-bold">{doc.id}</span>
                        <span className="text-[9.5px] font-bold uppercase tracking-wide text-faint shrink-0">
                          {doc.category}
                        </span>
                      </div>
                      <span className="text-[11.5px] font-semibold">{doc.title}</span>
                      <span className="text-[10.5px] text-muted">{doc.blurb}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Profile popover — customer snapshot, orders, switcher */}
        <div ref={profileRef} className="relative">
          <button
            onClick={() => {
              if (switchDisabled) return;
              setProfileOpen((v) => !v);
              setDocsOpen(false);
            }}
            disabled={switchDisabled}
            className="flex items-center gap-2 pl-1.5 pr-1.5 sm:pr-3 py-1.5 border border-border rounded-full bg-surface cursor-pointer hover:bg-surface-alt transition-colors disabled:cursor-default disabled:opacity-70 disabled:hover:bg-surface"
          >
            <div className="w-7 h-7 rounded-full bg-accent-soft flex items-center justify-center shrink-0">
              <span className="text-[11px] font-bold text-accent-deep">{initials(customer.name)}</span>
            </div>
            <div className="hidden sm:flex flex-col leading-tight">
              <span className="text-[13px] font-semibold">{customer.name}</span>
              <span className="text-[11px] text-muted capitalize">{customer.loyalty_tier} tier</span>
            </div>
            <ChevronDown className="hidden sm:block w-4 h-4 text-muted ml-0.5" />
          </button>

          {profileOpen && (
            <div className="absolute right-0 top-[calc(100%+8px)] w-[340px] sm:w-[380px] max-h-[640px] flex flex-col bg-surface border border-border rounded-[14px] shadow-lg z-30 overflow-hidden">
              <div className="overflow-y-auto">
                {/* Snapshot header */}
                <div className="px-[22px] pt-5 pb-4 flex flex-col gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-full bg-accent-soft flex items-center justify-center shrink-0">
                      <span className="text-[13px] font-bold text-accent-deep">{initials(customer.name)}</span>
                    </div>
                    <div className="flex flex-col gap-0.5 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[14.5px] font-bold truncate">{customer.name}</span>
                        <span className="px-2 py-0.5 rounded-full bg-surface-alt text-[10.5px] font-bold text-muted uppercase tracking-wide shrink-0">
                          {customer.loyalty_tier}
                        </span>
                      </div>
                      <span className="text-xs text-muted truncate">{activeEmail}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="bg-surface-alt rounded-[9px] px-3 py-2 flex flex-col gap-0.5">
                      <span className="text-[10px] font-bold uppercase tracking-wide text-muted">Points</span>
                      <span className="text-[13.5px] font-semibold">{customer.points_balance ?? "—"}</span>
                    </div>
                    <div className="bg-surface-alt rounded-[9px] px-3 py-2 flex flex-col gap-0.5">
                      <span className="text-[10px] font-bold uppercase tracking-wide text-muted">Member since</span>
                      <span className="text-[13.5px] font-semibold">{monthYear(customer.member_since)}</span>
                    </div>
                    <div className="bg-surface-alt rounded-[9px] px-3 py-2 flex flex-col gap-0.5">
                      <span className="text-[10px] font-bold uppercase tracking-wide text-muted">Contacts (30d)</span>
                      <span className="text-[13.5px] font-semibold">{customer.previous_contact_count_30d ?? "—"}</span>
                    </div>
                    <div className="bg-surface-alt rounded-[9px] px-3 py-2 flex flex-col gap-0.5">
                      <span className="text-[10px] font-bold uppercase tracking-wide text-muted">Open tickets</span>
                      <span className="text-[13.5px] font-semibold">{customer.open_tickets_count ?? "—"}</span>
                    </div>
                  </div>
                </div>

                <div className="h-px bg-border mx-[22px]" />

                {/* Orders */}
                <div className="px-[22px] py-4 flex flex-col gap-2">
                  <span className="text-[11px] font-bold tracking-wider uppercase text-muted">Orders</span>
                  {orders === null && <span className="text-xs text-faint">Loading…</span>}
                  {orders?.length === 0 && <span className="text-xs text-faint">No orders on file</span>}
                  {orders?.map((order) => {
                    const badge = orderStatusBadge(order);
                    return (
                      <div
                        key={order.order_id}
                        className="border border-border rounded-[10px] px-3 py-2.5 flex flex-col gap-2"
                      >
                        <div className="flex items-start gap-2.5">
                          <div className="w-[34px] h-[34px] rounded-[8px] bg-surface-alt flex items-center justify-center shrink-0">
                            <Box className="w-4 h-4 text-accent-deep" />
                          </div>
                          <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                            <span className="font-mono text-xs font-bold">{order.order_id}</span>
                            <span className="text-xs text-muted leading-snug break-words">
                              {order.items.map((i) => i.name).join(", ")}
                            </span>
                          </div>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10.5px] font-bold shrink-0 ${badge.bg} ${badge.fg}`}
                          >
                            {badge.label}
                          </span>
                        </div>
                        <div className="flex items-center justify-between pl-[42px]">
                          <span className="text-xs font-semibold">${order.order_total.toFixed(2)}</span>
                          <span className="text-[10.5px] text-faint">{orderSubtext(order)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="h-px bg-border mx-[22px]" />

                {/* Switch customer */}
                <div className="px-[22px] pt-4 pb-5 flex flex-col gap-2.5">
                  <span className="text-[11px] font-bold tracking-wider uppercase text-muted">Switch customer</span>
                  <input
                    value={customerQuery}
                    onChange={(e) => setCustomerQuery(e.target.value)}
                    placeholder={`Search ${customers.length} customers…`}
                    className="w-full border border-border rounded-full px-4 py-2 text-[12.5px] bg-bg placeholder:text-faint outline-none focus:border-accent"
                  />
                  <div className="flex flex-col gap-0.5">
                    {otherCustomers.length === 0 && (
                      <span className="text-xs text-faint px-1 py-1.5">No matches</span>
                    )}
                    {otherCustomers.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => {
                          onSwitchCustomer(c);
                          setProfileOpen(false);
                          setCustomerQuery("");
                        }}
                        className="w-full flex items-center gap-2.5 px-1 py-1.5 rounded-[9px] text-left cursor-pointer hover:bg-surface-alt transition-colors"
                      >
                        <div className="w-7 h-7 rounded-full bg-surface-alt flex items-center justify-center shrink-0">
                          <span className="text-[10.5px] font-bold text-muted">{initials(c.name)}</span>
                        </div>
                        <div className="flex flex-col leading-tight min-w-0 flex-1">
                          <span className="text-[12.5px] font-semibold truncate">{c.name}</span>
                          <span className="text-[11px] text-muted truncate">{c.email}</span>
                        </div>
                        <span className="px-2 py-0.5 rounded-full bg-surface-alt text-[10px] font-bold text-muted uppercase shrink-0">
                          {c.loyalty_tier}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
