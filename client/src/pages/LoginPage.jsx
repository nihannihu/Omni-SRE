import React from 'react';
import { supabase } from '../lib/supabase';
import { Github, Zap } from 'lucide-react';
import omniLogo from '../assets/omni-logo.jpeg';
import TiltCard from '../components/ui/TiltCard';

export default function LoginPage() {
  const handleLogin = async () => {
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
      minHeight: '100vh', padding: '1.5rem', background: 'transparent',
      position: 'relative', overflow: 'hidden',
    }}>
      <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: '440px' }}>
        <TiltCard className="animate-slide-up">
           <div className="glass-card" style={{ padding: '4rem 3rem', textAlign: 'center' }}>
            <div style={{ marginBottom: '3rem' }}>
              {/* Logo Section */}
              <div style={{
                width: 104, height: 104, margin: '0 auto 2.5rem',
                background: '#ffffff',
                borderRadius: '24px',
                overflow: 'hidden',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 12px 40px rgba(0, 0, 0, 0.08)',
                padding: '12px',
                border: '1px solid rgba(0, 0, 0, 0.05)'
              }}>
                  <img 
                    src={omniLogo} 
                    alt="Omni-SRE" 
                    style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: '14px' }}
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = "https://ui-avatars.com/api/?name=O&background=f1f5f9&color=2563eb";
                    }}
                  />
              </div>

              <h2 style={{
                fontSize: '2.5rem', fontWeight: 800,
                color: 'var(--text-primary)', marginBottom: '0.75rem',
                letterSpacing: '-0.05em',
              }}>
                Omni-SRE
              </h2>
              <p style={{
                color: 'var(--text-secondary)', fontSize: '1rem', lineHeight: 1.6,
                fontWeight: 500
              }}>
                Engineering Intelligence. <br/>
                Reliability scaling at the speed of thought.
              </p>
            </div>

            <button
              onClick={handleLogin}
              className="btn-pill btn-primary"
              style={{
                width: '100%', justifyContent: 'center',
                padding: '1rem', fontSize: '1rem',
              }}
            >
              <Github size={22} />
              <span>Connect GitHub</span>
            </button>

            <div style={{
              marginTop: '3rem', paddingTop: '2.5rem',
              borderTop: '1px solid var(--border-subtle)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1.5rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Zap size={14} style={{ color: 'var(--brand-primary)' }} />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                  Institutional Grade
                </span>
              </div>
            </div>
          </div>
        </TiltCard>
        
        <p style={{ 
          marginTop: '2.5rem', textAlign: 'center', color: 'var(--text-dim)', 
          fontSize: '0.85rem', fontWeight: 600, letterSpacing: '0.05em'
        }}>
          Omni-SRE Dashboard v2.0
        </p>
      </div>
    </div>
  );
}
