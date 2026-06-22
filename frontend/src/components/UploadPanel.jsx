import React, { useState, useRef } from 'react';

export default function UploadPanel({ documents, onUploadSuccess }) {
  const [dragActive, setDragActive] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(null); // { name, progress, status: 'uploading' | 'indexing' | 'success' | 'error', message }
  const fileInputRef = useRef(null);

  // Handle drag events
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  // Handle drop event
  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      startUploadFlow(file);
    }
  };

  // Handle file selection click
  const handleChange = (e) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      startUploadFlow(file);
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current.click();
  };

  // Simulated progress flow + real API integration
  const startUploadFlow = (file) => {
    const validExtensions = ['pdf', 'csv', 'txt'];
    const fileExt = file.name.split('.').pop().toLowerCase();
    
    if (!validExtensions.includes(fileExt)) {
      setUploadingFile({
        name: file.name,
        progress: 0,
        status: 'error',
        message: 'Unsupported file type. Please upload a PDF, CSV, or TXT file.'
      });
      return;
    }

    setUploadingFile({
      name: file.name,
      progress: 0,
      status: 'uploading',
      message: ''
    });

    const duration = 2000; // 2 seconds fake duration
    const intervalTime = 50; // increment progress every 50ms
    const step = 100 / (duration / intervalTime);
    let currentProgress = 0;

    const progressTimer = setInterval(async () => {
      currentProgress += step;
      
      if (currentProgress >= 100) {
        currentProgress = 100;
        clearInterval(progressTimer);
        
        // Update to indexing stage
        setUploadingFile(prev => ({ 
          ...prev, 
          progress: 100, 
          status: 'indexing' 
        }));
        
        // Execute real POST upload
        const formData = new FormData();
        formData.append('file', file);

        try {
          const response = await fetch('http://localhost:8000/upload', {
            method: 'POST',
            body: formData,
          });

          if (response.ok) {
            setUploadingFile(prev => ({ 
              ...prev, 
              status: 'success' 
            }));
            
            // Clear current indicator and call success callback
            setTimeout(() => {
              setUploadingFile(null);
              if (onUploadSuccess) {
                onUploadSuccess();
              }
            }, 1000);
          } else {
            const errResponse = await response.json();
            setUploadingFile(prev => ({ 
              ...prev, 
              status: 'error', 
              message: errResponse.detail || 'Failed to process document content' 
            }));
          }
        } catch (error) {
          setUploadingFile(prev => ({ 
            ...prev, 
            status: 'error', 
            message: 'Unable to connect to FastAPI backend server.' 
          }));
        }
      } else {
        setUploadingFile(prev => ({ 
          ...prev, 
          progress: Math.min(Math.round(currentProgress), 100) 
        }));
      }
    }, intervalTime);
  };

  return (
    <div className="panel-card">
      <h3>
        <span style={{ color: 'hsl(var(--accent-cyan))' }}>📂</span> Ingest Documents
      </h3>
      
      {/* Drag Zone */}
      <div 
        className={`dropzone ${dragActive ? 'active' : ''}`}
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        onClick={triggerFileSelect}
      >
        <input 
          ref={fileInputRef}
          type="file"
          style={{ display: 'none' }}
          accept=".pdf,.csv,.txt"
          onChange={handleChange}
        />
        <div className="dropzone-icon">📥</div>
        <div className="dropzone-text">
          Drag & drop your files here or <span>browse files</span>
        </div>
        <div style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))' }}>
          Supports industrial PDF, CSV, and TXT specifications
        </div>
      </div>

      {/* Uploading Status Progress Bar */}
      {uploadingFile && (
        <div style={{ marginTop: '0.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.25rem' }}>
            <span style={{ fontWeight: 600, color: 'hsl(var(--text-primary))', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '70%' }}>
              {uploadingFile.name}
            </span>
            <span style={{ fontWeight: 600, color: uploadingFile.status === 'error' ? 'hsl(var(--accent-red))' : 'hsl(var(--accent-cyan))' }}>
              {uploadingFile.status === 'uploading' && `Uploading ${uploadingFile.progress}%`}
              {uploadingFile.status === 'indexing' && 'Indexing...'}
              {uploadingFile.status === 'success' && 'Indexed ✓'}
              {uploadingFile.status === 'error' && 'Failed ✗'}
            </span>
          </div>
          <div className="progress-container">
            <div 
              className="progress-bar" 
              style={{ 
                width: `${uploadingFile.progress}%`,
                background: uploadingFile.status === 'error' ? 'hsl(var(--accent-red))' : 'linear-gradient(90deg, hsl(var(--accent-cyan)), hsl(var(--accent-green)))'
              }}
            ></div>
          </div>
          {uploadingFile.status === 'error' && (
            <div style={{ color: 'hsl(var(--accent-red))', fontSize: '0.75rem', marginTop: '0.25rem', fontWeight: 500 }}>
              {uploadingFile.message}
            </div>
          )}
        </div>
      )}

      {/* Indexed Document List */}
      <div style={{ marginTop: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <h4 style={{ fontSize: '0.9rem', color: 'hsl(var(--text-primary))', display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.5rem' }}>
          <span style={{ color: 'hsl(var(--accent-green))' }}>✔</span> Knowledge Repository ({documents.length} documents)
        </h4>
        
        {documents.length === 0 ? (
          <div style={{ fontSize: '0.8rem', color: 'hsl(var(--text-muted))', fontStyle: 'italic', textAlign: 'center', padding: '1.5rem 0' }}>
            No documents ingested. Drop a file above to begin indexing.
          </div>
        ) : (
          <div className="doc-list">
            {documents.map((doc, idx) => (
              <div key={idx} className="doc-item">
                <div className="doc-info">
                  <span style={{ fontSize: '1rem' }}>
                    {doc.endsWith('.pdf') ? '📄' : doc.endsWith('.csv') ? '📊' : '📝'}
                  </span>
                  <span className="doc-name" title={doc}>{doc}</span>
                </div>
                <span className="badge-indexed">Indexed ✓</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
