import React, { useEffect, useRef, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { triggerBoom } from '../../utils/boom';

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

// Interactive falling sticks physics engine
function ColorfulSticks() {
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

    const stickColors = [
      '#f472b6', '#3b82f6', '#84cc16', '#f59e0b', '#8b5cf6',
      '#06b6d4', '#ef4444', '#10b981', '#f97316', '#6366f1',
    ];

    const generateStick = (yOffset = 0) => ({
      x: Math.random() * canvas.offsetWidth,
      y: (Math.random() - yOffset) * canvas.offsetHeight,
      baseVx: (Math.random() - 0.5) * 0.5,
      baseVy: 0.5 + Math.random() * 1.5, // Fall down
      vx: 0, vy: 0,
      width: 12 + Math.random() * 28,
      height: 2 + Math.random() * 3,
      rotation: Math.random() * Math.PI,
      spin: (Math.random() - 0.5) * 0.05,
      color: stickColors[Math.floor(Math.random() * stickColors.length)],
      opacity: 0.4 + Math.random() * 0.45,
    });

    const sticks = Array.from({ length: 90 }, () => generateStick(1));
    let mouseX = -1000, mouseY = -1000;

    const onMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      mouseX = e.clientX - rect.left;
      mouseY = e.clientY - rect.top;
    };
    window.addEventListener('mousemove', onMove);
    
    // Support scrolling properly
    const onScroll = () => {
      mouseX = -1000; mouseY = -1000; // Reset to avoid weird stuck states
    };
    window.addEventListener('scroll', onScroll, { passive: true });

    const animate = () => {
      ctx.clearRect(0, 0, canvas.offsetWidth, canvas.offsetHeight);

      sticks.forEach(s => {
        // Apply base gravity
        s.vx += (s.baseVx - s.vx) * 0.05;
        s.vy += (s.baseVy - s.vy) * 0.05;

        // Repel from mouse
        const dx = s.x - mouseX;
        const dy = s.y - mouseY;
        const distSq = dx * dx + dy * dy;
        const repelRadius = 250;
        
        if (distSq < repelRadius * repelRadius) {
          const force = (repelRadius * repelRadius - distSq) / (repelRadius * repelRadius);
          const angle = Math.atan2(dy, dx);
          
          // Exponential repel force
          s.vx += Math.cos(angle) * force * 15;
          s.vy += Math.sin(angle) * force * 15;
          
          // Add crazy spin
          s.rotation += force * 0.2; 
        }

        // Apply friction
        s.vx *= 0.92;
        s.vy *= 0.92;

        s.x += s.vx;
        s.y += s.vy;
        s.rotation += s.spin;

        // Reset if it falls off screen
        if (s.y > canvas.offsetHeight + 50) {
          Object.assign(s, generateStick(1), { y: -50, x: Math.random() * canvas.offsetWidth });
        }
        if (s.x < -50) s.x = canvas.offsetWidth + 50;
        if (s.x > canvas.offsetWidth + 50) s.x = -50;

        ctx.save();
        ctx.translate(s.x, s.y);
        ctx.rotate(s.rotation);
        ctx.globalAlpha = s.opacity;
        
        ctx.shadowBlur = 10;
        ctx.shadowColor = s.color;
        ctx.fillStyle = s.color;
        
        // Draw capsule
        ctx.beginPath();
        ctx.roundRect(-s.width / 2, -s.height / 2, s.width, s.height, s.height / 2);
        ctx.fill();
        ctx.restore();
      });

      animId = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(animId);
    };
  }, []);

  return (
    <canvas ref={canvasRef} style={{
      position: 'absolute', inset: 0, width: '100%', height: '100%',
      pointerEvents: 'none', zIndex: 0
    }} />
  );
}

