import React from 'react';
import { useNavigate } from 'react-router-dom';

const Login = () => {
  const navigate = useNavigate();

  return (
    <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center' }}>
      <div className="card" style={{ 
        width: '100%', 
        maxWidth: '440px', 
        padding: '48px', 
        borderRadius: '20px',
        border: '2px solid var(--border-light)',
        animation: 'fadeIn 0.5s ease-out',
        position: 'relative',
        zIndex: 10 // above particles
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '12px' }}>
          <div style={{
            width: '72px', height: '72px', borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 30px rgba(6, 182, 212, 0.4)',
            overflow: 'hidden'
          }}>
            <img src="/logo.jpeg" alt="Omni-SRE Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
        </div>

        <h1 style={{ fontSize: '26px', textAlign: 'center', color: 'var(--bg-darker)', marginBottom: '8px' }}>
          Sign in to Omni-SRE
        </h1>
        <p style={{ fontSize: '14px', textAlign: 'center', color: 'var(--text-secondary)', marginBottom: '32px' }}>
          Enterprise Context-Aware Code Review Agent
        </p>

        {/* GitHub Login */}
        <button className="btn btn-dark" style={{ width: '100%', height: '52px', fontSize: '16px', borderRadius: '14px', marginBottom: '24px' }} onClick={() => navigate('/dashboard')}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="none" style={{marginRight: '10px'}}>
            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
          </svg>
          Continue with GitHub
        </button>

        {/* Divider */}
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '24px' }}>
          <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border-light)' }} />
          <span style={{ padding: '0 12px', fontSize: '14px', color: 'var(--text-muted)' }}>or</span>
          <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border-light)' }} />
        </div>

        {/* Email Login */}
        <input 
          type="email" 
          placeholder="Enter your work email" 
          className="input-base" 
          style={{ marginBottom: '12px' }}
        />
        <button className="btn btn-primary" style={{ width: '100%', height: '50px', fontSize: '14px', borderRadius: '14px', marginBottom: '24px' }} onClick={() => navigate('/dashboard')}>
          Continue with Email →
        </button>

        <p style={{ fontSize: '12px', textAlign: 'center', color: 'var(--text-muted)' }}>
          By continuing you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
      
      {/* Footer Link */}
      <div style={{ position: 'absolute', bottom: '40px', width: '100%', textAlign: 'center', zIndex: 10 }}>
         <a href="#" style={{ color: 'var(--primary-container)', fontSize: '14px', textDecoration: 'none', fontWeight: '500' }}>
            New to Omni-SRE? Request early access →
         </a>
      </div>
    </div>
  );
};

export default Login;
