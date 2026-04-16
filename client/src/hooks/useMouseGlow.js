import { useState, useEffect, useCallback } from 'react';

/**
 * Magnetic cursor glow hook — renders a smooth radial gradient
 * that follows the mouse like a magnetic field across every page.
 */
export default function useMouseGlow() {
  const [position, setPosition] = useState({ x: -100, y: -100 });

  const handleMouseMove = useCallback((e) => {
    setPosition({ x: e.clientX, y: e.clientY });
  }, []);

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [handleMouseMove]);

  return position;
}
