import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const navLinks = [
    { label: 'Features', href: '#features' },
    { label: 'How It Works', href: '#how-it-works' },
    { label: 'Security', href: '#security' },
  ];

  return (
    <>
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1000,
        padding: '0 48px', height: 72,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: scrolled ? 'rgba(255,255,255,0.85)' : 'transparent',
        backdropFilter: scrolled ? 'blur(20px)' : 'none',
        borderBottom: scrolled ? '1px solid rgba(0,0,0,0.06)' : '1px solid transparent',
        transition: 'all 0.4s cubic-bezier(0.23, 1, 0.32, 1)',
        fontFamily: "'Inter', sans-serif",
      }}>
        {/* Logo */}
        <a href="#" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <div style={{
            width: 36, height: 36, borderRadius: 8,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            overflow: 'hidden', background: '#fff'
          }}>
            <img src="/logo.jpeg" alt="Omni-SRE Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
          <span style={{
            fontSize: 20, fontWeight: 800, letterSpacing: '-0.03em',
            color: scrolled ? '#0a0a14' : '#ffffff',
            transition: 'color 0.3s ease',
          }}>Omni-SRE</span>
        </a>

        {/* Center Links */}
        <div className="landing-nav-links" style={{ display: 'flex', gap: 36 }}>
          {navLinks.map(link => (
            <a key={link.label} href={link.href} style={{
              fontSize: 15, fontWeight: 500, textDecoration: 'none',
              color: scrolled ? '#6b7280' : 'rgba(255,255,255,0.7)',
              transition: 'color 0.3s ease',
              position: 'relative',
            }}
            onMouseEnter={e => e.target.style.color = scrolled ? '#0a0a14' : '#ffffff'}
            onMouseLeave={e => e.target.style.color = scrolled ? '#6b7280' : 'rgba(255,255,255,0.7)'}
            >
              {link.label}
            </a>
          ))}
        </div>

        {/* Right Buttons */}
        <div className="landing-nav-buttons" style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <button onClick={() => navigate('/auth')} style={{
            padding: '8px 20px', borderRadius: 999, fontSize: 14, fontWeight: 600,
            background: 'transparent', cursor: 'pointer',
            color: scrolled ? '#6b7280' : 'rgba(255,255,255,0.8)',
            border: `1px solid ${scrolled ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.2)'}`,
            transition: 'all 0.3s ease', fontFamily: "'Inter', sans-serif",
          }}>Sign In</button>
          <button onClick={() => navigate('/auth')} style={{
            padding: '10px 24px', borderRadius: 999, fontSize: 14, fontWeight: 700,
            background: scrolled ? '#0a0a14' : '#ffffff',
            color: scrolled ? '#ffffff' : '#0a0a14',
            border: 'none', cursor: 'pointer',
            transition: 'all 0.3s ease', fontFamily: "'Inter', sans-serif",
          }}>Get Started →</button>
        </div>

        {/* Mobile hamburger */}
        <button className="landing-mobile-menu-btn" onClick={() => setMobileOpen(!mobileOpen)} style={{
          display: 'none', background: 'none', border: 'none', cursor: 'pointer', padding: 8,
        }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={scrolled ? '#0a0a14' : '#ffffff'} strokeWidth="2">
            {mobileOpen ? <path d="M18 6L6 18M6 6l12 12"/> : <><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></>}
          </svg>
        </button>
      </nav>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div style={{
          position: 'fixed', top: 72, left: 0, right: 0, zIndex: 999,
          background: 'rgba(5,5,16,0.98)', backdropFilter: 'blur(20px)',
          padding: '24px 32px', display: 'flex', flexDirection: 'column', gap: 16,
          borderBottom: '1px solid rgba(255,255,255,0.1)',
          animation: 'slideUp 0.3s ease forwards', fontFamily: "'Inter', sans-serif",
        }}>
          {navLinks.map(link => (
            <a key={link.label} href={link.href} onClick={() => setMobileOpen(false)} style={{
              fontSize: 18, fontWeight: 600, color: '#ffffff', textDecoration: 'none', padding: '12px 0',
              borderBottom: '1px solid rgba(255,255,255,0.06)',
            }}>{link.label}</a>
          ))}
          <button onClick={() => { navigate('/auth'); setMobileOpen(false); }} style={{
            marginTop: 8, padding: '14px', borderRadius: 999, fontSize: 16, fontWeight: 700,
            background: '#3b82f6', color: '#fff', border: 'none', cursor: 'pointer',
            fontFamily: "'Inter', sans-serif",
          }}>Get Started →</button>
        </div>
      )}
    </>
  );
}
