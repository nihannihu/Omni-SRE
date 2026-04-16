import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Send, FileCode, Brain, Command, CheckCircle,
  AlertTriangle, Upload, ArrowLeft, Terminal, Cpu
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import ReactMarkdown from 'react-markdown';
import TiltCard from '../components/ui/TiltCard';

const FASTAPI_URL = 'http://localhost:8000/api/review/stream';

export default function NewReviewPage() {
  const { workspaceId } = useParams();
  const navigate = useNavigate();

  const [prUrl, setPrUrl] = useState('');
  const [prNumber, setPrNumber] = useState('');
  const [prTitle, setPrTitle] = useState('');
  const [diff, setDiff] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);

  const [isStreaming, setIsStreaming] = useState(false);
  const [streamEvents, setStreamEvents] = useState([]);
  const [markdownContent, setMarkdownContent] = useState('');
  const [error, setError] = useState('');
  const [isReviewComplete, setIsReviewComplete] = useState(false);

  const terminalRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [streamEvents]);

  const parsePrUrl = (url) => {
    const match = url.match(/github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)/);
    if (match) {
      setPrNumber(match[3]);
      setPrTitle(`${match[1]}/${match[2]}#${match[3]}`);
    }
  };

  const handleFileDrop = async (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = e.dataTransfer?.files || e.target?.files;
    if (!files || files.length === 0) return;
    const file = files[0];
    const text = await file.text();
    setDiff(text);
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!diff.trim()) {
      setError('Technical payload required. Paste a code diff or drop a .diff file.');
      return;
    }
    setError('');
    setIsStreaming(true);
    setIsReviewComplete(false);
    setMarkdownContent('');
    setStreamEvents([{ time: new Date(), message: 'INITIATING AGENTIC CHAIN...', type: 'info' }]);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Session expired');
      const response = await fetch(FASTAPI_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body: JSON.stringify({ workspace_id: workspaceId, diff, pr_context: prTitle ? `PR #${prNumber}: ${prTitle}` : 'Manual Analysis' })
      });
      if (!response.ok) throw new Error(`API Error: ${response.status}`);
      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let parts = buffer.split('\n\n');
        buffer = parts.pop();
        for (const part of parts) {
          if (!part.trim()) continue;
          if (part.startsWith('data: ')) {
            const data = JSON.parse(part.substring(6));
            if (data.system_msg) setStreamEvents(prev => [...prev, { time: new Date(), message: data.system_msg, type: 'info' }]);
            if (data.content) setMarkdownContent(prev => prev + data.content);
            if (data.done) {
              setStreamEvents(prev => [...prev, { time: new Date(), message: `EXECUTION COMPLETE. Found ${data.stats?.findings_count || 0} vulnerabilities.`, type: 'complete' }]);
              setIsStreaming(false);
              setIsReviewComplete(true);
              await supabase.from('reviews').insert({
                workspace_id: workspaceId, created_by: session.user.id,
                pr_url: prUrl || 'Manual Diff', pr_title: prTitle || 'Manual Review',
                status: 'completed', findings_count: data.stats?.findings_count || 0,
                result: { memoryRecallCount: data.stats?.memoryRecallCount || 0, maturity: data.stats?.maturity || { level: 'ESTABLISHED' } }
              });
            }
            if (data.error) throw new Error(data.error);
          }
        }
      }
    } catch (err) {
      setError(err.message);
      setIsStreaming(false);
    }
  };

  // ── Streaming / Complete View ──
  if (isStreaming || isReviewComplete) {
    return (
      <div className="animate-slide-up" style={{ maxWidth: '900px', margin: '0 auto' }}>
        <header style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <h2 style={{ fontSize: '2rem', fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem' }}>
            {isStreaming ? <Cpu size={28} style={{ color: '#3b82f6', animation: 'spin 2s linear infinite' }} /> : <CheckCircle size={28} style={{ color: '#10b981' }} />}
            {isStreaming ? 'Agentic Analysis Active' : 'Intelligence Cycle Complete'}
          </h2>
          <p style={{ color: '#9ca3af', marginTop: '0.35rem', fontSize: '0.875rem' }}>
            {isStreaming ? 'Synchronizing with institutional memory...' : 'Technical audit finished.'}
          </p>
        </header>

        <section style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Terminal */}
          <div ref={terminalRef} style={{
            background: '#0a0a0a', borderRadius: '16px', padding: '1.25rem',
            fontFamily: 'var(--font-mono)', fontSize: '0.75rem', height: '220px',
            overflowY: 'auto', color: '#e5e7eb',
            boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
          }}>
            <div style={{ display: 'flex', gap: '6px', marginBottom: '1rem', opacity: 0.5 }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#ef4444' }} />
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#f59e0b' }} />
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#10b981' }} />
            </div>
            {streamEvents.map((evt, idx) => (
              <div key={idx} style={{ marginBottom: '0.3rem', display: 'flex', gap: '0.75rem' }}>
                <span style={{ color: '#6b7280', flexShrink: 0 }}>[{evt.time.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit', second:'2-digit'})}]</span>
                <span style={{ color: evt.type === 'complete' ? '#10b981' : '#e5e7eb' }}>{evt.message}</span>
              </div>
            ))}
          </div>

          {markdownContent && (
            <TiltCard className="review-result-md" style={{ padding: '2rem', lineHeight: 1.7 }}>
              <ReactMarkdown>{markdownContent}</ReactMarkdown>
            </TiltCard>
          )}

          {isReviewComplete && (
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: '0.5rem' }}>
              <button onClick={() => navigate(`/workspace/${workspaceId}`)} className="btn-pill btn-dark">
                Return to Command Center
              </button>
            </div>
          )}
        </section>
      </div>
    );
  }

  // ── Input Form View ──
  return (
    <div className="animate-slide-up" style={{ maxWidth: '720px' }}>
      <nav style={{ marginBottom: '1.5rem' }}>
        <Link to={`/workspace/${workspaceId}`} style={{ fontSize: '0.85rem', color: '#9ca3af', display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none' }}>
          <ArrowLeft size={14} /> Back
        </Link>
      </nav>

      <header style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '2.25rem', fontWeight: 900, marginBottom: '0.35rem' }}>Initiate Code Review</h2>
        <p style={{ color: '#9ca3af', fontSize: '0.9rem' }}>Inject technical debt knowledge and context into your reviews.</p>
      </header>

      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', padding: '0.875rem 1rem', borderRadius: '12px', color: '#ef4444', marginBottom: '1.5rem', fontSize: '0.85rem' }}>
          {error}
        </div>
      )}

      <TiltCard style={{ padding: '2rem' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '1.5rem' }}>Analysis Payload</h3>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div>
            <Label>GitHub PR URL (Optional)</Label>
            <Input type="url" value={prUrl} onChange={(e) => { setPrUrl(e.target.value); parsePrUrl(e.target.value); }} placeholder="https://github.com/org/repo/pull/123" />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1.25rem' }}>
            <div>
              <Label>Reference ID</Label>
              <Input type="text" value={prNumber} onChange={(e) => setPrNumber(e.target.value)} placeholder="e.g. 55" />
            </div>
            <div>
              <Label>Review Title</Label>
              <Input type="text" value={prTitle} onChange={(e) => setPrTitle(e.target.value)} placeholder="Feature: Auth migration" />
            </div>
          </div>

          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleFileDrop}
            onClick={() => fileInputRef.current?.click()}
            style={{
              border: `2px dashed ${isDragOver ? '#3b82f6' : 'rgba(0,0,0,0.1)'}`,
              borderRadius: '16px', padding: '2rem', textAlign: 'center',
              transition: 'all 200ms ease',
              background: isDragOver ? '#eff6ff' : '#fafafa',
            }}
          >
            <Upload size={24} style={{ color: isDragOver ? '#3b82f6' : '#d1d5db', marginBottom: '0.5rem' }} />
            <p style={{ fontSize: '0.8rem', color: '#9ca3af' }}>
              Drop a <code style={{ background: 'rgba(0,0,0,0.04)', padding: '0.1rem 0.3rem', borderRadius: '4px' }}>.diff</code> file or paste content below.
            </p>
            <input ref={fileInputRef} type="file" onChange={handleFileDrop} style={{ display: 'none' }} />
          </div>

          <textarea
            value={diff} onChange={(e) => setDiff(e.target.value)}
            placeholder="--- a/file.js ..."
            style={{
              width: '100%', padding: '1rem', background: '#fafafa',
              border: '1px solid rgba(0,0,0,0.08)', borderRadius: '12px',
              color: '#0a0a0a', fontSize: '0.8rem', outline: 'none',
              resize: 'vertical', fontFamily: 'var(--font-mono)', minHeight: '250px',
            }}
          />

          <button className="btn-pill btn-dark" type="submit" style={{ padding: '0.875rem', justifyContent: 'center', width: '100%' }}>
            <Command size={16} /> START AGENTIC ANALYSIS
          </button>
        </form>
      </TiltCard>
    </div>
  );
}

function Label({ children }) {
  return <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.5rem' }}>{children}</label>;
}

function Input(props) {
  return <input {...props} style={{ width: '100%', padding: '0.75rem 1rem', background: '#fafafa', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '12px', color: '#0a0a0a', fontSize: '0.85rem', outline: 'none', fontFamily: 'var(--font-sans)', ...props.style }} />;
}
