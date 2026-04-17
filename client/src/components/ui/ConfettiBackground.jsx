import React, { useEffect, useRef } from 'react';

/**
 * ConfettiBackground — Colorful sticks rain down continuously.
 * When cursor gets near, sticks repel away from it.
 */
export default function ConfettiBackground() {
  const canvasRef = useRef(null);
  const mouse = useRef({ x: -9999, y: -9999 });
  const animId = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    // Vibrant, multi-colored confetti palette
    const colors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'];
    const STICK_COUNT = 85;
    const REPEL_RADIUS = 130;

    // Initialize sticks — scattered across full height, falling down
    const sticks = Array.from({ length: STICK_COUNT }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      rotation: Math.random() * Math.PI,
      length: 16 + Math.random() * 18,
      width: 1.8 + Math.random() * 0.7,
      color: colors[Math.floor(Math.random() * colors.length)],
      opacity: 0.6 + Math.random() * 0.3,
      speed: 1.0 + Math.random() * 1.5, // Increased speed to make them fast again, but slightly smoother than original
      drift: (Math.random() - 0.5) * 0.3,
      vx: 0,
      vy: 0,
    }));

    const onMove = (e) => {
      mouse.current = { x: e.clientX, y: e.clientY };
    };
    window.addEventListener('mousemove', onMove);

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      sticks.forEach(s => {
        // Natural falling motion
        s.y += s.speed;
        s.x += s.drift;
        s.rotation += 0.003;

        // Cursor repulsion
        const dx = s.x - mouse.current.x;
        const dy = s.y - mouse.current.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < REPEL_RADIUS) {
          const force = (REPEL_RADIUS - dist) / REPEL_RADIUS;
          const angle = Math.atan2(dy, dx);
          s.vx += Math.cos(angle) * force * 4;
          s.vy += Math.sin(angle) * force * 4;
          s.rotation += (Math.random() - 0.5) * 0.1;
        }

        // Apply repulsion velocity with friction
        s.x += s.vx;
        s.y += s.vy;
        s.vx *= 0.92;
        s.vy *= 0.92;

        // Loop: if stick goes below screen, reset to top
        if (s.y > canvas.height + 20) {
          s.y = -20;
          s.x = Math.random() * canvas.width;
          s.vx = 0;
          s.vy = 0;
        }
        // If pushed off sides, wrap around
        if (s.x < -30) s.x = canvas.width + 20;
        if (s.x > canvas.width + 30) s.x = -20;

        // Draw
        ctx.save();
        ctx.translate(s.x, s.y);
        ctx.rotate(s.rotation);
        ctx.beginPath();
        ctx.moveTo(0, -s.length / 2);
        ctx.lineTo(0, s.length / 2);
        ctx.strokeStyle = s.color;
        ctx.globalAlpha = s.opacity;
        ctx.lineWidth = s.width;
        ctx.lineCap = 'round';
        ctx.stroke();
        ctx.restore();
      });

      animId.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('resize', resize);
      if (animId.current) cancelAnimationFrame(animId.current);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0, left: 0,
        width: '100%', height: '100%',
        pointerEvents: 'none',
        zIndex: 0,
      }}
    />
  );
}
