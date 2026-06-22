import io
import re
import uuid
import pandas as pd
from pypdf import PdfReader
from embeddings import get_collection, embed_text

def clean_text(text: str) -> str:
    """
    Remove excessive whitespace from extracted text.
    """
    if not text:
        return ""
    return re.sub(r'\s+', ' ', text).strip()

def chunk_text(text: str, chunk_size_words: int = 400, overlap_words: int = 40) -> list[str]:
    """
    Chunk text into overlapping sections using word boundaries.
    ~400 words is roughly 500 tokens.
    """
    words = text.split()
    if not words:
        return []
    chunks = []
    
    # If the text is shorter than a chunk, return it as a single chunk
    if len(words) <= chunk_size_words:
        return [" ".join(words)]
        
    step = chunk_size_words - overlap_words
    if step <= 0:
        step = chunk_size_words // 2
        
    for i in range(0, len(words), step):
        chunk_words = words[i:i + chunk_size_words]
        chunks.append(" ".join(chunk_words))
        # Stop if we have covered all words
        if i + chunk_size_words >= len(words):
            break
            
    return chunks

def extract_entities(text: str) -> dict:
    """
    Extract equipment tags, dates, and industrial keywords from a text chunk.
    """
    # Equipment tags: patterns like TAG-001 or EQ-A12
    equipment = list(set(re.findall(r'\b(?:TAG|EQ)-\w+\b', text, re.IGNORECASE)))
    equipment = [tag.upper() for tag in equipment]
    
    # Dates: YYYY-MM-DD, MM/DD/YYYY, DD-MM-YYYY, DD/MM/YYYY, etc.
    date_patterns = [
        r'\b\d{4}[-/]\d{1,2}[-/]\d{1,2}\b',
        r'\b\d{1,2}[-/]\d{1,2}[-/]\d{2,4}\b'
    ]
    dates = []
    for pattern in date_patterns:
        dates.extend(re.findall(pattern, text))
    dates = list(set(dates))
    
    # Keywords: maintenance, inspection, failure, hazard, procedure, compliance
    keywords_to_check = ["maintenance", "inspection", "failure", "hazard", "procedure", "compliance"]
    found_keywords = []
    for kw in keywords_to_check:
        if re.search(r'\b' + re.escape(kw) + r's?\b', text, re.IGNORECASE):
            found_keywords.append(kw)
            
    return {
        "equipment": equipment,
        "dates": dates,
        "keywords": found_keywords
    }

def ingest_file(file_content: bytes, filename: str) -> dict:
    """
    Process PDF, CSV, or TXT, extract text, chunk it, extract entities,
    generate local embeddings, and store in ChromaDB.
    """
    collection = get_collection()
    
    # 1. Clean out existing records of the same file to prevent duplicates
    try:
        collection.delete(where={"filename": filename})
    except Exception as e:
        print(f"No existing chunks to delete for {filename}: {e}")
        
    chunks_to_add = []
    
    # 2. Parse based on file extension
    ext = filename.split('.')[-1].lower()
    
    if ext == 'pdf':
        pdf_file = io.BytesIO(file_content)
        reader = PdfReader(pdf_file)
        for idx, page in enumerate(reader.pages):
            page_text = page.extract_text()
            cleaned = clean_text(page_text)
            if not cleaned:
                continue
            
            # Chunk the page text
            page_chunks = chunk_text(cleaned)
            for chunk_idx, chunk in enumerate(page_chunks):
                chunks_to_add.append({
                    "text": chunk,
                    "metadata": {
                        "filename": filename,
                        "page_num": str(idx + 1)
                    }
                })
                
    elif ext == 'csv':
        csv_file = io.BytesIO(file_content)
        df = pd.read_csv(csv_file)
        
        # Convert each row into a text representation
        for idx, row in df.iterrows():
            row_parts = []
            for col in df.columns:
                val = row[col]
                if pd.notna(val):
                    row_parts.append(f"{col}: {val}")
            row_str = f"Row {idx + 1}: " + ", ".join(row_parts)
            
            # Chunk individual row if it's very large, otherwise treat as single chunk
            row_chunks = chunk_text(row_str)
            for chunk_idx, chunk in enumerate(row_chunks):
                chunks_to_add.append({
                    "text": chunk,
                    "metadata": {
                        "filename": filename,
                        "page_num": f"Row {idx + 1}"
                    }
                })
                
    else:  # Treat as plain text (.txt, etc.)
        text_content = file_content.decode('utf-8', errors='ignore')
        # Split by newlines or paragraphs and chunk
        cleaned = clean_text(text_content)
        text_chunks = chunk_text(cleaned)
        for idx, chunk in enumerate(text_chunks):
            chunks_to_add.append({
                "text": chunk,
                "metadata": {
                    "filename": filename,
                    "page_num": f"Chunk {idx + 1}"
                }
            })
            
    if not chunks_to_add:
        return {"status": "success", "chunks_added": 0, "message": "No text extracted"}
        
    # 3. Process entities, generate embeddings, and write to ChromaDB
    ids = []
    embeddings = []
    documents = []
    metadatas = []
    
    for idx, item in enumerate(chunks_to_add):
        text = item["text"]
        meta = item["metadata"]
        
        # Extract entities
        entities = extract_entities(text)
        
        # Populate Chroma compatible metadata
        meta["equipment"] = ",".join(entities["equipment"])
        meta["dates"] = ",".join(entities["dates"])
        meta["keywords"] = ",".join(entities["keywords"])
        
        chunk_id = f"{filename}_chunk_{idx}_{uuid.uuid4().hex[:6]}"
        
        ids.append(chunk_id)
        documents.append(text)
        metadatas.append(meta)
        
    # Generate vectors locally
    embeddings = embed_text(documents)
    
    # Write to ChromaDB
    collection.add(
        ids=ids,
        embeddings=embeddings,
        documents=documents,
        metadatas=metadatas
    )
    
    return {
        "status": "success",
        "chunks_added": len(documents),
        "message": f"Successfully indexed {len(documents)} chunks from {filename}"
    }
