import React, { useState } from 'react';

export default function SourceCard({ filename, page, excerpt }) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Helper to determine icon by file suffix
  const getFileIcon = (name) => {
    if (!name) return '📝';
    if (name.endsWith('.pdf')) return '📄';
    if (name.endsWith('.csv')) return '📊';
    return '📝';
  };

  return (
    <div 
      className={`source-card ${isExpanded ? 'expanded' : ''}`}
      onClick={() => setIsExpanded(!isExpanded)}
      title="Click to view full context excerpt"
    >
      <div className="source-header">
        <div className="source-title-container">
          <span>{getFileIcon(filename)}</span>
          <span style={{ fontSize: '0.8rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '170px' }}>
            {filename}
          </span>
        </div>
        <span className="source-badge">
          {page.toString().startsWith('Row') ? page : `Page ${page}`}
        </span>
      </div>
      <div className="source-excerpt">
        {excerpt}
      </div>
      {isExpanded && (
        <div style={{ fontSize: '0.65rem', color: 'hsl(var(--accent-cyan))', textAlign: 'right', marginTop: '0.25rem', fontWeight: 600 }}>
          COLLAPSE ▲
        </div>
      )}
    </div>
  );
}
