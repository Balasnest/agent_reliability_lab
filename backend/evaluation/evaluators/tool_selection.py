"""
Evaluator: tool_selection

Checks whether the agent called the expected tools.
Uses subset semantics — expected tools must all appear in actual tools.
Order is not checked (the agent may call tools in a different sequence).
"""


def evaluate(result: dict) -> dict:
    expected = set(result["expected"].get("tool_calls", []))
    actual = set(result["actual"]["tool_calls"])

    missing = expected - actual
    passed = len(missing) == 0

    if passed:
        reason = f"All expected tools called: {sorted(expected)}"
    else:
        reason = f"Missing tools: {sorted(missing)}"

    # Partial credit: ratio of expected tools that were called
    score = len(expected - missing) / len(expected) if expected else 1.0

    return {
        "dimension": "tool_selection",
        "passed": passed,
        "score": round(score, 3),
        "expected": sorted(expected),
        "actual": sorted(actual),
        "reason": reason,
    }
