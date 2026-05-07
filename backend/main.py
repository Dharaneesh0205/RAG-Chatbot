import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
from google import genai
from retriever import retrieve

load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

SYSTEM_PROMPT = """You are a helpful HR assistant for SWS AI. Answer the employee's question using ONLY the context provided below from company policy documents.

Rules:
- Answer clearly and concisely based strictly on the context.
- If the answer is not found in the context, respond exactly: "I don't have that information in the company documents."
- Do not make up or infer information not present in the context.
- When relevant, mention specific policy details like numbers, days, or procedures.

Context:
{context}"""


class ChatRequest(BaseModel):
    question: str


@app.post("/api/chat")
async def chat(req: ChatRequest):
    chunks = retrieve(req.question, k=5)
    context = "\n\n".join([f"[{c['source']}]\n{c['text']}" for c in chunks])
    sources = list(dict.fromkeys(c["source"] for c in chunks))

    prompt = SYSTEM_PROMPT.format(context=context) + f"\n\nEmployee question: {req.question}"

    response = client.models.generate_content(
        model="gemini-2.0-flash",
        contents=prompt,
    )

    return {
        "answer": response.text,
        "sources": sources,
    }


@app.get("/health")
def health():
    return {"status": "ok"}
