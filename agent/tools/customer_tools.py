import json
from pathlib import Path
from langchain_core.tools import tool

FIXTURES_DIR = Path(__file__).parent.parent.parent / "data" / "fixtures"


def _load_customers() -> list[dict]:
    with open(FIXTURES_DIR / "customers.json") as f:
        return json.load(f)["customers"]


def _strip_internal(customer: dict) -> dict:
    return {k: v for k, v in customer.items() if not k.startswith("_")}


@tool
def get_customer_profile(customer_email: str) -> dict:
    """Retrieve a customer's profile including loyalty tier, contact history,
    and free return usage. Call this before applying tier-based return shipping
    rules or checking whether the repeated-contact escalation threshold has been
    reached.
    """
    customers = _load_customers()

    customer = next(
        (c for c in customers if c["email"].lower() == customer_email.lower()), None)

    if customer is None:
        return {"error": "customer_not_found", "email": customer_email}

    return _strip_internal(customer)


if __name__ == "__main__":
    print("--- search customer details: valid ---")
    print(get_customer_profile.invoke(
        {"customer_email": "james.okafor@email.com"}))

    print("--- search customer details: Invalid ---")
    print(get_customer_profile.invoke(
        {"customer_email": "notfound@email.com"}))
