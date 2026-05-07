import os
import shutil
from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from app.config import UPLOAD_DIR
from app.rag import generate_answer, ingest_single_file, list_documents

os.makedirs(UPLOAD_DIR, exist_ok=True)

app = FastAPI(title="RAG Chatbot API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static suggestions per document type
DOC_SUGGESTIONS = {
    "leave-policy": [
        {"icon": "🌴", "label": "Annual leave policy", "q": "What is the annual leave policy at SWS AI?"},
        {"icon": "🤒", "label": "Sick leave days", "q": "How many days of sick leave do employees get?"},
        {"icon": "🏖️", "label": "Casual leave", "q": "How many casual leaves are employees entitled to?"},
    ],
    "hr-policy": [
        {"icon": "👥", "label": "HR guidelines", "q": "What are the HR policies at SWS AI?"},
        {"icon": "📝", "label": "Employee conduct", "q": "What are the employee conduct guidelines?"},
    ],
    "resignation-policy": [
        {"icon": "📋", "label": "Notice period", "q": "What is the notice period for resignation?"},
        {"icon": "🚪", "label": "Exit process", "q": "What is the exit process at SWS AI?"},
    ],
    "it-security-policy": [
        {"icon": "🔒", "label": "Password policy", "q": "What is the password policy for company systems?"},
        {"icon": "💻", "label": "Device usage", "q": "What are the rules for using company devices?"},
    ],
    "wfh-policy": [
        {"icon": "🏠", "label": "WFH guidelines", "q": "What are the WFH guidelines?"},
        {"icon": "📅", "label": "WFH days allowed", "q": "How many days can employees work from home?"},
    ],
    "performance-review": [
        {"icon": "📈", "label": "Performance reviews", "q": "How are performance reviews conducted?"},
        {"icon": "🎯", "label": "Review frequency", "q": "How often are performance reviews held?"},
    ],
    "benefits-compensation": [
        {"icon": "💊", "label": "Health insurance", "q": "Does SWS AI offer health insurance?"},
        {"icon": "💰", "label": "Salary structure", "q": "What is the compensation structure at SWS AI?"},
    ],
    "company-overview": [
        {"icon": "🏢", "label": "Company mission", "q": "What is the mission of SWS AI?"},
        {"icon": "💬", "label": "Communication tools", "q": "What tools does SWS AI use for communication?"},
    ],
    "code-of-conduct": [
        {"icon": "⚖️", "label": "Code of conduct", "q": "What is the code of conduct at SWS AI?"},
        {"icon": "🤝", "label": "Workplace ethics", "q": "What are the workplace ethics guidelines?"},
    ],
    "onboarding-guide": [
        {"icon": "🚀", "label": "Onboarding steps", "q": "What are the onboarding steps for new employees?"},
        {"icon": "📚", "label": "First week guide", "q": "What should a new employee do in their first week?"},
    ],
}

DEFAULT_SUGGESTIONS = [
    {"icon": "🌴", "label": "Annual leave policy", "q": "What is the annual leave policy at SWS AI?"},
    {"icon": "🤒", "label": "Sick leave days", "q": "How many days of sick leave do employees get?"},
    {"icon": "📋", "label": "Notice period", "q": "What is the notice period for resignation?"},
    {"icon": "🔒", "label": "Password policy", "q": "What is the password policy for company systems?"},
    {"icon": "🏠", "label": "WFH guidelines", "q": "What are the WFH guidelines?"},
    {"icon": "📈", "label": "Performance reviews", "q": "How are performance reviews conducted?"},
    {"icon": "💊", "label": "Health insurance", "q": "Does SWS AI offer health insurance?"},
    {"icon": "💬", "label": "Communication tools", "q": "What tools does SWS AI use for communication?"},
]


class ChatRequest(BaseModel):
    question: str


@app.post("/api/chat")
async def chat(req: ChatRequest):
    return generate_answer(req.question)


@app.post("/api/upload")
async def upload(files: list[UploadFile] = File(...)):
    results = []
    for file in files:
        if not file.filename.endswith(".pdf"):
            results.append({"filename": file.filename, "status": "error", "message": "Only PDFs allowed"})
            continue
        save_path = os.path.join(UPLOAD_DIR, file.filename)
        with open(save_path, "wb") as f:
            shutil.copyfileobj(file.file, f)
        chunks = ingest_single_file(save_path, file.filename)
        results.append({"filename": file.filename, "status": "success", "chunks": chunks})
    return {"uploaded": results}


@app.get("/api/documents")
def documents():
    return {"documents": list_documents()}


@app.get("/api/suggest")
def suggest():
    docs = list_documents()
    if not docs:
        return {"title": "RAG Chatbot", "subtitle": "Upload documents to get started", "suggestions": DEFAULT_SUGGESTIONS}

    # Build suggestions from ingested docs
    suggestions = []
    seen_keys = set()
    for doc in docs:
        key = doc.replace("SWS-AI-", "").replace(".pdf", "")
        if key in DOC_SUGGESTIONS and key not in seen_keys:
            suggestions.extend(DOC_SUGGESTIONS[key][:2])
            seen_keys.add(key)
        if len(suggestions) >= 8:
            break

    if not suggestions:
        suggestions = DEFAULT_SUGGESTIONS

    # Build title based on doc count
    doc_count = len(docs)
    if doc_count == 1:
        name = docs[0].replace("SWS-AI-", "").replace(".pdf", "").replace("-", " ").title()
        title = f"{name} Assistant"
        subtitle = f"Ask me anything about {name}"
    else:
        title = "SWS AI Policy Assistant"
        subtitle = f"Ask anything across {doc_count} company policy documents"

    return {"title": title, "subtitle": subtitle, "suggestions": suggestions[:8]}


@app.get("/health")
def health():
    return {"status": "ok"}
