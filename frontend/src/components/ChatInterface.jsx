import React, { useState, useRef, useEffect } from 'react';
import SourceCard from './SourceCard';

function SourcesSection({ sources }) {
  const [isOpen, setIsOpen] = useState(false);

  if (!sources || sources.length === 0) return null;

  return (
    <div style={{ marginTop: '0.75rem' }}>
      <button 
        className="sources-toggle" 
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
      >
        <span>🔍</span> {isOpen ? 'Hide References' : `Show References (${sources.length})`} {isOpen ? '▲' : '▼'}
      </button>
      {isOpen && (
        <div className="sources-wrapper">
          {sources.map((src, idx) => (
            <SourceCard 
              key={idx} 
              filename={src.filename} 
              page={src.page} 
              excerpt={src.excerpt} 
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function ChatInterface() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const chatEndRef = useRef(null);

  // Auto-scroll to the latest message
  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const triggerQuery = async (queryText) => {
    if (!queryText.trim() || isLoading) return;

    // Add user message
    const userMsg = {
      id: Date.now().toString(),
      sender: 'user',
      text: queryText
    };
    
    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const response = await fetch('http://localhost:8000/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: queryText })
      });

      if (response.ok) {
        const data = await response.json(); // { answer, sources: [...] }
        setMessages(prev => [...prev, {
          id: (Date.now() + 1).toString(),
          sender: 'assistant',
          text: data.answer,
          sources: data.sources || []
        }]);
      } else {
        setMessages(prev => [...prev, {
          id: (Date.now() + 1).toString(),
          sender: 'assistant',
          text: "⚠️ Backend responded with an error. Please verify the server logs.",
          sources: []
        }]);
      }
    } catch (err) {
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        sender: 'assistant',
        text: "❌ Connection error. Please make sure the backend server is running on http://localhost:8000.",
        sources: []
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    const text = input;
    setInput('');
    triggerQuery(text);
  };

  const handleSuggestionClick = (text) => {
    triggerQuery(text);
  };

  return (
    <div className="chat-container">
      {/* Chat History View */}
      <div className="chat-history">
        {messages.length === 0 ? (
          <div className="welcome-container">
            <div className="welcome-logo">IndustrialMind</div>
            <p style={{ fontSize: '0.95rem', maxWidth: '480px', margin: '0 auto' }}>
              Your AI-powered RAG assistant for industrial, manufacturing, and compliance operations.
            </p>
            <div style={{ marginTop: '2rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', width: '100%', maxWidth: '500px' }}>
              <p style={{ fontSize: '0.8rem', fontWeight: 600, color: 'hsl(var(--accent-cyan))', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Quick Demo Queries
              </p>
              
              <button 
                className="doc-item" 
                onClick={() => handleSuggestionClick("What failures were recorded for TAG-001?")}
                style={{ textAlign: 'left', cursor: 'pointer', width: '100%', padding: '0.85rem' }}
              >
                ⚙️ "What failures were recorded for TAG-001?"
              </button>
              
              <button 
                className="doc-item" 
                onClick={() => handleSuggestionClick("What are the confined space entry requirements?")}
                style={{ textAlign: 'left', cursor: 'pointer', width: '100%', padding: '0.85rem' }}
              >
                🦺 "What are the confined space entry requirements?"
              </button>
              
              <button 
                className="doc-item" 
                onClick={() => handleSuggestionClick("List all compliance deviations found in the inspection report")}
                style={{ textAlign: 'left', cursor: 'pointer', width: '100%', padding: '0.85rem' }}
              >
                📋 "List all compliance deviations found in the inspection report"
              </button>
            </div>
          </div>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className={`chat-bubble ${msg.sender}`}>
              <div className="bubble-content">
                {msg.text}
                {msg.sender === 'assistant' && (
                  <SourcesSection sources={msg.sources} />
                )}
              </div>
            </div>
          ))
        )}

        {/* Loading Indicator */}
        {isLoading && (
          <div className="chat-bubble assistant">
            <div className="bubble-content" style={{ padding: '0.75rem 1.25rem' }}>
              <div className="typing-indicator">
                <div className="typing-dot"></div>
                <div className="typing-dot"></div>
                <div className="typing-dot"></div>
              </div>
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Input Message Area */}
      <div className="chat-input-container">
        <form className="chat-input-form" onSubmit={handleSubmit}>
          <input
            type="text"
            className="chat-input"
            placeholder="Ask a question about maintenance logs, OISD standards, or Factory Acts..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isLoading}
          />
          <button 
            type="submit" 
            className="chat-send-btn"
            disabled={!input.trim() || isLoading}
            title="Send query"
          >
            ➔
          </button>
        </form>
      </div>
    </div>
  );
}
