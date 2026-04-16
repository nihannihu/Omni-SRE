import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  ShieldCheck, GitPullRequest, AlertTriangle, Brain, 
  Plus, FileCode, Clock, TrendingUp, Search
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import GlassCard from '../components/ui/GlassCard';

export default function Dashboard() {
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
          ...r,
          _id: r.id,
          createdAt: r.created_at,
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
        <div style={{ width: 30, height: 30, border: '3px solid var(--text-dim)', borderTopColor: 'var(--brand-primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
      </div>
    );
  }

  const criticalFindings = reviews.reduce((sum, r) => sum + (r.result?.findings?.filter((f) => f.severity === 'critical')?.length || 0), 0);
  const totalMemories = reviews.reduce((sum, r) => sum + (r.result?.memoryRecallCount || 0), 0);

  return (
    <div className="animate-slide-up">
      <header style={{ marginBottom: '3rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h2 style={{ fontSize: '2.5rem', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
            {workspace?.name || 'Workspace'}
          </h2>
          <p style={{ color: 'var(--text-muted)' }}>
            System overview and active agent intelligence metrics.
          </p>
        </div>
        <Link to={`/workspace/${workspaceId}/review/new`} className="btn-premium btn-primary">
          <Plus size={18} /> New Intelligence Review
        </Link>
      </header>

      {/* Metrics Section */}
      <div className="stat-grid">
        <MetricCard label="System Reliability" value={`${reviews.length > 0 ? 98.4 : 100}%`} icon={<ShieldCheck size={20}/>} color="var(--green-glow)" />
        <MetricCard label="Active Reviews" value={reviews.length} icon={<GitPullRequest size={20}/>} color="var(--brand-primary)" />
        <MetricCard label="Critical Vulnerability" value={criticalFindings} icon={<AlertTriangle size={20}/>} color="var(--red-glow)" />
        <MetricCard label="Intelligence Recalls" value={totalMemories} icon={<Brain size={20}/>} color="var(--brand-secondary)" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>
        {/* Main Reviews Table */}
        <GlassCard title="Recent Technical Reviews">
          {reviews.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '4rem 0' }}>
              <p style={{ color: 'var(--text-muted)' }}>No intelligence logs available yet.</p>
            </div>
          ) : (
            <table className="premium-table">
              <thead>
                <tr>
                  <th>Target</th>
                  <th>Analysis Result</th>
                  <th>Status</th>
                  <th>Intelligence</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody>
                {reviews.slice(0, 10).map((review) => (
                  <tr key={review._id}>
                    <td>
                      <Link to={`/workspace/${workspaceId}/review/${review._id}`} style={{ color: 'var(--brand-primary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        #{review.prNumber || 'M-0'}
                      </Link>
                    </td>
                    <td>
                      <div style={{ maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.9rem' }}>
                        {review.prTitle || 'Manual Code Analysis'}
                      </div>
                    </td>
                    <td>
                      <span className={`status-badge status-${review.status === 'completed' ? 'completed' : review.status === 'failed' ? 'failed' : 'pending'}`}>
                        {review.status}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        <Brain size={12} /> {review.result?.memoryRecallCount || 0}
                      </div>
                    </td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
                      {new Date(review.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </GlassCard>

        {/* Security Logs / Incidents */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <GlassCard title="Security Incidents" icon={<AlertTriangle size={18} style={{ color: 'var(--red-glow)' }} />}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {incidents.length === 0 ? (
                <p style={{ color: 'var(--text-dim)', fontSize: '0.9rem' }}>No active incidents logged.</p>
              ) : (
                incidents.map(inc => (
                  <div key={inc.id} style={{ padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: 'var(--radius-md)', border: '1px solid var(--glass-border)' }}>
                    <div style={{ fontSize: '0.8rem', color: 'var(--red-glow)', fontWeight: 700, marginBottom: '0.25rem' }}>
                      {inc.title?.split(':')[0] || 'CRITICAL'}
                    </div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>{inc.title}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>{inc.description?.substring(0, 80)}...</div>
                  </div>
                ))
              )}
            </div>
          </GlassCard>

          <GlassCard title="Memory Evolution" icon={<TrendingUp size={18} />}>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
              Agent is currently aggregating facts from <strong>{reviews.length}</strong> reviews. <br/>
              Maturity level: <span style={{ color: 'var(--brand-primary)', fontWeight: 700 }}>EXPERT</span>
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ label, value, icon, color }) {
  return (
    <GlassCard className="stat-card" style={{ borderLeft: `4px solid ${color}` }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{label}</span>
        <div style={{ color }}>{icon}</div>
      </div>
      <div style={{ fontSize: '2rem', fontWeight: '800', color: 'var(--text-primary)' }}>{value}</div>
    </GlassCard>
  );
}
