import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ShieldCheck, GitPullRequest, AlertTriangle, Brain,
  Plus, TrendingUp, FileCode, Clock
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import TiltCard from '../components/ui/TiltCard';
import omniLogo from '../assets/omni-logo.jpeg';

export default function DashboardPage() {
  const { workspaceId } = useParams();
  const [workspace, setWorkspace] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const { data: wsData } = await supabase.from('workspaces').select('*').eq('id', workspaceId).single();
        if (wsData) setWorkspace(wsData);

        const { data: incData } = await supabase.from('incidents')
          .select('*').eq('workspace_id', workspaceId).order('created_at', { ascending: false }).limit(10);
        setIncidents(incData || []);

        const { data: revData } = await supabase.from('reviews')
          .select('*').eq('workspace_id', workspaceId).order('created_at', { ascending: false });

        const mappedReviews = (revData || []).map(r => ({
          ...r, _id: r.id, createdAt: r.created_at,
          prNumber: r.pr_number || r.pr_url?.split('/').pop(),
          prTitle: r.pr_title
        }));
        setReviews(mappedReviews);
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
        <div style={{ width: 30, height: 30, border: '3px solid #e5e7eb', borderTopColor: '#0a0a0a', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
      </div>
    );
  }

  const criticalFindings = reviews.reduce((s, r) => s + (r.result?.findings?.filter(f => f.severity === 'critical')?.length || 0), 0);
  const totalMemories = reviews.reduce((s, r) => s + (r.result?.memoryRecallCount || 0), 0);

  const stats = [
    { label: 'System Reliability', value: `${reviews.length > 0 ? 98.4 : 100}%`, icon: <ShieldCheck size={20}/>, color: '#10b981' },
    { label: 'Active Reviews', value: reviews.length, icon: <GitPullRequest size={20}/>, color: '#3b82f6' },
    { label: 'Critical Vulnerability', value: criticalFindings, icon: <AlertTriangle size={20}/>, color: '#ef4444' },
    { label: 'Intelligence Recalls', value: totalMemories, icon: <Brain size={20}/>, color: '#8b5cf6' },
  ];

  return (
    <div className="animate-slide-up">
      {/* Header */}
      <header style={{ marginBottom: '2.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h2 style={{ fontSize: '2.25rem', fontWeight: 900, marginBottom: '0.35rem' }}>
            {workspace?.name || 'Workspace'}
          </h2>
          <p style={{ color: '#9ca3af', fontSize: '0.9rem' }}>
            System overview and active agent intelligence metrics.
          </p>
        </div>
        <Link to={`/workspace/${workspaceId}/review/new`} className="btn-pill btn-dark" style={{ whiteSpace: 'nowrap' }}>
          <Plus size={16} /> New Intelligence Review
        </Link>
      </header>

      {/* Stat Cards */}
      <div className="stat-grid">
        {stats.map((s, i) => (
          <TiltCard key={i} style={{ borderLeft: `4px solid ${s.color}`, padding: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.12em' }}>{s.label}</span>
              <div style={{
                width: 32, height: 32, borderRadius: '10px',
                background: `${s.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: s.color,
              }}>{s.icon}</div>
            </div>
            <div style={{ fontSize: '2.5rem', fontWeight: 900, color: '#0a0a0a' }}>{s.value}</div>
          </TiltCard>
        ))}
      </div>

      {/* Content Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem' }}>
        {/* Reviews Table */}
        <TiltCard>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800 }}>Recent Technical Reviews</h3>
            {reviews.length > 0 && (
              <span style={{
                background: '#3b82f615', color: '#3b82f6',
                padding: '0.2rem 0.6rem', borderRadius: '999px',
                fontSize: '0.7rem', fontWeight: 700,
              }}>{reviews.length}</span>
            )}
          </div>

          {reviews.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem 0' }}>
              <div style={{
                width: 72, height: 72, borderRadius: '50%',
                background: '#ffffff', padding: '8px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 1.5rem',
                boxShadow: '0 8px 24px rgba(56, 189, 248, 0.15)',
              }}>
                <img src={omniLogo} alt="Omni-SRE" style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: '50%' }} />
              </div>
              <p style={{ color: '#9ca3af', fontSize: '0.875rem', marginBottom: '1.5rem' }}>No intelligence logs available yet.</p>
              <Link to={`/workspace/${workspaceId}/review/new`} className="btn-pill btn-dark" style={{ fontSize: '0.8rem' }}>
                Start Review
              </Link>
            </div>
          ) : (
            <table className="premium-table">
              <thead>
                <tr><th>Target</th><th>Analysis</th><th>Status</th><th>Intel</th><th>Time</th></tr>
              </thead>
              <tbody>
                {reviews.slice(0, 10).map(review => (
                  <tr key={review._id}>
                    <td>
                      <Link to={`/workspace/${workspaceId}/review/${review._id}`} style={{ color: '#3b82f6', fontWeight: 600 }}>
                        #{review.prNumber || 'M-0'}
                      </Link>
                    </td>
                    <td style={{ maxWidth: '250px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {review.prTitle || 'Manual Code Analysis'}
                    </td>
                    <td>
                      <span className={`status-badge status-${review.status === 'completed' ? 'completed' : review.status === 'failed' ? 'failed' : 'pending'}`}>
                        {review.status}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem', color: '#9ca3af' }}>
                        <Brain size={12} /> {review.result?.memoryRecallCount || 0}
                      </div>
                    </td>
                    <td style={{ fontSize: '0.75rem', color: '#d1d5db', fontFamily: 'var(--font-mono)' }}>
                      {new Date(review.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </TiltCard>

        {/* Right Panels */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <TiltCard>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <AlertTriangle size={16} style={{ color: '#f59e0b' }} />
              <h3 style={{ fontSize: '1rem', fontWeight: 800 }}>Security Incidents</h3>
            </div>
            {incidents.length === 0 ? (
              <p style={{ color: '#d1d5db', fontSize: '0.8rem' }}>No active incidents logged.</p>
            ) : (
              incidents.slice(0, 3).map(inc => (
                <div key={inc.id} style={{ padding: '0.75rem', background: 'rgba(0,0,0,0.02)', borderRadius: '10px', marginBottom: '0.5rem', border: '1px solid rgba(0,0,0,0.04)' }}>
                  <div style={{ fontSize: '0.7rem', color: '#ef4444', fontWeight: 700, marginBottom: '0.15rem' }}>
                    {inc.title?.split(':')[0] || 'CRITICAL'}
                  </div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#0a0a0a', marginBottom: '0.25rem' }}>{inc.title}</div>
                  <div style={{ fontSize: '0.7rem', color: '#9ca3af', lineHeight: 1.4 }}>{inc.description?.substring(0, 80)}...</div>
                </div>
              ))
            )}
          </TiltCard>

          <TiltCard>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <TrendingUp size={16} style={{ color: '#8b5cf6' }} />
              <h3 style={{ fontSize: '1rem', fontWeight: 800 }}>Memory Evolution</h3>
            </div>
            <div style={{ fontSize: '0.8rem', color: '#9ca3af', lineHeight: 1.7 }}>
              Agent is aggregating facts from <strong style={{ color: '#0a0a0a' }}>{reviews.length}</strong> reviews. <br/>
              Maturity: <span style={{
                background: '#8b5cf620', color: '#8b5cf6',
                padding: '0.15rem 0.5rem', borderRadius: '999px',
                fontSize: '0.65rem', fontWeight: 700,
              }}>EXPERT</span>
            </div>
          </TiltCard>
        </div>
      </div>
    </div>
  );
}
