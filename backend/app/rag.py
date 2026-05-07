import chromadb
from sentence_transformers import SentenceTransformer
from google import genai
from app.config import (
    CHROMA_DIR, COLLECTION_NAME, EMBEDDING_MODEL,
    RETRIEVAL_K, GEMINI_API_KEY, GEMINI_MODEL
)
from app.prompts import SYSTEM_PROMPT

_embedding_model = None
_collection = None
_gemini_client = None


def _get_embedding_model():
    global _embedding_model
    if _embedding_model is None:
        _embedding_model = SentenceTransformer(EMBEDDING_MODEL)
    return _embedding_model


def _get_collection():
    global _collection
    if _collection is None:
        client = chromadb.PersistentClient(path=CHROMA_DIR)
        _collection = client.get_collection(COLLECTION_NAME)
    return _collection


def _get_gemini():
    global _gemini_client
    if _gemini_client is None:
        _gemini_client = genai.Client(api_key=GEMINI_API_KEY)
    return _gemini_client


def retrieve(question: str, k: int = RETRIEVAL_K, doc_filter: str = None) -> list[dict]:
    model = _get_embedding_model()
    collection = _get_collection()
    embedding = model.encode([question]).tolist()

    # If doc_filter provided, only retrieve from that document
    where = {"source": {"$eq": doc_filter}} if doc_filter else None
    results = collection.query(
        query_embeddings=embedding,
        n_results=k,
        where=where
    )
    chunks = []
    for doc, meta in zip(results["documents"][0], results["metadatas"][0]):
        chunks.append({
            "text": doc,
            "source": meta["source"],
            "page": meta.get("page", 1)
        })
    return chunks


FALLBACK_MODELS = [
    "gemini-2.5-flash",
    "gemini-2.0-flash",
    "gemini-2.0-flash-lite",
    "gemini-flash-latest",
]

def generate_answer(question: str, doc_filter: str = None) -> dict:
    chunks = retrieve(question, doc_filter=doc_filter)
    context = "\n\n".join(
        [f"[{c['source']} — Page {c['page']}]\n{c['text']}" for c in chunks]
    )
    sources = list(dict.fromkeys(c["source"] for c in chunks))
    prompt = SYSTEM_PROMPT.format(context=context, question=question)

    client = _get_gemini()
    last_error = None
    for model in FALLBACK_MODELS:
        try:
            response = client.models.generate_content(model=model, contents=prompt)
            return {"answer": response.text, "sources": sources}
        except Exception as e:
            last_error = e
            continue
    return {"answer": f"All models are currently unavailable. Please try again in a moment. ({str(last_error)[:100]})", "sources": []}


def ingest_single_file(pdf_path: str, filename: str) -> int:
    import os
    from langchain_text_splitters import RecursiveCharacterTextSplitter
    from app.config import CHUNK_SIZE, CHUNK_OVERLAP
    from app.utils import extract_text_from_pdf

    model = _get_embedding_model()
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=CHUNK_SIZE, chunk_overlap=CHUNK_OVERLAP
    )

    client = chromadb.PersistentClient(path=CHROMA_DIR)
    try:
        collection = client.get_collection(COLLECTION_NAME)
    except Exception:
        collection = client.create_collection(COLLECTION_NAME)

    # Remove old chunks for this file
    try:
        existing = collection.get(where={"source": filename})
        if existing["ids"]:
            collection.delete(ids=existing["ids"])
    except Exception:
        pass

    pages = extract_text_from_pdf(pdf_path)
    texts, ids, metadatas = [], [], []
    chunk_index = 0

    for page_data in pages:
        chunks = splitter.split_text(page_data["text"])
        for chunk in chunks:
            texts.append(chunk)
            ids.append(f"{filename}_p{page_data['page']}_c{chunk_index}")
            metadatas.append({
                "source": filename,
                "page": page_data["page"],
                "chunk_index": chunk_index
            })
            chunk_index += 1

    if not texts:
        return 0

    embeddings = model.encode(texts).tolist()
    collection.add(documents=texts, embeddings=embeddings, ids=ids, metadatas=metadatas)

    # Reset cached collection so it reloads
    global _collection
    _collection = None

    return len(texts)


def list_documents() -> list[str]:
    try:
        collection = _get_collection()
        results = collection.get()
        return list(dict.fromkeys(m["source"] for m in results["metadatas"]))
    except Exception:
        return []
