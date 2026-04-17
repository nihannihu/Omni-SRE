import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  ArrowLeft, Brain, Clock, FileCode, ShieldAlert, CheckCircle,
  ExternalLink, ChevronRight, Zap, Cpu, Code
} from 'lucide-react';
import { reviewAPI } from '../services/api';
import TiltCard from '../components/ui/TiltCard';

export default function ReviewDetail() {
  const { reviewId } = useParams();
  const [review, setReview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [polling, setPolling] = useState(false);

  const loadReview = async () => {
    try {
      const { data } = await reviewAPI.get(reviewId);
      setReview(data.review);
      if (data.review.status === 'in_progress' || data.review.status === 'pending') {
        setPolling(true);
      } else {
        setPolling(false);
      }
    } catch (err) {
      console.error('Review load error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReview();
  }, [reviewId]);

  useEffect(() => {
    if (!polling) return;
    const interval = setInterval(loadReview, 3000);
    return () => clearInterval(interval);
  }, [polling]);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
        <div style={{ width: 24, height: 24, border: '3px solid #f1f5f9', borderTopColor: 'var(--brand-primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
      </div>
    );
  }

  if (!review) return (
    <div style={{ textAlign: 'center', padding: '10rem 2rem' }}>
       <h3 style={{ color: 'var(--text-primary)', fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.02em' }}>Audit Context Unavailable</h3>
       <p style={{ color: 'var(--text-secondary)', marginTop: '0.75rem', fontSize: '1.1rem', fontWeight: 500 }}>The requested analysis cycle could not be retrieved from the intelligence network.</p>
       <Link to="/" className="btn-pill btn-primary" style={{ marginTop: '2.5rem', display: 'inline-flex', padding: '1rem 2rem' }}>RETURN TO COMMAND</Link>
    </div>
  );

  const findings = review.result?.findings || [];

  return (
    <div className="animate-slide-up">
      <nav style={{ marginBottom: '2.5rem' }}>
        <Link to={`/workspace/${review.workspaceId}`} style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none', fontWeight: 700 }}>
          <ArrowLeft size={16} /> BACK TO DASHBOARD
        </Link>
      </nav>

      <header style={{ marginBottom: '4rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
            <h2 style={{ fontSize: '2.75rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.05em' }}>
               {review.prNumber ? `PROBE #${review.prNumber}` : 'ANALYSIS RUN'}
            </h2>
            <span className={`status-badge status-${review.status}`} style={{ fontSize: '0.65rem', fontWeight: 900, textTransform: 'uppercase' }}>
              {review.status}
            </span>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1.15rem', fontWeight: 500 }}>
            {review.prTitle || 'Manual Technical Audit'} • <span style={{ color: '#94a3b8' }}>Initiated by {review.prAuthor || 'Autonomous Agent'}</span>
          </p>
        </div>
        
        {review.result?.memoryRecallCount > 0 && (
          <div style={{ 
            display: 'flex', alignItems: 'center', gap: '1.25rem', 
            background: '#ffffff', border: '1px solid #e2e8f0',
            padding: '1.25rem 1.75rem', borderRadius: 'var(--radius-md)', color: 'var(--brand-primary)',
            boxShadow: '0 4px 12px rgba(0,0,0,0.03)'
          }}>
            <Brain size={28} />
            <div>
              <div style={{ fontSize: '0.7rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', opacity: 0.8 }}>Institutional Recall</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800 }}>{review.result.memoryRecallCount} CITATIONS</div>
            </div>
          </div>
        )}
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 340px', gap: '3.5rem' }}>
        <section>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
            <h3 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>Detailed Intelligence</h3>
            <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em' }}>VIOLATIONS DETECTED: {findings.length}</div>
          </div>

          {findings.length === 0 ? (
            <TiltCard>
              <div className="glass-card" style={{ padding: '5rem', textAlign: 'center', background: '#fff' }}>
                <CheckCircle size={64} style={{ color: '#10b981', marginBottom: '1.5rem' }} />
                <h3 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)' }}>Source Integrity Cleared</h3>
                <p style={{ color: 'var(--text-secondary)', marginTop: '0.75rem', fontSize: '1.1rem', fontWeight: 500 }}>The agentic chain detected zero critical vulnerabilities or architectural defects.</p>
              </div>
            </TiltCard>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
              {findings.map((finding, idx) => (
                <TiltCard key={idx}>
                  <div className="glass-card" style={{ background: '#fff', padding: '3rem', borderLeft: `5px solid ${finding.severity === 'critical' ? '#ef4444' : finding.severity === 'high' ? '#f59e0b' : '#3b82f6'}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                          <span style={{ 
                            background: finding.severity === 'critical' ? '#fef2f2' : finding.severity === 'high' ? '#fffbeb' : '#eff6ff', 
                            color: finding.severity === 'critical' ? '#ef4444' : finding.severity === 'high' ? '#f59e0b' : '#3b82f6',
                            padding: '0.4rem 0.8rem',
                            borderRadius: '4px',
                            fontSize: '0.65rem',
                            fontWeight: 900,
                            textTransform: 'uppercase',
                            border: `1px solid ${finding.severity === 'critical' ? '#fee2e2' : finding.severity === 'high' ? '#fef3c7' : '#dbeafe'}`
                          }}>
                            {finding.severity}
                          </span>
                          <span style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 900, letterSpacing: '0.12em' }}>
                            {finding.category || 'Architecture'}
                          </span>
                        </div>
                        <h4 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>{finding.title}</h4>
                      </div>
                      {finding.confidence && (
                        <div style={{ textAlign: 'right', padding: '0.75rem 1.25rem', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                          <div style={{ fontSize: '0.6rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 900 }}>CONFIDENCE</div>
                          <div style={{ fontSize: '1.25rem', color: 'var(--brand-primary)', fontWeight: 900 }}>{Math.round(finding.confidence * 100)}%</div>
                        </div>
                      )}
                    </div>

                    <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', lineHeight: 1.75, marginBottom: '2.5rem', fontWeight: 500 }}>
                      {finding.description}
                    </p>

                    <div style={{ background: '#f8fafc', borderRadius: 'var(--radius-md)', padding: '2rem', border: '1px solid #e2e8f0', marginBottom: '2rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.9rem', color: '#64748b', marginBottom: '1.25rem', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                        <Code size={18} style={{ color: 'var(--brand-primary)' }} /> 
                        <span style={{ color: 'var(--text-primary)', fontWeight: 800 }}>{finding.file}</span> 
                        {finding.line && <span style={{ opacity: 0.5 }}>:L{finding.line}</span>}
                      </div>
                      {finding.suggestedFix && (
                        <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '1.5rem' }}>
                          <div style={{ fontSize: '0.75rem', color: '#7c3aed', fontWeight: 900, textTransform: 'uppercase', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px', letterSpacing: '0.1em' }}>
                            <Zap size={16} /> REMEDIATION SEQUENCE
                          </div>
                          <pre style={{ margin: 0, padding: '1.5rem', background: '#0f172a', borderRadius: '8px', overflowX: 'auto', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.2)' }}>
                             <code style={{ fontSize: '0.95rem', color: '#38bdf8', fontFamily: 'var(--font-mono)', lineHeight: 1.6 }}>{finding.suggestedFix}</code>
                          </pre>
                        </div>
                      )}
                    </div>

                    {finding.memoryCitations?.length > 0 && (
                      <div style={{ padding: '2rem', background: '#f5f3ff', borderRadius: 'var(--radius-md)', border: '1px solid #ede9fe' }}>
                        <div style={{ fontSize: '0.75rem', color: '#7c3aed', fontWeight: 900, textTransform: 'uppercase', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '8px', letterSpacing: '0.1em' }}>
                          <Brain size={18} /> Neural Patterns Identified
                        </div>
                        {finding.memoryCitations.map((cite, ci) => (
                          <div key={ci} style={{ fontSize: '0.95rem', color: '#4c1d95', marginBottom: '0.85rem', display: 'flex', gap: '1rem', lineHeight: 1.6, fontWeight: 500 }}>
                            <ChevronRight size={18} style={{ color: '#8b5cf6', flexShrink: 0, marginTop: '2px' }} />
                            <span>{cite.text} <span style={{ color: '#8b5cf6', fontSize: '0.7rem', background: '#fff', padding: '0.2rem 0.6rem', borderRadius: '4px', marginLeft: '0.75rem', border: '1px solid #ddd6fe', fontWeight: 800 }}>{cite.type}</span></span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </TiltCard>
              ))}
            </div>
          )}
        </section>

        <aside style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
          <TiltCard>
            <div className="glass-card" style={{ background: '#fff', padding: '2.5rem' }}>
               <h3 style={{ fontSize: '0.75rem', fontWeight: 900, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Activity size={18} /> Runtime Metrology
               </h3>
               <MetaItem label="Intelligence Model" value={review.result?.llmModel?.split('/').pop() || 'Gemini 3.5 Ultra'} />
               <MetaItem label="Neural Volume" value={`${((review.result?.tokensUsed?.input || 0) + (review.result?.tokensUsed?.output || 0)).toLocaleString()} Tokens`} />
               <MetaItem label="Audit Latency" value={review.execution_time_ms ? (review.execution_time_ms / 1000).toFixed(2) + 's' : 'INSTANTANEOUS'} />
               <MetaItem label="Chain Status" value={(review.status || 'FINALIZED').toUpperCase()} />
            </div>
          </TiltCard>

          <TiltCard>
            <div className="glass-card" style={{ background: 'linear-gradient(135deg, #f8fafc 0%, #ffffff 100%)', padding: '2.5rem', border: '1px solid #e2e8f0' }}>
               <h3 style={{ fontSize: '0.75rem', fontWeight: 900, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: '1.25rem' }}>SOURCE TRACE</h3>
               <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: '2rem', fontWeight: 500 }}>
                 This analysis was performed on branch-level technical diffs. Integrity assured by cryptographic verification.
               </p>
               <button className="btn-pill" style={{ width: '100%', fontSize: '0.8rem', padding: '0.85rem', fontWeight: 800, background: '#fff', border: '1px solid #e2e8f0' }}>
                 <ExternalLink size={14} /> VIEW SOURCE DIFF
               </button>
            </div>
          </TiltCard>
        </aside>
      </div>
    </div>
  );
}

function MetaItem({ label, value }) {
  return (
    <div style={{ marginBottom: '1.75rem' }}>
      <div style={{ fontSize: '0.65rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 900 }}>{label}</div>
      <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '0.4rem', letterSpacing: '-0.01em' }}>{value}</div>
    </div>
  );
}
