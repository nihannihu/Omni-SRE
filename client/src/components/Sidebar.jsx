import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutGrid, PlusSquare, ShieldAlert, BrainCircuit, BookOpen, LogOut } from 'lucide-react';

const Sidebar = () => {
  return (
    <div style={{
      width: '240px',
      backgroundColor: 'var(--bg-dark)',
      minHeight: '100vh',
      position: 'fixed',
      left: 0,
      top: 0,
      borderRight: '1px solid var(--border-dark)',
      display: 'flex',
      flexDirection: 'column',
      padding: '24px 16px',
      color: 'white',
      zIndex: 10
    }}>
      {/* Brand */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', paddingBottom: '24px', borderBottom: '1px solid rgba(255,255,255,0.05)', marginBottom: '24px' }}>
        <div style={{ 
          width: '32px', height: '32px', borderRadius: '50%', 
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 0 15px rgba(6, 182, 212, 0.4)',
          overflow: 'hidden'
        }}>
          {/* Logo Icon */}
          <img src="/logo.jpeg" alt="Omni-SRE Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
        <span style={{ fontSize: '18px', fontWeight: 'bold' }}>Omni-SRE</span>
      </div>

      {/* Navigation Sections */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '24px' }}>
        
        {/* WORKSPACE */}
        <div>
          <div style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-secondary)', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '8px', paddingLeft: '12px' }}>
            WORKSPACE
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <NavItem to="/dashboard" icon={<LayoutGrid size={18} />} label="Dashboard" />
            <NavItem to="/new-review" icon={<PlusSquare size={18} />} label="New Review" />
            <NavItem to="/log-incident" icon={<ShieldAlert size={18} />} label="Log Incident" />
          </div>
        </div>

        {/* INTELLIGENCE */}
        <div>
          <div style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-secondary)', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '8px', paddingLeft: '12px' }}>
            INTELLIGENCE
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <NavItem to="/memory-bank" icon={<BrainCircuit size={18} />} label="Memory Bank" />
            <NavItem to="/conventions" icon={<BookOpen size={18} />} label="Conventions" />
          </div>
        </div>
      </div>

      {/* User Section */}
      <div style={{ paddingTop: '24px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', marginBottom: '8px' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#1f2937', flexShrink: 0 }} />
          <div style={{ overflow: 'hidden' }}>
            <div style={{ fontSize: '14px', fontWeight: '500', color: 'white', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>Sarah Engineer</div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>sarah@acmecorp.com</div>
          </div>
        </div>
        <button style={{ 
          display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', 
          width: '100%', background: 'transparent', border: 'none', 
          color: 'var(--accent-red)', cursor: 'pointer', fontSize: '14px', fontWeight: '500'
        }}>
          <LogOut size={16} />
          Sign Out
        </button>
      </div>
    </div>
  );
};

// Internal sub-component for nav links to handle active state styled as gradients
const NavItem = ({ to, icon, label }) => {
  return (
    <NavLink
      to={to}
      style={({ isActive }) => ({
        display: 'flex', alignItems: 'center', gap: '12px',
        padding: '10px 12px',
        borderRadius: '12px',
        color: isActive ? 'white' : 'var(--text-muted)',
        background: isActive ? 'var(--gradient-primary)' : 'transparent',
        textDecoration: 'none',
        fontSize: '14px',
        fontWeight: isActive ? '600' : '500',
        transition: 'all 0.2s ease',
        boxShadow: isActive ? '0 4px 12px rgba(6, 182, 212, 0.2)' : 'none'
      })}
    >
      {/* Icon Wrapper preserves shape */}
      <div style={{ opacity: 0.9 }}>{icon}</div>
      {label}
    </NavLink>
  );
};

export default Sidebar;
