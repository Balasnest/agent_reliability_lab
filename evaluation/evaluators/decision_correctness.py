"""
Evaluator: decision_correctness (LLM judge)

Calls an LLM to evaluate whether the agent's final response reflects the
correct decision — semantically, not by phrase matching.
"""

import json
import os

from dotenv import load_dotenv
from openai import OpenAI

load_dotenv(override=True)

_client = None


def _get_client() -> OpenAI:
    global _client
    if _client is None:
        _client = OpenAI(api_key=os.environ["OPENAI_API_KEY"])
    return _client


SYSTEM_PROMPT = """\
You are evaluating a customer-service AI agent for ShopNova (an e-commerce store).

Your task: decide whether the agent's response reflects the CORRECT DECISION for the customer's situation.

Evaluate MEANING, not exact wording. The agent passes if the decision and key information are right,
even if phrased differently than expected.

Respond with valid JSON only:
{
  "passed": true or false,
  "score": 0.0 to 1.0,
  "reason": "one concise sentence"
}

Score guide:
  1.0  — Correct decision, accurate information
  0.7  — Mostly correct; minor gaps or unnecessary hedging
  0.5  — Partially correct; right direction but meaningful confusion
  0.0  — Wrong decision or hallucinated policy
"""

USER_TEMPLATE = """\
SCENARIO: {scenario_name}

CUSTOMER QUERY:
{customer_query}

CORRECT BEHAVIOR:
- Escalate to human agent: {should_escalate}
- Key concepts the response must address (semantic — not exact phrases): {must_contain_hints}
- Claims the response must NOT make (these would be factually wrong or hallucinated): {must_not_contain_hints}

AGENT RESPONSE:
{agent_response}

Evaluate: did the agent make the correct decision and convey accurate information?"""


def evaluate(result: dict) -> dict:
    scenario_name = result.get("scenario_name", "")
    customer_query = result.get("customer_query", "(customer query not recorded)")
    agent_response = result["actual"]["final_response"]
    expected = result["expected"]

    should_escalate = expected.get("should_escalate", False)
    must_contain = expected.get("response_must_contain", [])
    must_not_contain = expected.get("response_must_not_contain", [])

    prompt = USER_TEMPLATE.format(
        scenario_name=scenario_name,
        customer_query=customer_query,
        should_escalate=should_escalate,
        must_contain_hints=", ".join(must_contain) if must_contain else "none specified",
        must_not_contain_hints=", ".join(must_not_contain) if must_not_contain else "none specified",
        agent_response=agent_response,
    )

    try:
        response = _get_client().chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": prompt},
            ],
            temperature=0,
            response_format={"type": "json_object"},
        )
        verdict = json.loads(response.choices[0].message.content)
        return {
            "dimension": "decision_correctness",
            "passed": bool(verdict["passed"]),
            "score": round(float(verdict["score"]), 3),
            "reason": verdict.get("reason", ""),
            "judge": "gpt-4o-mini",
        }
    except Exception as e:
        return {
            "dimension": "decision_correctness",
            "passed": False,
            "score": 0.0,
            "reason": f"Judge error: {e}",
            "judge": "gpt-4o-mini",
        }
