"""
Evaluator: response (covers decision_correctness + hallucination)

Two checks on the agent's final response text:
- must_contain: key phrases that must appear (proves correct decision)
- must_not_contain: phrases that must NOT appear (catches hallucination / wrong decision)

Both checks are case-insensitive.
"""


def evaluate(result: dict) -> dict:
    response = result["actual"]["final_response"].lower()
    must_contain = result["expected"].get("response_must_contain", [])
    must_not_contain = result["expected"].get("response_must_not_contain", [])

    missing = [phrase for phrase in must_contain if phrase.lower() not in response]
    present = [phrase for phrase in must_not_contain if phrase.lower() in response]

    contain_passed = len(missing) == 0
    not_contain_passed = len(present) == 0
    passed = contain_passed and not_contain_passed

    reasons = []
    if missing:
        reasons.append(f"Missing expected phrases: {missing}")
    if present:
        reasons.append(f"Found forbidden phrases: {present}")
    if passed:
        reasons.append("All response checks passed")

    # Score: penalise each failure proportionally
    total_checks = len(must_contain) + len(must_not_contain)
    failed_checks = len(missing) + len(present)
    score = 1.0 - (failed_checks / total_checks) if total_checks > 0 else 1.0

    return {
        "dimension": "response",
        "passed": passed,
        "score": round(score, 3),
        "missing_phrases": missing,
        "forbidden_phrases_found": present,
        "reason": " | ".join(reasons),
    }
