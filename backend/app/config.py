import os
from dotenv import load_dotenv

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
GEMINI_MODEL = "gemini-2.5-flash"

CHROMA_DIR = os.path.join(os.path.dirname(__file__), "..", "chroma_db")
DOCS_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "Documents")
UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "..", "uploaded_docs")
COLLECTION_NAME = "sws_ai_docs"

CHUNK_SIZE = 500
CHUNK_OVERLAP = 50
RETRIEVAL_K = 4
EMBEDDING_MODEL = "all-MiniLM-L6-v2"
