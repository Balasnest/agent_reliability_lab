"""One-time/idempotent migration: load the JSON fixtures into Postgres so the
API and agent tools read from the database instead of files on disk."""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))
from db import get_connection, init_schema  # noqa: E402

DATA_DIR = Path(__file__).parent
FIXTURES_DIR = DATA_DIR / "fixtures"
SCENARIOS_DIR = DATA_DIR / "scenarios"

# Curated KB doc metadata (title/category/blurb) — the knowledge_base/documents/*.txt
# files hold only body text, so this listing is the source of truth for display metadata.
KB_DOCUMENTS = [
    {"doc_id": "POL-001", "title": "Standard Return Policy", "category": "Returns", "blurb": "30 days from delivery, most items"},
    {"doc_id": "POL-002", "title": "Electronics Return Window", "category": "Returns", "blurb": "15 days — TVs, laptops, phones"},
    {"doc_id": "POL-003", "title": "Marketplace Seller Returns", "category": "Returns", "blurb": "Third-party terms differ"},
    {"doc_id": "POL-004", "title": "Damaged & Defective Items", "category": "Returns", "blurb": "Arrived broken or DOA"},
    {"doc_id": "SHP-001", "title": "Standard Shipping", "category": "Shipping", "blurb": "3-5 business days; free at Gold+"},
    {"doc_id": "SHP-002", "title": "Expedited Shipping", "category": "Shipping", "blurb": "Two-day and overnight options"},
    {"doc_id": "SHP-003", "title": "Lost, Delayed & Damaged Shipments", "category": "Shipping", "blurb": "Carrier issue resolution"},
    {"doc_id": "BIL-001", "title": "Refund Processing Timeline", "category": "Billing", "blurb": "How long refunds take to post"},
    {"doc_id": "BIL-002", "title": "Billing Disputes & Chargebacks", "category": "Billing", "blurb": "Before contacting the bank"},
    {"doc_id": "LOY-001", "title": "ShopNova Rewards Tiers", "category": "Loyalty", "blurb": "Standard, Silver, Gold benefits"},
    {"doc_id": "ESC-001", "title": "Escalation Criteria", "category": "Escalation", "blurb": "When to open a supervisor ticket"},
    {"doc_id": "ACC-001", "title": "Account Security", "category": "Account", "blurb": "Password & account protection"},
    {"doc_id": "WAR-001", "title": "Manufacturer Warranty", "category": "Warranty", "blurb": "Coverage beyond return window"},
]


def seed_customers(conn) -> int:
    data = json.loads((FIXTURES_DIR / "customers.json").read_text())
    rows = data["customers"]
    with conn.cursor() as cur:
        for c in rows:
            cur.execute(
                """
                INSERT INTO customers (
                    customer_id, email, name, loyalty_tier, account_status,
                    points_balance, previous_contact_count_30d, open_tickets_count,
                    free_returns_used_this_year, member_since
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (customer_id) DO UPDATE SET
                    email = EXCLUDED.email,
                    name = EXCLUDED.name,
                    loyalty_tier = EXCLUDED.loyalty_tier,
                    account_status = EXCLUDED.account_status,
                    points_balance = EXCLUDED.points_balance,
                    previous_contact_count_30d = EXCLUDED.previous_contact_count_30d,
                    open_tickets_count = EXCLUDED.open_tickets_count,
                    free_returns_used_this_year = EXCLUDED.free_returns_used_this_year,
                    member_since = EXCLUDED.member_since;
                """,
                (
                    c["customer_id"], c["email"], c["name"], c["loyalty_tier"], c["account_status"],
                    c["points_balance"], c["previous_contact_count_30d"], c["open_tickets_count"],
                    c["free_returns_used_this_year"], c["member_since"],
                ),
            )
    conn.commit()
    return len(rows)


