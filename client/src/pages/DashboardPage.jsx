import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ShieldCheck, GitPullRequest, AlertTriangle, Brain,
  Plus, TrendingUp, Cpu, Activity
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import TiltCard from '../components/ui/TiltCard';

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
        <div style={{ width: 24, height: 24, border: '3px solid #f1f5f9', borderTopColor: 'var(--brand-primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
      </div>
    );
  }

  const criticalFindings = reviews.reduce((s, r) => s + (r.result?.findings?.filter(f => f.severity === 'critical')?.length || 0), 0);
  const totalMemories = reviews.reduce((s, r) => s + (r.result?.memoryRecallCount || 0), 0);

  const stats = [
    { label: 'Overall Reliability', value: `${reviews.length > 0 ? 98.4 : 100}%`, icon: <ShieldCheck size={22}/>, color: 'var(--green)' },
    { label: 'Intelligence Cycles', value: reviews.length, icon: <Cpu size={22}/>, color: 'var(--brand-primary)' },
    { label: 'Critical Anomalies', value: criticalFindings, icon: <AlertTriangle size={22}/>, color: 'var(--red)' },
    { label: 'Knowledge Points', value: totalMemories, icon: <Brain size={22}/>, color: 'var(--purple)' },
  ];

  return (
    <div className="animate-slide-up">
      {/* Header */}
      <header style={{ marginBottom: '3.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
             <Activity size={16} style={{ color: 'var(--brand-primary)' }} />
             <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--brand-primary)', textTransform: 'uppercase', letterSpacing: '0.15em' }}>Operational Intelligence</span>
          </div>
          <h2 style={{ fontSize: '2.75rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.05em' }}>
            {workspace?.name || 'Workspace Overview'}
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', marginTop: '0.25rem' }}>
            Predictive reliability and engineering oversight across all vectors.
          </p>
        </div>
        <Link to={`/workspace/${workspaceId}/review/new`} className="btn-pill btn-primary">
          <Plus size={18} /> Deploy Analysis
        </Link>
      </header>

      {/* Statistics Layer */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginBottom: '3rem' }}>
        {stats.map((s, i) => (
          <TiltCard key={i}>
            <div className="glass-card" style={{ padding: '2rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.15em' }}>{s.label}</span>
                <div style={{
                  width: 44, height: 44, borderRadius: '12px',
                  background: 'rgba(0, 0, 0, 0.02)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: s.color, border: `1px solid ${s.color}22`
                }}>{s.icon}</div>
              </div>
              <div style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>{s.value}</div>
            </div>
          </TiltCard>
        ))}
      </div>

      {/* Operation Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 1.2fr', gap: '2rem' }}>
        {/* Intelligence Ledger */}
        <TiltCard>
          <div className="glass-card" style={{ height: '100%', padding: '2.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)' }}>Mission Ledger</h3>
              <div style={{
                background: 'rgba(37, 99, 235, 0.05)', color: 'var(--brand-primary)',
                padding: '0.45rem 1rem', borderRadius: 'var(--radius-full)',
                fontSize: '0.7rem', fontWeight: 800, border: '1px solid rgba(37, 99, 235, 0.1)'
              }}>{reviews.length} PROBES ACTIVE</div>
            </div>

            {reviews.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '4rem 0' }}>
                <div style={{ width: 80, height: 80, margin: '0 auto 1.5rem', background: 'rgba(0,0,0,0.02)', borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Cpu size={32} style={{ color: 'var(--text-dim)' }} />
                </div>
                <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', marginBottom: '2rem' }}>Awaiting telemetry data initialization.</p>
                <Link to={`/workspace/${workspaceId}/review/new`} className="btn-pill-light">
                  Initialize Run
                </Link>
              </div>
            ) : (
              <div className="table-container">
                <table className="premium-table">
                  <thead>
                    <tr><th>Identifier</th><th>Status</th><th>Intel</th><th>Timestamp</th></tr>
                  </thead>
                  <tbody>
                    {reviews.slice(0, 10).map(review => (
                      <tr key={review._id}>
                        <td>
                          <Link to={`/workspace/${workspaceId}/review/${review._id}`} style={{ color: 'var(--brand-primary)', fontWeight: 700, textDecoration: 'none' }}>
                             {review.prNumber ? `PROBE-${review.prNumber}` : 'AUDIT-SEC'}
                          </Link>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, marginTop: '2px' }}>
                            {review.prTitle || 'Self-Initiated Review'}
                          </div>
                        </td>
                        <td>
                          <span className={`status-badge status-${review.status}`}>
                             {review.status}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 800 }}>
                            <Brain size={12} style={{ color: 'var(--purple)' }} /> {review.result?.memoryRecallCount || 0}
                          </div>
                        </td>
                        <td style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>
                          {new Date(review.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </TiltCard>

        {/* Intelligence Feeds */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <TiltCard>
            <div className="glass-card" style={{ padding: '2.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem' }}>
                <AlertTriangle size={18} style={{ color: 'var(--red)' }} />
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Anomalies</h3>
              </div>
              {incidents.length === 0 ? (
                <div style={{ padding: '2rem', textAlign: 'center', border: '1px dashed #e2e8f0', borderRadius: 'var(--radius-md)' }}>
                   <p style={{ color: 'var(--text-dim)', fontSize: '0.875rem', fontWeight: 600 }}>Zero critical alerts.</p>
                </div>
              ) : (
                incidents.slice(0, 4).map(inc => (
                  <div key={inc.id} style={{ 
                    padding: '1.25rem', borderRadius: 'var(--radius-md)', marginBottom: '1.25rem', 
                    border: '1px solid #f1f5f9', background: '#fff'
                  }}>
                    <div style={{ fontSize: '0.65rem', color: 'var(--red)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.5rem' }}>
                      {inc.severity || 'System Alert'}
                    </div>
                    <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>{inc.title}</div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{inc.description?.substring(0, 80)}...</div>
                  </div>
                ))
              )}
            </div>
          </TiltCard>

          <TiltCard>
            <div className="glass-card" style={{ padding: '2.5rem', background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.02), #fff)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                <TrendingUp size={20} style={{ color: 'var(--brand-secondary)' }} />
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Maturity</h3>
              </div>
              <p style={{ fontSize: '1rem', color: 'var(--text-secondary)', lineHeight: 1.7, fontWeight: 500 }}>
                Synthesized <strong style={{ color: 'var(--text-primary)' }}>{reviews.length}</strong> operational datasets into institutional memory.
              </p>
              <div style={{ marginTop: '2rem' }}>
                 <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                   <span style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)' }}>COVERAGE: 85%</span>
                 </div>
                 <div style={{ height: '4px', background: 'rgba(0,0,0,0.05)', borderRadius: '2px', overflow: 'hidden' }}>
                    <div style={{ width: '85%', height: '100%', background: 'linear-gradient(90deg, var(--brand-primary), var(--brand-secondary))' }} />
                 </div>
              </div>
            </div>
          </TiltCard>
        </div>
      </div>
    </div>
  );
}
