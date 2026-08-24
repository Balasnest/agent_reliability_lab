from dotenv import load_dotenv
from typing import TypedDict, Annotated
from langchain_openai import ChatOpenAI
from langgraph.graph import START, END, StateGraph
from langchain_core.messages import BaseMessage, HumanMessage
from langgraph.graph.message import add_messages
from langgraph.prebuilt import ToolNode

from tools.order_tools import lookup_order, check_return_window
from tools.customer_tools import get_customer_profile
from tools.escalation_tools import create_escalation_ticket

load_dotenv(override=True)


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
]


def agent_node(state: AgentState) -> AgentState:
    """Call the LLM with tools bound. The LLM decides what to do next.
    retrieve docs, call a tool or respond to the customer.
    """

    # LLM with tools
    model = ChatOpenAI(model="gpt-5.4-mini").bind_tools(tools)

    # Call the model with the message history
    response = model.invoke(state["messages"])

    # Track what tools the LLM decided to call (before execution)
    if hasattr(response, "tool_calls") and response.tool_calls:
        for tool_call in response.tool_calls:
            state["tool_calls_made"].append({
                "tool": tool_call["name"],
                "args": tool_call["args"]
            })

    print("LLM response: ", response.content)
    print("LLM response toolcall: ", state["tool_calls_made"])

    # Add the response to messages
    state["messages"].append(response)
    return state


def should_continue(state: AgentState) -> str:
    """Decide whether the agent should execute tools or end the conversation."""

    last_message = state["messages"][-1]
    if hasattr(last_message, "tool_calls") and last_message.tool_calls:
        return "tools"
    return END


# Graph flow
graph_builder = StateGraph(AgentState)
graph_builder.add_node("agent", agent_node)
# ToolNode handles execution automatically
graph_builder.add_node("tools", ToolNode(tools))

graph_builder.set_entry_point("agent")
graph_builder.add_conditional_edges("agent", should_continue, {
                                    "tools": "tools", END: END})
graph_builder.add_edge("tools", "agent")
graph = graph_builder.compile()

if __name__ == "__main__":
    initial_state = {
        "messages": [HumanMessage(content="Can I return my order SN-10001? ordered from those account test@gmail.com")],
        "retrieved_docs": [],
        "tool_calls_made": [],
        "customer_email": "maria.chen@email.com",
        "escalation_triggered": False,
        "escalation_priority": "",
        "escalation_reason": "",
    }

    result = graph.invoke(initial_state)
    print(f"Tool calls made: {result['tool_calls_made']}")
