import sys
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from langchain_core.messages import HumanMessage
from pydantic import BaseModel

# graph.py uses bare `from tools...` imports, so backend/agent must be on the path.
AGENT_DIR = Path(__file__).parent.parent / "agent"
sys.path.insert(0, str(AGENT_DIR))

from graph import graph as agent_graph  # noqa: E402
from db import dict_connection, to_jsonable  # noqa: E402

app = FastAPI(title="ShopNova Support API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class ChatRequest(BaseModel):
    session_id: str
    customer_email: str
    message: str


class ToolCallTrace(BaseModel):
    tool: str
    args: dict


class ChatTrace(BaseModel):
    tool_calls: list[ToolCallTrace]
    retrieved_docs: list[dict]
    escalated: bool
    escalation_priority: str | None = None
    escalation_ticket_id: str | None = None


class ChatResponse(BaseModel):
    reply: str
    trace: ChatTrace


def _new_session_state(customer_email: str) -> dict:
    return {
        "messages": [],
        "retrieved_docs": [],
        "tool_calls_made": [],
        "customer_email": customer_email,
        "escalation_triggered": False,
        "escalation_priority": "",
        "escalation_reason": "",
    }


# In-memory per-session agent state. Fine for local/dev use; a restart drops
# in-flight conversations.
SESSIONS: dict[str, dict] = {}


@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.get("/api/customers")
def list_customers():
    with dict_connection() as conn, conn.cursor() as cur:
        cur.execute(
            "SELECT customer_id AS id, name, email, loyalty_tier FROM customers ORDER BY customer_id;"
        )
        return [to_jsonable(dict(row)) for row in cur.fetchall()]


@app.get("/api/scenarios")
def list_scenarios():
    with dict_connection() as conn, conn.cursor() as cur:
        cur.execute("SELECT id, name, difficulty FROM scenarios ORDER BY id;")
        return [to_jsonable(dict(row)) for row in cur.fetchall()]


@app.get("/api/scenarios/{scenario_id}")
def get_scenario(scenario_id: str):
    with dict_connection() as conn, conn.cursor() as cur:
        cur.execute("SELECT * FROM scenarios WHERE id = %s;", (scenario_id,))
        scenario = cur.fetchone()
    if scenario is None:
        raise HTTPException(status_code=404, detail=f"scenario '{scenario_id}' not found")
    return to_jsonable(dict(scenario))


@app.get("/api/kb/documents")
def list_kb_documents():
    with dict_connection() as conn, conn.cursor() as cur:
        cur.execute("SELECT doc_id AS id, title, category, blurb FROM kb_documents ORDER BY doc_id;")
        return [to_jsonable(dict(row)) for row in cur.fetchall()]


def _kb_titles(doc_ids: list[str]) -> list[dict]:
    if not doc_ids:
        return []
    with dict_connection() as conn, conn.cursor() as cur:
        cur.execute(
            "SELECT doc_id AS id, title FROM kb_documents WHERE doc_id = ANY(%s);",
            (doc_ids,),
        )
        by_id = {row["id"]: row["title"] for row in cur.fetchall()}
    return [{"id": d, "title": by_id.get(d, d)} for d in doc_ids]


@app.post("/api/chat")
def chat(req: ChatRequest) -> ChatResponse:
    state = SESSIONS.setdefault(req.session_id, _new_session_state(req.customer_email))
    state["customer_email"] = req.customer_email
    state["messages"].append(HumanMessage(content=req.message))

    tool_calls_before = len(state["tool_calls_made"])
    docs_before = len(state["retrieved_docs"])
    was_escalated = state["escalation_triggered"]

    result = agent_graph.invoke(state)
    SESSIONS[req.session_id] = result

    turn_tool_calls = result["tool_calls_made"][tool_calls_before:]
    turn_docs = result["retrieved_docs"][docs_before:]
    escalated_this_turn = result["escalation_triggered"] and not was_escalated

    trace = ChatTrace(
        tool_calls=[ToolCallTrace(tool=c["tool"], args=c["args"]) for c in turn_tool_calls],
        retrieved_docs=_kb_titles(turn_docs),
        escalated=escalated_this_turn,
        escalation_priority=result["escalation_priority"] if escalated_this_turn else None,
        escalation_ticket_id=result["escalation_reason"] if escalated_this_turn else None,
    )

    return ChatResponse(reply=result["messages"][-1].content, trace=trace)
