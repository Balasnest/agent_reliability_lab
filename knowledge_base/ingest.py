import os
import psycopg2
from pathlib import Path
from dotenv import load_dotenv
from langchain_huggingface import HuggingFaceEmbeddings

load_dotenv(override=True)

DOCS_DIR = Path(__file__).parent / "documents"
DB_URL = os.getenv(
    "DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/shopsupport")
EMBEDDING_MODEL = "all-MiniLM-L6-v2"


def get_connection():
    return psycopg2.connect(DB_URL)


def setup_db(conn):
    """Enable pgvector extension and create the documents table."""
    with conn.cursor() as cur:
        cur.execute("CREATE EXTENSION IF NOT EXISTS vector;")
        cur.execute("""
            CREATE TABLE IF NOT EXISTS documents (
                chunk_id     TEXT PRIMARY KEY,
                doc_id       TEXT NOT NULL,
                chunk_index  INTEGER NOT NULL,
                content      TEXT NOT NULL,
                embedding    vector(384)
            );
        """)
        cur.execute("CREATE INDEX IF NOT EXISTS idx_doc_id ON documents (doc_id);")
    conn.commit()


def _get_chunks(content: str) -> list[str]:
    """Split document into chunks. Today: whole document = one chunk.
    To enable smaller chunks later, replace this with a text splitter —
    nothing else in the pipeline needs to change."""
    return [content]


def ingest_documents(conn, embedder: HuggingFaceEmbeddings):
    """Read each .txt file, chunk it, embed each chunk, upsert into pgvector."""
    doc_files = sorted(DOCS_DIR.glob("*.txt"))

    if not doc_files:
        print("No documents found in", DOCS_DIR)
        return

    print(f"Ingesting {len(doc_files)} documents...")

    for doc_file in doc_files:
        doc_id = doc_file.stem                    # "POL-001.txt" → "POL-001"
        content = doc_file.read_text()
        chunks = _get_chunks(content)             # today: one chunk per doc

        for chunk_index, chunk_content in enumerate(chunks):
            chunk_id = f"{doc_id}-{chunk_index}"  # "POL-001-0"
            embedding = embedder.embed_query(chunk_content)

            with conn.cursor() as cur:
                cur.execute("""
                    INSERT INTO documents (chunk_id, doc_id, chunk_index, content, embedding)
                    VALUES (%s, %s, %s, %s, %s)
                    ON CONFLICT (chunk_id) DO UPDATE
                        SET content   = EXCLUDED.content,
                            embedding = EXCLUDED.embedding;
                """, (chunk_id, doc_id, chunk_index, chunk_content, embedding))

            conn.commit()

        print(f"  stored: {doc_id} ({len(chunks)} chunk(s))")

    print("Ingestion complete.")


def verify(conn):
    """Print a summary of what is stored."""
    with conn.cursor() as cur:
        cur.execute("SELECT doc_id, COUNT(*) FROM documents GROUP BY doc_id ORDER BY doc_id;")
        rows = cur.fetchall()
    print(f"\n{len(rows)} documents in pgvector:")
    for doc_id, count in rows:
        print(f"  {doc_id}  ({count} chunk(s))")


if __name__ == "__main__":
    print("Loading embedding model (first run downloads ~90MB) ...")
    embedder = HuggingFaceEmbeddings(model_name=EMBEDDING_MODEL)

    conn = get_connection()
    setup_db(conn)
    ingest_documents(conn, embedder)
    verify(conn)
    conn.close()
