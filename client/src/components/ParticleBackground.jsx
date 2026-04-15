import React, { useEffect, useState } from 'react';

const ParticleBackground = () => {
  const [particles, setParticles] = useState([]);

  useEffect(() => {
    // Generate static particle data once
    const particleCount = 100; // Increased for "hundreds of tiny animated floating blue and cyan dot particles"
    const newParticles = Array.from({ length: particleCount }).map((_, i) => ({
      id: i,
      x: Math.random() * 100, // vw
      y: Math.random() * 100, // vh
      size: Math.random() * 2 + 2, // 2-4px
      duration: Math.random() * 20 + 15, // 15-35s floating
      delay: Math.random() * -20, // start at different points in animation
      color: Math.random() > 0.5 ? '#3b82f6' : '#06b6d4', // Blue or Cyan
      opacity: Math.random() * 0.4 + 0.2 // 0.2 to 0.6 opacity
    }));
    
    setParticles(newParticles);
  }, []);

  return (
    <div className="particle-bg">
      {particles.map(p => (
        <div
          key={p.id}
          className="particle"
          style={{
            left: `${p.x}vw`,
            top: `${p.y}vh`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            backgroundColor: p.color,
            '--max-opacity': p.opacity,
            animationDuration: `${p.duration}s`,
            animationDelay: `${p.delay}s`
          }}
        />
      ))}
    </div>
  );
};

export default ParticleBackground;
