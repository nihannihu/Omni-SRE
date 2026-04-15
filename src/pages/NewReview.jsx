import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Send, FileCode, Brain, Command, CheckCircle, AlertTriangle, Upload } from 'lucide-react';
import { supabase } from '../lib/supabase';
import ReactMarkdown from 'react-markdown';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export default function NewReview() {
  const { workspaceId } = useParams();
  const navigate = useNavigate();
  const [prUrl, setPrUrl] = useState('');
  const [prNumber, setPrNumber] = useState('');
  const [prTitle, setPrTitle] = useState('');
  const [diff, setDiff] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  
  // Streaming state
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamEvents, setStreamEvents] = useState([]);
  const [liveFindings, setLiveFindings] = useState([]);
  const [error, setError] = useState('');
  const [reviewId, setReviewId] = useState(null);
  const [isReviewComplete, setIsReviewComplete] = useState(false);
  const [markdownContent, setMarkdownContent] = useState('');

  const terminalRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [streamEvents]);

  // Parse GitHub PR URL to extract PR number and title
  const parsePrUrl = (url) => {
    const match = url.match(/github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)/);
    if (match) {
      setPrNumber(match[3]);
      setPrTitle(`${match[1]}/${match[2]}#${match[3]}`);
    }
  };

  // Handle .diff file drop/upload
  const handleFileDrop = async (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = e.dataTransfer?.files || e.target?.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    if (!file.name.endsWith('.diff') && !file.name.endsWith('.patch') && file.type !== 'text/plain') {
      setError('Please drop a .diff or .patch file');
      return;
    }

    const text = await file.text();
    setDiff(text);
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!diff.trim()) {
      setError('Paste a code diff or drop a .diff file to review');
      return;
    }
    setError('');
    setIsStreaming(true);
    setIsReviewComplete(false);
    setMarkdownContent('');
    setStreamEvents([{ time: new Date(), message: 'Initiating context-aware review...' }]);
    setLiveFindings([]);

    try {
      // Get the current Supabase session token
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        setError('Authentication expired. Please log in again.');
        setIsStreaming(false);
        return;
      }

      // Point directly to the Python FastAPI Brain
      const FASTAPI_URL = 'http://localhost:8000/api/review/stream';

      const response = await fetch(FASTAPI_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          workspace_id: workspaceId,
          diff: diff,
          pr_context: prTitle ? `PR #${prNumber}: ${prTitle}` : 'Manual Review'
        })
      });

      if (!response.ok) {
        const errBody = await response.text();
        throw new Error(`API Error ${response.status}: ${errBody}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        let parts = buffer.split('\n\n');
        buffer = parts.pop(); // Keep incomplete chunk in buffer

        for (const part of parts) {
          if (!part.trim()) continue;
          
          if (part.startsWith('data: ')) {
            const dataStr = part.substring(6);
            
            try {
              const data = JSON.parse(dataStr);
              
              // Handle system messages (RAG steps)
              if (data.system_msg) {
                 setStreamEvents(prev => [...prev, { time: new Date(), message: data.system_msg, type: 'info' }]);
              }

              // Handle streaming content (The actual code review text)
              if (data.content) {
                 setMarkdownContent(prev => prev + data.content);
                 // We still keep the terminal event for the raw log if needed 
                 // (Though rendering Markdown below it is much better)
              }
              
              // Handle completion
              if (data.done) {
                 setStreamEvents(prev => [...prev, { time: new Date(), message: `✅ Review complete! Found ${data.stats?.findings_count || 0} critical issues.`, type: 'complete' }]);
                 setIsStreaming(false);
                 setIsReviewComplete(true);
                 
                 // Persist to Supabase
                 const { error: dbError } = await supabase.from('reviews').insert({
                     workspace_id: workspaceId,
                     created_by: session.user.id,
                     pr_url: prUrl || 'Manual Diff Upload',
                     pr_title: prTitle || 'Manual Review',
                     status: 'completed',
                     findings_count: data.stats?.findings_count || 0,
                     result: { memoryRecallCount: data.stats?.memoryRecallCount || 0 }
                 });
                 if (dbError) console.error('[SUPABASE] Failed to save review log:', dbError);
              }

              if (data.error) {
                 setError(data.error || 'Stream failed');
                 setIsStreaming(false);
              }
            } catch (err) {
              console.error('Failed to parse SSE JSON data:', err, dataStr);
            }
          }
        }
      }

      // If we exited the loop without a review_complete event
      if (isStreaming) {
        setIsStreaming(false);
        setStreamEvents(prev => [...prev, { time: new Date(), message: 'Stream ended', type: 'info' }]);
      }
    } catch (err) {
      setError(err.message || 'Failed to trigger review stream');
      setIsStreaming(false);
    }
  };

  if (isStreaming || isReviewComplete || liveFindings.length > 0) {
    return (
      <div className="animate-fade-in" style={{ maxWidth: 800, margin: '0 auto' }}>
        <div className="page-header" style={{ paddingBottom: 0, border: 'none', textAlign: 'center' }}>
          {isStreaming && <div className="spinner" style={{ margin: '0 auto 16px', display: 'block', width: 32, height: 32 }} />}
          <h2>{isStreaming ? 'Agentic Review in Progress' : 'Review Complete'}</h2>
          <p>{isStreaming ? 'Processing the 6-hop AI chain. Do not close this page.' : 'Analysis finished. You can review the LLM output below.'}</p>
          {isReviewComplete && (
            <button className="btn" style={{ margin: '16px auto 0', display: 'block', padding: '8px 16px' }} onClick={() => navigate(`/workspace/${workspaceId}`)}>
              Back to Dashboard
            </button>
          )}
        </div>

        <div className="page-body">
          {/* Terminal stream window */}
          <div 
            ref={terminalRef}
            style={{
              background: '#09090b',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-lg)',
              padding: 'var(--space-md)',
              fontFamily: 'var(--font-mono)',
              fontSize: 13,
              height: 300,
              overflowY: 'auto',
              marginBottom: 'var(--space-xl)',
              boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.5)'
            }}
          >
            {streamEvents.map((evt, idx) => (
              <div key={idx} style={{ marginBottom: 8, display: 'flex', gap: 12 }}>
                <span style={{ color: 'var(--text-muted)', flexShrink: 0 }}>
                  [{evt.time.toLocaleTimeString([], {hour12:false, hour:'2-digit', minute:'2-digit', second:'2-digit'})}]
                </span>
                <span style={{ 
                  color: evt.type === 'error' ? 'var(--accent-red)' : 
                         evt.type === 'finding_discovered' ? 'var(--accent-orange)' : 
                         evt.type === 'recall_complete' ? 'var(--brand-primary-light)' :
                         evt.type === 'complete' ? 'var(--accent-green)' : 'var(--text-primary)' 
                }}>
                  {evt.message}
                </span>
              </div>
            ))}
          </div>

          {/* Live findings preview */}
          {liveFindings.length > 0 && (
            <div>
              <h4 style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                <AlertTriangle size={16} /> Live Findings Preview ({liveFindings.length})
              </h4>
              <div style={{ display: 'grid', gap: 12 }}>
                {liveFindings.map((f, idx) => (
                  <div key={idx} style={{ 
                    padding: 12, 
                    background: 'var(--bg-elevated)', 
                    borderRadius: 'var(--radius-md)',
                    borderLeft: `3px solid var(--severity-${f.severity})`
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontWeight: 500, fontSize: 14 }}>{f.title}</span>
                      {f.has_citations && <span className="badge" style={{ background: 'var(--brand-glow)', color: 'var(--brand-primary-light)' }}><Brain size={12}/> Memory</span>}
                    </div>
                    {f.description && (
                      <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 8, lineHeight: 1.5 }}>
                        {f.description.substring(0, 200)}{f.description.length > 200 ? '...' : ''}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Render Markdown result */}
          {markdownContent && (
            <div className="review-markdown" style={{ 
              marginTop: 'var(--space-2xl)', 
              padding: 'var(--space-xl)', 
              background: 'var(--bg-elevated)', 
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border-color)',
              lineHeight: 1.6
            }}>
              <ReactMarkdown>{markdownContent}</ReactMarkdown>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h2>New Code Review</h2>
        <p>Paste a diff or drop a .diff file for context-aware analysis powered by team memory</p>
      </div>

      <div className="page-body" style={{ maxWidth: 800 }}>
        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          {/* GitHub PR URL input */}
          <div className="form-group">
            <label className="form-label">GitHub PR URL (optional — auto-extracts PR info)</label>
            <input 
              className="form-input" 
              type="url" 
              value={prUrl} 
              onChange={(e) => { setPrUrl(e.target.value); parsePrUrl(e.target.value); }}
              placeholder="https://github.com/owner/repo/pull/55" 
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
            <div className="form-group">
              <label className="form-label">PR Number</label>
              <input className="form-input" type="number" value={prNumber} onChange={(e) => setPrNumber(e.target.value)} placeholder="55" />
            </div>
            <div className="form-group">
              <label className="form-label">PR Title</label>
              <input className="form-input" type="text" value={prTitle} onChange={(e) => setPrTitle(e.target.value)} placeholder="Fix API issue" />
            </div>
          </div>

          {/* Drag and drop zone */}
          <div 
            className="form-group"
            onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleFileDrop}
          >
            <label className="form-label">
              <FileCode size={14} style={{ marginRight: 4, verticalAlign: 'middle' }} /> Code Diff (unified format)
            </label>
            
            {!diff && (
              <div 
                onClick={() => fileInputRef.current?.click()}
                style={{
                  border: `2px dashed ${isDragOver ? 'var(--brand-primary)' : 'var(--border-color)'}`,
                  borderRadius: 'var(--radius-lg)',
                  padding: 'var(--space-xl)',
                  textAlign: 'center',
                  cursor: 'pointer',
                  marginBottom: 'var(--space-md)',
                  background: isDragOver ? 'rgba(99, 102, 241, 0.05)' : 'transparent',
                  transition: 'all 0.2s ease',
                }}
              >
                <Upload size={24} style={{ color: 'var(--text-muted)', marginBottom: 8 }} />
                <p style={{ color: 'var(--text-muted)', fontSize: 14, margin: 0 }}>
                  Drop a <code>.diff</code> or <code>.patch</code> file here, or click to browse
                </p>
                <input 
                  ref={fileInputRef}
                  type="file" 
                  accept=".diff,.patch,.txt" 
                  onChange={handleFileDrop} 
                  style={{ display: 'none' }} 
                />
              </div>
            )}

            <textarea
              className="form-textarea"
              value={diff}
              onChange={(e) => setDiff(e.target.value)}
              placeholder={`--- a/src/index.js\n+++ b/src/index.js\n@@ -1,3 +1,4 @@\n+db.users.find(req.query)`}
              style={{ minHeight: diff ? 280 : 120, fontFamily: 'var(--font-mono)', fontSize: 13 }}
              required
            />
          </div>

          <button className="btn btn-primary btn-lg" type="submit" disabled={isStreaming}>
            <Command size={16} /> Start Agentic Review
          </button>
        </form>
      </div>
    </div>
  );
}
