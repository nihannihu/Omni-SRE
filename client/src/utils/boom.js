export const triggerBoom = (e, color = '#ffffff') => {
  const rect = e.currentTarget.getBoundingClientRect();
  // Calculate center of the button
  const x = rect.left + rect.width / 2;
  const y = rect.top + rect.height / 2;

  const particleCount = 25;

  for (let i = 0; i < particleCount; i++) {
    const particle = document.createElement('div');
    document.body.appendChild(particle);

    const size = 3 + Math.random() * 6;
    const angle = Math.random() * Math.PI * 2;
    const velocity = 60 + Math.random() * 120;
    const duration = 500 + Math.random() * 300;

    // Initial state
    Object.assign(particle.style, {
      position: 'fixed',
      left: `${x}px`,
      top: `${y}px`,
      width: `${size}px`,
      height: `${size}px`,
      backgroundColor: color,
      borderRadius: '50%',
      pointerEvents: 'none',
      zIndex: 99999,
      transform: 'translate(-50%, -50%)',
      transition: `all ${duration}ms cubic-bezier(0.1, 0.9, 0.2, 1)`,
      boxShadow: `0 0 ${size * 2}px ${color}`,
      opacity: 1,
    });

    // Force reflow so transition applies
    particle.getBoundingClientRect();

    const destX = Math.cos(angle) * velocity;
    const destY = Math.sin(angle) * velocity;

    // Animate to destination
    Object.assign(particle.style, {
      transform: `translate(calc(-50% + ${destX}px), calc(-50% + ${destY}px)) scale(0)`,
      opacity: 0,
    });

    // Cleanup
    setTimeout(() => {
      if (particle.parentNode) particle.remove();
    }, duration);
  }
};
