import json
import sys
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from langchain_core.messages import HumanMessage
from pydantic import BaseModel

# graph.py uses bare `from tools...` imports, so backend/agent must be on the path.
AGENT_DIR = Path(__file__).parent.parent / "agent"
sys.path.insert(0, str(AGENT_DIR))
EVAL_DIR = Path(__file__).parent.parent / "evaluation"
sys.path.insert(0, str(EVAL_DIR))

from graph import graph as agent_graph  # noqa: E402
from db import dict_connection, to_jsonable  # noqa: E402
from metrics import evaluate_result  # noqa: E402

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
    scenario_id: str | None = None


class ToolCallTrace(BaseModel):
    tool: str
    args: dict


class ChatTrace(BaseModel):
    tool_calls: list[ToolCallTrace]
    retrieved_docs: list[dict]
    escalated: bool
    escalation_priority: str | None = None
    escalation_ticket_id: str | None = None
    escalation_reason: str | None = None


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
            """
            SELECT customer_id AS id, name, email, loyalty_tier, points_balance,
                   member_since, previous_contact_count_30d, open_tickets_count
            FROM customers ORDER BY customer_id;
            """
        )
        return [to_jsonable(dict(row)) for row in cur.fetchall()]


@app.get("/api/customers/{email}/orders")
def get_customer_orders(email: str):
    with dict_connection() as conn, conn.cursor() as cur:
        cur.execute(
            "SELECT * FROM orders WHERE lower(customer_email) = lower(%s) ORDER BY placed_date DESC;",
            (email,),
        )
        orders = [dict(row) for row in cur.fetchall()]
        for order in orders:
            cur.execute(
                "SELECT item_id, name, category, quantity, unit_price FROM order_items WHERE order_id = %s;",
                (order["order_id"],),
            )
            order["items"] = [dict(row) for row in cur.fetchall()]
    return to_jsonable(orders)


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


def _build_trace(result: dict, tool_calls_before: int, docs_before: int, was_escalated: bool) -> ChatTrace:
    turn_tool_calls = result["tool_calls_made"][tool_calls_before:]
    turn_docs = result["retrieved_docs"][docs_before:]
    escalated_this_turn = result["escalation_triggered"] and not was_escalated

    escalation_reason = None
    if escalated_this_turn:
        ticket_call = next(
            (c for c in turn_tool_calls if c["tool"] == "create_escalation_ticket"), None
        )
        if ticket_call:
            escalation_reason = ticket_call["args"].get("summary")

    return ChatTrace(
        tool_calls=[ToolCallTrace(tool=c["tool"], args=c["args"]) for c in turn_tool_calls],
        retrieved_docs=_kb_titles(turn_docs),
        escalated=escalated_this_turn,
        escalation_priority=result["escalation_priority"] if escalated_this_turn else None,
        escalation_ticket_id=result["escalation_reason"] if escalated_this_turn else None,
        escalation_reason=escalation_reason,
    )


def _get_scenario(scenario_id: str) -> dict | None:
    with dict_connection() as conn, conn.cursor() as cur:
        cur.execute("SELECT * FROM scenarios WHERE id = %s;", (scenario_id,))
        scenario = cur.fetchone()
    return to_jsonable(dict(scenario)) if scenario else None


def _run_harness_evaluation(req: ChatRequest, reply: str, trace: ChatTrace) -> dict | None:
    """Score this turn against a scenario's ground truth (tool_selection,
    retrieval_accuracy, escalation_accuracy, hallucination, decision_correctness
    via LLM judge) — only meaningful when the turn originated from a scenario,
    since free-form chat has no expected/ground-truth outcome to compare against."""
    if not req.scenario_id:
        return None
    scenario = _get_scenario(req.scenario_id)
    if not scenario:
        return None

    result_for_eval = {
        "scenario_id": scenario["id"],
        "scenario_name": scenario["name"],
        "difficulty": scenario["difficulty"],
        "customer_query": req.message,
        "actual": {
            "tool_calls": [c.tool for c in trace.tool_calls],
            "retrieved_docs": [d["id"] for d in trace.retrieved_docs],
            "escalated": trace.escalated,
            "escalation_triggered_priority": trace.escalation_priority or "",
            "final_response": reply,
        },
        "expected": scenario.get("expected") or {},
        "evaluation_dimensions": scenario.get("evaluation_dimensions") or [],
    }
    return evaluate_result(result_for_eval)


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

    trace = _build_trace(result, tool_calls_before, docs_before, was_escalated)
    return ChatResponse(reply=result["messages"][-1].content, trace=trace)


def _sse(event: str, data: dict) -> str:
    return f"event: {event}\ndata: {json.dumps(data)}\n\n"


@app.post("/api/chat/stream")
async def chat_stream(req: ChatRequest):
    state = SESSIONS.setdefault(req.session_id, _new_session_state(req.customer_email))
    state["customer_email"] = req.customer_email
    state["messages"].append(HumanMessage(content=req.message))

    tool_calls_before = len(state["tool_calls_made"])
    docs_before = len(state["retrieved_docs"])
    was_escalated = state["escalation_triggered"]

    async def event_stream():
        final_output = None
        seen_tools: set[str] = set()
        try:
            async for event in agent_graph.astream_events(state, version="v2"):
                kind = event["event"]

                if kind == "on_chat_model_stream":
                    chunk = event["data"]["chunk"]
                    if chunk.content:
                        yield _sse("token", {"content": chunk.content})

                elif kind == "on_tool_start":
                    # Same tool can legitimately run more than once across the
                    # turn's tool-call loop (e.g. re-checking after a follow-up
                    # detail); use the langgraph run id to still dedupe retries
                    # from LangChain's own internal event replays.
                    dedupe_key = f"{event['name']}:{event['run_id']}"
                    if dedupe_key in seen_tools:
                        continue
                    seen_tools.add(dedupe_key)
                    yield _sse("tool_call", {
                        "tool": event["name"],
                        "args": event["data"].get("input", {}),
                    })

                elif kind == "on_chain_end" and event.get("name") == "LangGraph":
                    final_output = event["data"]["output"]
        except Exception as e:
            yield _sse("error", {"message": str(e)})
            return

        if final_output is None:
            yield _sse("error", {"message": "agent produced no output"})
            return

        SESSIONS[req.session_id] = final_output
        trace = _build_trace(final_output, tool_calls_before, docs_before, was_escalated)
        reply = final_output["messages"][-1].content

        yield _sse("done", {"reply": reply, "trace": trace.model_dump()})

        evaluation = _run_harness_evaluation(req, reply, trace)
        if evaluation is not None:
            yield _sse("evaluation", evaluation)

    return StreamingResponse(event_stream(), media_type="text/event-stream")
