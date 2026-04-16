import React, { useEffect, useRef } from 'react';

/**
 * CursorGlow — Custom cursor with outer ring, inner dot, and trailing particles.
 * Hides default cursor and renders a magnetic blue glow effect.
 */
export default function CursorGlow() {
  const outerRef = useRef(null);
  const innerRef = useRef(null);
  const trailCanvas = useRef(null);
  const particles = useRef([]);
  const mouse = useRef({ x: -100, y: -100 });
  const animId = useRef(null);

  useEffect(() => {
    const outer = outerRef.current;
    const inner = innerRef.current;
    const canvas = trailCanvas.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', resize);

    const colors = ['#3b82f6', '#8b5cf6', '#60a5fa', '#a78bfa'];

    const onMove = (e) => {
      mouse.current = { x: e.clientX, y: e.clientY };

      if (inner) {
        inner.style.left = e.clientX + 'px';
        inner.style.top = e.clientY + 'px';
      }
      if (outer) {
        outer.style.left = e.clientX + 'px';
        outer.style.top = e.clientY + 'px';
      }

      // Spawn trail particles
      for (let i = 0; i < 2; i++) {
        particles.current.push({
          x: e.clientX + (Math.random() - 0.5) * 12,
          y: e.clientY + (Math.random() - 0.5) * 12,
          size: Math.random() * 3 + 1.5,
          color: colors[Math.floor(Math.random() * colors.length)],
          alpha: 0.5,
          decay: 0.012 + Math.random() * 0.01,
        });
      }
    };

    const onHover = () => {
      if (outer) outer.style.transform = 'translate(-50%, -50%) scale(1.6)';
    };
    const onLeave = () => {
      if (outer) outer.style.transform = 'translate(-50%, -50%) scale(1)';
    };

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particles.current = particles.current.filter(p => p.alpha > 0.01);
      particles.current.forEach(p => {
        p.alpha -= p.decay;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color.replace(')', `, ${Math.max(0, p.alpha)})`).replace('rgb', 'rgba').replace('#', '');

        // Use hex to rgba conversion
        const hex = p.color;
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        ctx.fillStyle = `rgba(${r},${g},${b},${Math.max(0, p.alpha)})`;
        ctx.fill();
      });

      animId.current = requestAnimationFrame(animate);
    };

    window.addEventListener('mousemove', onMove);

    // Add hover detection to clickable elements
    const addHoverListeners = () => {
      document.querySelectorAll('a, button, [role="button"], input, textarea, select').forEach(el => {
        el.addEventListener('mouseenter', onHover);
        el.addEventListener('mouseleave', onLeave);
      });
    };

    addHoverListeners();
    const observer = new MutationObserver(addHoverListeners);
    observer.observe(document.body, { childList: true, subtree: true });

    animate();

    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('resize', resize);
      observer.disconnect();
      if (animId.current) cancelAnimationFrame(animId.current);
    };
  }, []);

  return (
    <>
      <canvas
        ref={trailCanvas}
        style={{
          position: 'fixed', top: 0, left: 0,
          width: '100%', height: '100%',
          pointerEvents: 'none', zIndex: 99998,
        }}
      />
      {/* Outer Ring */}
      <div
        ref={outerRef}
        style={{
          position: 'fixed',
          width: 36, height: 36,
          border: '1.5px solid rgba(99, 179, 237, 0.6)',
          borderRadius: '50%',
          pointerEvents: 'none',
          zIndex: 99999,
          transform: 'translate(-50%, -50%)',
          transition: 'transform 0.12s ease, border-color 0.15s ease',
          opacity: 0.9,
        }}
      />
      {/* Inner Dot */}
      <div
        ref={innerRef}
        style={{
          position: 'fixed',
          width: 8, height: 8,
          background: '#60a5fa',
          borderRadius: '50%',
          pointerEvents: 'none',
          zIndex: 99999,
          transform: 'translate(-50%, -50%)',
          boxShadow: '0 0 10px 4px rgba(96,165,250,0.6), 0 0 20px 8px rgba(96,165,250,0.2)',
        }}
      />
    </>
  );
}
