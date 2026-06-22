import React, { useState, useEffect } from 'react';
import UploadPanel from './components/UploadPanel';
import ChatInterface from './components/ChatInterface';
import KnowledgeGraph from './components/KnowledgeGraph';
import './App.css';

export default function App() {
  const [activeTab, setActiveTab] = useState('chat'); // 'chat' | 'graph'
  const [documents, setDocuments] = useState([]);

  // Fetch all ingested documents from the backend
  const fetchDocuments = async () => {
    try {
      const response = await fetch('http://localhost:8000/documents');
      if (response.ok) {
        const data = await response.json();
        setDocuments(data);
      } else {
        console.error('Failed to retrieve documents list');
      }
    } catch (error) {
      console.error('Error connecting to documents API:', error);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  const handleUploadSuccess = () => {
    // Refresh documents list after a successful ingestion
    fetchDocuments();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      {/* Top Navbar */}
      <header className="navbar">
        <div className="logo-container">
          <div className="logo-icon"></div>
          <h1 className="logo-text">Industrial<span>Mind</span></h1>
        </div>
        
        {/* Navigation Tabs */}
        <nav className="nav-tabs">
          <button 
            className={`tab-btn ${activeTab === 'chat' ? 'active' : ''}`}
            onClick={() => setActiveTab('chat')}
          >
            💬 RAG Chat Assistant
          </button>
          <button 
            className={`tab-btn ${activeTab === 'graph' ? 'active' : ''}`}
            onClick={() => setActiveTab('graph')}
          >
            🕸️ Knowledge Graph
          </button>
        </nav>
      </header>

      {/* Main Two-Panel Layout */}
      <main className="main-container">
        {/* Left Side: Upload Panel & Document List */}
        <aside className="left-panel">
          <UploadPanel 
            documents={documents} 
            onUploadSuccess={handleUploadSuccess} 
          />
        </aside>

        {/* Right Side: Interactive Panel (Chat Assistant OR Knowledge Graph) */}
        <section className="right-panel">
          {activeTab === 'chat' ? (
            <ChatInterface />
          ) : (
            <KnowledgeGraph />
          )}
        </section>
      </main>
    </div>
  );
}