def seed_orders(conn) -> tuple[int, int]:
    data = json.loads((FIXTURES_DIR / "orders.json").read_text())
    orders = data["orders"]
    item_count = 0
    with conn.cursor() as cur:
        for o in orders:
            cur.execute(
                """
                INSERT INTO orders (
                    order_id, customer_email, status, placed_date, expected_delivery,
                    delivered_date, is_delivered, days_since_delivery,
                    days_past_expected_delivery, seller_type, order_total, shipping_paid
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (order_id) DO UPDATE SET
                    customer_email = EXCLUDED.customer_email,
                    status = EXCLUDED.status,
                    placed_date = EXCLUDED.placed_date,
                    expected_delivery = EXCLUDED.expected_delivery,
                    delivered_date = EXCLUDED.delivered_date,
                    is_delivered = EXCLUDED.is_delivered,
                    days_since_delivery = EXCLUDED.days_since_delivery,
                    days_past_expected_delivery = EXCLUDED.days_past_expected_delivery,
                    seller_type = EXCLUDED.seller_type,
                    order_total = EXCLUDED.order_total,
                    shipping_paid = EXCLUDED.shipping_paid;
                """,
                (
                    o["order_id"], o["customer_email"], o["status"], o["placed_date"],
                    o["expected_delivery"], o["delivered_date"], o["is_delivered"],
                    o["days_since_delivery"], o.get("days_past_expected_delivery"),
                    o["seller_type"], o["order_total"], o["shipping_paid"],
                ),
            )
            for item in o["items"]:
                cur.execute(
                    """
                    INSERT INTO order_items (item_id, order_id, name, category, quantity, unit_price)
                    VALUES (%s, %s, %s, %s, %s, %s)
                    ON CONFLICT (item_id) DO UPDATE SET
                        order_id = EXCLUDED.order_id,
                        name = EXCLUDED.name,
                        category = EXCLUDED.category,
                        quantity = EXCLUDED.quantity,
                        unit_price = EXCLUDED.unit_price;
                    """,
                    (item["item_id"], o["order_id"], item["name"], item["category"],
                     item["quantity"], item["unit_price"]),
                )
                item_count += 1
    conn.commit()
    return len(orders), item_count


def seed_scenarios(conn) -> int:
    scenarios = json.loads((SCENARIOS_DIR / "scenarios.json").read_text())
    with conn.cursor() as cur:
        for s in scenarios:
            cur.execute(
                """
                INSERT INTO scenarios (
                    id, name, difficulty, customer_email, conversation,
                    expected, evaluation_dimensions, failure_modes_tested
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (id) DO UPDATE SET
                    name = EXCLUDED.name,
                    difficulty = EXCLUDED.difficulty,
                    customer_email = EXCLUDED.customer_email,
                    conversation = EXCLUDED.conversation,
                    expected = EXCLUDED.expected,
                    evaluation_dimensions = EXCLUDED.evaluation_dimensions,
                    failure_modes_tested = EXCLUDED.failure_modes_tested;
                """,
                (
                    s["id"], s["name"], s["difficulty"], s.get("customer_email"),
                    json.dumps(s["conversation"]), json.dumps(s.get("expected")),
                    json.dumps(s.get("evaluation_dimensions")),
                    json.dumps(s.get("failure_modes_tested")),
                ),
            )
    conn.commit()
    return len(scenarios)


def seed_kb_documents(conn) -> int:
    with conn.cursor() as cur:
        for d in KB_DOCUMENTS:
            cur.execute(
                """
                INSERT INTO kb_documents (doc_id, title, category, blurb)
                VALUES (%s, %s, %s, %s)
                ON CONFLICT (doc_id) DO UPDATE SET
                    title = EXCLUDED.title,
                    category = EXCLUDED.category,
                    blurb = EXCLUDED.blurb;
                """,
                (d["doc_id"], d["title"], d["category"], d["blurb"]),
            )
    conn.commit()
    return len(KB_DOCUMENTS)


def seed_escalation_tickets(conn) -> int:
    ticket_file = DATA_DIR / "escalation_tickets.json"
    if not ticket_file.exists():
        return 0
    content = ticket_file.read_text().strip()
    tickets = json.loads(content) if content else []
    with conn.cursor() as cur:
        for t in tickets:
            cur.execute(
                """
                INSERT INTO escalation_tickets (
                    ticket_id, customer_email, order_id, issue_type, priority, summary, created_at, status
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (ticket_id) DO NOTHING;
                """,
                (t["ticket_id"], t["customer_email"], t.get("order_id"), t.get("issue_type"),
                 t.get("priority"), t.get("summary"), t.get("created_at"), t.get("status", "open")),
            )
    conn.commit()
    return len(tickets)


if __name__ == "__main__":
    conn = get_connection()
    init_schema(conn)

    n_customers = seed_customers(conn)
    n_orders, n_items = seed_orders(conn)
    n_scenarios = seed_scenarios(conn)
    n_kb = seed_kb_documents(conn)
    n_tickets = seed_escalation_tickets(conn)

    conn.close()

    print(f"customers:          {n_customers}")
    print(f"orders:             {n_orders} ({n_items} items)")
    print(f"scenarios:          {n_scenarios}")
    print(f"kb_documents:       {n_kb}")
    print(f"escalation_tickets: {n_tickets}")
