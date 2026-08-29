# Agent Reliability Lab

A LangGraph support agent for a fictional shop (ShopNova), served two ways from
one graph: a live reviewer console for talking to it, and an offline harness
for scoring it at scale.

## Architecture

```
                          Client (browser)
                                │  HTTPS
                                ▼
                 nginx  ── /api/*  →  backend
                        ── /*      →  frontend
                    ┌───────────┴───────────┐
                    ▼                       ▼
        Next.js — reviewer console   FastAPI backend
        frontend/app                 backend/api/main.py
        (chat UI, trace panel)       (SSE chat + REST)
                                            │
                                            │ graph.astream_events()
                                            ▼
                              LangGraph agent loop
                              backend/agent/graph.py
                              agent (gpt-5.4-mini) ⇄ tools
                                            │
                    ┌───────────┬───────────┼───────────┐
                    ▼           ▼           ▼           ▼
              order_tools  customer_tools  kb_tools  escalation_tools
                    └───────────┴───────────┴───────────┘
                                            │
                                            ▼
                          Postgres + pgvector
                          customers · orders · escalation_tickets
                          documents (MiniLM embeddings, cosine search)
                                            │
                                            ▼
                                  Infra — EC2 host
                                  Docker Compose:
                                   ✅ pgvector
                                   🔜 frontend  (migrating soon)
                                   🔜 backend   (migrating soon)
```

**Evaluation harness** (offline, not behind nginx): `scenarios.json` →
`runner.py` replays each scenario through the same agent graph above →
5 evaluators (`tool_selection`, `retrieval`, `escalation`,
`decision_correctness`, `response`) score the run → `evaluation_report.json`.
The console runs the identical scoring inline per turn and streams it back as
an `evaluation` SSE event.

Full interactive diagram: `frontend/app/architecture`.

## Stack

| Layer      | Tech |
|------------|------|
| Frontend   | Next.js 16, React 19, Tailwind |
| Backend    | FastAPI, SSE streaming |
| Agent      | LangGraph + LangChain, OpenAI (`gpt-5.4-mini`) |
| Embeddings | sentence-transformers (`all-MiniLM-L6-v2`) |
| Data       | Postgres + pgvector |
| Infra      | Docker Compose, nginx reverse proxy |

## Layout

```
backend/
  agent/          LangGraph graph, nodes, tools, prompts
  api/main.py     FastAPI app (chat SSE + REST)
  evaluation/     runner + evaluators
  knowledge_base/ ingestion + retriever
  data/           seed script, fixtures, scenarios
frontend/         Next.js app (console + architecture page)
docker/           docker-compose.yml (pgvector), nginx.conf
scripts/          EC2 pull/seed/stand-up script
```

## Run it locally

**1. Database**

```bash
docker compose -f docker/docker-compose.yml up -d
```

**2. Backend**

```bash
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

export OPENAI_API_KEY=...
export DATABASE_URL=postgresql://postgres:postgres@localhost:5433/shopsupport

python backend/data/seed_db.py          # schema + fixtures
python backend/knowledge_base/ingest.py # embed KB docs

uvicorn backend.api.main:app --reload --port 8000
```

**3. Frontend**

```bash
cd frontend
npm install
npm run dev
```

Console: `http://localhost:3000/console`

## Evaluation harness

```bash
python backend/evaluation/runner.py
```

Replays all scenarios in `backend/data/scenarios`, scores them, and writes
`backend/evaluation/evaluation_report.json`.

## Deployment

Currently only Postgres runs in Docker (`docker/docker-compose.yml`); the
frontend and backend run natively via `scripts/push_db.sh` + `uvicorn`/`next
start` on the EC2 host, fronted by nginx. Frontend and backend are next in
line to move into the same Compose stack.
