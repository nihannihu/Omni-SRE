import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Brain, Search, Database, Fingerprint, Activity, Clock } from 'lucide-react';
import { supabase } from '../lib/supabase';
import TiltCard from '../components/ui/TiltCard';
import Skeleton from '../components/ui/Skeleton';

export default function MemoryBankPage() {
  const { workspaceId } = useParams();
  const [memories, setMemories] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await supabase.from('incidents')
          .select('*').eq('workspace_id', workspaceId)
          .order('created_at', { ascending: false }).limit(50);
        const mems = (data || []).map(inc => ({
          id: inc.id,
          text: inc.description || inc.title || 'Unknown incident',
          category: (inc.severity || 'info').toLowerCase(),
          source: inc.title || 'Logged Incident',
          timestamp: inc.created_at,
        }));
        setMemories(mems);
      } catch (err) {
        console.error('Memory bank error:', err);
      } finally {
        setLoading(false);
      }
    };
    if (workspaceId) load();
  }, [workspaceId]);

  const categoryColors = {
    critical: '#ef4444', 
    high: '#f59e0b', 
    medium: '#3b82f6', 
    low: '#10b981', 
    info: '#8b5cf6',
  };

  const filtered = memories.filter(m =>
    m.text.toLowerCase().includes(search.toLowerCase()) ||
    m.category.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="animate-slide-up">
        <header style={{ marginBottom: '3.5rem' }}>
          <Skeleton width="180px" height="1.5rem" style={{ marginBottom: '1rem' }} borderRadius="var(--radius-full)" />
          <Skeleton width="300px" height="3rem" style={{ marginBottom: '0.5rem' }} />
          <Skeleton width="600px" height="1.5rem" />
        </header>

        <Skeleton width="100%" height="3.5rem" style={{ maxWidth: '600px', marginBottom: '3.5rem' }} />

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '2rem' }}>
          {[1,2,3,4,5,6].map(idx => (
            <TiltCard key={idx}>
              <div className="glass-card" style={{ height: '300px', padding: '2.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                  <Skeleton width="80px" height="1.5rem" borderRadius="var(--radius-full)" />
                  <Skeleton width="100px" height="1rem" />
                </div>
                <Skeleton width="100%" height="4rem" style={{ marginBottom: '1.5rem' }} />
                <Skeleton width="60%" height="1rem" />
              </div>
            </TiltCard>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="animate-slide-up">
      <header style={{ marginBottom: '3.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
           <Database size={18} style={{ color: 'var(--brand-primary)' }} />
           <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--brand-primary)', textTransform: 'uppercase', letterSpacing: '0.15em' }}>Institutional Knowledge</span>
        </div>
        <h2 style={{ fontSize: '2.75rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.05em' }}>Memory Bank</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', marginTop: '0.5rem' }}>Aggregated engineering patterns and reliability constraints synthesized from historical analysis.</p>
      </header>

      {/* Advanced Filter */}
      <div style={{
        position: 'relative', marginBottom: '3.5rem', maxWidth: '600px',
      }}>
        <div style={{ position: 'absolute', left: '1.25rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', zIndex: 1 }}>
           <Search size={18} />
        </div>
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Filter intelligence nodes by pattern or context..."
          style={{
            width: '100%', padding: '1.125rem 1.5rem 1.125rem 3.5rem',
            background: '#ffffff',
            border: '1px solid #e2e8f0', borderRadius: 'var(--radius-md)',
            fontSize: '1rem', color: 'var(--text-primary)', outline: 'none',
            boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
            fontFamily: 'var(--font-sans)', transition: 'var(--transition-smooth)'
          }}
        />
      </div>

      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '6rem 0' }}>
          <div style={{
            width: 80, height: 80,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: '1.5rem', borderRadius: '20px', background: '#f8fafc',
            border: '1px solid #e2e8f0'
          }}>
            <Fingerprint size={32} style={{ color: '#94a3b8' }} />
          </div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)' }}>Empty Vector Space</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', marginTop: '0.5rem', fontWeight: 500 }}>
            No memories match your query. Initiate more audits to populate the knowledge bank.
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '2rem' }}>
          {filtered.map((mem, i) => (
            <TiltCard key={mem.id} className="animate-fade-in" style={{ animationDelay: `${i * 30}ms` }}>
              <div className="glass-card" style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#fff', padding: '2.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                  <span style={{
                    background: `${categoryColors[mem.category] || '#8b5cf6'}12`,
                    color: categoryColors[mem.category] || '#8b5cf6',
                    padding: '0.4rem 0.85rem', borderRadius: 'var(--radius-full)',
                    fontSize: '0.65rem', fontWeight: 900, textTransform: 'uppercase',
                    border: `1px solid ${categoryColors[mem.category] || '#8b5cf6'}22`,
                    letterSpacing: '0.1em'
                  }}>{mem.category}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#94a3b8', fontSize: '0.75rem', fontWeight: 700 }}>
                     <Clock size={12} />
                     {new Date(mem.timestamp).toLocaleDateString()}
                  </div>
                </div>
                <p style={{ fontSize: '1rem', color: 'var(--text-secondary)', lineHeight: 1.7, flex: 1, marginBottom: '1.5rem', fontWeight: 500 }}>
                   {mem.text}
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', paddingTop: '1.5rem', borderTop: '1px solid #f1f5f9', color: 'var(--brand-primary)', fontSize: '0.8rem', fontWeight: 800 }}>
                   <Activity size={12} />
                   <span style={{ opacity: 0.8, letterSpacing: '0.02em' }}>SOURCE: {mem.source}</span>
                </div>
              </div>
            </TiltCard>
          ))}
        </div>
      )}
    </div>
  );
}
