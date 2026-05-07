import os
import chromadb
from sentence_transformers import SentenceTransformer

CHROMA_DIR = os.path.join(os.path.dirname(__file__), "chroma_db")
COLLECTION_NAME = "sws_ai_docs"

_embedding_model = None
_collection = None


def _get_resources():
    global _embedding_model, _collection
    if _embedding_model is None:
        _embedding_model = SentenceTransformer("all-MiniLM-L6-v2")
    if _collection is None:
        client = chromadb.PersistentClient(path=CHROMA_DIR)
        _collection = client.get_collection(COLLECTION_NAME)
    return _embedding_model, _collection


def retrieve(question: str, k: int = 5):
    model, collection = _get_resources()
    embedding = model.encode([question]).tolist()
    results = collection.query(query_embeddings=embedding, n_results=k)

    chunks = []
    for doc, meta in zip(results["documents"][0], results["metadatas"][0]):
        chunks.append({"text": doc, "source": meta["source"]})
    return chunks
