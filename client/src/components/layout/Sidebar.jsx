import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, GitPullRequest, ShieldAlert, Brain, 
  BookOpen, LogOut, Plus, FolderGit2 
} from 'lucide-react';
import omniLogo from '../../assets/omni-logo.jpeg';

export default function Sidebar({ user, workspaces, currentWs, onLogout }) {
  const location = useLocation();
  const isActive = (path) => location.pathname === path;

  return (
    <aside className="sidebar">
      <div className="sidebar-brand" style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
        <div style={{ 
          width: 42, height: 42, borderRadius: '50%', overflow: 'hidden',
          background: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 12px rgba(56, 189, 248, 0.2)', padding: '4px'
        }}>
          <img src={omniLogo} alt="Omni-SRE" style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: '50%' }} />
        </div>
        <h1 style={{ fontSize: '1.25rem', color: 'var(--text-primary)' }}>Omni-SRE</h1>
      </div>

      <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
        {currentWs && (
          <>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: '1rem', marginBottom: '0.5rem' }}>Workspace</div>
            <SidebarLink to={`/workspace/${currentWs.id}`} icon={<LayoutDashboard size={18} />} label="Dashboard" active={isActive(`/workspace/${currentWs.id}`)} />
            <SidebarLink to={`/workspace/${currentWs.id}/review/new`} icon={<Plus size={18} />} label="New Review" active={isActive(`/workspace/${currentWs.id}/review/new`)} />
            <SidebarLink to={`/workspace/${currentWs.id}/incident`} icon={<ShieldAlert size={18} />} label="Security Log" active={isActive(`/workspace/${currentWs.id}/incident`)} />
            
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: '1.5rem', marginBottom: '0.5rem' }}>Intelligence</div>
            <SidebarLink to="#" icon={<Brain size={18} />} label="Memory Bank" disabled />
            <SidebarLink to="#" icon={<BookOpen size={18} />} label="Conventions" disabled />
          </>
        )}
      </nav>

      <div className="sidebar-footer" style={{ borderTop: '1px solid var(--glass-border)', paddingTop: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
          <div style={{ 
            width: 36, height: 36, borderRadius: '50%', 
            background: 'linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '0.8rem', fontWeight: 700,
            backgroundImage: user?.user_metadata?.avatar_url ? `url(${user.user_metadata.avatar_url})` : 'none',
            backgroundSize: 'cover'
          }}>
            {!user?.user_metadata?.avatar_url && (user?.user_metadata?.full_name?.charAt(0) || user?.email?.charAt(0))}
          </div>
          <div style={{ overflow: 'hidden' }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {user?.user_metadata?.full_name || 'Engineer'}
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {user?.email}
            </div>
          </div>
        </div>
        <button className="btn-premium" onClick={onLogout} style={{ width: '100%', justifyContent: 'center', background: 'rgba(244, 63, 94, 0.1)', color: 'var(--red-glow)', border: '1px solid rgba(244, 63, 94, 0.2)' }}>
          <LogOut size={16} /> Sign Out
        </button>
      </div>
    </aside>
  );
}

function SidebarLink({ to, icon, label, active, disabled }) {
  if (disabled) {
    return (
      <div style={{ 
        display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem',
        borderRadius: 'var(--radius-md)', color: 'var(--text-dim)', cursor: 'not-allowed',
        fontSize: '0.9rem'
      }}>
        {icon}
        <span>{label}</span>
      </div>
    );
  }

  return (
    <Link to={to} style={{ 
      display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem',
      borderRadius: 'var(--radius-md)', 
      background: active ? 'rgba(56, 189, 248, 0.1)' : 'transparent',
      color: active ? 'var(--brand-primary)' : 'var(--text-secondary)',
      transition: 'var(--transition-fast)',
      textDecoration: 'none', fontSize: '0.9rem', fontWeight: active ? 600 : 500
    }}>
      {icon}
      <span>{label}</span>
    </Link>
  );
}
