import json
from pathlib import Path
from langchain_core.tools import tool

FIXTURES_DIR = Path(__file__).parent.parent.parent / "data" / "fixtures"


def _load_orders() -> list[dict]:
    with open(FIXTURES_DIR / "orders.json") as f:
        return json.load(f)["orders"]


def _strip_internal(order: dict) -> dict:
    return {k: v for k, v in order.items() if not k.startswith("_")}


RETURN_WINDOW_BY_CATEGORY = {
    "electronics": {"days": 15, "policy": "POL-002"},
}
DEFAULT_RETURN_WINDOW = {"days": 30, "policy": "POL-001"}


@tool
def lookup_order(order_id: str, customer_email: str) -> dict:
    """Look up an order by order ID and verify it belongs to the customer.
    Use this when the customer provides an order ID and you need to retrieve
    order status, items, delivery date, seller type, or order total.
    Returns order details or an error key if the order is not found or the
    email does not match."""
    orders = _load_orders()

    order = next((o for o in orders if o["order_id"] == order_id), None)

    if order is None:
        return {"error": "order_not_found", "order_id": order_id}

    if order["customer_email"].lower() != customer_email.lower():
        # Do not reveal the order exists — treat it the same as not found
        return {"error": "order_not_found", "order_id": order_id}

    return _strip_internal(order)


@tool
def check_return_window(order_id: str,
                        item_id: str) -> dict:
    """Check whether an item is within its eligible return window based on
    delivery date and product category. Use this after lookup_order confirms
    the order exists and is delivered. Returns eligibility, days since
    delivery, and the applicable policy ID. Does NOT account for defective
    items, seller type, or loyalty tier — the agent must reason about those
    separately after receiving this result."""
    orders = _load_orders()

    order = next((o for o in orders if o["order_id"] == order_id), None)

    if order is None:
        return {"error": "order_not_found", "order_id": order_id}

    if not order["is_delivered"]:
        return {
            "eligible": False,
            "reason": "item_not_yet_delivered",
            "order_id": order_id,
        }

    item = next((i for i in order["items"] if i["item_id"] == item_id), None)

    if item is None:
        return {"error": "item_not_found", "item_id": item_id, "order_id": order_id}

    days = order["days_since_delivery"]
    window = RETURN_WINDOW_BY_CATEGORY.get(
        item["category"], DEFAULT_RETURN_WINDOW)
    eligible = days <= window["days"]

    return {
        "eligible": eligible,
        "days_since_delivery": days,
        "days_remaining": window["days"] - days,
        "return_window_days": window["days"],
        "applicable_policy": window["policy"],
        "item_category": item["category"],
        "reason": "within_return_window" if eligible else "return_window_expired",
    }


if __name__ == "__main__":
    print("--- lookup_order: valid ---")
    print(lookup_order.invoke(
        {"order_id": "SN-10001", "customer_email": "maria.chen@email.com"}))

    print("\n--- lookup_order: wrong email ---")
    print(lookup_order.invoke(
        {"order_id": "SN-10001", "customer_email": "wrong@email.com"}))

    print("\n--- lookup_order: not found ---")
    print(lookup_order.invoke(
        {"order_id": "SN-99999", "customer_email": "maria.chen@email.com"}))

    print("\n--- check_return_window: electronics within 15 days (SN-10001, 10 days) ---")
    print(check_return_window.invoke(
        {"order_id": "SN-10001", "item_id": "ITEM-E01"}))

    print("\n--- check_return_window: electronics outside 15 days (SN-10003, 18 days) ---")
    print(check_return_window.invoke(
        {"order_id": "SN-10003", "item_id": "ITEM-E02"}))

    print("\n--- check_return_window: item not yet delivered (SN-10002) ---")
    print(check_return_window.invoke(
        {"order_id": "SN-10002", "item_id": "ITEM-H01"}))
