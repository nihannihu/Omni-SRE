import React from 'react';
import { Link, useLocation, Outlet } from 'react-router-dom';
import {
  LayoutDashboard, Plus, ShieldAlert, Brain,
  BookOpen, LogOut, ChevronRight
} from 'lucide-react';
import ConfettiBackground from '../components/ui/ConfettiBackground';
import omniLogo from '../assets/omni-logo.jpeg';

export default function AppLayout({ session, currentWs, onLogout }) {
  const location = useLocation();
  const user = session?.user;
  const isActive = (path) => location.pathname === path;

  return (
    <div className="app-layout">
      {/* Background Layer */}

      {/* Sidebar */}
      <aside className="sidebar animate-fade-in" style={{
        background: 'rgba(255, 255, 255, 0.5)',
        backdropFilter: 'blur(40px)',
        borderRight: '1px solid rgba(0, 0, 0, 0.05)'
      }}>
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '3rem' }}>
          <div style={{
            width: 44, height: 44, borderRadius: '12px',
            background: '#ffffff',
            overflow: 'hidden',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.06)',
            padding: '8px',
            border: '1px solid rgba(0, 0, 0, 0.05)'
          }}>
              <img 
                src={omniLogo} 
                alt="Omni-SRE" 
                style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: '4px' }}
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = "https://ui-avatars.com/api/?name=O&background=f1f5f9&color=2563eb";
                }}
              />
          </div>
          <span style={{
            fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)',
            letterSpacing: '-0.04em',
          }}>
            Omni-SRE
          </span>
        </div>

        {/* Navigation */}
        <nav style={{ display: 'flex', flexDirection: 'column', flex: 1, gap: '0.25rem' }}>
          {currentWs && (
            <>
              <div className="nav-section-label">Command Center</div>
              <Link to={`/workspace/${currentWs.id}`} className={`nav-item ${isActive(`/workspace/${currentWs.id}`) ? 'active' : ''}`}>
                <LayoutDashboard size={20} /> Dashboard
              </Link>
              <Link to={`/workspace/${currentWs.id}/review/new`} className={`nav-item ${isActive(`/workspace/${currentWs.id}/review/new`) ? 'active' : ''}`}>
                <Plus size={20} /> Analysis Engine
              </Link>
              <Link to={`/workspace/${currentWs.id}/incident`} className={`nav-item ${isActive(`/workspace/${currentWs.id}/incident`) ? 'active' : ''}`}>
                <ShieldAlert size={20} /> Security Intel
              </Link>

              <div className="nav-section-label">Operations</div>
              <Link to={`/workspace/${currentWs.id}/memory`} className={`nav-item ${isActive(`/workspace/${currentWs.id}/memory`) ? 'active' : ''}`}>
                <Brain size={20} /> Memory Bank
              </Link>
              <Link to={`/workspace/${currentWs.id}/conventions`} className={`nav-item ${isActive(`/workspace/${currentWs.id}/conventions`) ? 'active' : ''}`}>
                <BookOpen size={20} /> Field Manuals
              </Link>
            </>
          )}
        </nav>

        {/* User Footer */}
        <div style={{ borderTop: '1px solid rgba(0, 0, 0, 0.05)', paddingTop: '1.5rem', marginTop: 'auto' }}>
          <div style={{ 
            display: 'flex', alignItems: 'center', gap: '0.875rem', marginBottom: '1rem',
            padding: '0.75rem', borderRadius: 'var(--radius-md)', background: 'rgba(0,0,0,0.02)',
            border: '1px solid rgba(0,0,0,0.02)'
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: 'var(--radius-sm)',
              background: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--brand-primary)', fontSize: '0.8rem', fontWeight: 800,
              backgroundImage: user?.user_metadata?.avatar_url ? `url(${user.user_metadata.avatar_url})` : 'none',
              backgroundSize: 'cover',
              border: '1px solid rgba(0,0,0,0.05)'
            }}>
              {!user?.user_metadata?.avatar_url && (user?.user_metadata?.full_name?.charAt(0) || user?.email?.charAt(0).toUpperCase() || 'U')}
            </div>
            <div style={{ overflow: 'hidden', flex: 1 }}>
              <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user?.user_metadata?.full_name || 'Senior Engineer'}
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user?.email}
              </div>
            </div>
          </div>
          <button onClick={onLogout} className="btn-pill" style={{ width: '100%', justifyContent: 'center', gap: '0.5rem', fontSize: '0.875rem', background: 'rgba(239, 68, 68, 0.05)', color: 'var(--red)', border: '1px solid rgba(239, 68, 68, 0.1)' }}>
            <LogOut size={16} /> Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
