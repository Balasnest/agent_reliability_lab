"""
Metrics: loads run_results.json, runs all evaluators, produces a report.
"""

import json
from pathlib import Path

from evaluators import tool_selection, retrieval, escalation, response as response_eval
from evaluators import decision_correctness

EVALUATOR_MAP = {
    "tool_selection":       tool_selection.evaluate,
    "retrieval_accuracy":   retrieval.evaluate,
    "escalation_accuracy":  escalation.evaluate,
    "decision_correctness": decision_correctness.evaluate,
    "hallucination":        response_eval.evaluate,
}

RESULTS_PATH = Path(__file__).parent / "run_results.json"
SCENARIOS_PATH = Path(__file__).parent.parent / "data" / "scenarios" / "scenarios.json"


def _load_query_lookup() -> dict[str, str]:
    """Build {scenario_id: customer_query} from scenarios file."""
    with open(SCENARIOS_PATH) as f:
        scenarios = json.load(f)
    return {
        s["id"]: next(
            (t["content"] for t in s["conversation"] if t["role"] == "user"), ""
        )
        for s in scenarios
    }


def evaluate_result(result: dict, query_lookup: dict[str, str] | None = None) -> dict:
    """Run all applicable evaluators for a single scenario result."""
    # Backfill customer_query for results captured before runner carried it
    if "customer_query" not in result and query_lookup:
        result = {**result, "customer_query": query_lookup.get(result["scenario_id"], "")}

    dimensions = result.get("evaluation_dimensions", [])
    evaluations = []
    seen = set()

    for dimension in dimensions:
        evaluator = EVALUATOR_MAP.get(dimension)
        if not evaluator:
            continue
        key = evaluator.__module__
        if key in seen:
            continue
        seen.add(key)
        eval_result = evaluator(result)
        eval_result["dimension"] = dimension
        evaluations.append(eval_result)

    all_passed = all(e["passed"] for e in evaluations)
    avg_score = sum(e["score"] for e in evaluations) / len(evaluations) if evaluations else 0.0

    return {
        "scenario_id": result["scenario_id"],
        "scenario_name": result["scenario_name"],
        "difficulty": result["difficulty"],
        "overall_passed": all_passed,
        "overall_score": round(avg_score, 3),
        "evaluations": evaluations,
    }


def print_report(evaluated: list[dict]):
    total = len(evaluated)
    passed = sum(1 for r in evaluated if r["overall_passed"])

    print("=" * 60)
    print(f"EVALUATION REPORT — {passed}/{total} scenarios passed")
    print("=" * 60)

    for r in evaluated:
        status = "PASS" if r["overall_passed"] else "FAIL"
        print(f"\n[{status}] {r['scenario_id']}: {r['scenario_name']}")
        print(f"  Overall score: {r['overall_score']:.3f} | Difficulty: {r['difficulty']}")
        for ev in r["evaluations"]:
            icon = "✓" if ev["passed"] else "✗"
            print(f"  {icon} {ev['dimension']}: {ev['score']:.3f} — {ev['reason']}")

    # Dimension-level summary
    print("\n" + "=" * 60)
    print("DIMENSION SUMMARY")
    print("=" * 60)
    dim_scores: dict[str, list[float]] = {}
    for r in evaluated:
        for ev in r["evaluations"]:
            dim_scores.setdefault(ev["dimension"], []).append(ev["score"])

    for dim, scores in sorted(dim_scores.items()):
        avg = sum(scores) / len(scores)
        print(f"  {dim:<25} {avg:.3f}  ({len(scores)} scenarios)")


if __name__ == "__main__":
    with open(RESULTS_PATH) as f:
        results = json.load(f)

    query_lookup = _load_query_lookup()
    evaluated = [evaluate_result(r, query_lookup) for r in results]

    output_path = Path(__file__).parent / "evaluation_report.json"
    with open(output_path, "w") as f:
        json.dump(evaluated, f, indent=2)

    print_report(evaluated)
    print(f"\nFull report saved to {output_path}")
