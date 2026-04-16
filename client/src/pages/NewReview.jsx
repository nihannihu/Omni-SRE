import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  Send, FileCode, Brain, Command, CheckCircle, 
  AlertTriangle, Upload, ArrowLeft, Terminal, Cpu
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import ReactMarkdown from 'react-markdown';
import GlassCard from '../components/ui/GlassCard';

const FASTAPI_URL = 'http://localhost:8000/api/review/stream';

export default function NewReview() {
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
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          workspace_id: workspaceId,
          diff: diff,
          pr_context: prTitle ? `PR #${prNumber}: ${prTitle}` : 'Manual Analysis'
        })
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
                  workspace_id: workspaceId,
                  created_by: session.user.id,
                  pr_url: prUrl || 'Manual Diff',
                  pr_title: prTitle || 'Manual Review',
                  status: 'completed',
                  findings_count: data.stats?.findings_count || 0,
                  result: { 
                    memoryRecallCount: data.stats?.memoryRecallCount || 0,
                    maturity: data.stats?.maturity || { level: 'ESTABLISHED' }
                  }
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

  if (isStreaming || isReviewComplete) {
    return (
      <div className="animate-slide-up" style={{ maxWidth: '900px', margin: '0 auto' }}>
        <header style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <h2 style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
            {isStreaming ? <Cpu size={32} className="spin" style={{ color: 'var(--brand-primary)' }} /> : <CheckCircle size={32} style={{ color: 'var(--green-glow)' }} />}
            {isStreaming ? 'Agentic Analysis Active' : 'Intelligence Cycle Complete'}
          </h2>
          <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>
            {isStreaming ? 'Synchronizing with institutional memory and evaluating risk vectors...' : 'Technical audit finished. Summary provided below.'}
          </p>
        </header>

        <section style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {/* Terminal View */}
          <div ref={terminalRef} style={{
            background: '#020617', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-lg)',
            padding: '1.5rem', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', height: '240px', overflowY: 'auto',
            boxShadow: 'inset 0 4px 12px rgba(0,0,0,0.5)', position: 'relative'
          }}>
            <div style={{ position: 'sticky', top: 0, right: 0, display: 'flex', justifyContent: 'flex-end', opacity: 0.5 }}>
              <Terminal size={12} />
            </div>
            {streamEvents.map((evt, idx) => (
              <div key={idx} style={{ marginBottom: '0.4rem', display: 'flex', gap: '1rem' }}>
                <span style={{ color: 'var(--text-dim)', flexShrink: 0 }}>[{evt.time.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit', second:'2-digit'})}]</span>
                <span style={{ color: evt.type === 'complete' ? 'var(--green-glow)' : 'var(--text-primary)' }}>{evt.message}</span>
              </div>
            ))}
          </div>

          {/* Markdown Content */}
          {markdownContent && (
            <GlassCard className="review-result-md" style={{ padding: '2.5rem', lineHeight: 1.7 }}>
              <ReactMarkdown>{markdownContent}</ReactMarkdown>
            </GlassCard>
          )}

          {isReviewComplete && (
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: '1rem' }}>
              <button onClick={() => navigate(`/workspace/${workspaceId}`)} className="btn-premium btn-primary">
                Return to Command Center
              </button>
            </div>
          )}
        </section>
      </div>
    );
  }

  return (
    <div className="animate-slide-up" style={{ maxWidth: '800px' }}>
      <nav style={{ marginBottom: '2rem' }}>
        <Link to={`/workspace/${workspaceId}`} style={{ fontSize: '0.9rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none' }}>
          <ArrowLeft size={16} /> Back
        </Link>
      </nav>

      <header style={{ marginBottom: '3rem' }}>
        <h2 style={{ fontSize: '2.5rem', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
          Initiate Code Review
        </h2>
        <p style={{ color: 'var(--text-muted)' }}>
          Inject technical debt knowledge and context into your reviews.
        </p>
      </header>

      {error && (
        <div style={{ background: 'rgba(244, 63, 94, 0.1)', border: '1px solid rgba(244, 63, 94, 0.2)', padding: '1rem', borderRadius: 'var(--radius-md)', color: 'var(--red-glow)', marginBottom: '2rem', fontSize: '0.9rem' }}>
          {error}
        </div>
      )}

      <GlassCard title="Analysis Payload">
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div>
            <Label>Provider Context (Optional)</Label>
            <Input 
              type="url" 
              value={prUrl} 
              onChange={(e) => { setPrUrl(e.target.value); parsePrUrl(e.target.value); }}
              placeholder="GitHub Pull Request URL" 
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1.5rem' }}>
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
            style={{
              border: `2px dashed ${isDragOver ? 'var(--brand-primary)' : 'var(--glass-border)'}`,
              borderRadius: 'var(--radius-md)', padding: '2rem', textAlign: 'center', transition: 'var(--transition-fast)',
              background: isDragOver ? 'rgba(56, 189, 248, 0.05)' : 'rgba(0,0,0,0.1)'
            }}
          >
            <Upload size={24} style={{ color: 'var(--text-dim)', marginBottom: '0.5rem' }} />
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Drop a <code>.diff</code> file or paste the content below.
            </p>
            <input ref={fileInputRef} type="file" onChange={handleFileDrop} style={{ display: 'none' }} />
          </div>

          <TextArea 
            value={diff} 
            onChange={(e) => setDiff(e.target.value)} 
            placeholder="--- a/file.js ..." 
            style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', minHeight: '300px' }}
          />

          <button className="btn-premium btn-primary" type="submit" style={{ padding: '1.25rem', marginTop: '1rem' }}>
            <Command size={18} /> START AGENTIC ANALYSIS
          </button>
        </form>
      </GlassCard>
    </div>
  );
}

function Label({ children }) {
  return <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.5rem' }}>{children}</label>;
}

function Input(props) {
  return <input {...props} style={{ width: '100%', padding: '0.875rem 1rem', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', fontSize: '0.9rem', outline: 'none' }} />;
}

function TextArea(props) {
  return <textarea {...props} style={{ width: '100%', padding: '1rem', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', fontSize: '0.9rem', outline: 'none', resize: 'vertical', ...props.style }} />;
}
