export type Scenario = { id: string; name: string; difficulty: string };
export type Customer = {
  id: string;
  name: string;
  email: string;
  loyalty_tier: string;
  points_balance?: number;
  member_since?: string;
  previous_contact_count_30d?: number;
  open_tickets_count?: number;
};
export type KbDocument = { id: string; title: string; category: string; blurb: string };

export type OrderItem = {
  item_id: string;
  name: string;
  category: string;
  quantity: number;
  unit_price: number;
};
export type Order = {
  order_id: string;
  customer_email: string;
  status: string;
  placed_date: string;
  expected_delivery: string;
  delivered_date: string | null;
  is_delivered: boolean;
  days_since_delivery: number | null;
  days_past_expected_delivery: number | null;
  seller_type: string;
  order_total: number;
  shipping_paid: number;
  items: OrderItem[];
};

export type ScenarioTurn = { role: string; content: string };
export type ScenarioDetail = Scenario & {
  customer_email: string;
  conversation: ScenarioTurn[];
};

export type ToolCallTrace = { tool: string; args: Record<string, unknown> };
export type RetrievedDoc = { id: string; title: string };
export type ChatTrace = {
  tool_calls: ToolCallTrace[];
  retrieved_docs: RetrievedDoc[];
  escalated: boolean;
  escalation_priority: string | null;
  escalation_ticket_id: string | null;
  escalation_reason: string | null;
};
export type ChatReply = { reply: string; trace: ChatTrace };

export type EvaluationDimension = {
  dimension: string;
  passed: boolean;
  score: number;
  reason: string;
  judge?: string;
};
export type Evaluation = {
  scenario_id: string;
  scenario_name: string;
  difficulty: string;
  overall_passed: boolean;
  overall_score: number;
  evaluations: EvaluationDimension[];
};

export type StreamChatPayload = {
  session_id: string;
  customer_email: string;
  message: string;
  scenario_id?: string;
};

export type StreamChatHandlers = {
  onToken?: (content: string) => void;
  onToolCall?: (call: ToolCallTrace) => void;
  onDone?: (result: ChatReply) => void;
  onEvaluation?: (evaluation: Evaluation) => void;
  onError?: (message: string) => void;
};

export async function getHealth(): Promise<boolean> {
  try {
    const res = await fetch(`/api/health`);
    return res.ok;
  } catch {
    return false;
  }
}

export async function getScenarios(): Promise<Scenario[]> {
  const res = await fetch(`/api/scenarios`);
  if (!res.ok) throw new Error("Failed to load scenarios");
  return res.json();
}

export async function getScenario(id: string): Promise<ScenarioDetail> {
  const res = await fetch(`/api/scenarios/${id}`);
  if (!res.ok) throw new Error("Failed to load scenario");
  return res.json();
}

export async function getCustomers(): Promise<Customer[]> {
  const res = await fetch(`/api/customers`);
  if (!res.ok) throw new Error("Failed to load customers");
  return res.json();
}

export async function getCustomerOrders(email: string): Promise<Order[]> {
  const res = await fetch(`/api/customers/${encodeURIComponent(email)}/orders`);
  if (!res.ok) throw new Error("Failed to load customer orders");
  return res.json();
}

export async function getKbDocuments(): Promise<KbDocument[]> {
  const res = await fetch(`/api/kb/documents`);
  if (!res.ok) throw new Error("Failed to load KB documents");
  return res.json();
}

export async function postChat(payload: {
  session_id: string;
  customer_email: string;
  message: string;
}): Promise<ChatReply> {
  const res = await fetch(`/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Chat request failed");
  return res.json();
}

/** Consumes the server-sent event stream from /api/chat/stream, invoking the
 * matching handler as each event arrives. Resolves once the stream ends. */
export async function streamChat(
  payload: StreamChatPayload,
  handlers: StreamChatHandlers,
  signal?: AbortSignal
): Promise<void> {
  const res = await fetch(`/api/chat/stream`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal,
  });
  if (!res.ok || !res.body) {
    handlers.onError?.("Chat stream request failed");
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let sepIndex: number;
    while ((sepIndex = buffer.indexOf("\n\n")) !== -1) {
      const rawEvent = buffer.slice(0, sepIndex);
      buffer = buffer.slice(sepIndex + 2);

      let eventType = "message";
      let data = "";
      for (const line of rawEvent.split("\n")) {
        if (line.startsWith("event:")) eventType = line.slice(6).trim();
        else if (line.startsWith("data:")) data += line.slice(5).trim();
      }
      if (!data) continue;

      let parsed: unknown;
      try {
        parsed = JSON.parse(data);
      } catch {
        continue;
      }

      switch (eventType) {
        case "token":
          handlers.onToken?.((parsed as { content: string }).content);
          break;
        case "tool_call":
          handlers.onToolCall?.(parsed as ToolCallTrace);
          break;
        case "done":
          handlers.onDone?.(parsed as ChatReply);
          break;
        case "evaluation":
          handlers.onEvaluation?.(parsed as Evaluation);
          break;
        case "error":
          handlers.onError?.((parsed as { message: string }).message);
          break;
      }
    }
  }
}
