import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ShieldAlert, Brain, CheckCircle, ArrowLeft, Terminal, Activity, Zap } from 'lucide-react';
import { supabase } from '../lib/supabase';
import TiltCard from '../components/ui/TiltCard';

export default function SecurityLogPage() {
  const { workspaceId } = useParams();
  const [form, setForm] = useState({
    incidentId: '', title: '', severity: 'P2',
    rootCause: '', affectedFiles: '', lessonsLearned: '',
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [retainedToMemory, setRetainedToMemory] = useState(false);
  const [showCalibration, setShowCalibration] = useState(false);

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
      setSuccess('Incident intelligence logged successfully.');
      setForm({ incidentId: '', title: '', severity: 'P2', rootCause: '', affectedFiles: '', lessonsLearned: '' });
    } catch (err) {
      setError(err.message || 'Failed to synchronize incident');
    } finally {
      setLoading(false);
    }
  };

  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const severityColors = { 
    P1: '#ef4444', 
    P2: '#f59e0b', 
    P3: '#3b82f6', 
    P4: '#10b981' 
  };

  return (
    <div className="animate-slide-up">
      <nav style={{ marginBottom: '2.5rem' }}>
        <Link to={`/workspace/${workspaceId}`} style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none', fontWeight: 700 }}>
          <ArrowLeft size={16} /> BACK TO DASHBOARD
        </Link>
      </nav>

      <header style={{ marginBottom: '3.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
           <div style={{ width: 48, height: 48, borderRadius: '12px', background: 'rgba(239, 68, 68, 0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(239, 68, 68, 0.1)' }}>
              <ShieldAlert size={24} style={{ color: '#ef4444' }} />
           </div>
           <div>
              <h2 style={{ fontSize: '2.75rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.05em' }}>
                Operational Defect Log
              </h2>
           </div>
        </div>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', maxWidth: '800px', lineHeight: 1.6 }}>
          Document system anomalies to calibrate institutional guards and synchronize autonomous code evaluation.
        </p>
      </header>

      <div style={{ maxWidth: '840px' }}>
        {error && (
          <div style={{ background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.1)', padding: '1.25rem 1.5rem', borderRadius: 'var(--radius-md)', color: '#ef4444', marginBottom: '2.5rem', fontSize: '0.9rem', fontWeight: 700 }}>
            {error}
          </div>
        )}

        {success && (
          <TiltCard>
            <div className="glass-card" style={{ marginBottom: '2.5rem', border: '1px solid #10b981', background: 'rgba(16, 185, 129, 0.05)', display: 'flex', alignItems: 'center', gap: '1.25rem', padding: '1.75rem' }}>
              <CheckCircle size={24} style={{ color: '#10b981' }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 800, color: '#065f46', fontSize: '1.1rem' }}>{success}</div>
                {retainedToMemory && <div style={{ fontSize: '0.9rem', color: '#047857', marginTop: '0.25rem', fontWeight: 600 }}>Memory finalized and rules calibrated.</div>}
              </div>
              {retainedToMemory && (
                <div style={{ background: '#fff', color: '#7c3aed', padding: '0.6rem 1.25rem', borderRadius: 'var(--radius-full)', fontSize: '0.7rem', fontWeight: 900, border: '1px solid rgba(124, 58, 237, 0.15)', display: 'flex', alignItems: 'center', gap: '0.5rem', letterSpacing: '0.05em' }}>
                  <Brain size={14} /> KNOWLEDGE SYNCED
                </div>
              )}
            </div>
          </TiltCard>
        )}

        <TiltCard>
          <div className="glass-card" style={{ padding: '3.5rem', background: '#fff' }}>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2.5rem' }}>
                <div>
                  <Label>Incident Reference</Label>
                  <Input value={form.incidentId} onChange={update('incidentId')} placeholder="CORE-SEC-2024" required />
                </div>
                <div>
                  <Label>Classification Level</Label>
                  <div style={{ position: 'relative' }}>
                    <select value={form.severity} onChange={update('severity')} style={{
                      width: '100%', padding: '1.125rem 1.25rem',
                      background: '#f8fafc', border: '1px solid #e2e8f0',
                      borderRadius: 'var(--radius-md)', color: severityColors[form.severity],
                      fontSize: '1rem', fontWeight: 800, outline: 'none',
                      fontFamily: 'var(--font-sans)', appearance: 'none',
                      transition: 'var(--transition-smooth)'
                    }}>
                      <option value="P1" style={{ color: '#ef4444' }}>P1 — MISSION CRITICAL</option>
                      <option value="P2" style={{ color: '#f59e0b' }}>P2 — HIGH SEVERITY</option>
                      <option value="P3" style={{ color: '#3b82f6' }}>P3 — STABLE OPERATIONAL</option>
                      <option value="P4" style={{ color: '#10b981' }}>P4 — MINOR ADVISORY</option>
                    </select>
                    <div style={{ position: 'absolute', right: '1.25rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#94a3b8', fontSize: '0.7rem' }}>▼</div>
                  </div>
                </div>
              </div>

              <div>
                <Label>Operational Title</Label>
                <Input value={form.title} onChange={update('title')} placeholder="Describe the anomaly subject..." required />
              </div>

              <div>
                <Label>Root Cause Perspective</Label>
                <textarea value={form.rootCause} onChange={update('rootCause')} placeholder="Perform a mechanical breakdown of the event..." required style={{
                  width: '100%', minHeight: '200px', padding: '1.5rem',
                  background: '#f8fafc', border: '1px solid #e2e8f0',
                  borderLeft: `4px solid ${severityColors[form.severity]}`,
                  borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', fontSize: '1rem',
                  outline: 'none', resize: 'vertical', fontFamily: 'var(--font-mono)',
                  lineHeight: 1.7, transition: 'var(--transition-smooth)'
                }} />
              </div>

              <div>
                <Label>Affected Vectors (Files)</Label>
                <Input value={form.affectedFiles} onChange={update('affectedFiles')} placeholder="src/auth.js, lib/database/adapter.ts" />
              </div>

              <div style={{ padding: '2rem', background: '#f8fafc', border: '1px dashed #e2e8f0', borderRadius: 'var(--radius-md)' }}>
                <button type="button" onClick={() => setShowCalibration(!showCalibration)} style={{
                  background: 'none', border: 'none', display: 'flex',
                  alignItems: 'center', gap: '0.75rem', color: 'var(--brand-primary)',
                  fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase',
                  letterSpacing: '0.15em', cursor: 'pointer', outline: 'none'
                }}>
                  <Terminal size={18} />
                  Intelligence Calibration
                  <span style={{ marginLeft: 'auto', transform: showCalibration ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 300ms cubic-bezier(0.4, 0, 0.2, 1)', fontSize: '0.7rem' }}>▼</span>
                </button>
                {showCalibration && (
                  <div style={{ marginTop: '2rem', animation: 'animate-slide-up' }}>
                    <Label>New Intelligence Rule</Label>
                    <textarea value={form.lessonsLearned} onChange={update('lessonsLearned')}
                      placeholder="Specify institutional standard changes..."
                      style={{
                        width: '100%', minHeight: '120px', padding: '1.25rem',
                        background: '#fff', border: '1px solid #e2e8f0',
                        borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', fontSize: '0.95rem',
                        outline: 'none', resize: 'vertical', fontFamily: 'var(--font-sans)',
                        lineHeight: 1.6
                      }}
                    />
                  </div>
                )}
              </div>

              <button className="btn-pill btn-primary" type="submit" disabled={loading} style={{ padding: '1.25rem', justifyContent: 'center', width: '100%', fontSize: '1.1rem', letterSpacing: '0.05em' }}>
                {loading ? (
                  <Activity size={20} className="animate-spin" />
                ) : (
                  <><Zap size={20} /> COMMENCE INTELLIGENCE SYNC</>
                )}
              </button>
            </form>
          </div>
        </TiltCard>
      </div>
    </div>
  );
}

function Label({ children }) {
  return <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 900, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: '0.75rem' }}>{children}</label>;
}

function Input(props) {
  return <input {...props} style={{ 
    width: '100%', padding: '1.125rem 1.25rem', background: '#f8fafc', 
    border: '1px solid #e2e8f0', borderRadius: 'var(--radius-md)', 
    color: 'var(--text-primary)', fontSize: '1rem', outline: 'none', 
    transition: 'var(--transition-smooth)', ...props.style 
  }} />;
}
