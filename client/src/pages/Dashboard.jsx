import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileCode2, AlertTriangle, Bug, TrendingUp, Brain, Plus } from 'lucide-react';
import { reviewAPI, incidentAPI, workspaceAPI } from '../services/api';

const Dashboard = () => {
  const navigate = useNavigate();
  const [reviews, setReviews] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [workspace, setWorkspace] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // 1. Get current workspace
        const { data: workspaces } = await workspaceAPI.list();
        if (workspaces && workspaces.length > 0) {
          const ws = workspaces[0];
          setWorkspace(ws);
          
          // 2. Get reviews and incidents for this workspace
          const [reviewsRes, incidentsRes] = await Promise.all([
            reviewAPI.list(ws.id),
            incidentAPI.list(ws.id)
          ]);
          
          setReviews(reviewsRes.data || []);
          setIncidents(incidentsRes.data || []);
        }
      } catch (err) {
        console.error('Failed to fetch dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: 'var(--text-secondary)' }}>
        <p>Syncing institutional memory...</p>
      </div>
    );
  }

  const criticalFindings = reviews.reduce((sum, r) => sum + (r.result?.findings?.filter(f => f.severity === 'critical')?.length || 0), 0);
  const totalMemories = reviews.reduce((sum, r) => sum + (r.result?.memoryRecallCount || 0), 0);

  return (
    <div style={{ padding: '40px' }}>
      
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '28px', color: 'var(--bg-darker)' }}>{workspace?.name || 'My Engineering Workspace'}</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Security-aware code review powered by institutional memory</p>
      </div>

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '32px', marginBottom: '32px' }}>
        <div className="card" style={{ borderTop: '3px solid var(--accent-purple)', paddingTop: '21px' }}>
          <div style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>TOTAL REVIEWS</div>
          <div style={{ fontSize: '40px', fontWeight: 'bold', color: 'var(--bg-darker)', margin: '8px 0' }}>{reviews.length}</div>
          <div style={{ fontSize: '12px', color: 'var(--accent-green)', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <TrendingUp size={12} />
            Active learning
          </div>
        </div>

        <div className="card" style={{ borderTop: '3px solid var(--accent-red)', paddingTop: '21px' }}>
          <div style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>CRITICAL FINDINGS</div>
          <div style={{ fontSize: '40px', fontWeight: 'bold', color: 'var(--bg-darker)', margin: '8px 0' }}>{criticalFindings}</div>
          <div style={{ fontSize: '12px', color: 'var(--accent-red)', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--accent-red)' }} />
            {criticalFindings > 0 ? 'Action required' : 'System secure'}
          </div>
        </div>

        <div className="card" style={{ borderTop: '3px solid var(--accent-orange)', paddingTop: '21px' }}>
          <div style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>INCIDENTS LOGGED</div>
          <div style={{ fontSize: '40px', fontWeight: 'bold', color: 'var(--bg-darker)', margin: '8px 0' }}>{incidents.length}</div>
          <div style={{ fontSize: '12px', color: 'var(--accent-orange)' }}>Used in next review</div>
        </div>

        <div className="card" style={{ borderTop: '3px solid var(--secondary)', paddingTop: '21px' }}>
          <div style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>MEMORIES RECALLED</div>
          <div style={{ fontSize: '40px', fontWeight: 'bold', color: 'var(--bg-darker)', margin: '8px 0' }}>{totalMemories}</div>
          <div style={{ fontSize: '12px', color: 'var(--secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Brain size={12} /> Hindsight active
          </div>
        </div>
      </div>

      {/* Recent Reviews + Incidents Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '32px' }}>
        
        {/* Recent Reviews */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <h2 style={{ fontSize: '20px' }}>Recent Reviews</h2>
            <button className="btn btn-primary" style={{ height: '36px', padding: '0 16px', fontSize: '14px' }} onClick={() => navigate('/new-review')}>
              <Plus size={14} style={{ marginRight: 6 }} /> New Review
            </button>
          </div>
          
          {reviews.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '64px 0' }}>
              <div style={{ width: '64px', height: '64px', backgroundColor: 'var(--bg-page)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
                <FileCode2 size={32} color="var(--text-muted)" />
              </div>
              <h3 style={{ fontSize: '18px', marginBottom: '8px' }}>No reviews yet</h3>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '24px', textAlign: 'center', maxWidth: '400px' }}>
                Trigger your first context-aware code review to start building institutional memory.
              </p>
              <button className="btn btn-primary" style={{ height: '44px', padding: '0 24px' }} onClick={() => navigate('/new-review')}>
                Start First Review
              </button>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-light)' }}>
                    <th style={{ padding: '12px 0', fontSize: '12px', color: 'var(--text-secondary)' }}>PR</th>
                    <th style={{ padding: '12px 0', fontSize: '12px', color: 'var(--text-secondary)' }}>TITLE</th>
                    <th style={{ padding: '12px 0', fontSize: '12px', color: 'var(--text-secondary)' }}>STATUS</th>
                    <th style={{ padding: '12px 0', fontSize: '12px', color: 'var(--text-secondary)' }}>FINDINGS</th>
                    <th style={{ padding: '12px 0', fontSize: '12px', color: 'var(--text-secondary)' }}>TIME</th>
                  </tr>
                </thead>
                <tbody>
                  {reviews.slice(0, 5).map(review => (
                    <tr key={review.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                      <td style={{ padding: '16px 0', fontFamily: 'JetBrains Mono', fontSize: '13px' }}>#{review.pr_number || '—'}</td>
                      <td style={{ padding: '16px 0', fontWeight: '500' }}>{review.pr_title || 'Review'}</td>
                      <td style={{ padding: '16px 0' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', textTransform: 'capitalize', fontSize: '13px' }}>
                          <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: review.status === 'completed' ? 'var(--accent-green)' : 'var(--accent-orange)' }} />
                          {review.status}
                        </div>
                      </td>
                      <td style={{ padding: '16px 0' }}>{review.result?.findings?.length || 0} alerts</td>
                      <td style={{ padding: '16px 0', color: 'var(--text-muted)', fontSize: '13px' }}>{new Date(review.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Security Incidents */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <h2 style={{ fontSize: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertTriangle color="var(--accent-orange)" size={20} />
              Security Incidents
            </h2>
            <button className="btn btn-ghost" style={{ height: '36px', padding: '0 16px', fontSize: '14px', border: '1px solid var(--border-medium)' }} onClick={() => navigate('/log-incident')}>
              + Log Incident
            </button>
          </div>
          
          {incidents.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 0' }}>
              <div style={{ width: '64px', height: '64px', backgroundColor: 'rgba(234, 88, 12, 0.1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
                <Bug size={32} color="var(--accent-orange)" />
              </div>
              <p style={{ color: 'var(--text-secondary)', textAlign: 'center' }}>
                No incidents logged. Log past post-mortems so Omni-SRE can watch for them.
              </p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
              {incidents.slice(0, 3).map(inc => (
                <div key={inc.id} style={{ padding: '16px', borderRadius: '12px', border: '1px solid var(--border-light)', backgroundColor: 'var(--bg-page)' }}>
                  <h4 style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '8px' }}>{inc.title}</h4>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.4' }}>{inc.description?.substring(0, 100)}...</p>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    
    </div>
  );
};

export default Dashboard;
