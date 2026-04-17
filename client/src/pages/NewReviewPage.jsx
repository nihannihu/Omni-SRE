import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Shield, Brain, Command, CheckCircle,
  AlertTriangle, Upload, ArrowLeft, Terminal, Cpu, Zap, Activity
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
    setStreamEvents([{ time: new Date(), message: 'INITIALIZING ANALYSIS SEQUENCE...', type: 'info' }]);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Session expired');
      const response = await fetch(FASTAPI_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body: JSON.stringify({ workspace_id: workspaceId, diff, pr_context: prTitle ? `PR #${prNumber}: ${prTitle}` : 'Manual Analysis' })
      });
      if (!response.ok) throw new Error(`API Connection Failed: ${response.status}`);
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
              setStreamEvents(prev => [...prev, { time: new Date(), message: `ANALYSIS COMPLETE. Committed findings to memory bank.`, type: 'complete' }]);
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

  // ── Execution / Complete View ──
  if (isStreaming || isReviewComplete) {
    return (
      <div className="animate-slide-up" style={{ maxWidth: '1000px', margin: '0 auto' }}>
        <header style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem 1.25rem', borderRadius: 'var(--radius-full)', background: 'var(--brand-glow)', border: '1px solid rgba(37, 99, 235, 0.1)', marginBottom: '1.5rem' }}>
             <Activity size={16} className={isStreaming ? 'animate-pulse' : ''} style={{ color: 'var(--brand-primary)' }} />
             <span style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--brand-primary)', textTransform: 'uppercase', letterSpacing: '0.15em' }}>
               {isStreaming ? 'Analysis In Progress' : 'Analysis Finalized'}
             </span>
          </div>
          <h2 style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.05em' }}>
            {isStreaming ? 'Synthesizing Intelligence' : 'Technical Audit Complete'}
          </h2>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem', fontSize: '1.1rem' }}>
            {isStreaming ? 'Evaluating code vectors against institutional standards...' : 'Audit findings have been committed to the workspace memory.'}
          </p>
        </header>

        <section style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
          {/* Terminal Console */}
          <div className="terminal-window">
             <div className="terminal-header">
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#ff5f56' }} />
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#ffbd2e' }} />
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#27c93f' }} />
                <span style={{ marginLeft: '1rem', fontSize: '0.65rem', color: '#94a3b8', fontWeight: 700, fontFamily: 'var(--font-mono)', letterSpacing: '0.1em' }}>ANALYSIS_STREAM.LOG</span>
             </div>
             <div ref={terminalRef} style={{
               padding: '1.5rem', fontFamily: 'var(--font-mono)', fontSize: '0.85rem', height: '240px',
               overflowY: 'auto', color: '#e2e8f0', lineHeight: 1.6
             }}>
               {streamEvents.map((evt, idx) => (
                 <div key={idx} style={{ marginBottom: '0.5rem', display: 'flex', gap: '1.25rem' }}>
                   <span style={{ color: '#475569', flexShrink: 0 }}>[{evt.time.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}]</span>
                   <span style={{ color: evt.type === 'complete' ? '#6ee7b7' : 'inherit' }}>
                     <span style={{ color: 'var(--brand-primary)', marginRight: '0.75rem', fontWeight: 900 }}>❯</span>
                     {evt.message}
                   </span>
                 </div>
               ))}
               {isStreaming && (
                 <div style={{ display: 'flex', gap: '1.25rem' }}>
                   <span style={{ color: '#475569', flexShrink: 0 }}>[--:--]</span>
                   <span style={{ color: 'var(--brand-primary)' }} className="animate-pulse">❯ PROCESSING CLUSTERS...</span>
                 </div>
               )}
             </div>
          </div>

          {markdownContent && (
            <TiltCard>
              <div className="glass-card markdown-content" style={{ padding: '3.5rem', background: '#fff' }}>
                <ReactMarkdown>{markdownContent}</ReactMarkdown>
              </div>
            </TiltCard>
          )}

          {isReviewComplete && (
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <button onClick={() => navigate(`/workspace/${workspaceId}`)} className="btn-pill btn-primary">
                Return to Dashboard
              </button>
            </div>
          )}
        </section>
      </div>
    );
  }

  // ── Mission Initiation View ──
  return (
    <div className="animate-slide-up" style={{ maxWidth: '800px' }}>
      <nav style={{ marginBottom: '2.5rem' }}>
        <Link to={`/workspace/${workspaceId}`} style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none', fontWeight: 700 }}>
          <ArrowLeft size={16} /> BACK TO DASHBOARD
        </Link>
      </nav>

      <header style={{ marginBottom: '3.5rem' }}>
        <h2 style={{ fontSize: '2.75rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.05em' }}>New Technical Review</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', marginTop: '0.5rem' }}>Input code changes for autonomous engineering evaluation.</p>
      </header>

      {error && (
        <div style={{ background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.1)', padding: '1.25rem 1.5rem', borderRadius: 'var(--radius-md)', color: 'var(--red)', marginBottom: '2.5rem', fontSize: '0.9rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <AlertTriangle size={18} /> {error}
        </div>
      )}

      <TiltCard>
        <div className="glass-card" style={{ padding: '3.5rem', background: '#fff' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '3rem' }}>
             <Zap size={20} style={{ color: 'var(--brand-primary)' }} />
             <h3 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Audit Parameters</h3>
          </div>
          
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '2rem' }}>
              <div>
                <Label>Audit Title</Label>
                <Input type="text" value={prTitle} onChange={(e) => setPrTitle(e.target.value)} placeholder="e.g. Infrastructure Scalability Patch" />
              </div>
              <div>
                <Label>Identifier #</Label>
                <Input type="text" value={prNumber} onChange={(e) => setPrNumber(e.target.value)} placeholder="128" />
              </div>
            </div>

            <div>
              <Label>Source URL (Optional)</Label>
              <Input type="url" value={prUrl} onChange={(e) => { setPrUrl(e.target.value); parsePrUrl(e.target.value); }} placeholder="https://github.com/org/repo/pull/123" />
            </div>

            <div>
              <Label>Code Payload (Diff Text)</Label>
              <div
                onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={handleFileDrop}
                onClick={() => fileInputRef.current?.click()}
                style={{
                  border: `2px dashed ${isDragOver ? 'var(--brand-primary)' : '#e2e8f0'}`,
                  borderRadius: 'var(--radius-md)', padding: '3rem', textAlign: 'center',
                  transition: 'var(--transition-smooth)',
                  background: isDragOver ? 'rgba(37, 99, 235, 0.02)' : '#f8fafc',
                  cursor: 'pointer', marginBottom: '1.5rem'
                }}
              >
                <Upload size={32} style={{ color: isDragOver ? 'var(--brand-primary)' : 'var(--text-dim)', marginBottom: '1rem' }} />
                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                  Drag & Drop <code style={{ color: 'var(--brand-primary)', background: 'rgba(37, 99, 235, 0.05)', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>.diff</code> or Click to Browse
                </p>
                <input ref={fileInputRef} type="file" onChange={handleFileDrop} style={{ display: 'none' }} />
              </div>

              <textarea
                value={diff} onChange={(e) => setDiff(e.target.value)}
                placeholder="Paste diff content here..."
                style={{
                  width: '100%', padding: '1.5rem', background: '#f8fafc',
                  border: '1px solid #e2e8f0', borderRadius: 'var(--radius-md)',
                  color: 'var(--text-primary)', fontSize: '0.9rem', outline: 'none',
                  resize: 'vertical', fontFamily: 'var(--font-mono)', minHeight: '280px',
                  transition: 'var(--transition-smooth)'
                }}
              />
            </div>

            <button className="btn-pill btn-primary" type="submit" style={{ padding: '1.25rem', justifyContent: 'center', width: '100%', fontSize: '1rem', letterSpacing: '0.05em' }}>
              <Command size={20} /> INITIATE ANALYSIS SEQUENCE
            </button>
          </form>
        </div>
      </TiltCard>
    </div>
  );
}

function Label({ children }) {
  return <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: '0.75rem' }}>{children}</label>;
}

function Input(props) {
  return <input {...props} style={{ 
    width: '100%', padding: '1.125rem 1.25rem', background: '#f8fafc', 
    border: '1px solid #e2e8f0', borderRadius: 'var(--radius-md)', 
    color: 'var(--text-primary)', fontSize: '1rem', outline: 'none', 
    transition: 'var(--transition-smooth)', ...props.style 
  }} />;
}
