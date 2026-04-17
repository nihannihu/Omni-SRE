import React, { useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

export default function HeroSection() {
  const canvasRef = useRef(null);
  const cursorRef = useRef(null);
  const mouseRef = useRef({ x: -999, y: -999 });
  const implodingRef = useRef(false);
  const navigate = useNavigate();

  // Particle field
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    let animId;

    const resize = () => {
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = window.innerWidth + 'px';
      canvas.style.height = window.innerHeight + 'px';
      ctx.scale(dpr, dpr);
    };
    resize();
    window.addEventListener('resize', resize);
    
    // Parallax tracking
    const targetParallax = { x: 0, y: 0 };
    let currentParallax = { x: 0, y: 0 };

    const onMove = (e) => {
      mouseRef.current.x = e.clientX;
      mouseRef.current.y = e.clientY;
      
      // Calculate normalized mouse position for parallax (-1 to 1)
      targetParallax.x = (e.clientX / window.innerWidth - 0.5) * 2;
      targetParallax.y = (e.clientY / window.innerHeight - 0.5) * 2;
    };
    window.addEventListener('mousemove', onMove);

    const PARTICLE_COUNT = 300; // Massively increased for dense star network
    const CONNECTION_DIST_SQ = 150 * 150;

    // Initialize particles with polar coordinates for the Galaxy Vortex
    const particles = Array.from({ length: PARTICLE_COUNT }, () => {
      const z = 0.2 + Math.random() * 0.8; 
      return {
        angle: Math.random() * Math.PI * 2,
        dist: Math.random() * (window.innerWidth / 1.2), // Spread out
        targetDist: Math.random() * (window.innerWidth / 1.2), // Base distance
        speed: (0.001 + Math.random() * 0.004) * z, // Much slower orbital speed
        baseR: (0.5 + Math.random() * 2.5) * z, // Range of tiny to medium dots
        baseHue: 230 + Math.random() * 40, // Restricted to Omni-SRE blues and deep purples
        z: z,
        x: window.innerWidth / 2,
        y: window.innerHeight / 2,
        offsetX: 0,
        offsetY: 0
      };
    });

    let galaxyCenter = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    let wasImploding = false;

    const animate = () => {
      // Create a gorgeous neon trail effect
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = 'rgba(5, 5, 16, 0.25)'; // Slow fade
      ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);
      
      // Additive blending for gorgeous fake glow
      ctx.globalCompositeOperation = 'lighter';
      
      // Smooth parallax interpolation
      currentParallax.x += (targetParallax.x - currentParallax.x) * 0.05;
      currentParallax.y += (targetParallax.y - currentParallax.y) * 0.05;

      // Continuous gentle resize/center drift
      galaxyCenter.x = window.innerWidth / 2;
      galaxyCenter.y = window.innerHeight / 2;

      const isImploding = implodingRef.current;
      const justReleased = !isImploding && wasImploding;

      particles.forEach(p => {
        // Trigger explosive force exactly on release
        if (justReleased) {
            p.blastVelocity = (30 + Math.random() * 50) * p.z; // Massive explosive outward push
        }

        // Black hole mechanics & The Supernova
        if (isImploding) {
          p.speed += 0.001; // Spin up heavily
          // Collapse into a perfect tight circular ring
          p.dist += (100 - p.dist) * 0.08; 
        } else {
          // Relax back to normal slow speed
          p.speed = Math.max(p.speed * 0.98, (0.001 + Math.random() * 0.004) * p.z);
          
          if (p.blastVelocity) {
              p.dist += p.blastVelocity; // Apply massive radial explosion
              p.blastVelocity *= 0.90; // Explosions slow down quickly due to friction
              if (p.blastVelocity < 0.1) p.blastVelocity = 0;
          }
          
          p.dist += (p.targetDist - p.dist) * 0.03; // Spring back to natural orbit smoothly
        }
        
        // Orbit math
        p.angle += p.speed * (isImploding ? 4 : 1);
        
        // Calculate new raw coordinates orbiting the galaxy center
        p.x = galaxyCenter.x + Math.cos(p.angle) * p.dist;
        p.y = galaxyCenter.y + Math.sin(p.angle) * p.dist;

        p.offsetX = (p.offsetX || 0) * 0.9;
        p.offsetY = (p.offsetY || 0) * 0.9;

        // Apply Parallax Shift and Suble Cursor Offset
        const renderX = (p.x + p.offsetX) - (currentParallax.x * 60 * p.z);
        const renderY = (p.y + p.offsetY) - (currentParallax.y * 60 * p.z);
        
        // Record velocity for stretching
        p.vx = renderX - (p.renderX || renderX);
        p.vy = renderY - (p.renderY || renderY);
        
        p.renderX = renderX;
        p.renderY = renderY;
      });

      // Draw connections
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
          // Only connect nearby orbiting nodes
          if (distSq < CONNECTION_DIST_SQ) {
            ctx.beginPath();
            ctx.moveTo(pi.renderX, pi.renderY);
            ctx.lineTo(pj.renderX, pj.renderY);
            ctx.strokeStyle = `hsla(${pi.baseHue}, 50%, 65%, ${(0.10 * (1 - Math.sqrt(distSq) / 150)) * pi.z})`; // Much softer, less saturated lines
            ctx.stroke();
          }
        }
        
        // Heavy Cursor Tethers & Physics Warp
        if (mx > 0 && my > 0) {
            const dxM = pi.renderX - mx;
            const dyM = pi.renderY - my;
            const distSqM = dxM * dxM + dyM * dyM;
            if (distSqM < 300 * 300) { // 300px interaction radius (massive)
                const distM = Math.sqrt(distSqM);
                
                // Draw strong tethers to cursor
                ctx.beginPath();
                ctx.moveTo(pi.renderX, pi.renderY);
                ctx.lineTo(mx, my);
                ctx.strokeStyle = `hsla(${pi.baseHue}, 80%, 75%, ${0.6 * (1 - distM / 300) * pi.z})`; // Much brighter
                ctx.stroke();
                
                // Dramatic kinetic repulsion (stars scatter heavily away from pointer)
                pi.offsetX += dxM * 0.02;
                pi.offsetY += dyM * 0.02;
            }
        }
      }
        
      // Draw Refined Glowing Particles
      particles.forEach(p => {
        // Random organic flickering + Cursor Proximity Flare
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
        
        const finalRadius = p.baseR + (flare * 3 * p.z) + (implodingRef.current ? 2 : 0);
        
        ctx.save();
        ctx.translate(p.renderX, p.renderY);
        ctx.rotate(p.angle + Math.PI / 2); 
        
        // Draw the inner bright core (Pure White)
        ctx.beginPath();
        ctx.ellipse(0, 0, finalRadius, finalRadius * stretch, 0, 0, Math.PI * 2);
        const opacity = (0.5 + 0.5 * p.z) + (flare * 0.4) + (implodingRef.current ? 0.3 : 0);
        ctx.fillStyle = `hsla(0, 0%, 100%, ${Math.min(1, opacity)})`; // Always white core
        ctx.fill();
        
        // Draw the outer soft glow ring (Subtle Blue/Purple)
        ctx.beginPath();
        ctx.ellipse(0, 0, finalRadius * 3, (finalRadius * 3) * stretch, 0, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${p.baseHue}, 70%, 55%, ${Math.min(1, opacity * 0.20)})`; // Reduced saturation and opacity
        ctx.fill();
        ctx.restore();
      });

      wasImploding = isImploding; // Update state tracker for next frame
      animId = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', onMove);
    };
  }, []);



  return (
    <section id="hero" style={{
      position: 'relative', width: '100%', minHeight: '100vh',
      background: '#050510', overflow: 'hidden',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: "'Inter', sans-serif",
    }}>
      {/* Gradient Orbs */}
      <div style={{
        position: 'absolute', top: '-10%', left: '-5%', width: 600, height: 600,
        background: 'radial-gradient(circle, rgba(59,130,246,0.3) 0%, transparent 70%)',
        borderRadius: '50%', filter: 'blur(80px)', willChange: 'transform',
        animation: 'floatSlow 8s ease-in-out infinite',
      }} />
      <div style={{
        position: 'absolute', bottom: '-15%', right: '-5%', width: 500, height: 500,
        background: 'radial-gradient(circle, rgba(124,58,237,0.25) 0%, transparent 70%)',
        borderRadius: '50%', filter: 'blur(80px)', willChange: 'transform',
        animation: 'floatSlow 10s ease-in-out infinite 2s',
      }} />
      <div style={{
        position: 'absolute', top: '40%', left: '50%', width: 400, height: 400,
        background: 'radial-gradient(circle, rgba(16,185,129,0.2) 0%, transparent 70%)',
        borderRadius: '50%', filter: 'blur(80px)', willChange: 'transform',
        transform: 'translateX(-50%)',
        animation: 'floatSlow 12s ease-in-out infinite 4s',
      }} />

      {/* Particle Canvas */}
      <canvas ref={canvasRef} style={{
        position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
        pointerEvents: 'none', zIndex: 1,
      }} />



      {/* Content */}
      <div style={{
        position: 'relative', zIndex: 3, textAlign: 'center',
        maxWidth: 900, padding: '0 24px', marginTop: 40,
      }}>
        {/* Pill Badge */}
        <div className="scroll-reveal revealed" style={{ marginBottom: 32 }}>
          <span className="landing-pill landing-pill-dark">
            🛡️ AI-Powered Code Security
          </span>
        </div>

        {/* Main Heading */}
        <h1 className="landing-hero-heading" style={{
          fontSize: 88, fontWeight: 900, color: '#ffffff',
          lineHeight: 1.05, letterSpacing: '-0.04em', margin: '0 0 28px',
        }}>
          The AI That <span className="gradient-text">Remembers</span>
          <br />Your Team's Mistakes.
        </h1>

        {/* Subtitle */}
        <p style={{
          fontSize: 19, color: '#9ca3af', maxWidth: 640, margin: '0 auto 48px',
          lineHeight: 1.7, fontWeight: 400,
        }}>
          Omni-SRE is the context-aware Site Reliability Engine that combines
          institutional memory with real-time GitHub PR reviews — catching bugs
          your team has seen before.
        </p>

        {/* Buttons */}
        <div className="landing-hero-buttons" style={{ display: 'flex', gap: 16, justifyContent: 'center', marginBottom: 56 }}>
          <button 
            className="landing-btn landing-btn-primary" 
            onMouseDown={() => implodingRef.current = true}
            onMouseUp={() => implodingRef.current = false}
            onMouseLeave={() => implodingRef.current = false}
            onTouchStart={() => implodingRef.current = true}
            onTouchEnd={() => implodingRef.current = false}
            onClick={() => navigate('/auth')}
          >
            Get Started Free →
          </button>
          <a 
            href="#how-it-works" 
            className="landing-btn landing-btn-ghost"
            onMouseDown={() => implodingRef.current = true}
            onMouseUp={() => implodingRef.current = false}
            onMouseLeave={() => implodingRef.current = false}
            onTouchStart={() => implodingRef.current = true}
            onTouchEnd={() => implodingRef.current = false}
          >
            Watch Demo ▶
          </a>
        </div>

        {/* Trust Stats */}
        <div className="landing-stats-row" style={{
          display: 'flex', justifyContent: 'center', gap: 48, flexWrap: 'wrap',
        }}>
          {['100% Context Reliability', 'Real-time PR Auditing', 'HMAC Secured'].map((stat, i) => (
            <span key={i} style={{
              fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.4)',
              letterSpacing: '0.08em', textTransform: 'uppercase',
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#3b82f6' }} />
              {stat}
            </span>
          ))}
        </div>
      </div>

      {/* Scroll Indicator */}
      <div style={{
        position: 'absolute', bottom: 40, left: '50%', transform: 'translateX(-50%)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, zIndex: 3,
      }}>
        <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.1em', fontWeight: 500 }}>
          Scroll to explore
        </span>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="2" style={{ animation: 'bounce 2s ease infinite' }}>
          <path d="M6 9l6 6 6-6" />
        </svg>
      </div>

      {/* Wave Divider */}
      <div style={{ position: 'absolute', bottom: -1, left: 0, right: 0, zIndex: 4 }}>
        <svg viewBox="0 0 1440 80" preserveAspectRatio="none" style={{ display: 'block', width: '100%', height: 80 }}>
          <path d="M0,40 C360,80 720,0 1080,40 C1260,60 1380,50 1440,40 L1440,80 L0,80 Z" fill="#ffffff" />
        </svg>
      </div>
    </section>
  );
}
