import React, { useState, useEffect, useRef } from 'react';
import ForceGraph2D from 'react-force-graph-2d';

export default function KnowledgeGraph() {
  const containerRef = useRef(null);
  const graphRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 500 });
  const [graphData, setGraphData] = useState({ nodes: [], links: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Resize listener to make the canvas responsive
  useEffect(() => {
    if (containerRef.current) {
      setDimensions({
        width: containerRef.current.clientWidth,
        height: containerRef.current.clientHeight || 500
      });
    }

    const handleResize = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight || 500
        });
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Fetch entities data on load
  const fetchEntities = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('http://localhost:8000/entities');
      if (response.ok) {
        const data = await response.json();
        setGraphData(data);
        
        // Slightly zoom to fit the nodes after loading
        setTimeout(() => {
          if (graphRef.current) {
            graphRef.current.zoomToFit(400, 50);
          }
        }, 300);
      } else {
        setError('Failed to fetch graph data from backend API.');
      }
    } catch (err) {
      setError('Connection to backend server failed. Make sure the API is active.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEntities();
  }, []);

  // Draw custom nodes with colored glow and clear text labels
  const paintNode = (node, ctx, globalScale) => {
    const radius = node.val || 6;
    
    // Choose color based on entity type
    let color = '#3b82f6'; // document (blue)
    if (node.type === 'equipment') color = '#ff9f00'; // equipment (orange)
    if (node.type === 'keyword') color = '#00ff9d'; // keyword (green)
    
    // 1. Draw node circle glow
    ctx.shadowColor = color;
    ctx.shadowBlur = 10 / globalScale;
    ctx.beginPath();
    ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI, false);
    ctx.fillStyle = color;
    ctx.fill();
    
    // Reset shadow for next drawings
    ctx.shadowBlur = 0;

    // 2. Draw label text below node
    const fontSize = node.type === 'document' ? 12 / globalScale : 9 / globalScale;
    ctx.font = `${node.type === 'document' ? '600' : '500'} ${fontSize}px 'Inter', sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    
    // Render labels only when zoomed in or for document nodes to reduce clutter
    if (globalScale > 0.6 || node.type === 'document') {
      ctx.fillText(node.name, node.x, node.y + radius + (8 / globalScale));
    }
  };

  return (
    <div ref={containerRef} className="graph-container" style={{ height: '100%' }}>
      {/* Legend overlay */}
      <div className="graph-legend">
        <div style={{ fontWeight: 600, color: '#fff', marginBottom: '0.25rem' }}>Entity Registry</div>
        <div className="legend-item">
          <div className="legend-color doc"></div>
          <div>Industrial Document</div>
        </div>
        <div className="legend-item">
          <div className="legend-color tag"></div>
          <div>Equipment Tag (TAG-*)</div>
        </div>
        <div className="legend-item">
          <div className="legend-color kw"></div>
          <div>Operations Keyword</div>
        </div>
        <button 
          onClick={fetchEntities} 
          style={{
            marginTop: '0.5rem',
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            color: 'hsl(var(--accent-cyan))',
            fontSize: '0.7rem',
            padding: '0.3rem',
            borderRadius: '4px',
            cursor: 'pointer',
            fontWeight: 600
          }}
        >
          🔄 Refresh Graph
        </button>
      </div>

      {/* Loading state overlay */}
      {isLoading && (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(10, 15, 28, 0.8)', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', zIndex: 5, gap: '1rem'
        }}>
          <div className="typing-indicator">
            <div className="typing-dot" style={{ backgroundColor: 'hsl(var(--accent-cyan))' }}></div>
            <div className="typing-dot" style={{ backgroundColor: 'hsl(var(--accent-cyan))' }}></div>
            <div className="typing-dot" style={{ backgroundColor: 'hsl(var(--accent-cyan))' }}></div>
          </div>
          <div style={{ fontSize: '0.85rem', color: 'hsl(var(--text-muted))' }}>Generating Force-Directed Layout...</div>
        </div>
      )}

      {/* Error state overlay */}
      {error && !isLoading && (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(10, 15, 28, 0.8)', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', zIndex: 5, gap: '1rem', padding: '2rem', textAlign: 'center'
        }}>
          <div style={{ fontSize: '2rem' }}>⚠️</div>
          <div style={{ fontSize: '0.9rem', color: 'hsl(var(--accent-red))' }}>{error}</div>
          <button 
            onClick={fetchEntities}
            style={{
              background: 'linear-gradient(135deg, hsl(var(--accent-cyan)), hsl(var(--accent-green)))',
              border: 'none',
              padding: '0.5rem 1rem',
              borderRadius: '6px',
              color: 'hsl(var(--bg-deep))',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Retry Connection
          </button>
        </div>
      )}

      {/* Empty graph state */}
      {!isLoading && !error && graphData.nodes.length === 0 && (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          zIndex: 4, padding: '2rem', textAlign: 'center', pointerEvents: 'none'
        }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🕸️</div>
          <div style={{ fontSize: '0.95rem', color: 'hsl(var(--text-muted))', maxWidth: '350px' }}>
            Graph database is empty. Upload some manuals in the ingest panel to map extracted entities.
          </div>
        </div>
      )}

      {/* D3 2D Force-Directed Graph */}
      {!isLoading && !error && graphData.nodes.length > 0 && (
        <ForceGraph2D
          ref={graphRef}
          graphData={graphData}
          width={dimensions.width}
          height={dimensions.height}
          backgroundColor="#080c14"
          nodeCanvasObject={paintNode}
          nodePointerAreaPaint={(node, color, ctx) => {
            // Hitbox area for hovering/clicking nodes
            ctx.beginPath();
            ctx.arc(node.x, node.y, node.val || 6, 0, 2 * Math.PI, false);
            ctx.fillStyle = color;
            ctx.fill();
          }}
          // Visual Link configuration
          linkColor={() => 'rgba(255, 255, 255, 0.08)'}
          linkWidth={1.5}
          // Interactive particles representing ingest relation streams
          linkDirectionalParticles={3}
          linkDirectionalParticleSpeed={0.006}
          linkDirectionalParticleColor={() => 'hsla(184, 100%, 50%, 0.4)'}
          linkDirectionalParticleWidth={2}
          // Interactive behaviors
          cooldownTicks={100}
          onEngineStop={() => {
            // Zoom to fit all components comfortably when engine settles
            if (graphRef.current) {
              graphRef.current.zoomToFit(400, 60);
            }
          }}
        />
      )}
    </div>
  );
}
