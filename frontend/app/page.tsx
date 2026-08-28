"use client";

import { useEffect, useRef, useState } from "react";
import TopBar from "@/components/TopBar";
import ScenarioRail from "@/components/ScenarioRail";
import ChatPanel from "@/components/ChatPanel";
import AgentTracePanel from "@/components/AgentTracePanel";
import type { Message } from "@/components/MessageBubble";
import {
  getCustomers,
  streamChat,
  type ChatTrace,
  type Customer,
  type Evaluation,
  type ScenarioDetail,
  type ToolCallTrace,
} from "@/lib/api";

const DEFAULT_CUSTOMER: Customer = {
  id: "CUST-001",
  name: "Maria Chen",
  email: "maria.chen@email.com",
  loyalty_tier: "standard",
};

const initialMessages: Message[] = [
  {
    role: "customer",
    text: "Hi, I'd like to return the headphones from order SN-10001 — is that still possible?",
    time: "9:41 AM",
  },
];

const EMPTY_TRACE: ChatTrace = {
  tool_calls: [],
  retrieved_docs: [],
  escalated: false,
  escalation_priority: null,
  escalation_ticket_id: null,
  escalation_reason: null,
};

function newSessionId() {
  return `session-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function nowLabel() {
  return new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

export default function Home() {
  // Generated client-side only (useEffect below) — Date.now()/Math.random() in a
  // useState initializer would differ between the SSR pass and hydration and
  // trigger a hydration mismatch.
  const [sessionId, setSessionId] = useState("");
  const [customer, setCustomer] = useState(DEFAULT_CUSTOMER);
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [trace, setTrace] = useState<ChatTrace | null>(null);
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const [sending, setSending] = useState(false);
  const [customersByEmail, setCustomersByEmail] = useState<Record<string, Customer>>({});
  const [customersList, setCustomersList] = useState<Customer[]>([]);

  // Mirrors sessionId so an in-flight request can tell, once it resolves,
  // whether the user has since switched sessions (e.g. picked a new scenario
  // mid-reply) — a stale reply must not be appended to a newer conversation.
  const sessionIdRef = useRef(sessionId);
  useEffect(() => {
    sessionIdRef.current = sessionId;
  }, [sessionId]);

  useEffect(() => {
    setSessionId(newSessionId());
  }, []);

  useEffect(() => {
    getCustomers()
      .then((list) => {
        const byEmail: Record<string, Customer> = {};
        for (const c of list) byEmail[c.email.toLowerCase()] = c;
        setCustomersByEmail(byEmail);
        setCustomersList(list);
        const match = byEmail[DEFAULT_CUSTOMER.email.toLowerCase()];
        if (match) setCustomer(match);
      })
      .catch(() => {});
  }, []);

  function customerFor(email: string): Customer {
    return (
      customersByEmail[email.toLowerCase()] ?? {
        id: email,
        name: email,
        email,
        loyalty_tier: "—",
      }
    );
  }

  /** Streams one customer turn end-to-end: appends the customer + a growing
   * agent bubble, updates the trace panel live as tool calls come in, and
   * finalizes with the authoritative reply/trace/harness-evaluation once the
   * turn completes. Shared by manual sends and scenario-triggered opens so
   * both get the same real-time behavior. */
  async function sendTurn(
    text: string,
    forSessionId: string,
    customerEmail: string,
    scenarioId?: string
  ) {
    setMessages((m) => [
      ...m,
      { role: "customer", text, time: nowLabel() },
      { role: "agent", text: "", time: nowLabel() },
    ]);
    setTrace(null);
    setEvaluation(null);
    setSending(true);

    const liveToolCalls: ToolCallTrace[] = [];
    const isCurrent = () => sessionIdRef.current === forSessionId;

    function updateLastAgentMessage(updater: (prev: string) => string) {
      setMessages((m) => {
        const next = [...m];
        const last = next[next.length - 1];
        if (last?.role === "agent") next[next.length - 1] = { ...last, text: updater(last.text) };
        return next;
      });
    }

    try {
      await streamChat(
        { session_id: forSessionId, customer_email: customerEmail, message: text, scenario_id: scenarioId },
        {
          onToken: (content) => {
            if (!isCurrent()) return;
            updateLastAgentMessage((prev) => prev + content);
          },
          onToolCall: (call) => {
            if (!isCurrent()) return;
            liveToolCalls.push(call);
            setTrace((t) => ({ ...(t ?? EMPTY_TRACE), tool_calls: [...liveToolCalls] }));
          },
          onDone: ({ reply, trace: finalTrace }) => {
            if (!isCurrent()) return;
            updateLastAgentMessage(() => reply);
            setTrace(finalTrace);
          },
          onEvaluation: (result) => {
            if (!isCurrent()) return;
            setEvaluation(result);
          },
          onError: (message) => {
            if (!isCurrent()) return;
            updateLastAgentMessage((prev) => prev || `(couldn't reach the agent — ${message})`);
          },
        }
      );
    } catch {
      if (isCurrent()) {
        updateLastAgentMessage((prev) => prev || "(couldn't reach the API — is it running on :8000?)");
      }
    } finally {
      if (isCurrent()) setSending(false);
    }
  }

  function switchCustomer(next: Customer) {
    if (next.email.toLowerCase() === customer.email.toLowerCase()) return;
    setSessionId(newSessionId());
    setCustomer(next);
    setMessages([]);
    setTrace(null);
    setEvaluation(null);
  }

  async function loadScenario(scenario: ScenarioDetail) {
    const opening = scenario.conversation[0]?.content ?? "";
    const freshSessionId = newSessionId();

    setSessionId(freshSessionId);
    setCustomer(customerFor(scenario.customer_email));
    setTrace(null);
    setEvaluation(null);
    setMessages([]);

    if (!opening) return;
    await sendTurn(opening, freshSessionId, scenario.customer_email, scenario.id);
  }

  async function handleSend(text: string) {
    await sendTurn(text, sessionId, customer.email);
  }

  return (
    <div className="h-full flex flex-col bg-bg text-ink overflow-hidden">
      <TopBar
        customer={customer}
        customers={customersList}
        onSwitchCustomer={switchCustomer}
        switchDisabled={sending}
      />
      <ScenarioRail onSelectScenario={loadScenario} disabled={sending} />
      <div className="flex-1 flex min-h-0">
        <ChatPanel
          sessionId={sessionId}
          customerEmail={customer.email}
          messages={messages}
          onSend={handleSend}
          sending={sending || !sessionId}
          trace={trace}
        />
        <AgentTracePanel trace={trace} evaluation={evaluation} sending={sending} />
      </div>
    </div>
  );
}
