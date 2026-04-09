import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Send, FileCode, Brain, Command, CheckCircle, AlertTriangle } from 'lucide-react';
import { repoAPI } from '../services/api';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export default function NewReview() {
  const { workspaceId } = useParams();
  const navigate = useNavigate();
  const [repos, setRepos] = useState([]);
  const [selectedRepo, setSelectedRepo] = useState('');
  const [prNumber, setPrNumber] = useState('');
  const [prTitle, setPrTitle] = useState('');
  const [diff, setDiff] = useState('');
  
  // Streaming state
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamEvents, setStreamEvents] = useState([]);
  const [liveFindings, setLiveFindings] = useState([]);
  const [error, setError] = useState('');
  const [reviewId, setReviewId] = useState(null);

  const terminalRef = useRef(null);

  useEffect(() => {
    repoAPI.list(workspaceId).then((res) => setRepos(res.data.repositories || [])).catch(() => {});
  }, [workspaceId]);

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [streamEvents]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!diff.trim()) {
      setError('Paste a code diff to review');
      return;
    }
    setError('');
    setIsStreaming(true);
    setStreamEvents([{ time: new Date(), message: 'Initiating context-aware review...' }]);
    setLiveFindings([]);

    try {
      const response = await fetch(`${API_BASE}/reviews/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        },
        body: JSON.stringify({
          workspaceId,
          repositoryId: selectedRepo || repos[0]?._id,
          prNumber: parseInt(prNumber) || 0,
          prTitle: prTitle || 'Manual Review',
          diff,
          filesChanged: [],
        })
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.statusText}`);
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
          
          let eventType = 'message';
          let dataStr = '{}';
          
          part.split('\n').forEach(line => {
            if (line.startsWith('event: ')) eventType = line.substring(7);
            if (line.startsWith('data: ')) dataStr = line.substring(6);
          });

          try {
            const data = JSON.parse(dataStr);
            
            if (data.message) {
               setStreamEvents(prev => [...prev, { time: new Date(), message: data.message, type: eventType }]);
            }

            if (eventType === 'review_started') {
               setReviewId(data.review_id);
            }

            if (eventType === 'finding_discovered') {
               setLiveFindings(prev => [...prev, data]);
            }
            
            if (eventType === 'review_complete') {
               setTimeout(() => navigate(`/workspace/${workspaceId}/review/${data.review_id}`), 2500);
            }

            if (eventType === 'error') {
               setError(data.message || 'Stream failed');
               setIsStreaming(false);
            }
          } catch (err) {
            console.error('Failed to parse SSE data', err, dataStr);
          }
        }
      }
    } catch (err) {
      setError(err.message || 'Failed to trigger review stream');
      setIsStreaming(false);
    }
  };

  if (isStreaming) {
    return (
      <div className="animate-fade-in" style={{ maxWidth: 800, margin: '0 auto' }}>
        <div className="page-header" style={{ paddingBottom: 0, border: 'none', textAlign: 'center' }}>
          <div className="spinner" style={{ margin: '0 auto 16px', display: 'block', width: 32, height: 32 }} />
          <h2>Agentic Review in Progress</h2>
          <p>Processing the 6-hop AI chain. Do not close this page.</p>
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
                <span style={{ color: 'var(--text-muted)' }}>
                  [{evt.time.toLocaleTimeString([], {hour12:false, hour:'2-digit', minute:'2-digit', second:'2-digit'})}]
                </span>
                <span style={{ 
                  color: evt.type === 'error' ? 'var(--accent-red)' : 
                         evt.type === 'finding_discovered' ? 'var(--accent-orange)' : 
                         evt.type === 'recall_complete' ? 'var(--brand-primary-light)' : 'var(--text-primary)' 
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
                  </div>
                ))}
              </div>
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
        <p>Paste a diff for context-aware analysis powered by team memory</p>
      </div>

      <div className="page-body" style={{ maxWidth: 800 }}>
        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleSubmit}>
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

          {repos.length > 0 && (
            <div className="form-group">
              <label className="form-label">Repository</label>
              <select className="form-select" value={selectedRepo} onChange={(e) => setSelectedRepo(e.target.value)}>
                <option value="">Select a repository...</option>
                {repos.map((r) => (
                  <option key={r._id} value={r._id}>{r.fullName}</option>
                ))}
              </select>
            </div>
          )}

          <div className="form-group">
            <label className="form-label">
              <FileCode size={14} style={{ marginRight: 4, verticalAlign: 'middle' }} /> Code Diff (unified format)
            </label>
            <textarea
              className="form-textarea"
              value={diff}
              onChange={(e) => setDiff(e.target.value)}
              placeholder={`--- a/src/index.js\n+++ b/src/index.js\n@@ -1,3 +1,4 @@\n+db.users.find(req.query)`}
              style={{ minHeight: 280 }}
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
