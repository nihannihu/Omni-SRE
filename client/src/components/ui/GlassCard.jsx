import React from 'react';

export default function GlassCard({ children, className = '', title, subtitle, icon, ...props }) {
  return (
    <div className={`glass-card ${className}`} {...props}>
      {(title || icon) && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
          <div>
            {title && <h3 style={{ fontSize: '1.1rem', color: 'var(--text-primary)' }}>{title}</h3>}
            {subtitle && <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>{subtitle}</p>}
          </div>
          {icon && <div style={{ color: 'var(--brand-primary)' }}>{icon}</div>}
        </div>
      )}
      {children}
    </div>
  );
}
