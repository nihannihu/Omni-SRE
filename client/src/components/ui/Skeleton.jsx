import React from 'react';

export default function Skeleton({ width = '100%', height = '1rem', borderRadius = 'var(--radius-md)', style = {}, className = '' }) {
  return (
    <div 
      className={`skeleton-loader ${className}`}
      style={{
        width,
        height,
        borderRadius,
        background: 'linear-gradient(90deg, var(--bg-base) 0%, rgba(226, 232, 240, 0.4) 50%, var(--bg-base) 100%)',
        backgroundSize: '200% 100%',
        animation: 'shimmer 1.5s infinite',
        ...style
      }}
    />
  );
}
