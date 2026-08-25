"""
Evaluator: escalation_accuracy

Checks two things:
1. Whether the agent escalated when it should (or didn't when it shouldn't)
2. Whether the escalation priority was correct (if escalation was expected)
"""


def evaluate(result: dict) -> dict:
    expected_escalate = result["expected"].get("should_escalate", False)
    expected_priority = result["expected"].get("escalation_priority", "")
    actual_escalate = result["actual"].get("escalated", False)
    actual_priority = result["actual"].get("escalation_triggered_priority", "")

    # Check 1: did escalation happen when it should?
    escalation_correct = expected_escalate == actual_escalate

    if not escalation_correct:
        if expected_escalate and not actual_escalate:
            reason = "FAIL: Agent should have escalated but did not"
        else:
            reason = "FAIL: Agent escalated when it should not have"
        return {
            "dimension": "escalation_accuracy",
            "passed": False,
            "score": 0.0,
            "expected_escalate": expected_escalate,
            "actual_escalate": actual_escalate,
            "reason": reason,
        }

    # Check 2: if escalation was expected, was the priority correct?
    if expected_escalate and expected_priority:
        priority_correct = expected_priority == actual_priority
        score = 1.0 if priority_correct else 0.7  # escalated but wrong priority
        reason = (
            f"Escalated with correct priority: {actual_priority}"
            if priority_correct
            else f"Escalated but wrong priority — expected: {expected_priority}, got: {actual_priority}"
        )
    else:
        score = 1.0
        reason = "No escalation expected and none triggered" if not expected_escalate else "Escalated correctly"

    return {
        "dimension": "escalation_accuracy",
        "passed": score >= 0.7,
        "score": score,
        "expected_escalate": expected_escalate,
        "actual_escalate": actual_escalate,
        "reason": reason,
    }
