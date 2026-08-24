import json
from datetime import datetime
from pathlib import Path
from langchain_core.tools import tool

ESCALATION_DATA_DIR = Path(__file__).parent.parent.parent / "data"

ESCALATION_TIME = {
    "urgent": 2,
    "high": 8,
    "medium": 24,
    "low": 72
}


def _load_escalation_tickets() -> list[dict]:
    ticket_file = ESCALATION_DATA_DIR / "escalation_tickets.json"
    if not ticket_file.exists():
        return []
    with open(ticket_file) as f:
        content = f.read().strip()
        if not content:
            return []
        return json.loads(content)


def _save_escalation_tickets(tickets: list[dict]) -> None:
    with open(ESCALATION_DATA_DIR / "escalation_tickets.json", "w") as f:
        json.dump(tickets, f, indent=2)


@tool
def create_escalation_ticket(
    customer_email: str, order_id: str, issue_type: str, priority: str, summary: str
) -> dict:
    """Create an escalation ticket to route the conversation to a human agent.
    Use this when the customer mentions legal action, the order exceeds $500,
    they've contacted support 3+ times about the same issue, or they request
    to speak with a supervisor. Returns a ticket ID and estimated response time."""

    tickets = _load_escalation_tickets()
    ticket_id = f"TKT-{len(tickets) + 1:05d}"
    priority_lower = priority.lower()
    estimated_hours = ESCALATION_TIME.get(priority_lower, 24)

    ticket = {
        "ticket_id": ticket_id,
        "customer_email": customer_email,
        "order_id": order_id,
        "issue_type": issue_type,
        "priority": priority_lower,
        "summary": summary,
        "created_at": datetime.now().isoformat(),
        "status": "open",
    }

    tickets.append(ticket)
    _save_escalation_tickets(tickets)

    return {
        "ticket_id": ticket_id,
        "status": "created",
        "priority": priority_lower,
        "estimated_response_hours": estimated_hours,
    }


if __name__ == "__main__":
    print("--- create escalation ticket: valid (first ticket) ---")
    result1 = create_escalation_ticket.invoke({
        "customer_email": "rachel.wu@email.com",
        "order_id": "SN-10008",
        "issue_type": "high_value_order",
        "priority": "HIGH",
        "summary": "Customer ordered $1299.99 MacBook Air, requesting return guidance for high-value item."
    })
    print(result1)

    print("\n--- create escalation ticket: valid (second ticket) ---")
    result2 = create_escalation_ticket.invoke({
        "customer_email": "tom.harris@email.com",
        "order_id": "SN-10009",
        "issue_type": "repeated_contact",
        "priority": "MEDIUM",
        "summary": "Customer has contacted support 4 times in 30 days about the same yoga mat return issue."
    })
    print(result2)

    print("\n--- verify tickets were written to file ---")
    tickets = _load_escalation_tickets()
    print(f"Total tickets in file: {len(tickets)}")
    for ticket in tickets:
        print(f"  {ticket['ticket_id']}: {ticket['priority']} - {ticket['customer_email']}")
