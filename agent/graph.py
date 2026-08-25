import ast
from dotenv import load_dotenv
import json
import logging
from pathlib import Path
from typing import TypedDict, Annotated
from langchain_openai import ChatOpenAI
from langgraph.graph import START, END, StateGraph
from langchain_core.messages import BaseMessage, HumanMessage, SystemMessage, ToolMessage
from langgraph.graph.message import add_messages
from langgraph.prebuilt import ToolNode

from tools.order_tools import lookup_order, check_return_window
from tools.customer_tools import get_customer_profile
from tools.escalation_tools import create_escalation_ticket
from tools.kb_tools import search_knowledge_base

load_dotenv(override=True)
logging.basicConfig(
    level=logging.WARNING,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)
logger.setLevel(logging.DEBUG)

SYSTEM_PROMPT_PATH = Path(__file__).parent / "prompts" / "system_prompt.txt"
system_prompt = SYSTEM_PROMPT_PATH.read_text()


class AgentState(TypedDict):
    """State maintained throughout the agent's conversation with a customer."""
    messages: Annotated[list[BaseMessage], add_messages]
    retrieved_docs: list[str]
    tool_calls_made: list[dict]
    customer_email: str
    escalation_triggered: bool
    escalation_priority: str
    escalation_reason: str


# Bind all tools to the model
tools = [
    lookup_order,
    check_return_window,
    get_customer_profile,
    create_escalation_ticket,
    search_knowledge_base
]


def agent_node(state: AgentState) -> AgentState:
    """Call the LLM with tools bound. The LLM decides what to do next.
    retrieve docs, call a tool or respond to the customer.
    """

    # LLM with tools
    model = ChatOpenAI(model="gpt-5.4-mini").bind_tools(tools)

    customer_context = ""
    if state.get("customer_email"):
        customer_context = f"\n\nAuthenticated customer email: {state['customer_email']}"

    # Call the model with the message history
    messages = [SystemMessage(
        content=system_prompt + customer_context)] + state["messages"]
    response = model.invoke(messages)

    # Track what tools the LLM decided to call (before execution)
    if hasattr(response, "tool_calls") and response.tool_calls:
        for tool_call in response.tool_calls:
            state["tool_calls_made"].append({
                "tool": tool_call["name"],
                "args": tool_call["args"]
            })

    logger.debug("LLM response: %s", response.content)
    logger.debug("LLM response toolcall: %s", state["tool_calls_made"])

    # Add the response to messages
    state["messages"].append(response)
    return state


def should_continue(state: AgentState) -> str:
    """Decide whether the agent should execute tools or end the conversation."""

    last_message = state["messages"][-1]
    if hasattr(last_message, "tool_calls") and last_message.tool_calls:
        return "tools"
    return END


def update_tracking(state: AgentState) -> AgentState:
    for message in state["messages"]:
        if isinstance(message, ToolMessage) and message.name == "search_knowledge_base":
            try:
                results = json.loads(message.content)
            except json.JSONDecodeError:
                # ToolNode serializes with str(), not json.dumps() — produces Python repr
                results = ast.literal_eval(message.content)
            for r in results:
                if r["doc_id"] not in state["retrieved_docs"]:
                    state["retrieved_docs"].append(r["doc_id"])

        if isinstance(message, ToolMessage) and message.name == "create_escalation_ticket":
            try:
                results = json.loads(message.content)
            except json.JSONDecodeError:
                results = ast.literal_eval(message.content)
            state["escalation_triggered"] = True
            state["escalation_priority"] = results.get("priority", "")
            state["escalation_reason"] = results.get("ticket_id", "")

    return state


# Graph flow
graph_builder = StateGraph(AgentState)
graph_builder.add_node("agent", agent_node)
# ToolNode handles execution automatically
graph_builder.add_node("tools", ToolNode(tools))
graph_builder.add_node("update_tracking", update_tracking)


graph_builder.set_entry_point("agent")
graph_builder.add_conditional_edges("agent", should_continue, {
                                    "tools": "tools", END: END})
graph_builder.add_edge("tools", "update_tracking")
graph_builder.add_edge("update_tracking", "agent"
                       )
graph = graph_builder.compile()

if __name__ == "__main__":
    initial_state = {
        "messages": [HumanMessage(content="free return shipping loyalty")],
        "retrieved_docs": [],
        "tool_calls_made": [],
        "customer_email": "maria.chen@email.com",
        "escalation_triggered": False,
        "escalation_priority": "",
        "escalation_reason": "",
    }

    result = graph.invoke(initial_state)
    logger.debug(f"Tool calls made: {result['tool_calls_made']}")
    logger.debug(f"retrieved_docs: {result['retrieved_docs']}")
