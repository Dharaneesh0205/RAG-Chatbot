# RAG Chatbot — SWS AI 

A Retrieval-Augmented Generation (RAG) chatbot that lets employees ask natural language questions about SWS AI company policies and receive accurate, grounded answers sourced directly from internal PDF documents — no hallucination.

---

## Architecture

```
PDFs → Text Extraction (PyMuPDF) → Chunking → Embeddings → ChromaDB
                                                                ↓
User Question → Embed Question → Top-K Retrieval → Gemini LLM → Answer + Sources
```

---

## Tech Stack

| Component | Choice | Why |
|---|---|---|
| Backend | FastAPI | Fast, async, auto docs at /docs |
| PDF Parsing | PyMuPDF (fitz) | Faster than pdfplumber, better formatting |
| Text Splitting | RecursiveCharacterTextSplitter | Preserves semantic meaning with overlap |
| Embeddings | all-MiniLM-L6-v2 (HuggingFace) | Free, runs locally, strong retrieval quality |
| Vector DB | ChromaDB | Local, zero config, persists to disk |
| LLM | Gemini 2.5 Flash (with fallback) | Free tier, fast, accurate |
| Frontend | Plain HTML/CSS/JS | No build step, instant demo |

---

## Architecture Decisions

### Chunking Strategy
- `chunk_size=500`, `chunk_overlap=50`
- Small enough for precise retrieval, large enough to preserve meaning
- Overlap prevents context loss at chunk boundaries
- `RecursiveCharacterTextSplitter` splits on paragraphs first, then sentences

### Embedding Model
- `all-MiniLM-L6-v2` from sentence-transformers
- Free, no API key needed, runs locally
- 384-dimensional vectors, excellent semantic similarity

### Vector Database — ChromaDB
- Local persistent storage, no server required
- Simple Python API, perfect for prototypes
- Stores text + embeddings + metadata (source, page, chunk_index)
- Supports `where` filter for per-chat document scoping

### Retrieval K Value
- `k=4` — balanced between enough context and avoiding prompt noise
- Returns top-4 most semantically similar chunks

### Prompt Design
- Strict grounding: LLM instructed to answer ONLY from provided context
- Fallback: "I don't have that information in the company documents."
- Context includes source filename and page number per chunk

### LLM Fallback Strategy
- Tries models in order: `gemini-2.5-flash` → `gemini-2.0-flash` → `gemini-2.0-flash-lite` → `gemini-flash-latest`
- Handles 503 overload and 429 quota errors gracefully

---

## Project Structure

```
RAG-Chatbot/
├── backend/
│   ├── app/
│   │   ├── main.py          # FastAPI app + all endpoints
│   │   ├── rag.py           # Retrieval + generation logic
│   │   ├── ingest.py        # PDF ingestion pipeline
│   │   ├── prompts.py       # LLM prompt template
│   │   ├── config.py        # All settings
│   │   └── utils.py         # PDF text extraction (PyMuPDF)
│   ├── chroma_db/           # Persisted vector store (auto-created)
│   ├── uploaded_docs/       # User-uploaded PDFs (auto-created)
│   ├── requirements.txt
│   └── .env                 # API keys (never committed)
├── frontend/
│   ├── index.html           # Chat UI
│   ├── style.css            # Styling (Livvic font, white/blue, dark mode)
│   └── app.js               # Chat logic, multi-session, upload, sources
├── Documents/               # 10 company PDFs
├── .gitignore
└── README.md
```

---

## Setup Instructions

### 1. Clone the repository

```bash
git clone https://github.com/Dharaneesh0205/RAG-Chatbot.git
cd RAG-Chatbot
```

### 2. Install dependencies

```bash
cd backend
pip install -r requirements.txt
```

### 3. Set environment variables

Create `backend/.env`:

```env
GEMINI_API_KEY=your_gemini_api_key_here
```

Get a free Gemini API key at: https://aistudio.google.com/app/apikey

> Important: Create the key in a **new Google Cloud project** to get free tier quota.

### 4. Ingest documents

```bash
cd backend
python -m app.ingest
```

This will:
- Load all 10 PDFs from the `Documents/` folder
- Extract text page-by-page using PyMuPDF
- Split into 500-char chunks with 50-char overlap
- Generate embeddings using all-MiniLM-L6-v2
- Store in ChromaDB at `backend/chroma_db/`

### 5. Run the backend

```bash
cd backend
python -m uvicorn app.main:app --reload --port 8000
```

API available at: http://localhost:8000  
API docs at: http://localhost:8000/docs

### 6. Open the frontend

Open `frontend/index.html` directly in your browser — no server needed.

---

## API Endpoints

### POST /api/chat
```json
Request:  { "question": "How many sick leaves do I get?", "doc_filter": "SWS-AI-leave-policy.pdf" }
Response: { "answer": "...", "sources": ["SWS-AI-leave-policy.pdf"] }
```
- `doc_filter` is optional — if provided, retrieval is scoped to that document only

### POST /api/upload
- Accepts multipart PDF file upload
- Ingests into ChromaDB immediately
- Returns chunk count per file

### GET /api/documents
- Returns list of all ingested document filenames

### GET /api/suggest
- Returns dynamic title, subtitle, and suggested questions based on ingested docs

### GET /health
- Health check

---

## Features

- Multi-session chat — each chat tab is independent with its own history
- Per-chat document scoping — doc-specific chats only retrieve from that document
- Chat history persisted in localStorage — survives page refresh
- Upload PDFs directly from the input bar — ingested instantly
- Suggestions update dynamically based on uploaded document
- Source document attribution per answer with page numbers
- Typewriter animation for AI responses
- Dark/light mode toggle
- Copy answer button
- Responsive mobile layout
- Automatic LLM fallback across multiple Gemini models

---

## Sample Queries

| Query | Expected Source |
|---|---|
| What is the annual leave policy? | SWS-AI-leave-policy.pdf |
| How many sick leave days do employees get? | SWS-AI-leave-policy.pdf |
| What is the notice period for resignation? | SWS-AI-resignation-policy.pdf |
| What tools does SWS AI use for communication? | SWS-AI-company-overview.pdf |
| What is the password policy? | SWS-AI-it-security-policy.pdf |
| How are performance reviews conducted? | SWS-AI-performance-review.pdf |
| What are the WFH guidelines? | SWS-AI-wfh-policy.pdf |
| Does SWS AI offer health insurance? | SWS-AI-benefits-compensation.pdf |
