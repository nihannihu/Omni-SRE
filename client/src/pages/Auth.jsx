import React from 'react';
import { supabase, supabaseUrl } from '../lib/supabase';
import omniLogo from '../assets/omni-logo.jpeg';

export default function Auth() {
  const handleLogin = async () => {
    console.log('🛑 [DIAGNOSTIC TRACE: Auth.jsx handleLogin()] 🛑');
    console.log('-> INITIATING OAUTH WITH URL:', supabaseUrl);
    console.log('-> REDIRECT TO:', window.location.origin);
    
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: {
        redirectTo: window.location.origin
      }
    });
    
    if (error) {
      console.error('Error logging in:', error);
    }
  };

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      minHeight: '100vh', background: 'var(--bg-base, #030712)', color: '#fff',
      fontFamily: 'Inter, system-ui, sans-serif'
    }}>
      <div style={{
        width: '100%', maxWidth: '400px', padding: '40px 32px',
        background: 'var(--bg-surface, #111827)', borderRadius: '16px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        border: '1px solid var(--border-color, #1f2937)',
        textAlign: 'center'
      }}>
        <img 
          src={omniLogo} 
          alt="Omni-SRE Logo" 
          style={{ width: '80px', height: '80px', margin: '0 auto 24px', borderRadius: '50%', objectFit: 'cover' }} 
        />
        
        <h2 style={{ fontSize: '24px', fontWeight: '800', marginBottom: '8px' }}>Sign in to Omni-SRE</h2>
        <p style={{ color: '#9ca3af', fontSize: '14px', marginBottom: '32px' }}>
          Enterprise Context-Aware Code Review Agent
        </p>

        <button 
          onClick={handleLogin} 
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: '100%', padding: '12px 16px', fontSize: '15px', fontWeight: '600',
            color: '#fff', background: '#374151', border: 'none', borderRadius: '8px',
            cursor: 'pointer', transition: 'background 0.2s'
          }} 
          onMouseOver={(e) => e.target.style.background = '#4b5563'} 
          onMouseOut={(e) => e.target.style.background = '#374151'}
        >
          <svg style={{ marginRight: '12px', width: '20px', height: '20px', fill: 'currentColor' }} viewBox="0 0 24 24" aria-hidden="true">
            <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
          </svg>
          Continue with GitHub
        </button>
      </div>
    </div>
  );
}
