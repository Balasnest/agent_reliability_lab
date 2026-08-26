const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8010";

export type Scenario = { id: string; name: string; difficulty: string };
export type Customer = { id: string; name: string; email: string; loyalty_tier: string };
export type KbDocument = { id: string; title: string; category: string; blurb: string };
export type ChatReply = { reply: string };

export async function getHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/api/health`);
    return res.ok;
  } catch {
    return false;
  }
}

export async function getScenarios(): Promise<Scenario[]> {
  const res = await fetch(`${API_BASE}/api/scenarios`);
  if (!res.ok) throw new Error("Failed to load scenarios");
  return res.json();
}

export async function getCustomers(): Promise<Customer[]> {
  const res = await fetch(`${API_BASE}/api/customers`);
  if (!res.ok) throw new Error("Failed to load customers");
  return res.json();
}

export async function getKbDocuments(): Promise<KbDocument[]> {
  const res = await fetch(`${API_BASE}/api/kb/documents`);
  if (!res.ok) throw new Error("Failed to load KB documents");
  return res.json();
}

export async function postChat(payload: {
  session_id: string;
  customer_email: string;
  message: string;
}): Promise<ChatReply> {
  const res = await fetch(`${API_BASE}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Chat request failed");
  return res.json();
}
