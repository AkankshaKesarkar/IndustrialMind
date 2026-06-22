# IndustrialMind — AI Knowledge Intelligence Platform

IndustrialMind is a full-stack, RAG-powered knowledge intelligence system built for manufacturing plants and heavy industrial environments. It enables safety officers, technicians, and plant managers to instantly query maintenance logs, safety guidelines (OISD), and factory regulations (Indian Factories Act 1948), receiving accurate answers with verified page/row-level source citations.

---

## 🌟 Key Features

1. **RAG QA with Source Citations**: Retrieve precise context using a local vector store and generate responses through Anthropic's Claude 3.5 Sonnet, ending with verified source badges and collapsible citations showing matching passages.
2. **Dynamic Entity-Relation Knowledge Graph**: A force-directed 2D canvas displaying relations between ingested documents, extracted equipment tags (e.g., `TAG-001`), and operational keywords (e.g., *maintenance*, *compliance*).
3. **Multi-Format Ingestion Engine**: Seamless native drag-and-drop processing for PDFs (using `pypdf`), CSV datasets (using `pandas`), and plain TXT logs.
4. **Local Embedding Generation**: Uses the lightweight `all-MiniLM-L6-v2` Sentence-Transformers model running locally (no API key required, zero latency charges).

---

## ⚙️ How to Run

### Prerequisites
- Python 3.9 - 3.11
- Node.js (v18+) & npm

### 1. Backend Setup
Navigate to the backend directory, install dependencies, configure your API key, and start the FastAPI uvicorn server.

```bash
# Navigate to backend
cd industrialmind/backend

# Install python dependencies
pip install -r requirements.txt

# Create/Edit the .env file and set your Anthropic API Key:
# ANTHROPIC_API_KEY=your_actual_api_key_here

# Run the backend server
uvicorn main:app --reload --port 8000
```
*The FastAPI backend will start running on [http://localhost:8000](http://localhost:8000).*

### 2. Frontend Setup
Navigate to the frontend directory, install npm packages, and start the Vite React developer server.

```bash
# Navigate to frontend
cd industrialmind/frontend

# Install dependencies
npm install

# Start developer server
npm run dev
```
*The React app will be live on [http://localhost:5173](http://localhost:5173).*

---

## ⚙️ Demo Evaluation Flows (Judges)

To demonstrate RAG citations and knowledge graph linking, we have included 3 mock files in `backend/sample_docs/` that you can upload to see the platform in action. Open the browser, drag and drop these files one-by-one from `industrialmind/backend/sample_docs/` into the upload zone, and try these exact queries:

*   **Query 1 (Maintenance)**: *"What failures were recorded for TAG-001?"*
    *   **Retrieval**: Pulls from `maintenance_log.txt` (detailing steam boiler units).
*   **Query 2 (Confined Spaces)**: *"What are the confined space entry requirements?"*
    *   **Retrieval**: Pulls from `safety_procedure.txt` (citing OISD-GDN-137 standards).
*   **Query 3 (Quarterly Audit)**: *"List all compliance deviations found in the inspection report"*
    *   **Retrieval**: Pulls from `inspection_report.txt` (citing Section 36 & 38 of the Indian Factories Act 1948).

---

## 🔬 Technical Excellence & Architecture

### 📊 Ingestion & Chunking Strategy
- **Text Chunking**: Documents are split using overlapping sliding-window chunk boundaries set to **~500 tokens (400 words)** with a **50-token (40 words) overlap**.
- **Context Preservation**: Overlapping chunks prevent critical safety terms or serial numbers from being split in half at chunk boundaries.
- **Dynamic Entity Extraction**: A regex and keyword-matching pass isolates equipment IDs (`(TAG|EQ)-\w+`), dates (`YYYY-MM-DD`, etc.), and operational keywords (*maintenance*, *inspection*, *failure*, *hazard*, *procedure*, *compliance*), writing them to database metadata.

### 🗄️ Database Scalability (ChromaDB)
- **Local Persistence**: We use ChromaDB running in a persistent SQLite storage mode.
- **Millions of Documents**: In production, ChromaDB can scale to millions of vector entries using the built-in Hierarchical Navigable Small World (HNSW) indexing algorithm. Query lookups operate in $O(\log N)$ logarithmic time complexity, allowing milliseconds retrieval latency over huge databases.

---

## 💼 Judging Criteria & Industry Impact

### 🚀 Business Impact (25%)
- **Mishap Mitigation (DGFASLI)**: According to reports by the *Directorate General Factory Advice Service and Labour Institutes (DGFASLI)*, safety audits reveal that **35% of industrial accidents** in hazardous factories are caused by non-compliance with pressure-vessel certifications and confined-space air-quality logs. IndustrialMind brings these critical checks directly to a technician's screen in seconds.
- **Operational Savings (McKinsey)**: A study by *McKinsey & Company* on AI in manufacturing indicates that implementing intelligent search systems for standard operating procedures (SOPs) and historical logs **reduces unplanned equipment downtime by 20% to 30%** and increases mechanical technician troubleshooting efficiency by up to **50%**, saving hours of high-risk operational troubleshooting per week.

### 💡 Innovation (25%)
Rather than a standard text list, IndustrialMind processes chunk metadata to create an interactive 2D node graph, mapping files to equipment and safety keywords, presenting a "wow factor" dashboard to visualize factory risk clusters.

### 🌟 Technical & UX Excellence (35%)
- Fully responsive, glassmorphic layout styled in vanilla CSS with customized interactive states.
- Typographic hierarchy using Google Fonts (*Outfit*, *Inter*, *JetBrains Mono*).
- Animated typing feedback and link-particle animations to visualize knowledge relationships.
