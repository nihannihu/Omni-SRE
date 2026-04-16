import React from 'react';
import { supabase, supabaseUrl } from '../lib/supabase';
import { GitPullRequest } from 'lucide-react';
import omniLogo from '../assets/omni-logo.jpeg';
import TiltCard from '../components/ui/TiltCard';
import ConfettiBackground from '../components/ui/ConfettiBackground';

export default function LoginPage() {
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
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      minHeight: '100vh', padding: '1rem', background: '#ffffff',
      position: 'relative', overflow: 'hidden',
    }}>
      <ConfettiBackground />

      <TiltCard
        className="animate-slide-up"
        style={{
          width: '100%', maxWidth: '420px', padding: '3.5rem 2.5rem',
          textAlign: 'center', position: 'relative', zIndex: 1,
          background: 'rgba(255, 255, 255, 0.85)',
          border: '1px solid rgba(0, 0, 0, 0.06)',
          borderRadius: '24px',
          boxShadow: '0 8px 40px rgba(0, 0, 0, 0.08)',
        }}
      >
        <div style={{ marginBottom: '2.5rem' }}>
          {/* Geometric SVG Logo */}
          <div style={{
            width: 84, height: 84, margin: '0 auto 1.5rem',
            background: '#ffffff', borderRadius: '50%',
            overflow: 'hidden',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 8px 32px rgba(56, 189, 248, 0.25)',
            border: '1px solid rgba(56, 189, 248, 0.1)',
            padding: '8px',
          }}>
            <img 
              src={omniLogo} 
              alt="Omni-SRE" 
              style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: '50%' }}
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = "https://ui-avatars.com/api/?name=O&background=0a0a0a&color=fff";
              }}
            />
          </div>

          <h2 style={{
            fontSize: '2rem', fontWeight: 900,
            color: '#0a0a0a', marginBottom: '0.5rem',
            letterSpacing: '-0.03em',
          }}>
            Omni-SRE
          </h2>
          <p style={{
            color: '#9ca3af', fontSize: '0.9rem', lineHeight: 1.6,
          }}>
            The AI-first Site Reliability Engine. <br/>
            Context-aware intelligence for modern engineering.
          </p>
        </div>

        <button
          onClick={handleLogin}
          className="btn-pill btn-dark"
          style={{
            width: '100%', justifyContent: 'center',
            padding: '0.875rem 1.75rem', fontSize: '0.9rem',
          }}
        >
          <GitPullRequest size={18} />
          <span>Continue with GitHub</span>
        </button>

        <div style={{
          marginTop: '2.5rem', paddingTop: '1.5rem',
          borderTop: '1px solid rgba(0, 0, 0, 0.06)',
        }}>
          <p style={{
            fontSize: '0.65rem', color: '#d1d5db',
            letterSpacing: '0.15em', textTransform: 'uppercase',
            fontWeight: 700,
          }}>
            Enterprise Grade Reliability
          </p>
        </div>
      </TiltCard>
    </div>
  );
}
