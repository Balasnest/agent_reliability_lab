import sys
from pathlib import Path
from langchain_core.tools import tool

# Add project root to path so knowledge_base package is importable
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from knowledge_base.retriever import retrieve


@tool
def search_knowledge_base(query: str) -> list[dict]:
    """Search ShopNova's knowledge base for policies on returns, refunds, shipping,
    warranties, loyalty benefits, and account issues. Call this before answering
    any policy question.
    """
    return retrieve(query)
