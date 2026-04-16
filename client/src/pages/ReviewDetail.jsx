import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  ArrowLeft, Brain, Clock, FileCode, ShieldAlert, CheckCircle,
  ExternalLink, ChevronRight, Zap
} from 'lucide-react';
import { reviewAPI } from '../services/api';
import GlassCard from '../components/ui/GlassCard';

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
        <div style={{ width: 30, height: 30, border: '3px solid var(--text-dim)', borderTopColor: 'var(--brand-primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
      </div>
    );
  }

  if (!review) return <div style={{ textAlign: 'center', padding: '4rem' }}>Error: Review not found.</div>;

  const findings = review.result?.findings || [];

  return (
    <div className="animate-slide-up">
      <nav style={{ marginBottom: '2rem' }}>
        <Link to={`/workspace/${review.workspaceId}`} style={{ fontSize: '0.9rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none' }}>
          <ArrowLeft size={16} /> Back to Control Center
        </Link>
      </nav>

      <header style={{ marginBottom: '3rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
            <h2 style={{ fontSize: '2rem', fontWeight: '800', color: 'var(--text-primary)' }}>
              PR #{review.prNumber || 'M-0'} Review
            </h2>
            <span className={`status-badge status-${review.status === 'completed' ? 'completed' : review.status === 'failed' ? 'failed' : 'pending'}`}>
              {review.status}
            </span>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '1rem' }}>
            {review.prTitle || 'Manual Analysis Run'} • by {review.prAuthor || 'System Agent'}
          </p>
        </div>
        
        {review.result?.memoryRecallCount > 0 && (
          <div style={{ 
            display: 'flex', alignItems: 'center', gap: '0.75rem', 
            background: 'rgba(129, 140, 248, 0.1)', border: '1px solid rgba(129, 140, 248, 0.2)',
            padding: '0.75rem 1.25rem', borderRadius: 'var(--radius-md)', color: 'var(--brand-secondary)'
          }}>
            <Brain size={20} />
            <div>
              <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase' }}>Hindsight Confidence</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 800 }}>{review.result.memoryRecallCount} Context Citations</div>
            </div>
          </div>
        )}
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr', gap: '2.5rem' }}>
        <section>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: '700' }}>Deep Analysis Findings</h3>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{findings.length} issues identified</span>
          </div>

          {findings.length === 0 ? (
            <GlassCard style={{ padding: '3rem', textAlign: 'center' }}>
              <CheckCircle size={40} style={{ color: 'var(--green-glow)', marginBottom: '1rem' }} />
              <h3>High Confidence Pass</h3>
              <p style={{ color: 'var(--text-muted)' }}>No high-severity findings were detected in this analysis cycle.</p>
            </GlassCard>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {findings.map((finding, idx) => (
                <GlassCard key={idx} style={{ borderLeft: `4px solid var(--${finding.severity === 'critical' || finding.severity === 'high' ? 'red-glow' : 'yellow-glow'})` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                        <span className={`status-badge status-${finding.severity === 'critical' ? 'failed' : 'pending'}`} style={{ fontSize: '0.65rem' }}>
                          {finding.severity}
                        </span>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
                          {finding.category || 'Security'}
                        </span>
                      </div>
                      <h4 style={{ fontSize: '1.1rem', fontWeight: '700' }}>{finding.title}</h4>
                    </div>
                    {finding.confidence && (
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textAlign: 'right' }}>
                        Agent Confidence<br/>
                        <span style={{ color: 'var(--brand-primary)', fontWeight: 800 }}>{Math.round(finding.confidence * 100)}%</span>
                      </div>
                    )}
                  </div>

                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: 1.6, marginBottom: '1.5rem' }}>
                    {finding.description}
                  </p>

                  <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: 'var(--radius-md)', padding: '1rem', border: '1px solid var(--glass-border)', marginBottom: '1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                      <FileCode size={14} /> <span>{finding.file}</span> {finding.line && <span>:L{finding.line}</span>}
                    </div>
                    {finding.suggestedFix && (
                      <div style={{ borderTop: '1px solid var(--glass-border)', paddingTop: '1rem' }}>
                        <div style={{ fontSize: '0.7rem', color: 'var(--brand-primary)', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Zap size={10} /> Remediation Suggestion
                        </div>
                        <code style={{ fontSize: '0.85rem', color: '#6ee7b7' }}>{finding.suggestedFix}</code>
                      </div>
                    )}
                  </div>

                  {finding.memoryCitations?.length > 0 && (
                    <div style={{ padding: '1rem', background: 'rgba(129, 140, 248, 0.05)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(129, 140, 248, 0.1)' }}>
                      <div style={{ fontSize: '0.7rem', color: 'var(--brand-secondary)', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Brain size={12} /> Institutional Memory Calibration
                      </div>
                      {finding.memoryCitations.map((cite, ci) => (
                        <div key={ci} style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', display: 'flex', gap: '0.75rem' }}>
                          <ChevronRight size={14} style={{ color: 'var(--brand-secondary)', flexShrink: 0, marginTop: '2px' }} />
                          <span>{cite.text} <span style={{ color: 'var(--text-dim)', fontSize: '0.75rem' }}>({cite.type})</span></span>
                        </div>
                      ))}
                    </div>
                  )}
                </GlassCard>
              ))}
            </div>
          )}
        </section>

        <aside style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <GlassCard title="Execution Metadata">
            <MetaItem label="Model" value={review.result?.llmModel?.split('/').pop() || 'Gemini 1.5 Pro'} />
            <MetaItem label="Budget" value={`${((review.result?.tokensUsed?.input || 0) + (review.result?.tokensUsed?.output || 0)).toLocaleString()} Tokens`} />
            <MetaItem label="Duration" value={`${review.execution_time_ms ? (review.execution_time_ms / 1000).toFixed(1) + 's' : '—'}`} />
            <MetaItem label="Maturity" value={review.result?.maturity?.level || 'BASELINE'} />
          </GlassCard>

          <GlassCard title="Source Integrity">
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>Analysis performed on branch diff for repo connectivity verification.</p>
            <button className="btn-premium" style={{ width: '100%', fontSize: '0.8rem', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)' }}>
              <ExternalLink size={14} /> View Provider Diff
            </button>
          </GlassCard>
        </aside>
      </div>
    </div>
  );
}

function MetaItem({ label, value }) {
  return (
    <div style={{ marginBottom: '1rem' }}>
      <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
      <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>{value}</div>
    </div>
  );
}
