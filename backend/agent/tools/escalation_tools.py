import sys
from datetime import datetime
from pathlib import Path
from langchain_core.tools import tool

sys.path.insert(0, str(Path(__file__).parent.parent.parent))
from db import connection  # noqa: E402

ESCALATION_TIME = {
    "urgent": 2,
    "high": 8,
    "medium": 24,
    "low": 72
}


def _next_ticket_id(cur) -> str:
    cur.execute("SELECT COUNT(*) FROM escalation_tickets;")
    (count,) = cur.fetchone()
    return f"TKT-{count + 1:05d}"


@tool
def create_escalation_ticket(
    customer_email: str, order_id: str, issue_type: str, priority: str, summary: str
) -> dict:
    """Create an escalation ticket to route the conversation to a human agent.
    Use this when the customer mentions legal action, the order exceeds $500,
    they've contacted support 3+ times about the same issue, or they request
    to speak with a supervisor. Returns a ticket ID and estimated response time."""

    priority_lower = priority.lower()
    estimated_hours = ESCALATION_TIME.get(priority_lower, 24)

    with connection() as conn, conn.cursor() as cur:
        ticket_id = _next_ticket_id(cur)
        cur.execute(
            """
            INSERT INTO escalation_tickets (
                ticket_id, customer_email, order_id, issue_type, priority, summary, created_at, status
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, 'open');
            """,
            (ticket_id, customer_email, order_id, issue_type, priority_lower, summary, datetime.now()),
        )
        conn.commit()

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

    print("\n--- verify tickets were written to the database ---")
    with connection() as conn, conn.cursor() as cur:
        cur.execute("SELECT ticket_id, priority, customer_email FROM escalation_tickets ORDER BY created_at;")
        rows = cur.fetchall()
    print(f"Total tickets in db: {len(rows)}")
    for ticket_id, priority, email in rows:
        print(f"  {ticket_id}: {priority} - {email}")
