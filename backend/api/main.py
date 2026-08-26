from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI(title="ShopNova Support API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

DUMMY_CUSTOMERS = [
    {"id": "CUST-001", "name": "Maria Chen", "email": "maria.chen@email.com", "loyalty_tier": "standard"},
    {"id": "CUST-003", "name": "Priya Sharma", "email": "priya.sharma@email.com", "loyalty_tier": "silver"},
    {"id": "CUST-005", "name": "David Kim", "email": "david.kim@email.com", "loyalty_tier": "gold"},
]

DUMMY_SCENARIOS = [
    {"id": "S001", "name": "Return policy question", "difficulty": "easy"},
    {"id": "S006", "name": "Electronics return, in window", "difficulty": "medium"},
    {"id": "S007", "name": "Return outside window", "difficulty": "medium"},
    {"id": "S012", "name": "High-value escalation", "difficulty": "medium"},
    {"id": "S013", "name": "Price match (no KB match)", "difficulty": "hard"},
]

DUMMY_KB_DOCUMENTS = [
    {"id": "POL-001", "title": "Standard Return Policy", "category": "Returns", "blurb": "30 days from delivery, most items"},
    {"id": "POL-002", "title": "Electronics Return Window", "category": "Returns", "blurb": "15 days — TVs, laptops, phones"},
    {"id": "POL-003", "title": "Marketplace Seller Returns", "category": "Returns", "blurb": "Third-party terms differ"},
    {"id": "POL-004", "title": "Damaged & Defective Items", "category": "Returns", "blurb": "Arrived broken or DOA"},
    {"id": "SHP-001", "title": "Standard Shipping", "category": "Shipping", "blurb": "3-5 business days; free at Gold+"},
    {"id": "SHP-002", "title": "Expedited Shipping", "category": "Shipping", "blurb": "Two-day and overnight options"},
    {"id": "SHP-003", "title": "Lost, Delayed & Damaged Shipments", "category": "Shipping", "blurb": "Carrier issue resolution"},
    {"id": "BIL-001", "title": "Refund Processing Timeline", "category": "Billing", "blurb": "How long refunds take to post"},
    {"id": "BIL-002", "title": "Billing Disputes & Chargebacks", "category": "Billing", "blurb": "Before contacting the bank"},
    {"id": "LOY-001", "title": "ShopNova Rewards Tiers", "category": "Loyalty", "blurb": "Standard, Silver, Gold benefits"},
    {"id": "ESC-001", "title": "Escalation Criteria", "category": "Escalation", "blurb": "When to open a supervisor ticket"},
    {"id": "ACC-001", "title": "Account Security", "category": "Account", "blurb": "Password & account protection"},
    {"id": "WAR-001", "title": "Manufacturer Warranty", "category": "Warranty", "blurb": "Coverage beyond return window"},
]


class ChatRequest(BaseModel):
    session_id: str
    customer_email: str
    message: str


class ChatResponse(BaseModel):
    reply: str


@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.get("/api/customers")
def list_customers():
    return DUMMY_CUSTOMERS


@app.get("/api/scenarios")
def list_scenarios():
    return DUMMY_SCENARIOS


@app.get("/api/kb/documents")
def list_kb_documents():
    return DUMMY_KB_DOCUMENTS


@app.post("/api/chat")
def chat(req: ChatRequest) -> ChatResponse:
    return ChatResponse(
        reply=f"(dummy reply) Got your message — the real agent isn't wired up yet, {req.customer_email}."
    )
