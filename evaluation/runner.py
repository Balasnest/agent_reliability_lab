"""
Scenario runner: loads scenarios from JSON, runs each through the agent graph,
and collects actual outputs for evaluation.

The runner does NOT score — it only collects. Evaluators score separately.
"""

import json
import sys
from datetime import datetime
from pathlib import Path

# Add project root so agent imports resolve
sys.path.insert(0, str(Path(__file__).parent.parent))
sys.path.insert(0, str(Path(__file__).parent.parent / "agent"))

from langchain_core.messages import HumanMessage, AIMessage
from graph import graph

SCENARIOS_PATH = Path(__file__).parent.parent / "data" / "scenarios" / "scenarios.json"


def load_scenarios() -> list[dict]:
    with open(SCENARIOS_PATH) as f:
        return json.load(f)


def build_initial_state(scenario: dict) -> dict:
    """Convert scenario conversation into initial AgentState."""
    messages = [
        HumanMessage(content=turn["content"])
        for turn in scenario["conversation"]
        if turn["role"] == "user"
    ]

    return {
        "messages": messages,
        "retrieved_docs": [],
        "tool_calls_made": [],
        "customer_email": scenario["customer_email"],
        "escalation_triggered": False,
        "escalation_priority": "",
        "escalation_reason": "",
    }


def get_final_response(messages: list) -> str:
    """Extract the last AI message content as the agent's final response."""
    for message in reversed(messages):
        if isinstance(message, AIMessage) and message.content:
            return message.content
    return ""


def run_scenario(scenario: dict) -> dict:
    """Run a single scenario through the agent and return actual output."""
    initial_state = build_initial_state(scenario)

    try:
        result = graph.invoke(initial_state)
        final_response = get_final_response(result["messages"])
        error = None
    except Exception as e:
        result = initial_state
        final_response = ""
        error = str(e)

    actual_tool_names = [c["tool"] for c in result.get("tool_calls_made", [])]

    return {
        "scenario_id": scenario["id"],
        "scenario_name": scenario["name"],
        "difficulty": scenario["difficulty"],
        "actual": {
            "tool_calls": actual_tool_names,
            "retrieved_docs": result.get("retrieved_docs", []),
            "escalated": result.get("escalation_triggered", False),
            "final_response": final_response,
        },
        "expected": scenario["expected"],
        "evaluation_dimensions": scenario["evaluation_dimensions"],
        "error": error,
        "ran_at": datetime.now().isoformat(),
    }


def run_all(scenarios: list[dict]) -> list[dict]:
    results = []
    for scenario in scenarios:
        print(f"Running {scenario['id']}: {scenario['name']}...")
        result = run_scenario(scenario)
        status = "ERROR" if result["error"] else "OK"
        print(f"  [{status}] tools={result['actual']['tool_calls']} docs={result['actual']['retrieved_docs']}")
        results.append(result)
    return results


if __name__ == "__main__":
    scenarios = load_scenarios()
    print(f"Loaded {len(scenarios)} scenarios\n")

    results = run_all(scenarios)

    output_path = Path(__file__).parent / "run_results.json"
    with open(output_path, "w") as f:
        json.dump(results, f, indent=2)

    print(f"\nResults saved to {output_path}")
    print(f"Scenarios run: {len(results)}")
    print(f"Errors: {sum(1 for r in results if r['error'])}")
