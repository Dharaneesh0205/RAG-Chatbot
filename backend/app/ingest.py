import os
import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

import chromadb
from langchain_text_splitters import RecursiveCharacterTextSplitter
from sentence_transformers import SentenceTransformer
from app.config import (
    CHROMA_DIR, DOCS_DIR, COLLECTION_NAME,
    CHUNK_SIZE, CHUNK_OVERLAP, EMBEDDING_MODEL
)
from app.utils import extract_text_from_pdf


def ingest_documents(docs_dir: str = DOCS_DIR):
    embedding_model = SentenceTransformer(EMBEDDING_MODEL)
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=CHUNK_SIZE, chunk_overlap=CHUNK_OVERLAP
    )

    client = chromadb.PersistentClient(path=CHROMA_DIR)
    try:
        client.delete_collection(COLLECTION_NAME)
    except Exception:
        pass
    collection = client.create_collection(COLLECTION_NAME)

    pdf_files = [f for f in os.listdir(docs_dir) if f.endswith(".pdf")]
    print(f"Found {len(pdf_files)} PDFs")

    all_texts, all_ids, all_metadatas = [], [], []
    chunk_index = 0

    for pdf_file in pdf_files:
        pdf_path = os.path.join(docs_dir, pdf_file)
        print(f"Processing: {pdf_file}")
        pages = extract_text_from_pdf(pdf_path)

        for page_data in pages:
            chunks = splitter.split_text(page_data["text"])
            for i, chunk in enumerate(chunks):
                all_texts.append(chunk)
                all_ids.append(f"{pdf_file}_p{page_data['page']}_c{chunk_index}")
                all_metadatas.append({
                    "source": pdf_file,
                    "page": page_data["page"],
                    "chunk_index": chunk_index
                })
                chunk_index += 1

    print(f"Total chunks: {len(all_texts)}")
    print("Generating embeddings...")
    embeddings = embedding_model.encode(all_texts, show_progress_bar=True).tolist()

    batch_size = 100
    for i in range(0, len(all_texts), batch_size):
        collection.add(
            documents=all_texts[i:i + batch_size],
            embeddings=embeddings[i:i + batch_size],
            ids=all_ids[i:i + batch_size],
            metadatas=all_metadatas[i:i + batch_size],
        )

    print("Ingestion complete!")

    # Test retrieval
    test_query = "What is the leave policy?"
    test_emb = embedding_model.encode([test_query]).tolist()
    results = collection.query(query_embeddings=test_emb, n_results=3)
    print(f"\nTest query: '{test_query}'")
    for doc, meta in zip(results["documents"][0], results["metadatas"][0]):
        print(f"  [{meta['source']} p.{meta['page']}] {doc[:80]}...")


if __name__ == "__main__":
    ingest_documents()
