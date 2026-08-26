import os
import psycopg2
from dotenv import load_dotenv
from langchain_huggingface import HuggingFaceEmbeddings

load_dotenv(override=True)

DB_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5433/shopsupport")
EMBEDDING_MODEL = "all-MiniLM-L6-v2"

# Load once at module level — avoids reloading the model on every query
_embedder = HuggingFaceEmbeddings(model_name=EMBEDDING_MODEL)


def retrieve(query: str, top_k: int = 3) -> list[dict]:
    """Embed the query and return the top_k most relevant KB documents.

    Returns doc_id (not chunk_id) so evaluation ground truth stays stable
    regardless of how documents are chunked internally.
    """
    query_embedding = _embedder.embed_query(query)

    conn = psycopg2.connect(DB_URL)
    try:
        with conn.cursor() as cur:
            # <=> is pgvector cosine distance operator
            # 1 - distance = similarity score (higher = more similar)
            cur.execute("""
                SELECT doc_id,
                       content,
                       1 - (embedding <=> %s::vector) AS score
                FROM documents
                ORDER BY embedding <=> %s::vector
                LIMIT %s;
            """, (query_embedding, query_embedding, top_k))

            rows = cur.fetchall()
    finally:
        conn.close()

    return [
        {"doc_id": row[0], "content": row[1], "score": round(row[2], 4)}
        for row in rows
    ]


if __name__ == "__main__":
    tests = [
        ("electronics return window",       ["POL-002"]),
        ("marketplace refund method",        ["POL-003"]),
        ("chargeback dispute consequences",  ["BIL-002"]),
        ("warranty claim process",           ["WAR-001"]),
        ("escalation supervisor request",    ["ESC-001"]),
        ("free return shipping loyalty",     ["LOY-001"]),
    ]

    print("=== Retrieval Tests ===\n")
    for query, expected in tests:
        results = retrieve(query, top_k=2)
        top_doc = results[0]["doc_id"] if results else "none"
        status = "PASS" if top_doc in expected else "FAIL"
        print(f"[{status}] Query: '{query}'")
        for r in results:
            marker = "<-- expected" if r["doc_id"] in expected else ""
            print(f"       [{r['score']:.4f}] {r['doc_id']} {marker}")
        print()
