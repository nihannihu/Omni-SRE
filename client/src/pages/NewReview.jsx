import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { GitPullRequest, FileUp, Terminal, Loader2 } from 'lucide-react';
import { reviewAPI, workspaceAPI } from '../services/api';

const NewReview = () => {
  const navigate = useNavigate();
  const [workspace, setWorkspace] = useState(null);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    pr_url: '',
    pr_number: '',
    pr_title: '',
    diff: ''
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!workspace) return alert('No workspace active');
    if (!formData.diff && !formData.pr_url) return alert('Please provide a diff or a PR URL');

    setLoading(true);
    try {
      const payload = {
        workspace_id: workspace.id,
        pr_url: formData.pr_url,
        pr_number: formData.pr_number ? parseInt(formData.pr_number) : undefined,
        pr_title: formData.pr_title,
        diff: formData.diff
      };

      const { data } = await reviewAPI.trigger(payload);
      if (data && data.id) {
        navigate('/dashboard');
      }
    } catch (err) {
      console.error('Failed to trigger review:', err);
      alert('Failed to start review. Check backend connection.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '40px', maxWidth: '940px', margin: '0 auto' }}>
      {/* Header */}
      <h1 style={{ fontSize: '28px', color: 'var(--bg-darker)', marginBottom: '8px' }}>New Code Review</h1>
      <p style={{ color: 'var(--text-secondary)' }}>Paste a diff or drop a .diff file for context-aware analysis powered by your team's Hindsight memory.</p>
      <hr style={{ border: 'none', borderTop: '1px solid var(--border-light)', margin: '24px 0 32px 0' }} />

      <div style={{ display: 'flex', gap: '32px' }}>
        
        {/* Form Container */}
        <form onSubmit={handleSubmit} style={{ flex: 1 }}>
          
          {/* GitHub Block */}
          <div style={{ marginBottom: '32px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: 'bold', marginBottom: '12px' }}>
              GitHub PR URL
              <span style={{ fontSize: '11px', fontWeight: 'normal', backgroundColor: 'var(--bg-page)', padding: '2px 8px', borderRadius: '12px', color: 'var(--text-secondary)' }}>
                (optional — auto-extracts PR info)
              </span>
            </label>
            <div style={{ position: 'relative' }}>
              <div style={{ position: 'absolute', top: '14px', left: '16px' }}><GitPullRequest size={20} color="var(--text-muted)" /></div>
              <input 
                type="text" 
                className="input-base" 
                placeholder="https://github.com/owner/repo/pull/55" 
                style={{ paddingLeft: '48px', paddingRight: '120px' }}
                value={formData.pr_url}
                onChange={(e) => setFormData({ ...formData, pr_url: e.target.value })}
              />
              <button 
                type="button"
                className="btn" 
                style={{ position: 'absolute', right: '6px', top: '6px', height: '36px', padding: '0 16px', fontSize: '13px', backgroundColor: '#ecfdf5', color: 'var(--accent-green)', fontWeight: '600' }}
              >
                Auto-fetch
              </button>
            </div>
          </div>

          {/* PR Details 50/50 */}
          <div style={{ display: 'flex', gap: '24px', marginBottom: '32px' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 'bold', marginBottom: '12px' }}>PR Number</label>
              <input 
                type="text" 
                className="input-base" 
                placeholder="55" 
                value={formData.pr_number}
                onChange={(e) => setFormData({ ...formData, pr_number: e.target.value })}
              />
            </div>
            <div style={{ flex: 2 }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 'bold', marginBottom: '12px' }}>PR Title</label>
              <input 
                type="text" 
                className="input-base" 
                placeholder="Fix API issue" 
                value={formData.pr_title}
                onChange={(e) => setFormData({ ...formData, pr_title: e.target.value })}
              />
            </div>
          </div>

          {/* Code Diff Upload */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: 'bold', marginBottom: '12px' }}>
              <FileUp size={16} /> Code Diff (unified format)
            </label>
            <div style={{ 
              height: '140px', border: '2px dashed var(--border-medium)', borderRadius: '16px',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              backgroundColor: 'white', cursor: 'pointer', transition: 'all 0.2s ease'
             }} 
             onMouseOver={(e) => { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.backgroundColor = '#f0f9ff'; }}
             onMouseOut={(e) => { e.currentTarget.style.borderColor = 'var(--border-medium)'; e.currentTarget.style.backgroundColor = 'white'; }}
            >
              <FileUp size={32} color="var(--text-muted)" style={{ marginBottom: '8px' }} />
              <div style={{ color: 'var(--text-secondary)', fontWeight: '500' }}>Drop a .diff or .patch file here, or click to browse</div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>Supports .diff and .patch files</div>
            </div>
          </div>

          {/* Text Area */}
          <div style={{ marginBottom: '32px' }}>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px' }}>Or paste diff directly</div>
            <textarea 
              className="input-base input-mono" 
              placeholder="@@ -12,5 +12,4 @@&#10;- const oldVar = 1;&#10;+ const newVar = 2;"
              style={{ backgroundColor: 'var(--bg-darker)', color: '#e2e8f0', border: 'none', height: '200px' }}
              value={formData.diff}
              onChange={(e) => setFormData({ ...formData, diff: e.target.value })}
            />
          </div>

          {/* Submit */}
          <button 
            type="submit"
            className="btn btn-primary" 
            style={{ width: '100%', height: '56px', fontSize: '16px', borderRadius: '14px', gap: '8px' }}
            disabled={loading}
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : <Terminal size={20} />}
            {loading ? 'Analyzing Code...' : 'Start Agentic Review'}
          </button>

        </form>

        {/* Side Panel */}
        <div style={{ width: '280px' }}>
          <div style={{ backgroundColor: '#eff6ff', borderRadius: '16px', padding: '24px', border: '1px solid #bfdbfe' }}>
            <h3 style={{ fontSize: '16px', color: '#1e3a8a', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              💡 What Omni-SRE checks
            </h3>
            <ul style={{ paddingLeft: '20px', color: '#1e40af', fontSize: '14px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <li>Security vulnerabilities</li>
              <li>Past incident patterns</li>
              <li>Team conventions</li>
              <li>Dependency risks</li>
              <li>Code quality regressions</li>
            </ul>
          </div>
        </div>

      </div>
    </div>
  );
};

export default NewReview;
