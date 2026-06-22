import os
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn
from dotenv import load_dotenv

# Load env variables first
load_dotenv()

import embeddings
import ingest
import rag

app = FastAPI(
    title="IndustrialMind AI Engine",
    description="FastAPI Backend for RAG-powered industrial documents search & knowledge graph mapping",
    version="1.0.0"
)

# Enable CORS for frontend localhost:5173
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class QueryRequest(BaseModel):
    question: str

@app.get("/")
def read_root():
    return {"status": "running", "service": "IndustrialMind API"}

@app.post("/upload")
async def upload_document(file: UploadFile = File(...)):
    """
    Accepts multipart file uploads (PDF, CSV, TXT), processes them,
    extracts chunks/entities, embeds them, and inserts them into ChromaDB.
    """
    try:
        content = await file.read()
        result = ingest.ingest_file(content, file.filename)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to ingest file: {str(e)}")

@app.post("/query")
async def query_knowledge_base(payload: QueryRequest):
    """
    Accepts a question query, runs vector search against ChromaDB,
    retrieves context chunks, queries Claude, and returns answer + sources.
    """
    try:
        result = rag.query_rag(payload.question)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to query knowledge base: {str(e)}")

@app.get("/documents")
async def list_documents():
    """
    Returns a unique list of all ingested document names in ChromaDB.
    """
    try:
        collection = embeddings.get_collection()
        data = collection.get(include=["metadatas"])
        if not data or not data.get("metadatas"):
            return []
        
        filenames = set()
        for meta in data["metadatas"]:
            if meta and "filename" in meta:
                filenames.add(meta["filename"])
                
        return sorted(list(filenames))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list documents: {str(e)}")

@app.get("/entities")
async def get_entities():
    """
    Returns nodes and edges representing documents and their extracted
    entities (equipment tags, keywords) for rendering the force-directed graph.
    """
    try:
        collection = embeddings.get_collection()
        data = collection.get(include=["metadatas"])
        
        nodes_map = {}
        links_set = set()
        
        if data and data.get("metadatas"):
            for meta in data["metadatas"]:
                if not meta:
                    continue
                
                filename = meta.get("filename")
                if not filename:
                    continue
                
                # 1. Create/Retrieve Document Node
                if filename not in nodes_map:
                    nodes_map[filename] = {
                        "id": filename,
                        "name": filename,
                        "type": "document",
                        "val": 16  # Document nodes are larger
                    }
                
                # 2. Extract Equipment Tags (orange nodes)
                eq_str = meta.get("equipment", "")
                if eq_str:
                    for eq in eq_str.split(","):
                        eq = eq.strip()
                        if not eq:
                            continue
                        
                        if eq not in nodes_map:
                            nodes_map[eq] = {
                                "id": eq,
                                "name": eq,
                                "type": "equipment",
                                "val": 8
                            }
                        # Edge connecting equipment tag to document
                        links_set.add((eq, filename))
                
                # 3. Extract Keywords (green nodes)
                kw_str = meta.get("keywords", "")
                if kw_str:
                    for kw in kw_str.split(","):
                        kw = kw.strip()
                        if not kw:
                            continue
                        
                        kw_display = kw.capitalize()
                        if kw_display not in nodes_map:
                            nodes_map[kw_display] = {
                                "id": kw_display,
                                "name": kw_display,
                                "type": "keyword",
                                "val": 8
                            }
                        # Edge connecting keyword to document
                        links_set.add((kw_display, filename))
                        
        # Format nodes and links for react-force-graph-2d
        nodes = list(nodes_map.values())
        links = [{"source": link[0], "target": link[1]} for link in links_set]
        
        return {
            "nodes": nodes,
            "links": links
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate entities data: {str(e)}")

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
