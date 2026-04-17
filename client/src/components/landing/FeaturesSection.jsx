import React, { useEffect, useRef, useState } from 'react';
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

function FeatureCard({ icon, title, desc, color, delay }) {
  const cardRef = useRef(null);
  const [ref, visible] = useScrollReveal();
  const [hovered, setHovered] = useState(false);

  const handleMove = (e) => {
    const rect = cardRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width - 0.5) * 14;
    const y = ((e.clientY - rect.top) / rect.height - 0.5) * -14;
    cardRef.current.style.transform = `perspective(1000px) rotateX(${y}deg) rotateY(${x}deg) translateY(-12px)`;
  };
  const handleLeave = () => {
    setHovered(false);
    if (cardRef.current) cardRef.current.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) translateY(0)';
  };

  return (
    <div ref={ref} style={{
      opacity: visible ? 1 : 0,
      transform: visible ? 'translateY(0)' : 'translateY(-80px)',
      transition: `all 0.8s cubic-bezier(0.23,1,0.32,1) ${delay}ms`,
    }}>
      <div ref={cardRef}
        onMouseMove={handleMove}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={handleLeave}
        onClick={(e) => triggerBoom(e, color)}
        style={{
          background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(20px)',
          border: `1px solid ${hovered ? color + '60' : 'rgba(255,255,255,0.08)'}`,
          borderRadius: 20, padding: '40px 32px', position: 'relative', overflow: 'hidden',
          transition: 'border-color 0.4s ease, box-shadow 0.4s ease, transform 0.4s cubic-bezier(0.23,1,0.32,1)',
          willChange: 'transform',
          boxShadow: hovered ? `0 20px 60px ${color}25, 0 0 40px ${color}15` : '0 4px 24px rgba(0,0,0,0.1)',
        }}>
        {/* Top gradient line */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 2,
          background: `linear-gradient(90deg, transparent, ${color}, transparent)`,
        }} />

        {/* Icon */}
        <div style={{
          width: 60, height: 60, borderRadius: 16,
          background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 30, marginBottom: 24,
          animation: 'iconPulse 2.5s ease-in-out infinite',
        }}>
          <span style={{
            display: 'inline-block',
            transition: 'transform 0.6s cubic-bezier(0.23,1,0.32,1)',
            transform: hovered ? 'rotate(360deg)' : 'rotate(0)',
          }}>{icon}</span>
        </div>

        <h3 style={{ fontSize: 21, fontWeight: 800, color: '#ffffff', marginBottom: 12, letterSpacing: '-0.02em' }}>{title}</h3>
        <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.55)', lineHeight: 1.7, margin: 0 }}>{desc}</p>
      </div>
    </div>
  );
}

// Particle rain for CTA banner
function ParticleRain() {
  const particles = Array.from({ length: 30 }, (_, i) => ({
    left: Math.random() * 100,
    delay: Math.random() * 5,
    duration: 3 + Math.random() * 4,
    size: 1 + Math.random() * 2,
  }));
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', borderRadius: 24 }}>
      {particles.map((p, i) => (
        <div key={i} style={{
          position: 'absolute', left: `${p.left}%`, top: '-10px',
          width: p.size, height: p.size, borderRadius: '50%',
          background: 'rgba(255,255,255,0.4)',
          animation: `rainDrop ${p.duration}s linear ${p.delay}s infinite`,
        }} />
      ))}
    </div>
  );
}

