import React from 'react';
import { supabase, supabaseUrl } from '../lib/supabase';
import omniLogo from '../assets/omni-logo.jpeg';
import GlassCard from '../components/ui/GlassCard';
import { GitPullRequest } from 'lucide-react';

export default function Auth() {
  const handleLogin = async () => {
    console.log('-> INITIATING OAUTH WITH URL:', supabaseUrl);
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
    <div className="auth-container" style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      minHeight: '100vh', padding: '1rem', background: 'var(--bg-deep)'
    }}>
      <GlassCard 
        className="animate-slide-up"
        style={{ 
          width: '100%', maxWidth: '420px', padding: '3rem 2.5rem', 
          textAlign: 'center', position: 'relative', zIndex: 1
        }}
      >
        <div style={{ marginBottom: '2.5rem' }}>
          <div style={{ 
            width: 80, height: 80, margin: '0 auto 1.5rem', 
            borderRadius: '24px', overflow: 'hidden',
            boxShadow: '0 8px 32px rgba(56, 189, 248, 0.4)',
            border: '2px solid rgba(56, 189, 248, 0.3)'
          }}>
            <img 
              src={omniLogo} 
              alt="Omni-SRE" 
              style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
            />
          </div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
            Omni-SRE
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.6 }}>
            The AI-first Site Reliability Engine. <br/>
            Context-aware intelligence for modern engineering.
          </p>
        </div>

        <button 
          onClick={handleLogin} 
          className="btn-premium btn-primary"
          style={{ width: '100%', justifyContent: 'center', padding: '1rem' }}
        >
          <GitPullRequest size={20} />
          <span>Continue with GitHub</span>
        </button>

        <div style={{ marginTop: '2.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--glass-border)' }}>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            Enterprise Grade Reliability
          </p>
        </div>
      </GlassCard>

      {/* Ambient background decoration */}
      <div style={{
        position: 'absolute', top: '10%', right: '15%', 
        width: '300px', height: '300px', borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(56, 189, 248, 0.08) 0%, transparent 70%)',
        filter: 'blur(60px)', pointerEvents: 'none'
      }} />
      <div style={{
        position: 'absolute', bottom: '15%', left: '10%', 
        width: '250px', height: '250px', borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(129, 140, 248, 0.08) 0%, transparent 70%)',
        filter: 'blur(60px)', pointerEvents: 'none'
      }} />
    </div>
  );
}
