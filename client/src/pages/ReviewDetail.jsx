import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Brain, Clock, FileCode, ShieldAlert, CheckCircle } from 'lucide-react';
import { reviewAPI } from '../services/api';

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

  // Poll while in progress
  useEffect(() => {
    if (!polling) return;
    const interval = setInterval(loadReview, 3000);
    return () => clearInterval(interval);
  }, [polling]);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
        <div className="loader"><span className="spinner" /> Loading review...</div>
      </div>
    );
  }

  if (!review) {
    return <div className="empty-state"><h3>Review not found</h3></div>;
  }

  const findings = review.result?.findings || [];

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <Link to={`/workspace/${review.workspaceId}`} style={{ fontSize: 13, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 8 }}>
          <ArrowLeft size={14} /> Back to Dashboard
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <h2>PR #{review.prNumber || '—'} — {review.prTitle || 'Manual Review'}</h2>
          <span className={`badge badge-${review.status === 'completed' ? 'success' : review.status === 'failed' ? 'critical' : 'pending'}`}>
            {review.status}
          </span>
        </div>
        <p>
          by {review.prAuthor} • {new Date(review.createdAt).toLocaleString()}
          {review.result?.memoryRecallCount > 0 && (
            <span style={{ marginLeft: 16, color: 'var(--brand-primary-light)' }}>
              <Brain size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />
              {review.result.memoryRecallCount} memories recalled
            </span>
          )}
        </p>
      </div>

      <div className="page-body">
        {/* Summary Stats */}
        {review.status === 'completed' && (
          <div className="stat-grid" style={{ marginBottom: 'var(--space-xl)' }}>
            <div className="stat-card" style={{ '--stat-accent': 'var(--accent-red)' }}>
              <div className="stat-label">Findings</div>
              <div className="stat-value">{findings.length}</div>
            </div>
            
            {/* The 25% Hackathon Judging Magic: Memory Maturity Signal */}
            <div className="stat-card" style={{ '--stat-accent': review.result?.maturity?.level === 'EXPERT' ? 'var(--accent-orange)' : 'var(--brand-primary)' }}>
              <div className="stat-label">Agentic Maturity</div>
              <div className="stat-value" style={{ fontSize: 20 }}>
                {review.result?.maturity?.level || 'COLD'}
              </div>
              <div className="stat-change" style={{ color: 'var(--text-muted)' }}>
                {review.result?.maturity?.observations > 0 
                  ? <><Brain size={12}/> {review.result?.maturity?.totalFacts} facts, {review.result?.maturity?.observations} obs</>
                  : <><Brain size={12}/> Baseline Analysis</>}
              </div>
            </div>

            <div className="stat-card" style={{ '--stat-accent': 'var(--accent-cyan)' }}>
              <div className="stat-label">Model Engine</div>
              <div className="stat-value" style={{ fontSize: 16, fontFamily: 'var(--font-mono)' }}>
                {review.result?.llmModel?.split('/')[1] || '—'}
              </div>
            </div>
            
            <div className="stat-card" style={{ '--stat-accent': 'var(--accent-green)' }}>
              <div className="stat-label">Token Budget</div>
              <div className="stat-value" style={{ fontSize: 20 }}>
                {((review.result?.tokensUsed?.input || 0) + (review.result?.tokensUsed?.output || 0)).toLocaleString()}
              </div>
            </div>
          </div>
        )}

        {/* In-progress state */}
        {(review.status === 'in_progress' || review.status === 'pending') && (
          <div className="empty-state">
            <div className="empty-state-icon"><span className="spinner" style={{ width: 28, height: 28 }} /></div>
            <h3>Review in progress...</h3>
            <p>The agent is recalling memories, analyzing the diff, and generating findings. This page auto-refreshes.</p>
          </div>
        )}

        {/* Error state */}
        {review.status === 'failed' && review.errorLog && (
          <div className="auth-error" style={{ marginBottom: 'var(--space-xl)' }}>
            <strong>Review Failed:</strong> {review.errorLog}
          </div>
        )}

        {/* Findings List */}
        {findings.length > 0 && (
          <>
            <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 'var(--space-md)' }}>
              Findings
            </h3>
            {findings.map((finding, idx) => (
              <div key={finding.id || idx} className={`finding-card ${finding.severity}`} style={{ animationDelay: `${idx * 80}ms` }}>
                <div className="finding-header">
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span className={`badge badge-${finding.severity}`}>
                        {finding.severity}
                      </span>
                      <span className={`badge badge-${finding.category === 'security' ? 'critical' : 'info'}`} style={{ background: 'var(--bg-hover)', borderColor: 'var(--border-default)' }}>
                        {finding.category}
                      </span>
                    </div>
                    <div className="finding-title">{finding.title}</div>
                    {finding.file && (
                      <div className="finding-location">
                        <FileCode size={12} style={{ marginRight: 4 }} />
                        {finding.file}{finding.line ? `:${finding.line}` : ''}
                      </div>
                    )}
                  </div>
                  {finding.confidence > 0 && (
                    <span style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                      {Math.round(finding.confidence * 100)}% conf
                    </span>
                  )}
                </div>

                <div className="finding-description">{finding.description}</div>

                {/* Memory Citations */}
                {finding.memoryCitations?.length > 0 && (
                  <div className="finding-citations">
                    <div className="finding-citations-header">
                      <Brain size={14} /> Historical Context
                    </div>
                    {finding.memoryCitations.map((cite, ci) => (
                      <div key={ci} className="citation-item">
                        <span className="citation-dot" />
                        <div>
                          <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>[{cite.type}]</span>{' '}
                          {cite.text}
                          {cite.occurredAt && (
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                              <Clock size={10} /> {new Date(cite.occurredAt).toLocaleDateString()}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Suggested Fix */}
                {finding.suggestedFix && (
                  <div className="suggested-fix">
                    <div className="suggested-fix-header">
                      <CheckCircle size={14} style={{ marginRight: 4 }} /> Suggested Fix
                    </div>
                    <code>{finding.suggestedFix}</code>
                  </div>
                )}
              </div>
            ))}
          </>
        )}

        {/* Retained badge */}
        {review.retainedToHindsight && (
          <div style={{
            marginTop: 'var(--space-xl)', padding: 'var(--space-md)', background: 'rgba(34, 197, 94, 0.06)',
            border: '1px solid rgba(34, 197, 94, 0.15)', borderRadius: 'var(--radius-md)',
            display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: 'var(--accent-green)',
          }}>
            <Brain size={16} /> This review has been retained into team memory. Future reviews will learn from these findings.
          </div>
        )}
      </div>
    </div>
  );
}
