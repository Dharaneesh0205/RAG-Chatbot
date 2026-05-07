# RAG Chatbot — SWS AI Policy Assistant

A Retrieval-Augmented Generation (RAG) chatbot that lets employees ask natural language questions about SWS AI company policies and receive accurate, grounded answers sourced directly from 10 internal PDF documents.

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
| Embeddings | all-MiniLM-L6-v2 (HuggingFace) | Free, fast, strong retrieval quality |
| Vector DB | ChromaDB | Local, zero config, persists to disk |
| LLM | Gemini 1.5 Flash | Free tier, fast, accurate |
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

### Retrieval K Value
- `k=4` — balanced between enough context and avoiding prompt noise
- Returns top-4 most semantically similar chunks

### Prompt Design
- Strict grounding: LLM instructed to answer ONLY from provided context
- Fallback: "I don't have that information in the company documents."
- Context includes source filename and page number per chunk

---

## Project Structure

```
RAG-Chatbot/
├── backend/
│   ├── app/
│   │   ├── main.py          # FastAPI app + endpoints
│   │   ├── rag.py           # Retrieval + generation logic
│   │   ├── ingest.py        # PDF ingestion pipeline
│   │   ├── prompts.py       # LLM prompt template
│   │   ├── config.py        # All settings
│   │   └── utils.py         # PDF text extraction
│   ├── chroma_db/           # Persisted vector store
│   ├── uploaded_docs/       # User-uploaded PDFs
│   ├── requirements.txt
│   └── .env
├── frontend/
│   ├── index.html           # Chat UI
│   ├── style.css            # Styling (Livvic font, white/blue)
│   └── app.js               # Chat logic, upload, sources
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

### 4. Ingest documents

```bash
cd backend
python -m app.ingest
```

This will:
- Load all 10 PDFs from the `Documents/` folder
- Extract text using PyMuPDF
- Split into 500-char chunks with 50-char overlap
- Generate embeddings using all-MiniLM-L6-v2
- Store in ChromaDB at `backend/chroma_db/`

### 5. Run the backend

```bash
cd backend
python -m uvicorn app.main:app --reload --port 8000
```

API will be available at: http://localhost:8000
API docs at: http://localhost:8000/docs

### 6. Open the frontend

Open `frontend/index.html` directly in your browser.

---

## API Endpoints

### POST /api/chat
```json
Request:  { "question": "How many sick leaves do I get?" }
Response: { "answer": "...", "sources": ["SWS-AI-leave-policy.pdf"] }
```

### POST /api/upload
Upload new PDF files to ingest into the knowledge base.

### GET /api/documents
Returns list of all ingested documents.

### GET /health
Health check endpoint.

---

## Sample Queries

| Query | Expected Source |
|---|---|
| What is the annual leave policy? | leave-policy.pdf |
| How many sick leave days do employees get? | leave-policy.pdf |
| What is the notice period for resignation? | resignation-policy.pdf |
| What tools does SWS AI use for communication? | company-overview.pdf |
| What is the password policy? | it-security-policy.pdf |
| How are performance reviews conducted? | performance-review.pdf |
| What are the WFH guidelines? | wfh-policy.pdf |
| Does SWS AI offer health insurance? | benefits-compensation.pdf |

---

## Features

- RAG pipeline with semantic retrieval (no hallucination)
- Source document attribution per answer
- Upload new PDFs and ask questions instantly
- Typewriter animation for AI responses
- Dark/light mode toggle
- Copy answer button
- Suggested question chips
- Responsive mobile layout
- Collapsible sidebar with document list