function TestimonialCard({ name, role, quote, delay }) {
  const cardRef = useRef(null);
  const glareRef = useRef(null);
  const [ref, visible] = useScrollReveal();

  const handleMove = (e) => {
    const rect = cardRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width - 0.5) * 12;
    const y = ((e.clientY - rect.top) / rect.height - 0.5) * -12;
    cardRef.current.style.transform = `perspective(1000px) rotateX(${y}deg) rotateY(${x}deg) translateY(-6px)`;
    
    // Dynamic glare effect
    if (glareRef.current) {
        glareRef.current.style.opacity = '1';
        glareRef.current.style.background = `radial-gradient(circle at ${e.clientX - rect.left}px ${e.clientY - rect.top}px, rgba(255,255,255,0.4) 0%, transparent 80%)`;
    }
  };
  const handleLeave = () => {
    if (cardRef.current) cardRef.current.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) translateY(0)';
    if (glareRef.current) glareRef.current.style.opacity = '0';
  };

  const colors = ['#3b82f6', '#7c3aed', '#10b981'];
  const color = colors[(delay / 150) % 3];

  return (
    <div ref={ref} style={{
      opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(40px)',
      transition: `all 0.7s cubic-bezier(0.23,1,0.32,1) ${delay}ms`,
    }}>
      <div ref={cardRef} onMouseMove={handleMove} onMouseLeave={handleLeave} onClick={(e) => triggerBoom(e, color)} style={{
        background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: 20,
        padding: '36px 32px', cursor: 'pointer',
        boxShadow: '0 4px 24px rgba(0,0,0,0.04)',
        transition: 'transform 0.4s cubic-bezier(0.23,1,0.32,1), box-shadow 0.4s ease',
        willChange: 'transform', position: 'relative', zIndex: 1, overflow: 'hidden'
      }}
      onMouseEnter={e => e.currentTarget.style.boxShadow = '0 20px 60px rgba(0,0,0,0.1)'}
      >
        <div ref={glareRef} style={{
            position: 'absolute', inset: 0, pointerEvents: 'none',
            opacity: 0, transition: 'opacity 0.4s ease', zIndex: 10
        }} />
        {/* Stars */}
        <div style={{ marginBottom: 20, display: 'flex', gap: 4, position: 'relative', zIndex: 11 }}>
          {[...Array(5)].map((_, i) => (
            <svg key={i} width="18" height="18" viewBox="0 0 24 24" fill="#f59e0b">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
            </svg>
          ))}
        </div>

        <p style={{ fontSize: 16, color: '#374151', lineHeight: 1.7, marginBottom: 28, fontStyle: 'italic' }}>
          "{quote}"
        </p>

        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{
            width: 44, height: 44, borderRadius: '50%',
            background: `linear-gradient(135deg, ${color}, ${color}88)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18, fontWeight: 800, color: '#fff',
          }}>{name.charAt(0)}</div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#0a0a14' }}>{name}</div>
            <div style={{ fontSize: 13, color: '#6b7280' }}>{role}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CTASection() {
  const [statsRef, statsVisible] = useScrollReveal();
  const [ctaRef, ctaVisible] = useScrollReveal();
  const canvasRef = useRef(null);
  const navigate = useNavigate();

  // CTA particle canvas
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

    const particles = Array.from({ length: 60 }, () => ({
      x: Math.random() * canvas.offsetWidth,
      y: Math.random() * canvas.offsetHeight,
      vx: (Math.random() - 0.5) * 0.2,
      vy: (Math.random() - 0.5) * 0.2,
      r: 1 + Math.random() * 1.5,
    }));

    const animate = () => {
      ctx.clearRect(0, 0, canvas.offsetWidth, canvas.offsetHeight);
      particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > canvas.offsetWidth) p.vx *= -1;
        if (p.y < 0 || p.y > canvas.offsetHeight) p.vy *= -1;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,255,255,0.2)';
        ctx.fill();
      });
      animId = requestAnimationFrame(animate);
    };
    animate();

    return () => { cancelAnimationFrame(animId); window.removeEventListener('resize', resize); };
  }, []);

  const testimonials = [
    { name: 'Sarah Chen', role: 'Senior SRE at TechCorp', quote: "Omni-SRE caught a repeat SQL injection pattern we'd fixed twice before. Nothing else does that." },
    { namep: 'Marcus Rodriguez', role: 'Lead DevOps', quote: "The institutional memory feature is a game changer. It's like having a senior engineer who never forgets." },
    { name: 'Priya Patel', role: 'Platform Engineer', quote: "Real-time webhook reviews with zero false positives from our own history. Incredible." },
  ];

  // Fix the typo above
  const fixedTestimonials = [
    { name: 'Sarah Chen', role: 'Senior SRE at TechCorp', quote: "Omni-SRE caught a repeat SQL injection pattern we'd fixed twice before. Nothing else does that." },
    { name: 'Marcus Rodriguez', role: 'Lead DevOps', quote: "The institutional memory feature is a game changer. It's like having a senior engineer who never forgets." },
    { name: 'Priya Patel', role: 'Platform Engineer', quote: "Real-time webhook reviews with zero false positives from our own history. Incredible." },
  ];

  return (
    <>
      {/* Social Proof — white with colorful sticks */}
      <section id="security" style={{
        background: '#ffffff', padding: '120px 24px', fontFamily: "'Inter', sans-serif",
        position: 'relative', overflow: 'hidden',
      }}>
        <ColorfulSticks />

        <div style={{ maxWidth: 1200, margin: '0 auto', position: 'relative', zIndex: 1 }}>
          {/* Stats */}
          <div ref={statsRef} style={{
            textAlign: 'center', marginBottom: 72,
            opacity: statsVisible ? 1 : 0, transform: statsVisible ? 'translateY(0)' : 'translateY(40px)',
            transition: 'all 0.7s cubic-bezier(0.23,1,0.32,1)',
          }}>
            <p style={{ fontSize: 14, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 40 }}>
              Trusted by engineering teams
            </p>
            <div className="landing-stats-row" style={{ display: 'flex', justifyContent: 'center', gap: 80, flexWrap: 'wrap', marginBottom: 16 }}>
              {[
                { value: '10,000+', label: 'PRs Reviewed' },
                { value: '99.9%', label: 'Uptime' },
                { value: '3x', label: 'Faster Reviews' },
              ].map((s, i) => (
                <div key={i} style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 52, fontWeight: 900, color: '#0a0a14', letterSpacing: '-0.04em' }}>{s.value}</div>
                  <div style={{ fontSize: 15, color: '#6b7280', fontWeight: 500, marginTop: 4 }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Testimonials */}
          <div className="landing-grid-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 28 }}>
            {fixedTestimonials.map((t, i) => (
              <TestimonialCard key={i} {...t} delay={i * 150} />
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA — dark */}
      <section style={{
        background: '#050510', padding: '120px 24px', fontFamily: "'Inter', sans-serif",
        position: 'relative', overflow: 'hidden',
      }}>
        <canvas ref={canvasRef} style={{
          position: 'absolute', inset: 0, width: '100%', height: '100%',
          pointerEvents: 'none', zIndex: 0,
        }} />

        {/* Gradient orbs */}
        <div style={{
          position: 'absolute', top: '-20%', right: '-10%', width: 500, height: 500,
          background: 'radial-gradient(circle, rgba(59,130,246,0.2) 0%, transparent 70%)',
          borderRadius: '50%', filter: 'blur(80px)',
          animation: 'floatSlow 10s ease-in-out infinite',
        }} />
        <div style={{
          position: 'absolute', bottom: '-20%', left: '-10%', width: 400, height: 400,
          background: 'radial-gradient(circle, rgba(124,58,237,0.15) 0%, transparent 70%)',
          borderRadius: '50%', filter: 'blur(80px)',
          animation: 'floatSlow 12s ease-in-out infinite 3s',
        }} />
        <div style={{
          position: 'absolute', top: '50%', left: '50%', width: 350, height: 350,
          background: 'radial-gradient(circle, rgba(16,185,129,0.1) 0%, transparent 70%)',
          borderRadius: '50%', filter: 'blur(80px)', transform: 'translate(-50%, -50%)',
          animation: 'floatSlow 14s ease-in-out infinite 1s',
        }} />

        <div ref={ctaRef} style={{
          maxWidth: 800, margin: '0 auto', textAlign: 'center', position: 'relative', zIndex: 1,
          opacity: ctaVisible ? 1 : 0, transform: ctaVisible ? 'translateY(0)' : 'translateY(40px)',
          transition: 'all 0.7s cubic-bezier(0.23,1,0.32,1)',
        }}>
          <h2 style={{
            fontSize: 64, fontWeight: 900, color: '#ffffff', letterSpacing: '-0.04em',
            marginBottom: 24, lineHeight: 1.1,
          }}>Stop Reviewing Code Blindly.</h2>
          <p style={{ fontSize: 20, color: '#9ca3af', marginBottom: 48, lineHeight: 1.7 }}>
            Give your team the context-aware AI that remembers everything.
          </p>
          <div className="landing-hero-buttons" style={{ display: 'flex', gap: 16, justifyContent: 'center', marginBottom: 40 }}>
            <button className="landing-btn" onClick={(e) => { triggerBoom(e, '#3b82f6'); navigate('/auth'); }} style={{
              background: '#3b82f6', color: '#fff', padding: '18px 40px', fontSize: 17,
              boxShadow: '0 0 50px rgba(59,130,246,0.4)', border: 'none', cursor: 'pointer',
              fontFamily: "'Inter', sans-serif", fontWeight: 800, borderRadius: 999,
              transition: 'all 0.3s ease',
            }}
            onMouseEnter={e => { e.target.style.transform = 'scale(1.08)'; e.target.style.boxShadow = '0 0 80px rgba(59,130,246,0.6)'; }}
            onMouseLeave={e => { e.target.style.transform = 'scale(1)'; e.target.style.boxShadow = '0 0 50px rgba(59,130,246,0.4)'; }}
            >Get Started Free →</button>
            <a href="#features" className="landing-btn landing-btn-ghost" onClick={(e) => triggerBoom(e, '#9ca3af')} style={{ padding: '18px 40px', fontSize: 17 }}>
              Read the Docs
            </a>
          </div>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.3)', fontWeight: 500 }}>
            No credit card required • Setup in 10 minutes • HMAC secured
          </p>
        </div>
      </section>
    </>
  );
}
