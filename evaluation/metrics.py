"""
Metrics: loads run_results.json, runs all evaluators, produces a report.
"""

import json
from pathlib import Path

from evaluators import tool_selection, retrieval, escalation, response as response_eval

EVALUATOR_MAP = {
    "tool_selection":    tool_selection.evaluate,
    "retrieval_accuracy": retrieval.evaluate,
    "escalation_accuracy": escalation.evaluate,
    "decision_correctness": response_eval.evaluate,
    "hallucination":     response_eval.evaluate,
}

RESULTS_PATH = Path(__file__).parent / "run_results.json"


def evaluate_result(result: dict) -> dict:
    """Run all applicable evaluators for a single scenario result."""
    dimensions = result.get("evaluation_dimensions", [])
    evaluations = []
    seen = set()

    for dimension in dimensions:
        evaluator = EVALUATOR_MAP.get(dimension)
        if not evaluator:
            continue
        # response_eval covers both decision_correctness and hallucination — run once
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

    evaluated = [evaluate_result(r) for r in results]

    output_path = Path(__file__).parent / "evaluation_report.json"
    with open(output_path, "w") as f:
        json.dump(evaluated, f, indent=2)

    print_report(evaluated)
    print(f"\nFull report saved to {output_path}")
