import os
import chromadb
from sentence_transformers import SentenceTransformer

# Resolve path for local ChromaDB storage
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, "chroma_db")

_embedding_model = None

def get_embedding_model():
    """
    Lazy load and return the SentenceTransformer model to avoid multiple loads.
    """
    global _embedding_model
    if _embedding_model is None:
        # Load local lightweight sentence transformer
        _embedding_model = SentenceTransformer("all-MiniLM-L6-v2")
    return _embedding_model

def get_chroma_client():
    """
    Return the persistent ChromaDB client.
    """
    return chromadb.PersistentClient(path=DB_PATH)

def get_collection():
    """
    Return the default ChromaDB collection for IndustrialMind.
    """
    client = get_chroma_client()
    # Create or retrieve the collection
    return client.get_or_create_collection(name="industrialmind_kb")

def embed_text(texts: list[str]) -> list[list[float]]:
    """
    Encode a list of text strings into vector embeddings.
    """
    model = get_embedding_model()
    embeddings = model.encode(texts)
    return embeddings.tolist()
