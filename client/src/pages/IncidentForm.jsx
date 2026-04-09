import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { ShieldAlert, Plus, Brain } from 'lucide-react';
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setSuccess('');
    setLoading(true);
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
      setSuccess('Incident logged and retained into team memory!');
      setForm({ incidentId: '', title: '', severity: 'P2', rootCause: '', affectedFiles: '', lessonsLearned: '' });
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to log incident');
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
            <Brain size={16} /> {success}
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
            <label className="form-label">Root Cause</label>
            <textarea className="form-textarea" value={form.rootCause} onChange={update('rootCause')} placeholder="Unsanitized $where clause allowed arbitrary JS execution on the database..." required style={{ fontFamily: 'var(--font-sans)' }} />
          </div>
          <div className="form-group">
            <label className="form-label">Affected Files (comma-separated)</label>
            <input className="form-input" value={form.affectedFiles} onChange={update('affectedFiles')} placeholder="src/routes/search.js, src/middleware/sanitize.js" />
          </div>
          <div className="form-group">
            <label className="form-label">Lessons Learned</label>
            <textarea className="form-textarea" value={form.lessonsLearned} onChange={update('lessonsLearned')} placeholder="All MongoDB queries must use parameterized helpers from /lib/db/safe-query.js" style={{ fontFamily: 'var(--font-sans)' }} />
          </div>
          <button className="btn btn-primary btn-lg" type="submit" disabled={loading}>
            {loading ? <><span className="spinner" /> Logging...</> : <><Plus size={16} /> Log Incident & Retain to Memory</>}
          </button>
        </form>
      </div>
    </div>
  );
}
