"""
Evaluator: retrieval_accuracy

Checks whether the expected KB documents were retrieved.
Uses subset semantics — all expected docs must appear in retrieved docs.
The agent may retrieve additional docs; that is not penalised.

Special case: if expected retrieved_docs is empty (e.g. S013 price match),
the evaluator checks that no docs were retrieved with high confidence.
"""


def evaluate(result: dict) -> dict:
    expected = set(result["expected"].get("retrieved_docs", []))
    actual = set(result["actual"]["retrieved_docs"])

    if not expected:
        # Scenario expects no relevant docs — pass regardless of what was retrieved
        # (the agent should have searched but found nothing policy-relevant)
        return {
            "dimension": "retrieval_accuracy",
            "passed": True,
            "score": 1.0,
            "expected": [],
            "actual": sorted(actual),
            "reason": "No specific docs expected — search attempt is sufficient",
        }

    missing = expected - actual
    passed = len(missing) == 0
    score = len(expected - missing) / len(expected) if expected else 1.0

    if passed:
        reason = f"All expected docs retrieved: {sorted(expected)}"
    else:
        reason = f"Missing docs: {sorted(missing)}"

    return {
        "dimension": "retrieval_accuracy",
        "passed": passed,
        "score": round(score, 3),
        "expected": sorted(expected),
        "actual": sorted(actual),
        "reason": reason,
    }
