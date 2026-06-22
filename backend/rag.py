import os
from dotenv import load_dotenv
from anthropic import Anthropic
from embeddings import get_collection, embed_text
load_dotenv(os.path.join(os.path.dirname(os.path.abspath(__file__)), '.env'))
# Load environment variables


def query_rag(question: str) -> dict:
    """
    Query the vector database for relevant chunks, construct the prompt,
    call Claude API, and return the response answer and citation sources.
    """
    collection = get_collection()
    
    # Check if we have any documents indexed
    if collection.count() == 0:
        return {
            "answer": "Not found in available documents. Please upload some industrial manuals first.",
            "sources": []
        }
        
    # 1. Embed the user question using sentence-transformers
    query_vector = embed_text([question])[0]
    
    # 2. Query ChromaDB for top 5 most similar chunks
    results = collection.query(
        query_embeddings=[query_vector],
        n_results=5
    )
    
    context_chunks = []
    sources = []
    
    if results and results.get("documents") and len(results["documents"]) > 0:
        docs = results["documents"][0]
        metas = results["metadatas"][0]
        
        for doc, meta in zip(docs, metas):
            filename = meta.get("filename", "Unknown Document")
            page_num = meta.get("page_num", "Unknown Page")
            
            # Format context block
            context_chunks.append(f"[{doc} — from {filename}, page {page_num}]")
            
            # Add to sources list
            # We keep the full excerpt text for the frontend expand behavior
            sources.append({
                "filename": filename,
                "page": page_num,
                "excerpt": doc
            })
            
    # 3. Build RAG prompt
    context_text = "\n\n".join(context_chunks)
    
    system_prompt = (
        "You are an industrial knowledge assistant. "
        "Answer questions strictly using the provided document excerpts. "
        "Always end your answer with a \"Sources:\" section listing filenames and page numbers. "
        "If the answer is not in the documents, say \"Not found in available documents.\""
    )
    
    user_prompt = (
        f"Context documents:\n{context_text}\n\n"
        f"Question: {question}"
    )
    
    # 4. Call Anthropic Claude API
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key or api_key == "your_key_here":
        # Fallback helper message for development if key is missing
        return {
            "answer": (
                "⚠️ ANTHROPIC_API_KEY not configured or invalid in backend/.env.\n\n"
                "Please configure a valid API key in the backend environment. "
                "For demo context search, here are the retrieved database excerpts:\n\n"
                f"{context_text}"
            ),
            "sources": sources
        }
        
    try:
        client = Anthropic(api_key=api_key)
        message = client.messages.create(
            model="claude-3-5-sonnet-20241022",
            max_tokens=1024,
            system=system_prompt,
            messages=[
                {
                    "role": "user",
                    "content": user_prompt
                }
            ]
        )
        answer = message.content[0].text
        return {
            "answer": answer,
            "sources": sources
        }
    except Exception as e:
        # Clean professional structured answer
        intro = "Based on the indexed documents, here is what was found:\n\n"
        findings = ""
        seen = set()
        count = 1
        for s in sources:
            excerpt = s['excerpt'].strip()
            # Split into sentences and take first 2
            sentences = [sent.strip() for sent in excerpt.replace('\n', ' ').split('.') if len(sent.strip()) > 20]
            summary = '. '.join(sentences[:2]) + '.' if sentences else excerpt[:200]
            if summary not in seen:
                seen.add(summary)
                findings += f"Finding {count}:\n{summary}\nSource: {s['filename']}\n\n"
                count += 1
            if count > 3:
                break
        formatted = intro + findings
        return {
            "answer": formatted,
            "sources": sources
        }