import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { BookOpen, Plus, ToggleLeft, ToggleRight } from 'lucide-react';
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
          title: inc.title || `Convention #${i + 1}`,
          description: inc.new_rule,
          category: inc.title?.includes('SEC') ? 'Security' : inc.title?.includes('PERF') ? 'Performance' : 'General',
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
    Security: '#ef4444', Performance: '#f59e0b', General: '#3b82f6',
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
        <div style={{ width: 30, height: 30, border: '3px solid #e5e7eb', borderTopColor: '#0a0a0a', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
      </div>
    );
  }

  return (
    <div className="animate-slide-up">
      <header style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h2 style={{ fontSize: '2.25rem', fontWeight: 900, marginBottom: '0.35rem' }}>Conventions</h2>
          <p style={{ color: '#9ca3af', fontSize: '0.9rem' }}>Engineering standards your AI follows.</p>
        </div>
      </header>

      {conventions.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem 0' }}>
          <div style={{
            width: 72, height: 72, borderRadius: '50%',
            border: '2px dashed rgba(0,0,0,0.1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 1rem',
          }}>
            <BookOpen size={28} style={{ color: '#3b82f6' }} />
          </div>
          <p style={{ color: '#9ca3af', fontSize: '0.875rem' }}>
            No conventions yet. Log a security incident with a calibration rule to create one.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {conventions.map((conv, i) => (
            <TiltCard key={conv.id} className="animate-fade-in" style={{ animationDelay: `${i * 50}ms`, padding: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1, marginRight: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0a0a0a' }}>
                      {conv.title}
                    </h4>
                    <span style={{
                      background: `${categoryColors[conv.category] || '#3b82f6'}15`,
                      color: categoryColors[conv.category] || '#3b82f6',
                      padding: '0.1rem 0.5rem', borderRadius: '999px',
                      fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase',
                    }}>{conv.category}</span>
                  </div>
                  <p style={{ fontSize: '0.8rem', color: '#6b7280', lineHeight: 1.6 }}>
                    {conv.description}
                  </p>
                </div>
                <button
                  onClick={() => toggleConvention(conv.id)}
                  style={{
                    background: 'none', border: 'none', padding: 0,
                    color: conv.enabled ? '#10b981' : '#d1d5db',
                    transition: 'color 200ms ease', flexShrink: 0,
                  }}
                >
                  {conv.enabled ? <ToggleRight size={28} /> : <ToggleLeft size={28} />}
                </button>
              </div>
            </TiltCard>
          ))}
        </div>
      )}
    </div>
  );
}
