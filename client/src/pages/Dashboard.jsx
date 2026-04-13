import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ShieldCheck, GitPullRequest, AlertTriangle, Brain,
  Plus, FileCode, Clock, TrendingUp
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { reviewAPI } from '../services/api';

export default function Dashboard() {
  const { workspaceId } = useParams();
  const [workspace, setWorkspace] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        // Fetch workspace from Supabase
        const { data: wsData, error: wsError } = await supabase
          .from('workspaces')
          .select('id, name, created_by, created_at')
          .eq('id', workspaceId)
          .single();

        if (wsError) {
          console.error('Error fetching workspace:', wsError);
        } else {
          setWorkspace(wsData);
        }

        // Fetch incidents from Supabase
        const { data: incData, error: incError } = await supabase
          .from('incidents')
          .select('*')
          .eq('workspace_id', workspaceId)
          .order('created_at', { ascending: false })
          .limit(10);

        if (incError) {
          console.error('Error fetching incidents:', incError);
        } else {
          setIncidents(incData || []);
        }

        // Fetch reviews directly from Supabase
        try {
          const { data: revData, error: revError } = await supabase
            .from('reviews')
            .select('*')
            .eq('workspace_id', workspaceId)
            .order('created_at', { ascending: false });

          if (revError) throw revError;
          
          // Map to match the existing UI expectations (e.g. _id -> id, createdAt -> created_at)
          const mappedReviews = (revData || []).map(r => ({
            ...r,
            _id: r.id,
            createdAt: r.created_at,
            prNumber: r.pr_number || r.pr_url?.split('/').pop(),
            prTitle: r.pr_title
          }));
          
          setReviews(mappedReviews);
        } catch (revErr) {
          console.error('Reviews fetch failed:', revErr);
        }

      } catch (err) {
        console.error('Dashboard load error:', err);
      } finally {
        setLoading(false);
      }
    };
    if (workspaceId) load();
  }, [workspaceId]);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
        <div className="loader"><span className="spinner" /> Loading workspace...</div>
      </div>
    );
  }

  const completedReviews = reviews.filter((r) => r.status === 'completed');
  const totalFindings = completedReviews.reduce(
    (sum, r) => sum + (r.result?.findings?.length || 0), 0
  );
  const criticalFindings = completedReviews.reduce(
    (sum, r) => sum + (r.result?.findings?.filter((f) => f.severity === 'critical')?.length || 0), 0
  );
  const totalMemories = completedReviews.reduce(
    (sum, r) => sum + (r.result?.memoryRecallCount || 0), 0
  );

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h2>{workspace?.name || 'Workspace'}</h2>
        <p>Security-aware code review powered by institutional memory</p>
      </div>

      <div className="page-body">
        {/* Stats */}
        <div className="stat-grid">
          <div className="stat-card" style={{ '--stat-accent': 'var(--brand-primary)' }}>
            <div className="stat-label">Total Reviews</div>
            <div className="stat-value">{reviews.length}</div>
            <div className="stat-change positive">
              <TrendingUp size={12} /> Active learning
            </div>
          </div>
          <div className="stat-card" style={{ '--stat-accent': 'var(--accent-red)' }}>
            <div className="stat-label">Critical Findings</div>
            <div className="stat-value">{criticalFindings}</div>
          </div>
          <div className="stat-card" style={{ '--stat-accent': 'var(--accent-yellow)' }}>
            <div className="stat-label">Incidents Logged</div>
            <div className="stat-value">{incidents.length}</div>
          </div>
          <div className="stat-card" style={{ '--stat-accent': 'var(--accent-cyan)' }}>
            <div className="stat-label">Memories Recalled</div>
            <div className="stat-value">{totalMemories}</div>
            <div className="stat-change positive">
              <Brain size={12} /> Hindsight active
            </div>
          </div>
        </div>

        {/* Recent Reviews */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-md)' }}>
          <h3 style={{ fontSize: 18, fontWeight: 600 }}>Recent Reviews</h3>
          <Link to={`/workspace/${workspaceId}/review/new`} className="btn btn-primary btn-sm">
            <Plus size={14} /> New Review
          </Link>
        </div>

        {reviews.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon"><GitPullRequest size={28} /></div>
            <h3>No reviews yet</h3>
            <p>Trigger your first context-aware code review to start building institutional memory.</p>
            <Link to={`/workspace/${workspaceId}/review/new`} className="btn btn-primary">
              <Plus size={14} /> Start First Review
            </Link>
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>PR</th>
                  <th>Title</th>
                  <th>Status</th>
                  <th>Findings</th>
                  <th>Memories</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody>
                {reviews.slice(0, 10).map((review) => (
                  <tr key={review._id} style={{ cursor: 'pointer' }}>
                    <td>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13 }}>
                        #{review.prNumber || '—'}
                      </span>
                    </td>
                    <td>
                      <Link to={`/workspace/${workspaceId}/review/${review._id}`} style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
                        {review.prTitle || 'Manual Review'}
                      </Link>
                    </td>
                    <td>
                      <div className="review-status">
                        <span className={`review-status-dot ${review.status}`} />
                        <span style={{ fontSize: 13, textTransform: 'capitalize' }}>{review.status}</span>
                      </div>
                    </td>
                    <td>
                      {review.result?.findings?.length || 0}
                      {review.result?.findings?.some((f) => f.severity === 'critical') && (
                        <span className="badge badge-critical" style={{ marginLeft: 8 }}>CRIT</span>
                      )}
                    </td>
                    <td>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--text-muted)' }}>
                        <Brain size={14} /> {review.result?.memoryRecallCount || 0}
                      </span>
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontSize: 13, fontFamily: 'var(--font-mono)' }}>
                      {new Date(review.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Incidents */}
        {incidents.length > 0 && (
          <div style={{ marginTop: 'var(--space-2xl)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-md)' }}>
              <h3 style={{ fontSize: 18, fontWeight: 600 }}>
                <AlertTriangle size={18} style={{ marginRight: 8, verticalAlign: 'middle', color: 'var(--accent-red)' }} />
                Security Incidents
              </h3>
              <Link to={`/workspace/${workspaceId}/incident`} className="btn btn-sm" style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}>
                <Plus size={14} /> Log Incident
              </Link>
            </div>
            <div className="card-grid">
              {incidents.slice(0, 6).map((inc) => (
                <div key={inc.id} className="card">
                  <div className="card-header">
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--text-muted)' }}>
                      {inc.title?.split(':')[0] || 'INC'}
                    </span>
                  </div>
                  <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>{inc.title}</h4>
                  <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5 }}>
                    {inc.description?.substring(0, 120)}{inc.description?.length > 120 ? '...' : ''}
                  </p>
                  {inc.new_rule && (
                    <div style={{ marginTop: 12, fontSize: 12, color: 'var(--accent-green)', display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(34,197,94,0.08)', padding: '4px 8px', borderRadius: 'var(--radius-sm)' }}>
                      <Brain size={12} /> Rule: {inc.new_rule.substring(0, 80)}{inc.new_rule.length > 80 ? '...' : ''}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
