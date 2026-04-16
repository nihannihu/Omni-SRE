import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ShieldAlert, Brain, CheckCircle, ArrowLeft, Terminal } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { incidentAPI } from '../services/api';
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
      try {
        await incidentAPI.create({
          workspaceId, incidentId: form.incidentId,
          title: form.title, severity: form.severity,
          rootCause: form.rootCause,
          affectedFiles: form.affectedFiles.split(',').map(f => f.trim()).filter(Boolean),
          lessonsLearned: form.lessonsLearned,
        });
        setRetainedToMemory(true);
      } catch (ingestErr) {
        console.warn('[INCIDENT] Hindsight ingestion failed:', ingestErr.message);
      }
      setSuccess('Operational Intelligence Logged Successfully.');
      setForm({ incidentId: '', title: '', severity: 'P2', rootCause: '', affectedFiles: '', lessonsLearned: '' });
    } catch (err) {
      setError(err.message || 'Failed to sync incident');
    } finally {
      setLoading(false);
    }
  };

  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const severityColors = { P1: '#ef4444', P2: '#f59e0b', P3: '#eab308', P4: '#10b981' };

  return (
    <div className="animate-slide-up">
      <nav style={{ marginBottom: '1.5rem' }}>
        <Link to={`/workspace/${workspaceId}`} style={{ fontSize: '0.85rem', color: '#9ca3af', display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none' }}>
          <ArrowLeft size={14} /> Dashboard
        </Link>
      </nav>

      <header style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '2.25rem', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.35rem' }}>
          <ShieldAlert size={28} style={{ color: '#ef4444' }} /> Log Security Incident
        </h2>
        <p style={{ color: '#9ca3af', fontSize: '0.9rem' }}>
          Record root cause analysis and lessons learned. Findings calibrate future reviews.
        </p>
      </header>

      <div style={{ maxWidth: '720px' }}>
        {error && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', padding: '0.875rem 1rem', borderRadius: '12px', color: '#ef4444', marginBottom: '1.5rem', fontSize: '0.85rem' }}>
            {error}
          </div>
        )}

        {success && (
          <TiltCard style={{ marginBottom: '1.5rem', border: '1px solid #a7f3d0', background: '#ecfdf5' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <CheckCircle size={18} style={{ color: '#10b981' }} />
              <span style={{ fontWeight: 600, color: '#10b981' }}>{success}</span>
              {retainedToMemory && (
                <span style={{ marginLeft: 'auto', background: '#8b5cf620', color: '#8b5cf6', padding: '0.2rem 0.6rem', borderRadius: '999px', fontSize: '0.65rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <Brain size={12} /> CALIBRATED
                </span>
              )}
            </div>
          </TiltCard>
        )}

        <TiltCard style={{ padding: '2rem' }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
              <div>
                <Label>Incident Reference</Label>
                <Input value={form.incidentId} onChange={update('incidentId')} placeholder="e.g. INC-SEC-092" required />
              </div>
              <div>
                <Label>Severity Matrix</Label>
                <select value={form.severity} onChange={update('severity')} style={{
                  width: '100%', padding: '0.75rem 1rem',
                  background: '#fafafa', border: '1px solid rgba(0,0,0,0.08)',
                  borderRadius: '999px', color: severityColors[form.severity],
                  fontSize: '0.85rem', fontWeight: 700, outline: 'none',
                  fontFamily: 'var(--font-sans)',
                }}>
                  <option value="P1" style={{ color: '#ef4444' }}>P1 — MISSION CRITICAL</option>
                  <option value="P2" style={{ color: '#f59e0b' }}>P2 — HIGH SEVERITY</option>
                  <option value="P3" style={{ color: '#eab308' }}>P3 — STABLE OPERATIONAL</option>
                  <option value="P4" style={{ color: '#10b981' }}>P4 — MINOR ADVISORY</option>
                </select>
              </div>
            </div>

            <div>
              <Label>Incident Vector / Title</Label>
              <Input value={form.title} onChange={update('title')} placeholder="Injection vulnerability in authentication middleware..." required />
            </div>

            <div>
              <Label>Root Cause Analysis</Label>
              <textarea value={form.rootCause} onChange={update('rootCause')} placeholder="Detailed mechanical breakdown of the failure vector..." required style={{
                width: '100%', minHeight: '120px', padding: '0.875rem 1rem',
                background: '#fafafa', border: '1px solid rgba(0,0,0,0.08)',
                borderLeft: '3px solid #ef4444',
                borderRadius: '12px', color: '#0a0a0a', fontSize: '0.85rem',
                outline: 'none', resize: 'vertical', fontFamily: 'var(--font-mono)',
              }} />
            </div>

            <div>
              <Label>Impacted Scope (Files)</Label>
              <Input value={form.affectedFiles} onChange={update('affectedFiles')} placeholder="src/auth.js, lib/database/adapter.ts" />
            </div>

            <div>
              <button type="button" onClick={() => setShowCalibration(!showCalibration)} style={{
                background: 'none', border: 'none', display: 'flex',
                alignItems: 'center', gap: '0.5rem', color: '#3b82f6',
                fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase',
                letterSpacing: '0.08em', marginBottom: showCalibration ? '0.75rem' : 0,
                transition: 'all 200ms ease',
              }}>
                <Terminal size={14} />
                Hindsight Calibration Rule
                <span style={{ transform: showCalibration ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 200ms ease' }}>▼</span>
              </button>
              {showCalibration && (
                <textarea value={form.lessonsLearned} onChange={update('lessonsLearned')}
                  placeholder="Future reviews should flag any usage of..."
                  style={{
                    width: '100%', minHeight: '80px', padding: '0.875rem 1rem',
                    background: '#f0f9ff', border: '1px solid rgba(59,130,246,0.15)',
                    borderRadius: '12px', color: '#0a0a0a', fontSize: '0.85rem',
                    outline: 'none', resize: 'vertical', fontFamily: 'var(--font-sans)',
                    animation: 'slideUp 0.2s ease',
                  }}
                />
              )}
            </div>

            <button className="btn-pill btn-dark" type="submit" disabled={loading} style={{ padding: '0.875rem', justifyContent: 'center', width: '100%' }}>
              {loading ? (
                <><div style={{ width: 16, height: 16, border: '2px solid #fff', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} /> PROCESSING...</>
              ) : (
                <><ShieldAlert size={16} /> SYNC TO INTELLIGENCE MEMORY</>
              )}
            </button>
          </form>
        </TiltCard>
      </div>
    </div>
  );
}

function Label({ children }) {
  return <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.5rem' }}>{children}</label>;
}

function Input(props) {
  return <input {...props} style={{ width: '100%', padding: '0.75rem 1rem', background: '#fafafa', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '12px', color: '#0a0a0a', fontSize: '0.85rem', outline: 'none', fontFamily: 'var(--font-sans)', transition: 'border-color 200ms ease', ...props.style }} />;
}
