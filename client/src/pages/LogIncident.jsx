import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, Info, X, Loader2 } from 'lucide-react';
import { incidentAPI, workspaceAPI } from '../services/api';

const LogIncident = () => {
  const navigate = useNavigate();
  const [workspace, setWorkspace] = useState(null);
  const [loading, setLoading] = useState(false);
  const [severity, setSeverity] = useState('P2');
  const [tags, setTags] = useState(['security', 'injection']);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    affected_files: 'src/routes/search.js, src/middleware/sanitize.js',
    new_rule: ''
  });

  useEffect(() => {
    const fetchWorkspace = async () => {
      try {
        const { data: workspaces } = await workspaceAPI.list();
        if (workspaces && workspaces.length > 0) {
          setWorkspace(workspaces[0]);
        }
      } catch (err) {
        console.error('Failed to fetch workspace:', err);
      }
    };
    fetchWorkspace();
  }, []);

  const getSeverityColor = (sev) => {
    switch(sev) {
      case 'P1': return 'var(--accent-red)';
      case 'P2': return 'var(--accent-orange)';
      case 'P3': return '#eab308'; // yellow
      case 'P4': return 'var(--accent-green)';
      default: return 'var(--text-muted)';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!workspace) return alert('No workspace active');
    if (!formData.title || !formData.description) return alert('Title and description are required');

    setLoading(true);
    try {
      const payload = {
        workspace_id: workspace.id,
        title: formData.title,
        description: formData.description,
        severity: severity,
        affected_files: formData.affected_files.split(',').map(f => f.trim()).filter(f => f),
        new_rule: formData.new_rule,
        tags: tags
      };

      const { data } = await incidentAPI.create(payload);
      if (data && data.id) {
        navigate('/dashboard');
      }
    } catch (err) {
      console.error('Failed to log incident:', err);
      alert('Failed to log incident. Check backend connection.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '40px', maxWidth: '880px', margin: '0 auto' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
        <h1 style={{ fontSize: '28px', color: 'var(--bg-darker)', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <ShieldAlert color="var(--accent-red)" size={28} />
          Log Security Incident
        </h1>
        <div style={{ backgroundColor: '#fee2e2', color: 'var(--accent-red)', padding: '4px 12px', borderRadius: '99px', fontSize: '12px', fontWeight: 'bold' }}>
          Retained to Memory Forever
        </div>
      </div>
      <p style={{ color: 'var(--text-secondary)' }}>Record a security incident. It will be permanently retained into Hindsight memory and referenced in all future code reviews.</p>
      <hr style={{ border: 'none', borderTop: '1px solid var(--border-light)', margin: '24px 0 32px 0' }} />

      <form onSubmit={handleSubmit} className="card" style={{ padding: '40px' }}>
        
        {/* Block 1: ID & Severity */}
        <div style={{ display: 'flex', gap: '24px', marginBottom: '32px' }}>
          <div style={{ flex: '0 0 40%' }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: 'bold', marginBottom: '8px' }}>Incident ID</label>
            <input type="text" className="input-base input-mono" defaultValue="INC-013" readOnly />
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px' }}>Auto-generated for reference</div>
          </div>
          <div style={{ flex: '0 0 60%' }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: 'bold', marginBottom: '8px' }}>Severity</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              {['P1', 'P2', 'P3', 'P4'].map(p => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setSeverity(p)}
                  style={{
                    flex: 1, height: '48px', borderRadius: '10px', border: severity === p ? `2px solid ${getSeverityColor(p)}` : '1px solid var(--border-medium)',
                    backgroundColor: severity === p ? `${getSeverityColor(p)}10` : 'white',
                    fontWeight: severity === p ? 'bold' : 'normal', cursor: 'pointer', transition: 'all 0.2s'
                  }}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Block 2: Title */}
        <div style={{ marginBottom: '32px' }}>
          <label style={{ display: 'block', fontSize: '14px', fontWeight: 'bold', marginBottom: '8px' }}>Incident Title</label>
          <input 
            type="text" 
            className="input-base" 
            placeholder="e.g. Production NoSQL Injection via /api/search" 
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          />
        </div>

        {/* Block 3: Root Cause */}
        <div style={{ marginBottom: '32px' }}>
          <label style={{ display: 'block', fontSize: '14px', fontWeight: 'bold', marginBottom: '4px' }}>Root Cause — What Went Wrong?</label>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px' }}>Describe the technical root cause in detail</div>
          <textarea 
            className="input-base" 
            style={{ height: '180px' }} 
            placeholder="e.g. Unsanitized $where clause allowed arbitrary JS execution on the database..." 
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          />
        </div>

        {/* Block 4: Affected Files */}
        <div style={{ marginBottom: '32px' }}>
          <label style={{ display: 'block', fontSize: '14px', fontWeight: 'bold', marginBottom: '4px' }}>Affected Files</label>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px' }}>Comma-separated file paths</div>
          <input 
            type="text" 
            className="input-base input-mono" 
            placeholder="src/routes/search.js, src/middleware/sanitize.js" 
            value={formData.affected_files}
            onChange={(e) => setFormData({ ...formData, affected_files: e.target.value })}
          />
        </div>

        {/* Block 5: Lessons Learned (Red Highlight) */}
        <div style={{ marginBottom: '32px' }}>
          <label style={{ display: 'block', fontSize: '14px', fontWeight: 'bold', marginBottom: '4px', color: 'var(--accent-red)' }}>New Rule / Lessons Learned</label>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px' }}>This rule will be added to your Memory Bank and checked in every future review</div>
          <textarea 
            className="input-base" 
            style={{ height: '180px', borderLeft: '4px solid var(--accent-red)' }} 
            placeholder="e.g. All MongoDB queries must use parameterized helpers from /lib/db/safe-query.js" 
            value={formData.new_rule}
            onChange={(e) => setFormData({ ...formData, new_rule: e.target.value })}
          />
        </div>

        {/* Block 6: Tags */}
        <div style={{ marginBottom: '40px' }}>
          <label style={{ display: 'block', fontSize: '14px', fontWeight: 'bold', marginBottom: '12px' }}>Tags (optional)</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {['security', 'injection', 'authentication', 'authorization', 'database'].map(tag => (
              <div key={tag} style={{ 
                padding: '6px 14px', borderRadius: '99px', fontSize: '13px', fontWeight: '500', cursor: 'pointer',
                backgroundColor: tags.includes(tag) ? '#1f2937' : '#f3f4f6',
                color: tags.includes(tag) ? 'white' : 'var(--text-secondary)'
               }}
               onClick={() => {
                 if(tags.includes(tag)) setTags(tags.filter(t => t !== tag));
                 else setTags([...tags, tag]);
               }}
               >
                {tag}
              </div>
            ))}
          </div>
        </div>

        {/* Submit */}
        <button 
          type="submit"
          className="btn btn-danger" 
          style={{ width: '100%', height: '56px', fontSize: '16px', borderRadius: '14px', gap: '8px' }}
          disabled={loading}
        >
          {loading ? <Loader2 size={20} className="animate-spin" /> : <ShieldAlert size={20} />}
          {loading ? 'Retaining to Memory...' : '+ Log Incident & Retain to Memory'}
        </button>
        <div style={{ textAlign: 'center', fontSize: '12px', color: 'var(--text-muted)', marginTop: '16px' }}>
          This incident will be embedded into your team's Hindsight memory immediately.
        </div>
      </form>

      {/* Info Card */}
      <div style={{ marginTop: '32px', backgroundColor: '#fef2f2', borderRadius: '16px', padding: '24px', border: '1px solid #fecaca', display: 'flex', gap: '16px' }}>
        <Info color="var(--accent-red)" size={24} style={{ flexShrink: 0 }} />
        <div>
          <h3 style={{ fontSize: '16px', color: '#991b1b', marginBottom: '8px' }}>What happens after logging?</h3>
          <ol style={{ paddingLeft: '20px', color: '#b91c1c', fontSize: '14px', display: 'flex', flexDirection: 'column', gap: '8px', margin: 0 }}>
            <li>Incident completely embedded into Memory Bank</li>
            <li>All future code reviews automatically reference this incident</li>
            <li>Similar code patterns submitted in future PRs will be dynamically flagged</li>
          </ol>
        </div>
      </div>
    </div>
  );
};

export default LogIncident;