export default function FeaturesSection() {
  const [headRef, headVisible] = useScrollReveal();
  const navigate = useNavigate();
  const canvasRef = useRef(null);
  const mouseRef = useRef({ x: -999, y: -999 });

  const features = [
    { icon: '🧠', title: 'Deterministic RAG', desc: 'Combines pgvector semantic search with Absolute CRUD Fallback for 100% context reliability. Never misses a memory.', color: '#3b82f6' },
    { icon: '🔗', title: 'GitHub Webhook Integration', desc: 'Automated real-time PR auditing via secure HMAC-verified ngrok tunnels. Every PR reviewed instantly.', color: '#7c3aed' },
    { icon: '🔄', title: 'Vector Auto-Healing', desc: 'Background workers automatically vectorize missing data keeping your memory bank always current.', color: '#10b981' },
    { icon: '🛡️', title: 'HMAC Security', desc: 'Every incoming webhook is cryptographically verified. Zero unauthorized access, ever.', color: '#ef4444' },
    { icon: '📊', title: 'Premium Dashboard', desc: 'Real-time analytics on security findings, institutional memory hits, and team patterns.', color: '#f59e0b' },
    { icon: '🏛️', title: 'Institutional Memory', desc: 'Remembers every rejected PR, past bug, and failure. Your AI gets smarter every single sprint.', color: '#6366f1' },
  ];

  // Particle field (Starfield background clone from Hero)
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
    
    const targetParallax = { x: 0, y: 0 };
    let currentParallax = { x: 0, y: 0 };

    const onMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current.x = e.clientX - rect.left;
      mouseRef.current.y = e.clientY - rect.top;
      
      targetParallax.x = (e.clientX / window.innerWidth - 0.5) * 2;
      targetParallax.y = (e.clientY / window.innerHeight - 0.5) * 2;
    };
    window.addEventListener('mousemove', onMove);

    const onScroll = () => {
      mouseRef.current.x = -999;
      mouseRef.current.y = -999;
    };
    window.addEventListener('scroll', onScroll, { passive: true });

    const PARTICLE_COUNT = 200; // slightly restrained for features grid visibility
    const CONNECTION_DIST_SQ = 150 * 150;

    const particles = Array.from({ length: PARTICLE_COUNT }, () => {
      const z = 0.2 + Math.random() * 0.8; 
      return {
        angle: Math.random() * Math.PI * 2,
        dist: Math.random() * (canvas.offsetWidth / 1.2),
        targetDist: Math.random() * (canvas.offsetWidth / 1.2),
        speed: (0.001 + Math.random() * 0.004) * z,
        baseR: (0.5 + Math.random() * 2.5) * z,
        baseHue: 230 + Math.random() * 40,
        z: z,
        x: canvas.offsetWidth / 2,
        y: canvas.offsetHeight / 2,
        offsetX: 0,
        offsetY: 0
      };
    });

    let galaxyCenter = { x: canvas.offsetWidth / 2, y: canvas.offsetHeight / 2 };

    const animate = () => {
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = 'rgba(10, 10, 20, 0.25)'; // Matches #0a0a14 tail fade
      ctx.fillRect(0, 0, canvas.offsetWidth, canvas.offsetHeight);
      
      ctx.globalCompositeOperation = 'lighter';
      
      currentParallax.x += (targetParallax.x - currentParallax.x) * 0.05;
      currentParallax.y += (targetParallax.y - currentParallax.y) * 0.05;

      galaxyCenter.x = canvas.offsetWidth / 2;
      galaxyCenter.y = canvas.offsetHeight / 2;

      particles.forEach(p => {
        p.speed = Math.max(p.speed * 0.98, (0.001 + Math.random() * 0.004) * p.z);
        p.dist += (p.targetDist - p.dist) * 0.03;
        
        p.angle += p.speed;
        
        p.x = galaxyCenter.x + Math.cos(p.angle) * p.dist;
        p.y = galaxyCenter.y + Math.sin(p.angle) * p.dist;

        p.offsetX = (p.offsetX || 0) * 0.9;
        p.offsetY = (p.offsetY || 0) * 0.9;

        const renderX = (p.x + p.offsetX) - (currentParallax.x * 60 * p.z);
        const renderY = (p.y + p.offsetY) - (currentParallax.y * 60 * p.z);
        
        p.vx = renderX - (p.renderX || renderX);
        p.vy = renderY - (p.renderY || renderY);
        
        p.renderX = renderX;
        p.renderY = renderY;
      });

      ctx.lineWidth = 1;
      const mx = mouseRef.current.x;
      const my = mouseRef.current.y;
      
      for (let i = 0; i < particles.length; i++) {
        const pi = particles[i];
        
        for (let j = i + 1; j < particles.length; j++) {
          const pj = particles[j];
          const dx = pi.renderX - pj.renderX;
          const dy = pi.renderY - pj.renderY;
          const distSq = dx * dx + dy * dy;
          if (distSq < CONNECTION_DIST_SQ) {
            ctx.beginPath();
            ctx.moveTo(pi.renderX, pi.renderY);
            ctx.lineTo(pj.renderX, pj.renderY);
            ctx.strokeStyle = `hsla(${pi.baseHue}, 50%, 65%, ${(0.10 * (1 - Math.sqrt(distSq) / 150)) * pi.z})`;
            ctx.stroke();
          }
        }
        
        if (mx > 0 && my > 0) {
            const dxM = pi.renderX - mx;
            const dyM = pi.renderY - my;
            const distSqM = dxM * dxM + dyM * dyM;
            if (distSqM < 300 * 300) {
                const distM = Math.sqrt(distSqM);
                ctx.beginPath();
                ctx.moveTo(pi.renderX, pi.renderY);
                ctx.lineTo(mx, my);
                ctx.strokeStyle = `hsla(${pi.baseHue}, 80%, 75%, ${0.6 * (1 - distM / 300) * pi.z})`;
                ctx.stroke();
                
                pi.offsetX += dxM * 0.02;
                pi.offsetY += dyM * 0.02;
            }
        }
      }
        
      particles.forEach(p => {
        let flare = Math.random() > 0.99 ? 0.8 : 0; 
        
        if (mx > 0 && my > 0) {
            const dxM = p.renderX - mx;
            const dyM = p.renderY - my;
            const distSqM = dxM * dxM + dyM * dyM;
            if (distSqM < 250 * 250) {
                flare = Math.max(flare, 1 - Math.sqrt(distSqM) / 250);
            }
        }
        const speedMagnitude = Math.sqrt(p.vx * p.vx + p.vy * p.vy) || 0.1;
        const stretch = Math.max(1, speedMagnitude * 0.3); 
        
        const finalRadius = p.baseR + (flare * 3 * p.z);
        
        ctx.save();
        ctx.translate(p.renderX, p.renderY);
        ctx.rotate(p.angle + Math.PI / 2); 
        
        ctx.beginPath();
        ctx.ellipse(0, 0, finalRadius, finalRadius * stretch, 0, 0, Math.PI * 2);
        const opacity = (0.5 + 0.5 * p.z) + (flare * 0.4);
        ctx.fillStyle = `hsla(0, 0%, 100%, ${Math.min(1, opacity)})`; 
        ctx.fill();
        
        ctx.beginPath();
        ctx.ellipse(0, 0, finalRadius * 3, (finalRadius * 3) * stretch, 0, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${p.baseHue}, 70%, 55%, ${Math.min(1, opacity * 0.20)})`; 
        ctx.fill();
        ctx.restore();
      });

      animId = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('scroll', onScroll);
    };
  }, []);

  return (
    <section id="features" style={{
      background: '#0a0a14', padding: '140px 24px', fontFamily: "'Inter', sans-serif",
      position: 'relative', overflow: 'hidden',
    }}>
      {/* Dynamic Starfield Canvas */}
      <canvas ref={canvasRef} style={{
        position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
        pointerEvents: 'none', zIndex: 0,
      }} />

      {/* Floating orbs */}
      <div style={{
        position: 'absolute', top: '10%', left: '-5%', width: 500, height: 500,
        background: 'radial-gradient(circle, rgba(59,130,246,0.12) 0%, transparent 70%)',
        borderRadius: '50%', filter: 'blur(80px)', pointerEvents: 'none',
        animation: 'orbFloat1 18s ease-in-out infinite', zIndex: 0,
      }} />
      <div style={{
        position: 'absolute', top: '50%', right: '-10%', width: 400, height: 400,
        background: 'radial-gradient(circle, rgba(124,58,237,0.1) 0%, transparent 70%)',
        borderRadius: '50%', filter: 'blur(80px)', pointerEvents: 'none',
        animation: 'orbFloat2 20s ease-in-out infinite 4s', zIndex: 0,
      }} />
      <div style={{
        position: 'absolute', bottom: '10%', left: '30%', width: 350, height: 350,
        background: 'radial-gradient(circle, rgba(16,185,129,0.1) 0%, transparent 70%)',
        borderRadius: '50%', filter: 'blur(80px)', pointerEvents: 'none',
        animation: 'orbFloat3 15s ease-in-out infinite 2s', zIndex: 0,
      }} />
      <div style={{
        position: 'absolute', top: '30%', left: '60%', width: 300, height: 300,
        background: 'radial-gradient(circle, rgba(244,114,182,0.08) 0%, transparent 70%)',
        borderRadius: '50%', filter: 'blur(80px)', pointerEvents: 'none',
        animation: 'orbFloat1 22s ease-in-out infinite 6s', zIndex: 0,
      }} />

      <div style={{ maxWidth: 1200, margin: '0 auto', position: 'relative', zIndex: 1 }}>
        {/* Header */}
        <div ref={headRef} style={{
          textAlign: 'center', marginBottom: 80,
          opacity: headVisible ? 1 : 0, transform: headVisible ? 'translateY(0)' : 'translateY(40px)',
          transition: 'all 0.7s cubic-bezier(0.23,1,0.32,1)',
        }}>
          <span className="landing-pill landing-pill-dark" style={{ marginBottom: 24, display: 'inline-flex' }}>⚡ Core Features</span>
          <h2 className="landing-section-heading" style={{
            fontSize: 56, fontWeight: 800, color: '#ffffff', letterSpacing: '-0.03em',
            margin: '24px 0 20px', lineHeight: 1.1,
          }}>
            Built Different<span style={{ animation: 'dotColorCycle 3s linear infinite' }}>.</span>
          </h2>
          <p style={{ fontSize: 18, color: 'rgba(255,255,255,0.5)', maxWidth: 560, margin: '0 auto', lineHeight: 1.7 }}>
            Every feature designed to eliminate AI noise and replace it with institutional signal.
          </p>
        </div>

        {/* Grid */}
        <div className="landing-grid-3" style={{
          display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24, marginBottom: 80,
        }}>
          {features.map((f, i) => (
            <FeatureCard key={i} {...f} delay={i * 150} />
          ))}
        </div>

        {/* CTA Banner */}
        <div style={{
          position: 'relative', borderRadius: 24, padding: '60px 48px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexWrap: 'wrap', gap: 24, overflow: 'hidden',
          background: 'linear-gradient(-45deg, #3b82f6, #7c3aed, #10b981, #3b82f6)',
          backgroundSize: '300% 300%',
          animation: 'gradientShift 6s ease infinite',
        }}>
          <ParticleRain />
          <div style={{ position: 'relative', zIndex: 1 }}>
            <h3 style={{ fontSize: 28, fontWeight: 800, color: '#ffffff', letterSpacing: '-0.02em', marginBottom: 8 }}>
              Ready to stop getting generic advice?
            </h3>
            <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.8)', margin: 0 }}>Join teams using context-aware code reviews.</p>
          </div>
          <button onClick={(e) => { triggerBoom(e, '#ffffff'); navigate('/auth'); }} style={{
            position: 'relative', zIndex: 1,
            padding: '16px 36px', borderRadius: 999, fontSize: 16, fontWeight: 800,
            background: '#ffffff', color: '#0a0a14', border: 'none', cursor: 'pointer',
            boxShadow: '0 0 40px rgba(255,255,255,0.3)',
            transition: 'all 0.3s ease', fontFamily: "'Inter', sans-serif",
          }}
          onMouseEnter={e => { e.target.style.transform = 'scale(1.08)'; e.target.style.boxShadow = '0 0 60px rgba(255,255,255,0.5)'; }}
          onMouseLeave={e => { e.target.style.transform = 'scale(1)'; e.target.style.boxShadow = '0 0 40px rgba(255,255,255,0.3)'; }}
          >Start Free Review →</button>
        </div>
      </div>

      {/* Wave dividers */}
      <div style={{ position: 'absolute', top: -1, left: 0, right: 0, zIndex: 2 }}>
        <svg viewBox="0 0 1440 60" preserveAspectRatio="none" style={{ display: 'block', width: '100%', height: 60, transform: 'rotate(180deg)' }}>
          <path d="M0,30 C360,60 720,0 1080,30 C1260,45 1380,40 1440,30 L1440,60 L0,60 Z" fill="#fafbff" />
        </svg>
      </div>
      <div style={{ position: 'absolute', bottom: -1, left: 0, right: 0, zIndex: 2 }}>
        <svg viewBox="0 0 1440 60" preserveAspectRatio="none" style={{ display: 'block', width: '100%', height: 60 }}>
          <path d="M0,30 C360,60 720,0 1080,30 C1260,45 1380,40 1440,30 L1440,60 L0,60 Z" fill="#020208" />
        </svg>
      </div>

      <style>{`
        @keyframes iconPulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.08); }
        }
        @keyframes dotColorCycle {
          0% { color: #ef4444; }
          25% { color: #3b82f6; }
          50% { color: #10b981; }
          75% { color: #7c3aed; }
          100% { color: #ef4444; }
        }
        @keyframes orbFloat1 {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(40px, -30px); }
        }
        @keyframes orbFloat2 {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(-50px, 40px); }
        }
        @keyframes orbFloat3 {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(30px, 50px); }
        }
        @keyframes rainDrop {
          0% { transform: translateY(-10px); opacity: 0; }
          10% { opacity: 0.6; }
          100% { transform: translateY(300px); opacity: 0; }
        }
      `}</style>
    </section>
  );
}
