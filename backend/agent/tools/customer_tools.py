import sys
from pathlib import Path
from langchain_core.tools import tool

sys.path.insert(0, str(Path(__file__).parent.parent.parent))
from db import dict_connection, to_jsonable  # noqa: E402


@tool
def get_customer_profile(customer_email: str) -> dict:
    """Retrieve a customer's profile including loyalty tier, contact history,
    and free return usage. Call this before applying tier-based return shipping
    rules or checking whether the repeated-contact escalation threshold has been
    reached.
    """
    with dict_connection() as conn, conn.cursor() as cur:
        cur.execute(
            "SELECT * FROM customers WHERE lower(email) = lower(%s);",
            (customer_email,),
        )
        customer = cur.fetchone()

    if customer is None:
        return {"error": "customer_not_found", "email": customer_email}

    return to_jsonable(dict(customer))


if __name__ == "__main__":
    print("--- search customer details: valid ---")
    print(get_customer_profile.invoke(
        {"customer_email": "james.okafor@email.com"}))

    print("--- search customer details: Invalid ---")
    print(get_customer_profile.invoke(
        {"customer_email": "notfound@email.com"}))
