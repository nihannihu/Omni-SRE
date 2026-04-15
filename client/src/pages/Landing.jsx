import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Brain, Shield, GitBranch, TerminalSquare } from 'lucide-react';

const Landing = () => {
  const navigate = useNavigate();

  return (
    <div style={{ position: 'relative', zIndex: 10 }}>
      {/* Navbar */}
      <nav style={{ 
        position: 'fixed', top: 0, width: '100%', backgroundColor: 'rgba(255,255,255,0.85)', 
        backdropFilter: 'blur(12px)', borderBottom: '1px solid var(--border-light)', 
        height: '80px', display: 'flex', alignItems: 'center', padding: '0 40px', zIndex: 50
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
          <div style={{ 
            width: '40px', height: '40px', borderRadius: '50%', 
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            overflow: 'hidden'
          }}>
            <img src="/logo.jpeg" alt="Omni-SRE Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
          <span style={{ fontSize: '20px', fontWeight: '800', color: 'var(--bg-darker)' }}>Omni-SRE</span>
        </div>
        
        <div style={{ display: 'flex', gap: '32px', fontWeight: '500', color: 'var(--text-secondary)' }}>
          <span>Product</span>
          <span>Use Cases</span>
          <span>Pricing</span>
          <span>Resources</span>
        </div>

        <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end', gap: '16px' }}>
          <button className="btn btn-ghost" style={{ padding: '0 24px' }} onClick={() => navigate('/login')}>Sign In</button>
          <button className="btn btn-dark" style={{ padding: '0 24px', height: '44px' }} onClick={() => navigate('/login')}>Get Started Free</button>
        </div>
      </nav>

      {/* Hero Section */}
      <div style={{ paddingTop: '180px', paddingBottom: '100px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', maxWidth: '1000px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '72px', letterSpacing: '-0.04em', color: 'var(--bg-darker)', marginBottom: '24px' }}>
          Ship Code That Never <br/><span className="text-gradient">Repeats Its Mistakes.</span>
        </h1>
        <p style={{ fontSize: '20px', color: 'var(--text-secondary)', maxWidth: '600px', marginBottom: '48px', lineHeight: '1.6' }}>
          The enterprise code review agent that builds an institutional memory of your past incidents to protect your future deployments.
        </p>
        <div style={{ display: 'flex', gap: '16px' }}>
          <button className="btn btn-primary" style={{ height: '56px', padding: '0 32px', fontSize: '16px' }} onClick={() => navigate('/login')}>
            🚀 Start Free Review
          </button>
          <button className="btn btn-ghost" style={{ height: '56px', padding: '0 32px', fontSize: '16px', border: '1px solid var(--border-medium)' }}>
            ▶ Watch Demo
          </button>
        </div>
      </div>

      {/* Features Section */}
      <div style={{ padding: '100px 40px', backgroundColor: 'var(--bg-pure)' }}>
        <h2 style={{ fontSize: '36px', textAlign: 'center', marginBottom: '64px' }}>Everything your team needs to review smarter</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '32px', maxWidth: '1200px', margin: '0 auto' }}>
          
          <div className="card" style={{ border: 'none' }}>
            <div style={{ width: '48px', height: '48px', backgroundColor: '#f3e8ff', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px' }}>
              <GitBranch color="#9333ea" size={24} />
            </div>
            <h3 style={{ fontSize: '20px', marginBottom: '12px' }}>AI Code Review</h3>
            <p style={{ color: 'var(--text-secondary)' }}>Trigger deep-context analysis natively within your GitHub PRs. Finds logical flaws standard linters miss.</p>
          </div>

          <div className="card" style={{ border: 'none' }}>
            <div style={{ width: '48px', height: '48px', backgroundColor: '#e0f2fe', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px' }}>
              <Brain color="#0284c7" size={24} />
            </div>
            <h3 style={{ fontSize: '20px', marginBottom: '12px' }}>Hindsight Memory</h3>
            <p style={{ color: 'var(--text-secondary)' }}>The AI learns your specific architectural conventions over time. No more explaining the basics.</p>
          </div>

          <div className="card" style={{ border: 'none' }}>
            <div style={{ width: '48px', height: '48px', backgroundColor: '#fee2e2', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px' }}>
              <Shield color="#dc2626" size={24} />
            </div>
            <h3 style={{ fontSize: '20px', marginBottom: '12px' }}>Incident Tracking</h3>
            <p style={{ color: 'var(--text-secondary)' }}>Log post-mortems and security incidents. Omni-SRE ensures those specific vulnerabilities never hit main again.</p>
          </div>

        </div>
      </div>
      
      {/* Footer minimal */}
      <div style={{ borderTop: '1px solid var(--border-light)', padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
        © 2026 Omni-SRE Enterprise. All rights reserved.
      </div>
    </div>
  );
};

export default Landing;
