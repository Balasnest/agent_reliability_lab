import datetime
import decimal
import os
from contextlib import contextmanager

import psycopg2
import psycopg2.extras
from dotenv import load_dotenv

load_dotenv(override=True)

DB_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5433/shopsupport")

SCHEMA = """
CREATE TABLE IF NOT EXISTS customers (
    customer_id                 TEXT PRIMARY KEY,
    email                       TEXT UNIQUE NOT NULL,
    name                        TEXT NOT NULL,
    loyalty_tier                TEXT NOT NULL,
    account_status              TEXT NOT NULL,
    points_balance              INTEGER NOT NULL DEFAULT 0,
    previous_contact_count_30d  INTEGER NOT NULL DEFAULT 0,
    open_tickets_count          INTEGER NOT NULL DEFAULT 0,
    free_returns_used_this_year INTEGER NOT NULL DEFAULT 0,
    member_since                DATE
);

CREATE TABLE IF NOT EXISTS orders (
    order_id                     TEXT PRIMARY KEY,
    customer_email                TEXT NOT NULL,
    status                        TEXT NOT NULL,
    placed_date                   DATE,
    expected_delivery             DATE,
    delivered_date                 DATE,
    is_delivered                  BOOLEAN NOT NULL DEFAULT FALSE,
    days_since_delivery           INTEGER,
    days_past_expected_delivery   INTEGER,
    seller_type                   TEXT,
    order_total                   NUMERIC(10, 2),
    shipping_paid                  NUMERIC(10, 2)
);

CREATE TABLE IF NOT EXISTS order_items (
    item_id     TEXT PRIMARY KEY,
    order_id    TEXT NOT NULL REFERENCES orders(order_id),
    name        TEXT NOT NULL,
    category    TEXT NOT NULL,
    quantity    INTEGER NOT NULL DEFAULT 1,
    unit_price  NUMERIC(10, 2)
);

CREATE TABLE IF NOT EXISTS scenarios (
    id                     TEXT PRIMARY KEY,
    name                   TEXT NOT NULL,
    difficulty             TEXT NOT NULL,
    customer_email         TEXT,
    conversation           JSONB NOT NULL,
    expected               JSONB,
    evaluation_dimensions  JSONB,
    failure_modes_tested   JSONB
);

CREATE TABLE IF NOT EXISTS kb_documents (
    doc_id    TEXT PRIMARY KEY,
    title     TEXT NOT NULL,
    category  TEXT NOT NULL,
    blurb     TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS escalation_tickets (
    ticket_id      TEXT PRIMARY KEY,
    customer_email TEXT NOT NULL,
    order_id       TEXT,
    issue_type     TEXT,
    priority       TEXT,
    summary        TEXT,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    status         TEXT NOT NULL DEFAULT 'open'
);
"""


def get_connection():
    """Raw connection factory — caller owns its lifecycle (commit/close)."""
    return psycopg2.connect(DB_URL)


def get_dict_connection():
    """Raw connection whose cursors yield dict-like rows (RealDictCursor).
    Caller owns its lifecycle (commit/close)."""
    return psycopg2.connect(DB_URL, cursor_factory=psycopg2.extras.RealDictCursor)


@contextmanager
def connection():
    """`with connection() as conn:` — commits on success, rolls back on
    error, and always closes the connection. Use this (not get_connection)
    for request-scoped DB access: psycopg2's own `with conn:` only manages
    the transaction, it does NOT close the underlying socket, so using a raw
    connection as a context manager leaks a connection per call."""
    conn = psycopg2.connect(DB_URL)
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


@contextmanager
def dict_connection():
    """Same as connection(), but cursors yield dict-like rows (RealDictCursor)."""
    conn = psycopg2.connect(DB_URL, cursor_factory=psycopg2.extras.RealDictCursor)
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def init_schema(conn) -> None:
    with conn.cursor() as cur:
        cur.execute(SCHEMA)
    conn.commit()


def to_jsonable(value):
    """Recursively convert psycopg2 row values (Decimal, date/datetime) into
    plain JSON-friendly types, so tool output going back to the LLM (and to
    the API) reads like the original fixtures rather than Python reprs."""
    if isinstance(value, dict):
        return {k: to_jsonable(v) for k, v in value.items()}
    if isinstance(value, list):
        return [to_jsonable(v) for v in value]
    if isinstance(value, decimal.Decimal):
        return float(value)
    if isinstance(value, (datetime.date, datetime.datetime)):
        return value.isoformat()
    return value


if __name__ == "__main__":
    conn = get_connection()
    init_schema(conn)
    conn.close()
    print("Schema ready.")
