import os
import pdfplumber
import chromadb
from langchain_text_splitters import RecursiveCharacterTextSplitter
from sentence_transformers import SentenceTransformer

DOCS_DIR = os.path.join(os.path.dirname(__file__), "..", "Documents")
CHROMA_DIR = os.path.join(os.path.dirname(__file__), "chroma_db")
COLLECTION_NAME = "sws_ai_docs"

embedding_model = SentenceTransformer("all-MiniLM-L6-v2")
splitter = RecursiveCharacterTextSplitter(chunk_size=500, chunk_overlap=50)


def extract_text(pdf_path: str) -> str:
    text = ""
    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            page_text = page.extract_text()
            if page_text:
                text += page_text + "\n"
    return text


def ingest():
    client = chromadb.PersistentClient(path=CHROMA_DIR)

    # Delete existing collection to allow re-ingestion
    try:
        client.delete_collection(COLLECTION_NAME)
    except Exception:
        pass

    collection = client.create_collection(COLLECTION_NAME)

    pdf_files = [f for f in os.listdir(DOCS_DIR) if f.endswith(".pdf")]
    print(f"Found {len(pdf_files)} PDFs")

    all_texts, all_ids, all_metadatas = [], [], []
    chunk_index = 0

    for pdf_file in pdf_files:
        pdf_path = os.path.join(DOCS_DIR, pdf_file)
        print(f"Processing: {pdf_file}")
        raw_text = extract_text(pdf_path)
        chunks = splitter.split_text(raw_text)

        for i, chunk in enumerate(chunks):
            all_texts.append(chunk)
            all_ids.append(f"{pdf_file}_chunk_{chunk_index}")
            all_metadatas.append({"source": pdf_file, "chunk_index": i})
            chunk_index += 1

    print(f"Total chunks: {len(all_texts)}")
    print("Generating embeddings...")
    embeddings = embedding_model.encode(all_texts, show_progress_bar=True).tolist()

    # Store in batches of 100
    batch_size = 100
    for i in range(0, len(all_texts), batch_size):
        collection.add(
            documents=all_texts[i:i+batch_size],
            embeddings=embeddings[i:i+batch_size],
            ids=all_ids[i:i+batch_size],
            metadatas=all_metadatas[i:i+batch_size],
        )

    print("Ingestion complete!")

    # Quick test query
    test_query = "What is the leave policy?"
    test_embedding = embedding_model.encode([test_query]).tolist()
    results = collection.query(query_embeddings=test_embedding, n_results=3)
    print(f"\nTest query: '{test_query}'")
    for doc, meta in zip(results["documents"][0], results["metadatas"][0]):
        print(f"  [{meta['source']}] {doc[:100]}...")


if __name__ == "__main__":
    ingest()
