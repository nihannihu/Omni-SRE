import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { ShieldAlert, Plus, Brain, CheckCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { incidentAPI } from '../services/api';

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
      // STEP 1: Write to Supabase incidents table (source of truth for RLS-protected data)
      const { data: supabaseIncident, error: supaError } = await supabase
        .from('incidents')
        .insert([{
          workspace_id: workspaceId,
          title: `${form.incidentId}: ${form.title}`,
          description: form.rootCause,
          new_rule: form.lessonsLearned || null,
        }])
        .select()
        .single();

      if (supaError) {
        throw new Error(`Supabase insert failed: ${supaError.message}`);
      }

      // STEP 2: Send to backend to ingest into Hindsight Vector Memory
      try {
        await incidentAPI.create({
          workspaceId,
          incidentId: form.incidentId,
          title: form.title,
          severity: form.severity,
          rootCause: form.rootCause,
          affectedFiles: form.affectedFiles.split(',').map((f) => f.trim()).filter(Boolean),
          lessonsLearned: form.lessonsLearned,
        });
        setRetainedToMemory(true);
      } catch (ingestErr) {
        // Non-fatal: The incident is already persisted in Supabase.
        // Hindsight ingestion can be retried later.
        console.warn('[INCIDENT] Hindsight ingestion failed (non-fatal):', ingestErr.message);
      }

      setSuccess('Incident logged successfully!');
      setForm({ incidentId: '', title: '', severity: 'P2', rootCause: '', affectedFiles: '', lessonsLearned: '' });
    } catch (err) {
      console.error('[INCIDENT] Submission failed:', err);
      setError(err.message || 'Failed to log incident');
    } finally {
      setLoading(false);
    }
  };

  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h2><ShieldAlert size={22} style={{ marginRight: 8, verticalAlign: 'middle', color: 'var(--accent-red)' }} />Log Security Incident</h2>
        <p>Record a security incident. It will be retained into Hindsight memory for future code reviews.</p>
      </div>
      <div className="page-body" style={{ maxWidth: 700 }}>
        {error && <div className="auth-error">{error}</div>}
        {success && (
          <div style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 'var(--radius-md)', padding: 'var(--space-md)', color: 'var(--accent-green)', fontSize: 14, marginBottom: 'var(--space-lg)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <CheckCircle size={16} /> {success}
            {retainedToMemory && (
              <span style={{ marginLeft: 8, display: 'inline-flex', alignItems: 'center', gap: 4, background: 'rgba(99,102,241,0.15)', padding: '2px 8px', borderRadius: 'var(--radius-sm)', color: 'var(--brand-primary-light)', fontSize: 12 }}>
                <Brain size={12} /> Retained to Hindsight
              </span>
            )}
          </div>
        )}
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
            <div className="form-group">
              <label className="form-label">Incident ID</label>
              <input className="form-input" value={form.incidentId} onChange={update('incidentId')} placeholder="INC-012" required />
            </div>
            <div className="form-group">
              <label className="form-label">Severity</label>
              <select className="form-select" value={form.severity} onChange={update('severity')}>
                <option value="P1">P1 — Critical</option>
                <option value="P2">P2 — High</option>
                <option value="P3">P3 — Medium</option>
                <option value="P4">P4 — Low</option>
              </select>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Title</label>
            <input className="form-input" value={form.title} onChange={update('title')} placeholder="Production NoSQL Injection via /api/search" required />
          </div>
          <div className="form-group">
            <label className="form-label">Root Cause — What Went Wrong?</label>
            <textarea className="form-textarea" value={form.rootCause} onChange={update('rootCause')} placeholder="Unsanitized $where clause allowed arbitrary JS execution on the database..." required style={{ fontFamily: 'var(--font-sans)', minHeight: 120 }} />
          </div>
          <div className="form-group">
            <label className="form-label">Affected Files (comma-separated)</label>
            <input className="form-input" value={form.affectedFiles} onChange={update('affectedFiles')} placeholder="src/routes/search.js, src/middleware/sanitize.js" />
          </div>
          <div className="form-group">
            <label className="form-label">New Rule / Lessons Learned</label>
            <textarea className="form-textarea" value={form.lessonsLearned} onChange={update('lessonsLearned')} placeholder="All MongoDB queries must use parameterized helpers from /lib/db/safe-query.js" style={{ fontFamily: 'var(--font-sans)', minHeight: 100 }} />
          </div>
          <button className="btn btn-primary btn-lg" type="submit" disabled={loading}>
            {loading ? <><span className="spinner" /> Logging...</> : <><Plus size={16} /> Log Incident & Retain to Memory</>}
          </button>
        </form>
      </div>
    </div>
  );
}
