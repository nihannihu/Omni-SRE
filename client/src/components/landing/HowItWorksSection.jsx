import React, { useEffect, useRef, useState, useMemo } from 'react';

function useScrollReveal() {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true); }, { threshold: 0.1 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return [ref, visible];
}

// Starfield background
function Starfield() {
  const stars = useMemo(() => Array.from({ length: 200 }, () => ({
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: 0.5 + Math.random() * 2,
    delay: Math.random() * 6,
    duration: 3 + Math.random() * 5,
  })), []);

  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
      {stars.map((s, i) => (
        <div key={i} style={{
          position: 'absolute', left: `${s.x}%`, top: `${s.y}%`,
          width: s.size, height: s.size, borderRadius: '50%',
          background: '#ffffff',
          animation: `twinkle ${s.duration}s ease-in-out ${s.delay}s infinite`,
        }} />
      ))}
    </div>
  );
}

function TimelineCard({ icon, title, subtitle, desc, glow, index, isLeft }) {
  const [ref, visible] = useScrollReveal();
  const cardRef = useRef(null);
  const [hovered, setHovered] = useState(false);

  const handleMove = (e) => {
    const rect = cardRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width - 0.5) * 20;
    const y = ((e.clientY - rect.top) / rect.height - 0.5) * -20;
    cardRef.current.style.transform = `perspective(1000px) rotateX(${y}deg) rotateY(${x}deg) scale(1.04)`;
  };
  const handleLeave = () => {
    setHovered(false);
    if (cardRef.current) cardRef.current.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) scale(1)';
  };

  return (
    <div ref={ref} style={{
      display: 'flex', alignItems: 'center', gap: 0,
      flexDirection: isLeft ? 'row' : 'row-reverse',
      opacity: visible ? 1 : 0,
      transform: visible
        ? 'translateX(0)'
        : isLeft ? 'translateX(-80px)' : 'translateX(80px)',
      transition: `all 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) ${index * 300}ms`,
      marginBottom: 20,
    }}>
      {/* Card */}
      <div style={{ flex: 1, maxWidth: 420, padding: isLeft ? '0 40px 0 0' : '0 0 0 40px' }}>
        <div ref={cardRef}
          onMouseMove={handleMove}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={handleLeave}
          style={{
            background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(20px)',
            border: `1px solid ${hovered ? glow + '50' : 'rgba(255,255,255,0.08)'}`,
            borderRadius: 20, padding: '36px 32px', position: 'relative',
            transition: 'all 0.4s cubic-bezier(0.23,1,0.32,1)',
            boxShadow: hovered ? `0 20px 60px ${glow}20, 0 0 40px ${glow}10` : 'none',
            willChange: 'transform',
          }}>
          {/* Live indicator */}
          <div style={{
            position: 'absolute', top: 16, right: 16,
            display: 'flex', alignItems: 'center', gap: 6,
            fontSize: 10, fontWeight: 800, color: '#10b981', letterSpacing: '0.1em',
          }}>
            <div style={{
              width: 6, height: 6, borderRadius: '50%', background: '#10b981',
              animation: 'livePulse 2s ease-in-out infinite',
            }} />
            ACTIVE
          </div>

          <div style={{
            fontSize: 56, marginBottom: 16,
            animation: `floatIcon 3s ease-in-out infinite ${index * 0.3}s`,
          }}>{icon}</div>
          <h3 style={{ fontSize: 20, fontWeight: 800, color: '#ffffff', marginBottom: 6 }}>{title}</h3>
          <div style={{
            fontSize: 12, fontWeight: 700, color: glow, textTransform: 'uppercase',
            letterSpacing: '0.1em', marginBottom: 14,
          }}>{subtitle}</div>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', lineHeight: 1.7, margin: 0 }}>{desc}</p>
        </div>
      </div>

      {/* Center node */}
      <div style={{
        width: 60, height: 60, borderRadius: '50%', flexShrink: 0, zIndex: 2,
        background: `linear-gradient(135deg, ${glow}, ${glow}88)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 22, fontWeight: 900, color: '#fff',
        boxShadow: `0 0 30px ${glow}50, 0 0 60px ${glow}20`,
        border: '3px solid rgba(255,255,255,0.2)',
      }}>{index + 1}</div>

      {/* Spacer for opposite side */}
      <div style={{ flex: 1, maxWidth: 420 }} />
    </div>
  );
}

export default function HowItWorksSection() {
  const [headRef, headVisible] = useScrollReveal();
  const [sectionRef, sectionVisible] = useScrollReveal();
  const [badgesRef, badgesVisible] = useScrollReveal();

  const steps = [
    { icon: '🔔', title: 'Webhook Trigger', subtitle: 'PR Opened', desc: 'GitHub sends a webhook. HMAC signature verified in <50ms. Zero unauthorized access.', glow: '#3b82f6' },
    { icon: '🧠', title: 'Memory Retrieval', subtitle: 'pgvector Search', desc: 'Semantic similarity search across all past reviews, bugs, and institutional knowledge.', glow: '#7c3aed' },
    { icon: '⚡', title: 'Groq AI Analysis', subtitle: 'LLM Inference', desc: 'Context-aware review with institutional memory injected. No generic advice.', glow: '#10b981' },
    { icon: '📝', title: 'PR Comment Posted', subtitle: 'Review Published', desc: 'Specific, contextual feedback posted directly to your PR. Signal, not noise.', glow: '#f59e0b' },
  ];

  const badges = [
    { icon: '🔒', label: 'HMAC Verified', color: '#3b82f6' },
    { icon: '🏛️', label: 'Tenant Isolated RLS', color: '#7c3aed' },
    { icon: '⚡', label: 'Groq Powered', color: '#10b981' },
  ];

  return (
    <section id="how-it-works" style={{
      background: '#020208', padding: '140px 24px', fontFamily: "'Inter', sans-serif",
      position: 'relative', overflow: 'hidden',
    }}>
      <Starfield />

      {/* Gradient Orbs */}
      <div style={{
        position: 'absolute', top: '5%', left: '-15%', width: 800, height: 800,
        background: 'radial-gradient(circle, rgba(59,130,246,0.1) 0%, transparent 70%)',
        borderRadius: '50%', filter: 'blur(100px)',
        animation: 'orbDrift 20s ease-in-out infinite',
      }} />
      <div style={{
        position: 'absolute', top: '40%', right: '-10%', width: 600, height: 600,
        background: 'radial-gradient(circle, rgba(124,58,237,0.08) 0%, transparent 70%)',
        borderRadius: '50%', filter: 'blur(100px)',
        animation: 'orbDrift 25s ease-in-out infinite 5s',
      }} />
      <div style={{
        position: 'absolute', bottom: '10%', left: '40%', width: 400, height: 400,
        background: 'radial-gradient(circle, rgba(16,185,129,0.08) 0%, transparent 70%)',
        borderRadius: '50%', filter: 'blur(100px)',
        animation: 'orbDrift 18s ease-in-out infinite 3s',
      }} />

      <div style={{ maxWidth: 1000, margin: '0 auto', position: 'relative', zIndex: 1 }}>
        {/* Header */}
        <div ref={headRef} style={{
          textAlign: 'center', marginBottom: 80,
          opacity: headVisible ? 1 : 0, transform: headVisible ? 'translateY(0)' : 'translateY(40px)',
          transition: 'all 0.7s cubic-bezier(0.23,1,0.32,1)',
        }}>
          <span className="landing-pill landing-pill-dark" style={{ marginBottom: 24, display: 'inline-flex' }}>🏗️ Architecture</span>
          <h2 className="landing-section-heading" style={{
            fontSize: 56, fontWeight: 800, color: '#ffffff', letterSpacing: '-0.03em',
            margin: '24px 0 20px', lineHeight: 1.1,
          }}>How Omni-SRE Thinks.</h2>
          <p style={{ fontSize: 18, color: '#9ca3af', maxWidth: 560, margin: '0 auto', lineHeight: 1.7 }}>
            A four-stage intelligence pipeline that turns your team's history into real-time protection.
          </p>
        </div>

        {/* Vertical Timeline */}
        <div ref={sectionRef} style={{ position: 'relative', paddingTop: 20, paddingBottom: 20 }}>
          {/* Center glowing line */}
          <div style={{
            position: 'absolute', left: '50%', top: 0, bottom: 0, width: 2,
            transform: 'translateX(-50%)',
            background: 'linear-gradient(180deg, #3b82f6, #7c3aed, #10b981, #f59e0b)',
            boxShadow: '0 0 15px rgba(59,130,246,0.4), 0 0 30px rgba(124,58,237,0.2)',
            opacity: sectionVisible ? 1 : 0,
            transition: 'opacity 0.8s ease',
          }}>
            {/* Flowing dots */}
            <div style={{
              position: 'absolute', width: 6, height: 6, borderRadius: '50%',
              background: '#ffffff', left: -2, top: 0,
              boxShadow: '0 0 10px rgba(255,255,255,0.8)',
              animation: 'flowDown 3s linear infinite',
            }} />
            <div style={{
              position: 'absolute', width: 6, height: 6, borderRadius: '50%',
              background: '#ffffff', left: -2, top: 0,
              boxShadow: '0 0 10px rgba(255,255,255,0.8)',
              animation: 'flowDown 3s linear 1.5s infinite',
            }} />
          </div>

          {steps.map((step, i) => (
            <TimelineCard key={i} {...step} index={i} isLeft={i % 2 === 0} />
          ))}
        </div>

        {/* Security Badges */}
        <div ref={badgesRef} className="landing-stats-row" style={{
          display: 'flex', justifyContent: 'center', gap: 20, flexWrap: 'wrap', marginTop: 60,
          opacity: badgesVisible ? 1 : 0, transform: badgesVisible ? 'translateY(0)' : 'translateY(30px)',
          transition: 'all 0.7s cubic-bezier(0.23,1,0.32,1) 0.3s',
        }}>
          {badges.map((b, i) => (
            <div key={i} style={{
              background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(16px)',
              border: `1px solid ${b.color}30`, borderRadius: 999,
              padding: '14px 28px', display: 'flex', alignItems: 'center', gap: 10,
              fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.8)',
              transition: 'all 0.3s ease', position: 'relative', overflow: 'hidden',
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = `0 8px 30px ${b.color}30`; e.currentTarget.style.borderColor = b.color + '60'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.borderColor = b.color + '30'; }}
            >
              {/* Pulse ring */}
              <div style={{
                position: 'absolute', left: 20, width: 24, height: 24, borderRadius: '50%',
                border: `2px solid ${b.color}40`,
                animation: 'pulseRing 2s ease-out infinite',
              }} />
              <span style={{ position: 'relative', zIndex: 1 }}>{b.icon}</span>
              <span style={{ position: 'relative', zIndex: 1 }}>{b.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Wave to light */}
      <div style={{ position: 'absolute', bottom: -1, left: 0, right: 0, zIndex: 2 }}>
        <svg viewBox="0 0 1440 60" preserveAspectRatio="none" style={{ display: 'block', width: '100%', height: 60 }}>
          <path d="M0,30 C360,60 720,0 1080,30 C1260,45 1380,40 1440,30 L1440,60 L0,60 Z" fill="#ffffff" />
        </svg>
      </div>

      <style>{`
        @keyframes twinkle {
          0%, 100% { opacity: 0.15; }
          50% { opacity: 0.8; }
        }
        @keyframes floatIcon {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-12px); }
        }
        @keyframes livePulse {
          0%, 100% { opacity: 1; box-shadow: 0 0 0 0 rgba(16,185,129,0.5); }
          50% { opacity: 0.6; box-shadow: 0 0 0 6px rgba(16,185,129,0); }
        }
        @keyframes flowDown {
          0% { top: -2%; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { top: 98%; opacity: 0; }
        }
        @keyframes orbDrift {
          0%, 100% { transform: translate(0, 0); }
          33% { transform: translate(40px, -30px); }
          66% { transform: translate(-30px, 40px); }
        }
        @keyframes pulseRing {
          0% { transform: scale(1); opacity: 0.6; }
          100% { transform: scale(2.5); opacity: 0; }
        }
      `}</style>
    </section>
  );
}
