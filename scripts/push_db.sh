#!/usr/bin/env bash
# Pull latest code, bring up Postgres, and (re)seed it — run this on the EC2 instance.
set -euo pipefail

cd "$(dirname "$0")/.."

echo "== repo state before pull =="
git status --short
git log --oneline -1

echo
echo "== pulling latest main =="
git pull origin main

echo
echo "== confirming seed files exist =="
ls backend/data/seed_db.py backend/data/fixtures/ backend/data/scenarios/ backend/knowledge_base/documents/ >/dev/null

echo
echo "== starting Postgres (pgvector) =="
docker compose -f docker/docker-compose.yml up -d
sleep 3

if [ -z "${DATABASE_URL:-}" ]; then
  echo "ERROR: DATABASE_URL is not set in the environment." >&2
  echo "Export it before running this script, e.g.:" >&2
  echo "  export DATABASE_URL=postgresql://postgres:postgres@localhost:5433/shopsupport" >&2
  exit 1
fi

echo
echo "== activating venv =="
source .venv/bin/activate

echo
echo "== seeding schema + fixture data =="
python backend/data/seed_db.py

echo
echo "== ingesting KB docs into pgvector =="
python backend/knowledge_base/ingest.py

echo
echo "Done."
