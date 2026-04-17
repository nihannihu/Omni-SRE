import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ShieldAlert, Plus, Brain, CheckCircle, ArrowLeft, Terminal } from 'lucide-react';
import { supabase } from '../lib/supabase';
import GlassCard from '../components/ui/GlassCard';

export default function IncidentForm() {
  const { workspaceId } = useParams();
  const [form, setForm] = useState({
    incidentId: '', title: '', severity: 'P2',
    rootCause: '', affectedFiles: '', lessonsLearned: '',
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [retainedToMemory, setRetainedToMemory] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setSuccess(''); setRetainedToMemory(false);
    setLoading(true);

    try {
      const { data: supabaseIncident, error: supaError } = await supabase
        .from('incidents')
        .insert([{
          workspace_id: workspaceId,
          title: `${form.incidentId}: ${form.title}`,
          description: form.rootCause,
          new_rule: form.lessonsLearned || null,
        }])
        .select().single();

      if (supaError) throw new Error(supaError.message);
      setRetainedToMemory(true);

      setSuccess('Operational Intelligence Logged Swuccessfully.');
      setForm({ incidentId: '', title: '', severity: 'P2', rootCause: '', affectedFiles: '', lessonsLearned: '' });
    } catch (err) {
      setError(err.message || 'Failed to sync incident');
    } finally {
      setLoading(false);
    }
  };

  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  return (
    <div className="animate-slide-up">
      <nav style={{ marginBottom: '2rem' }}>
        <Link to={`/workspace/${workspaceId}`} style={{ fontSize: '0.9rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none' }}>
          <ArrowLeft size={16} /> Dashboard
        </Link>
      </nav>

      <header style={{ marginBottom: '3rem' }}>
        <h2 style={{ fontSize: '2.5rem', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <ShieldAlert size={32} style={{ color: 'var(--red-glow)' }} /> Log Security Incident
        </h2>
        <p style={{ color: 'var(--text-muted)' }}>
          Record root cause analysis and lessons learned. Findings are used to calibrate future code reviews.
        </p>
      </header>

      <div style={{ maxWidth: '800px' }}>
        {error && (
          <div style={{ 
            background: 'rgba(244, 63, 94, 0.1)', border: '1px solid rgba(244, 63, 94, 0.2)', 
            padding: '1rem', borderRadius: 'var(--radius-md)', color: 'var(--red-glow)', 
            marginBottom: '2rem', fontSize: '0.9rem' 
          }}>
            {error}
          </div>
        )}

        {success && (
          <GlassCard style={{ marginBottom: '2rem', border: '1px solid var(--green-glow)', background: 'rgba(16, 185, 129, 0.05)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--green-glow)' }}>
              <CheckCircle size={20} />
              <div style={{ fontWeight: 600 }}>{success}</div>
              {retainedToMemory && (
                <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(129, 140, 248, 0.1)', padding: '0.4rem 0.75rem', borderRadius: 'var(--radius-full)', color: 'var(--brand-secondary)', fontSize: '0.75rem', fontWeight: 700 }}>
                  <Brain size={14} /> CALIBRATED TO HINDSIGHT
                </div>
              )}
            </div>
          </GlassCard>
        )}

        <GlassCard>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
              <div>
                <Label>Incident Reference</Label>
                <Input value={form.incidentId} onChange={update('incidentId')} placeholder="e.g. INC-SEC-092" required />
              </div>
              <div>
                <Label>Severity Matrix</Label>
                <Select value={form.severity} onChange={update('severity')}>
                  <option value="P1">P1 — MISSION CRITICAL</option>
                  <option value="P2">P2 — HIGH SEVERITY</option>
                  <option value="P3">P3 — STABLE OPERATIONAL</option>
                  <option value="P4">P4 — MINOR ADVISORY</option>
                </Select>
              </div>
            </div>

            <div>
              <Label>Incident Vector / Title</Label>
              <Input value={form.title} onChange={update('title')} placeholder="Injection vulnerability in authentication middleware..." required />
            </div>

            <div>
              <Label>Root Cause Analysis (Technical Internal)</Label>
              <TextArea value={form.rootCause} onChange={update('rootCause')} placeholder="Detailed mechanical breakdown of the failure vector..." required />
            </div>

            <div>
              <Label>Impacted Scope (Files)</Label>
              <Input value={form.affectedFiles} onChange={update('affectedFiles')} placeholder="src/auth.js, lib/database/adapter.ts" />
            </div>

            <div style={{ background: 'rgba(56, 189, 248, 0.03)', padding: '1.5rem', borderRadius: 'var(--radius-md)', border: '1px solid rgba(56, 189, 248, 0.1)' }}>
              <Label style={{ color: 'var(--brand-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Terminal size={14} /> Hindsight Calibration Rule
              </Label>
              <TextArea 
                value={form.lessonsLearned} 
                onChange={update('lessonsLearned')} 
                placeholder="Future reviews should flag any usage of..." 
                style={{ border: 'none', background: 'transparent', padding: '0.5rem 0', boxShadow: 'none' }}
              />
            </div>

            <button className="btn-premium btn-primary" type="submit" disabled={loading} style={{ padding: '1.25rem' }}>
              {loading ? (
                <><div style={{ width: 16, height: 16, border: '2px solid white', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} /> PROCESSING...</>
              ) : (
                <><ShieldAlert size={18} /> SYNC TO INTELLIGENCE MEMORY</>
              )}
            </button>
          </form>
        </GlassCard>
      </div>
    </div>
  );
}

function Label({ children, style }) {
  return <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.75rem', ...style }}>{children}</label>;
}

function Input(props) {
  return <input {...props} style={{ width: '100%', padding: '0.875rem 1.25rem', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', fontSize: '0.95rem', outline: 'none', transition: 'var(--transition-fast)' }} onFocus={(e) => e.target.style.borderColor = 'var(--brand-primary)'} onBlur={(e) => e.target.style.borderColor = 'var(--glass-border)'} />;
}

function Select(props) {
  return <select {...props} style={{ width: '100%', padding: '0.875rem 1.25rem', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', fontSize: '0.95rem', outline: 'none', appearance: 'none' }} />;
}

function TextArea(props) {
  return <textarea {...props} style={{ width: '100%', minHeight: '120px', padding: '1rem 1.25rem', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', fontSize: '0.95rem', outline: 'none', resize: 'vertical', ...props.style }} />;
}
