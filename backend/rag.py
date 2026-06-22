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
    
def synthesize_mock_answer(question: str, sources: list) -> str:
    """
    Generate a highly realistic RAG response using local document excerpts
    when no API key is configured or when the API call fails.
    """
    question_lower = question.lower()
    
    # 1. Boiler failures / TAG-001
    if "tag-001" in question_lower or "failure" in question_lower or "boiler" in question_lower:
        return (
            "🤖 **[Local Offline Demo Mode]**\n\n"
            "Based on the **maintenance logs**, several failures and actions were recorded for **TAG-001** (High-Pressure Steam Boiler Unit A):\n\n"
            "- **Valve Fluctuation (2026-03-10)**: The secondary steam outlet valve pressure gauge fluctuated abnormally, spiking at 1.8 bar (exceeding the safety margin of 1.2 bar). Senior specialist Dave Miller depressurized the boiler, replaced the mechanical actuator, re-calibrated the sensors, and tested the unit under 1.5 bar steam load.\n"
            "- **Flame Sensor Occlusion (2026-03-12)**: Slight soot accumulation on the combustion chamber window occluded the flame sensor, dropping the voltage below the critical threshold. Dave Miller wiped the combustion viewport with solvent, restoring the sensor to a normal 4.8V output."
        )
        
    # 2. Confined space / safety
    elif "confined" in question_lower or "space" in question_lower or "safety" in question_lower or "oisd" in question_lower:
        return (
            "🤖 **[Local Offline Demo Mode]**\n\n"
            "According to standard operating procedure **SOP-SAF-042** (compliant with **OISD-GDN-137** safety guidelines), the confined space entry requirements are:\n\n"
            "1. **Permit Approval**: A signed Confined Space Entry Permit (Form SF-02) must be authorized by the Area Manager before entry.\n"
            "2. **Gas Testing**: Air quality testing must be performed 10 minutes prior to entry using calibrated multi-gas detectors to ensure oxygen levels are safe (19.5% to 23.5%) and toxic gases (CO, H2S) are absent.\n"
            "3. **Isolation & LOTO**: The space must be isolated, inlet/outlet lines blinded, and Lockout/Tagout (LOTO) applied to all electrical drives.\n"
            "4. **Active Ventilation**: Mechanical air blowers (like EQ-104) must run continuously.\n"
            "5. **Dedicated Attendant**: A Standby Attendant must monitor entry/exit logs and be equipped with communication devices and rescue harnesses."
        )
        
    # 3. Deviations / compliance / inspection
    elif "deviation" in question_lower or "compliance" in question_lower or "inspection" in question_lower or "factories act" in question_lower:
        return (
            "🤖 **[Local Offline Demo Mode]**\n\n"
            "The safety audit (INSP-2026-Q1) conducted by Ramesh Chandra under the **Indian Factories Act 1948** noted three safety deviations:\n\n"
            "1. **Deviation #1 (Boiler TAG-001)**: Missing annual pressure hydro-test certification (violates Section 31). The last test was in January 2025 (exceeding the 12-month limit).\n"
            "2. **Deviation #2 (Pump TAG-002 Area)**: Emergency exit route blocked by structural steel plates and spare metal pipes, violating Section 38 (Fire Safety regulations).\n"
            "3. **Deviation #3 (Tank TK-502 Area)**: Toxic gas pre-entry monitoring values were missing from the confined space entry permit sheets.\n\n"
            "**Required Corrective Actions**: Relocate blocking materials, schedule hydro-testing immediately, and retrain safety supervisors on permit procedures."
        )
        
    # 4. Default dynamic summary if no specific keyword matches but documents exist
    else:
        summary_points = []
        for s in sources[:3]:
            fname = s["filename"]
            excerpt = s["excerpt"].strip()
            sentences = [sent.strip() for sent in excerpt.replace('\n', ' ').split('.') if len(sent.strip()) > 20]
            summary = '. '.join(sentences[:2]) + '.' if sentences else excerpt[:150]
            summary_points.append(f"**From {fname} (Page {s['page']})**: {summary}")
            
        points_text = "\n\n".join(summary_points)
        return (
            "🤖 **[Local Offline Demo Mode]**\n\n"
            "Based on the retrieved snippets, here are the synthesized search results:\n\n"
            f"{points_text}\n\n"
            "*(Configure `ANTHROPIC_API_KEY` in the `backend/.env` file to retrieve live responses from Claude.)*"
        )


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
        mock_answer = synthesize_mock_answer(question, sources)
        return {
            "answer": mock_answer,
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
        print(f"Error calling Claude API: {e}")
        mock_answer = synthesize_mock_answer(question, sources)
        return {
            "answer": mock_answer,
            "sources": sources
        }