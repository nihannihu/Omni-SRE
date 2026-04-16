import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Brain, Search } from 'lucide-react';
import { supabase } from '../lib/supabase';
import TiltCard from '../components/ui/TiltCard';

export default function MemoryBankPage() {
  const { workspaceId } = useParams();
  const [memories, setMemories] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await supabase.from('reviews')
          .select('*').eq('workspace_id', workspaceId).order('created_at', { ascending: false });
        const mems = (data || []).flatMap((r, ri) =>
          (r.result?.findings || []).map((f, fi) => ({
            id: `${r.id}-${fi}`,
            text: f.description || f.title || 'Unknown finding',
            category: f.severity || 'info',
            source: r.pr_title || 'Manual Review',
            timestamp: r.created_at,
          }))
        );
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
    critical: '#ef4444', high: '#f59e0b', medium: '#3b82f6',
    low: '#10b981', info: '#8b5cf6',
  };

  const filtered = memories.filter(m =>
    m.text.toLowerCase().includes(search.toLowerCase()) ||
    m.category.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
        <div style={{ width: 30, height: 30, border: '3px solid #e5e7eb', borderTopColor: '#0a0a0a', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
      </div>
    );
  }

  return (
    <div className="animate-slide-up">
      <header style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '2.25rem', fontWeight: 900, marginBottom: '0.35rem' }}>Memory Bank</h2>
        <p style={{ color: '#9ca3af', fontSize: '0.9rem' }}>Aggregated intelligence from all code reviews.</p>
      </header>

      {/* Search */}
      <div style={{
        position: 'relative', marginBottom: '2rem', maxWidth: '480px',
      }}>
        <Search size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search memories..."
          style={{
            width: '100%', padding: '0.75rem 1rem 0.75rem 2.75rem',
            background: 'rgba(255,255,255,0.8)', backdropFilter: 'blur(8px)',
            border: '1px solid rgba(0,0,0,0.08)', borderRadius: '999px',
            fontSize: '0.875rem', color: '#0a0a0a', outline: 'none',
            fontFamily: 'var(--font-sans)',
          }}
        />
      </div>

      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem 0' }}>
          <div style={{
            width: 72, height: 72, borderRadius: '50%',
            border: '2px dashed rgba(0,0,0,0.1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 1rem',
          }}>
            <Brain size={28} style={{ color: '#8b5cf6' }} />
          </div>
          <p style={{ color: '#9ca3af', fontSize: '0.875rem' }}>
            No memory entries yet. Start a code review to build intelligence.
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem' }}>
          {filtered.map((mem, i) => (
            <TiltCard key={mem.id} className="animate-fade-in" style={{ animationDelay: `${i * 50}ms`, padding: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                <span style={{
                  background: `${categoryColors[mem.category] || '#8b5cf6'}15`,
                  color: categoryColors[mem.category] || '#8b5cf6',
                  padding: '0.15rem 0.6rem', borderRadius: '999px',
                  fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase',
                }}>{mem.category}</span>
                <span style={{ fontSize: '0.65rem', color: '#d1d5db' }}>
                  {new Date(mem.timestamp).toLocaleDateString()}
                </span>
              </div>
              <p style={{ fontSize: '0.8rem', color: '#6b7280', lineHeight: 1.6 }}>
                {mem.text.length > 150 ? mem.text.substring(0, 150) + '...' : mem.text}
              </p>
            </TiltCard>
          ))}
        </div>
      )}
    </div>
  );
}
