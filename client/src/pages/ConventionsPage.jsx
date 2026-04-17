import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { BookOpen, ToggleLeft, ToggleRight, Shield, Activity } from 'lucide-react';
import { supabase } from '../lib/supabase';
import TiltCard from '../components/ui/TiltCard';

export default function ConventionsPage() {
  const { workspaceId } = useParams();
  const [conventions, setConventions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await supabase.from('incidents')
          .select('*').eq('workspace_id', workspaceId)
          .not('new_rule', 'is', null)
          .order('created_at', { ascending: false });
        const convs = (data || []).map((inc, i) => ({
          id: inc.id,
          title: inc.title || `CONV-0${i + 1}`,
          description: inc.new_rule,
          category: inc.title?.includes('SEC') ? 'Security' : inc.title?.includes('PERF') ? 'Performance' : 'Architecture',
          enabled: true,
          createdAt: inc.created_at,
        }));
        setConventions(convs);
      } catch (err) {
        console.error('Conventions load error:', err);
      } finally {
        setLoading(false);
      }
    };
    if (workspaceId) load();
  }, [workspaceId]);

  const toggleConvention = (id) => {
    setConventions(prev => prev.map(c => c.id === id ? { ...c, enabled: !c.enabled } : c));
  };

  const categoryColors = {
    Security: '#ef4444', 
    Performance: '#f59e0b', 
    Architecture: '#3b82f6',
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
        <div style={{ width: 24, height: 24, border: '3px solid #f1f5f9', borderTopColor: 'var(--brand-primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
      </div>
    );
  }

  return (
    <div className="animate-slide-up">
      <header style={{ marginBottom: '3.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
           <BookOpen size={18} style={{ color: 'var(--brand-primary)' }} />
           <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--brand-primary)', textTransform: 'uppercase', letterSpacing: '0.15em' }}>Policy Layer</span>
        </div>
        <h2 style={{ fontSize: '2.75rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.05em' }}>Operational Standards</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', marginTop: '0.5rem' }}>Immutable constraints and pattern enforcements applied across all analysis vectors.</p>
      </header>

      {conventions.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '6rem 0' }}>
          <div style={{
            width: 80, height: 80, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: '1.5rem', borderRadius: '20px', background: '#f8fafc', border: '1px solid #e2e8f0'
          }}>
            <Shield size={32} style={{ color: '#94a3b8' }} />
          </div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)' }}>No Active Constraints</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', marginTop: '0.5rem', fontWeight: 500 }}>
            Operational policies are currently empty. Log incident remediations to populate this registry.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {conventions.map((conv, i) => (
            <TiltCard key={conv.id} className="animate-fade-in" style={{ animationDelay: `${i * 40}ms` }}>
              <div className="glass-card" style={{ 
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '2rem 2.5rem', borderLeft: `4px solid ${categoryColors[conv.category] || '#3b82f6'}`,
                background: conv.enabled ? '#ffffff' : '#f8fafc',
                opacity: conv.enabled ? 1 : 0.65,
                transition: 'var(--transition-smooth)'
              }}>
                <div style={{ flex: 1, marginRight: '3rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                    <h4 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                      {conv.title}
                    </h4>
                    <span style={{
                      background: `${categoryColors[conv.category] || '#3b82f6'}12`,
                      color: categoryColors[conv.category] || '#3b82f6',
                      padding: '0.25rem 0.75rem', borderRadius: 'var(--radius-full)',
                      fontSize: '0.65rem', fontWeight: 900, textTransform: 'uppercase',
                      border: `1px solid ${categoryColors[conv.category] || '#3b82f6'}15`,
                      letterSpacing: '0.05em'
                    }}>{conv.category}</span>
                  </div>
                  <p style={{ fontSize: '1rem', color: 'var(--text-secondary)', lineHeight: 1.7, fontWeight: 500 }}>
                    {conv.description}
                  </p>
                </div>
                <button
                  onClick={() => toggleConvention(conv.id)}
                  style={{
                    background: 'none', border: 'none', padding: 0,
                    color: conv.enabled ? 'var(--brand-primary)' : '#94a3b8',
                    cursor: 'pointer', transition: 'var(--transition-smooth)', flexShrink: 0,
                  }}
                >
                  {conv.enabled ? <ToggleRight size={48} strokeWidth={1} /> : <ToggleLeft size={48} strokeWidth={1} />}
                </button>
              </div>
            </TiltCard>
          ))}
        </div>
      )}
    </div>
  );
}
