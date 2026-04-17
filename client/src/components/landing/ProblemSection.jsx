import React, { useEffect, useRef, useState, useMemo } from 'react';

function useScrollReveal() {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true); }, { threshold: 0.15 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return [ref, visible];
}

function AnimatedCounter({ end, suffix = '', label, color }) {
  const [count, setCount] = useState(0);
  const [ref, visible] = useScrollReveal();
  useEffect(() => {
    if (!visible) return;
    if (typeof end !== 'number') { setCount(end); return; }
    const duration = 2000;
    const startTime = performance.now();
    const step = (now) => {
      const progress = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(eased * end));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [visible, end]);
  return (
    <div ref={ref} style={{
      textAlign: 'center',
      opacity: visible ? 1 : 0,
      transform: visible ? 'scale(1)' : 'scale(0.5)',
      transition: 'all 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)',
    }}>
      <div style={{
        fontSize: 64, fontWeight: 900, color: '#ffffff', letterSpacing: '-0.04em', lineHeight: 1,
        textShadow: `0 0 40px ${color}80, 0 0 20px ${color}40`,
      }}>
        {typeof end === 'number' ? count : end}{suffix}
      </div>
      <div style={{
        width: 80, height: 4, borderRadius: 2, background: color, margin: '12px auto',
        boxShadow: `0 0 20px ${color}80`,
      }} />
      <div style={{ fontSize: 15, color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 12 }}>{label}</div>
    </div>
  );
}

// Sleek interactive floating tech symbols for dark aesthetic (Canvas implementation)
function FloatingTechSymbols() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    let animId;

    const resize = () => {
      canvas.width = canvas.offsetWidth * dpr;
      canvas.height = canvas.offsetHeight * dpr;
      ctx.scale(dpr, dpr);
    };
    resize();
    window.addEventListener('resize', resize);

    const icons = ['{ }', '< />', '[ ]', '>_', '//', '⌘', '⌥'];
    const particles = Array.from({ length: 80 }, () => ({
      text: icons[Math.floor(Math.random() * icons.length)],
      x: Math.random() * canvas.offsetWidth,
      y: canvas.offsetHeight + Math.random() * 800,
      baseVx: (Math.random() - 0.5) * 0.5,
      baseVy: -1.5 - Math.random() * 2.5, // fast upward
      vx: 0,
      vy: 0,
      size: 14 + Math.random() * 16,
      rot: Math.random() * Math.PI * 2,
      spin: (Math.random() - 0.5) * 0.05,
    }));

    let mouseX = -999;
    let mouseY = -999;

    const onMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      mouseX = e.clientX - rect.left;
      mouseY = e.clientY - rect.top;
    };
    const onLeave = () => { mouseX = -999; mouseY = -999; };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('scroll', onLeave, { passive: true });

    const animate = () => {
      ctx.clearRect(0, 0, canvas.offsetWidth, canvas.offsetHeight);

      particles.forEach(p => {
        // Return to base speed organically
        p.vx += (p.baseVx - p.vx) * 0.05;
        p.vy += (p.baseVy - p.vy) * 0.05;

        // Collision/Repel
        if (mouseX > 0) {
          const dx = p.x - mouseX;
          const dy = p.y - mouseY;
          const distSq = dx * dx + dy * dy;
          const repRadius = 250;
          if (distSq < repRadius * repRadius) {
            const force = (repRadius * repRadius - distSq) / (repRadius * repRadius);
            const angle = Math.atan2(dy, dx);
            p.vx += Math.cos(angle) * force * 15;
            p.vy += Math.sin(angle) * force * 15;
            p.spin += force * 0.02;
          }
        }

        // Apply friction
        p.vx *= 0.95;
        p.vy *= 0.95;

        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.spin;

        // Wrap around fast
        if (p.y < -100) {
          p.y = canvas.offsetHeight + 100;
          p.x = Math.random() * canvas.offsetWidth;
        }
        if (p.x < -100) p.x = canvas.offsetWidth + 100;
        if (p.x > canvas.offsetWidth + 100) p.x = -100;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        
        ctx.font = `${p.size}px 'JetBrains Mono', monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = 'rgba(70, 80, 110, 0.4)'; // Darker, tech-grey
        ctx.fillText(p.text, 0, 0);
        
        ctx.restore();
      });

      animId = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('scroll', onLeave);
      cancelAnimationFrame(animId);
    };
  }, []);

  return (
    <canvas ref={canvasRef} style={{
      position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 0
    }} />
  );
}

export default function ProblemSection() {
  const [headRef, headVisible] = useScrollReveal();
  const [cardsRef, cardsVisible] = useScrollReveal();
  const [statsRef, statsVisible] = useScrollReveal();

  const oldWay = [
    'Gives textbook advice with no team context',
    "Can't remember your past failures",
    'Flags the same issues every sprint',
    'No institutional memory',
    'Noise without signal',
  ];
  const omniWay = [
    "Learns from your team's rejected PRs",
    'Remembers every past bug and failure',
    'Catches context-specific security issues',
    'Grows smarter with every review',
    'Signal over noise, always',
  ];

  // Word-by-word animate heading
  const headingWords = 'Generic AI gives generic advice.'.split(' ');

  return (
    <section id="problem" style={{
      position: 'relative', padding: '140px 24px', fontFamily: "'Inter', sans-serif",
      overflow: 'hidden', background: '#020208',
    }}>
      {/* Animated gradient mesh background (Dark Mode) */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 0, overflow: 'hidden' }}>
        <div style={{
          position: 'absolute', top: '-20%', left: '-20%', width: '80%', height: '80%',
          background: 'radial-gradient(circle, rgba(239,68,68,0.06) 0%, transparent 60%)',
          borderRadius: '50%', filter: 'blur(100px)',
          animation: 'meshRotate1 20s ease-in-out infinite',
        }} />
        <div style={{
          position: 'absolute', top: '20%', right: '-10%', width: '60%', height: '60%',
          background: 'radial-gradient(circle, rgba(59,130,246,0.06) 0%, transparent 60%)',
          borderRadius: '50%', filter: 'blur(100px)',
          animation: 'meshRotate2 30s ease-in-out infinite',
        }} />
        <div style={{
          position: 'absolute', bottom: '-10%', left: '30%', width: '50%', height: '50%',
          background: 'radial-gradient(circle, rgba(16,185,129,0.06) 0%, transparent 60%)',
          borderRadius: '50%', filter: 'blur(100px)',
          animation: 'meshRotate3 25s ease-in-out infinite',
        }} />
      </div>

      {/* Grid Pattern overlay */}
      <div style={{
        position: 'absolute', inset: 0, opacity: 0.15, zIndex: 0,
        backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.15) 1px, transparent 1px)',
        backgroundSize: '40px 40px', pointerEvents: 'none',
      }} />

      <FloatingTechSymbols />

      <div style={{ maxWidth: 1200, margin: '0 auto', position: 'relative', zIndex: 1 }}>
        {/* Header */}
        <div ref={headRef} style={{ textAlign: 'center', marginBottom: 80 }}>
          <span className="landing-pill landing-pill-red" style={{ marginBottom: 28, display: 'inline-flex' }}>⚠️ The Problem</span>
          <h2 style={{ fontSize: 56, fontWeight: 800, letterSpacing: '-0.03em', margin: '28px 0 24px', lineHeight: 1.1 }}>
            {headingWords.map((word, i) => (
              <span key={i} style={{
                display: 'inline-block', marginRight: 14,
                opacity: headVisible ? 1 : 0,
                transform: headVisible ? 'translateY(0)' : 'translateY(-60px)',
                transition: `all 0.6s cubic-bezier(0.23,1,0.32,1) ${i * 80}ms`,
                color: '#ffffff',
                ...(word.toLowerCase() === 'generic' ? {
                  textDecoration: 'line-through',
                  textDecorationColor: '#ef4444',
                  textDecorationThickness: '4px',
                  textShadow: '0 0 20px rgba(239,68,68,0.4)'
                } : {}),
              }}>{word}</span>
            ))}
          </h2>
          <p style={{
            fontSize: 18, color: '#9ca3af', maxWidth: 600, margin: '0 auto', lineHeight: 1.7,
            opacity: headVisible ? 1 : 0, transition: 'opacity 0.6s ease 0.5s',
          }}>
            Every AI linter tells you the same thing. None of them know your team
            shipped a broken auth migration 3 months ago.
          </p>
        </div>

        {/* Comparison Cards */}
        <div ref={cardsRef} className="landing-grid-2" style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 36, marginBottom: 80,
          opacity: cardsVisible ? 1 : 0, transform: cardsVisible ? 'translateY(0)' : 'translateY(50px)',
          transition: 'all 0.8s cubic-bezier(0.23,1,0.32,1) 0.2s',
        }}>
          {/* Old Way Card - Dark Theme */}
          <div style={{ perspective: 1000 }}>
            <div style={{
              position: 'relative', background: 'rgba(255,255,255,0.02)', backdropFilter: 'blur(20px)', 
              borderRadius: 24, padding: '44px 40px',
              border: '1px solid rgba(255,255,255,0.05)', borderTop: '4px solid #ef4444', overflow: 'hidden',
              boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
              transition: 'all 0.5s cubic-bezier(0.23,1,0.32,1)',
              animation: 'pulseRedGlowDark 3s ease-in-out infinite',
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'rotateY(-8deg) translateY(-8px)'; e.currentTarget.style.boxShadow = '0 20px 60px rgba(239,68,68,0.2)'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.2)'; e.currentTarget.style.borderTop = '4px solid #ef4444'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'rotateY(0) translateY(0)'; e.currentTarget.style.boxShadow = '0 8px 32px rgba(0,0,0,0.4)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)'; e.currentTarget.style.borderTop = '4px solid #ef4444'; }}
            >
              {/* Watermark */}
              <div style={{
                position: 'absolute', top: '50%', left: '50%',
                transform: 'translate(-50%,-50%) rotate(-45deg)',
                fontSize: 80, fontWeight: 900, color: 'transparent',
                WebkitTextStroke: '1px rgba(239,68,68,0.1)',
                whiteSpace: 'nowrap', pointerEvents: 'none', letterSpacing: '0.1em',
              }}>OUTDATED</div>

              <h3 style={{ fontSize: 24, fontWeight: 800, color: '#ffffff', marginBottom: 32, display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ color: '#ef4444', textShadow: '0 0 15px rgba(239,68,68,0.6)' }}>✗</span> Generic AI Linters
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20, position: 'relative' }}>
                {oldWay.map((item, i) => (
                  <div key={i} style={{ display: 'flex', gap: 14, alignItems: 'center' }}
                    onMouseEnter={e => { const icon = e.currentTarget.querySelector('.shake-icon'); if(icon) icon.style.animation = 'shakeX 0.4s ease'; }}
                    onMouseLeave={e => { const icon = e.currentTarget.querySelector('.shake-icon'); if(icon) icon.style.animation = 'none'; }}
                  >
                    <div className="shake-icon" style={{
                      width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                      background: 'rgba(239,68,68,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      border: '1px solid rgba(239,68,68,0.3)',
                    }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="3"><path d="M18 6L6 18M6 6l12 12"/></svg>
                    </div>
                    <span style={{ fontSize: 16, color: '#9ca3af', lineHeight: 1.5, fontWeight: 500 }}>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Omni Way Card - Dark Theme */}
          <div style={{ perspective: 1000 }}>
            <div style={{
              position: 'relative', borderRadius: 24, padding: '44px 40px',
              border: '1px solid rgba(16,185,129,0.2)', borderTop: '4px solid #10b981', overflow: 'hidden',
              background: 'linear-gradient(180deg, rgba(16,185,129,0.06) 0%, rgba(255,255,255,0.02) 100%)',
              backdropFilter: 'blur(20px)',
              boxShadow: '0 8px 32px rgba(16,185,129,0.1)',
              transition: 'all 0.5s cubic-bezier(0.23,1,0.32,1)',
              animation: 'pulseGreenGlowDark 3s ease-in-out infinite 1.5s',
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-12px)'; e.currentTarget.style.boxShadow = '0 24px 64px rgba(16,185,129,0.25)'; e.currentTarget.style.borderColor = 'rgba(16,185,129,0.4)'; e.currentTarget.style.borderTop = '4px solid #10b981'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 8px 32px rgba(16,185,129,0.1)'; e.currentTarget.style.borderColor = 'rgba(16,185,129,0.2)'; e.currentTarget.style.borderTop = '4px solid #10b981'; }}
            >
              {/* Recommended Badge */}
              <div style={{
                position: 'absolute', top: 20, right: 20,
                background: 'rgba(16,185,129,0.2)', color: '#10b981', border: '1px solid #10b981',
                fontSize: 11, fontWeight: 800,
                padding: '6px 14px', borderRadius: 999, letterSpacing: '0.08em',
                animation: 'badgeBounce 2s ease infinite',
                boxShadow: '0 0 15px rgba(16,185,129,0.4)',
              }}>RECOMMENDED</div>

              {/* Watermark Removed for a cleaner look */}

              <h3 style={{ fontSize: 24, fontWeight: 800, color: '#ffffff', marginBottom: 32, display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ color: '#10b981', textShadow: '0 0 15px rgba(16,185,129,0.6)' }}>✓</span> Omni-SRE
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20, position: 'relative' }}>
                {omniWay.map((item, i) => (
                  <div key={i} style={{
                    display: 'flex', gap: 14, alignItems: 'center',
                    opacity: cardsVisible ? 1 : 0,
                    transform: cardsVisible ? 'translateX(0)' : 'translateX(20px)',
                    transition: `all 0.5s ease ${0.4 + i * 0.1}s`,
                  }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                      background: 'rgba(16,185,129,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      border: '1px solid rgba(16,185,129,0.3)'
                    }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="3"
                        style={{ strokeDasharray: 30, strokeDashoffset: cardsVisible ? 0 : 30, transition: `stroke-dashoffset 0.6s ease ${0.6 + i * 0.15}s` }}>
                        <path d="M20 6L9 17l-5-5"/>
                      </svg>
                    </div>
                    <span style={{ fontSize: 16, color: '#e5e7eb', lineHeight: 1.5, fontWeight: 500 }}>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div ref={statsRef} className="landing-stats-row" style={{
          display: 'flex', justifyContent: 'center', gap: 100,
        }}>
          <AnimatedCounter end={100} suffix="%" label="Context Reliability" color="#10b981" />
          <AnimatedCounter end="Real-time" label="PR Auditing" color="#3b82f6" />
          <AnimatedCounter end="Zero" label="Generic Noise" color="#ef4444" />
        </div>
      </div>

      <style>{`
        @keyframes meshRotate1 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(60px, 40px) scale(1.1); }
        }
        @keyframes meshRotate2 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(-50px, 30px) scale(1.15); }
        }
        @keyframes meshRotate3 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(40px, -40px) scale(1.08); }
        }
        @keyframes pulseRedGlowDark {
          0%, 100% { box-shadow: 0 8px 32px rgba(239,68,68,0.04); }
          50% { box-shadow: 0 8px 40px rgba(239,68,68,0.12); }
        }
        @keyframes pulseGreenGlowDark {
          0%, 100% { box-shadow: 0 8px 32px rgba(16,185,129,0.1); }
          50% { box-shadow: 0 8px 40px rgba(16,185,129,0.18); }
        }
        @keyframes shakeX {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-4px) rotate(-5deg); }
          75% { transform: translateX(4px) rotate(5deg); }
        }
        @keyframes badgeBounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
      `}</style>
    </section>
  );
}
