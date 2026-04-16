import React from 'react';
import { Link, useLocation, Outlet } from 'react-router-dom';
import {
  LayoutDashboard, Plus, ShieldAlert, Brain,
  BookOpen, LogOut
} from 'lucide-react';
import ConfettiBackground from '../components/ui/ConfettiBackground';
import omniLogo from '../assets/omni-logo.jpeg';

export default function AppLayout({ session, currentWs, onLogout }) {
  const location = useLocation();
  const user = session?.user;
  const isActive = (path) => location.pathname === path;

  return (
    <div className="app-layout">
      <ConfettiBackground />

      {/* Sidebar */}
      <aside className="sidebar">
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem' }}>
          <div style={{
            width: 38, height: 38, borderRadius: '50%',
            background: '#ffffff',
            overflow: 'hidden',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(56, 189, 248, 0.2)',
            border: '1px solid rgba(56, 189, 248, 0.1)',
            padding: '4px',
          }}>
            <img 
              src={omniLogo} 
              alt="Omni-SRE" 
              style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: '50%' }}
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = "https://ui-avatars.com/api/?name=O&background=0a0a0a&color=fff";
              }}
            />
          </div>
          <span style={{
            fontSize: '1.1rem', fontWeight: 900, color: '#0a0a0a',
            letterSpacing: '-0.03em',
          }}>
            Omni-SRE
          </span>
        </div>

        {/* Navigation */}
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1 }}>
          {currentWs && (
            <>
              <div className="nav-section-label">Workspace</div>
              <Link to={`/workspace/${currentWs.id}`} className={`nav-item ${isActive(`/workspace/${currentWs.id}`) ? 'active' : ''}`}>
                <LayoutDashboard size={17} /> Dashboard
              </Link>
              <Link to={`/workspace/${currentWs.id}/review/new`} className={`nav-item ${isActive(`/workspace/${currentWs.id}/review/new`) ? 'active' : ''}`}>
                <Plus size={17} /> New Review
              </Link>
              <Link to={`/workspace/${currentWs.id}/incident`} className={`nav-item ${isActive(`/workspace/${currentWs.id}/incident`) ? 'active' : ''}`}>
                <ShieldAlert size={17} /> Security Log
              </Link>

              <div className="nav-section-label">Intelligence</div>
              <Link to={`/workspace/${currentWs.id}/memory`} className={`nav-item ${isActive(`/workspace/${currentWs.id}/memory`) ? 'active' : ''}`}>
                <Brain size={17} /> Memory Bank
              </Link>
              <Link to={`/workspace/${currentWs.id}/conventions`} className={`nav-item ${isActive(`/workspace/${currentWs.id}/conventions`) ? 'active' : ''}`}>
                <BookOpen size={17} /> Conventions
              </Link>
            </>
          )}
        </nav>

        {/* User Footer */}
        <div style={{ borderTop: '1px solid rgba(0,0,0,0.06)', paddingTop: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.75rem' }}>
            <div style={{
              width: 32, height: 32, borderRadius: '50%',
              background: '#0a0a0a',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontSize: '0.7rem', fontWeight: 700,
              backgroundImage: user?.user_metadata?.avatar_url ? `url(${user.user_metadata.avatar_url})` : 'none',
              backgroundSize: 'cover',
            }}>
              {!user?.user_metadata?.avatar_url && (user?.user_metadata?.full_name?.charAt(0) || user?.email?.charAt(0) || 'U')}
            </div>
            <div style={{ overflow: 'hidden', flex: 1 }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0a0a0a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user?.user_metadata?.full_name || 'Engineer'}
              </div>
              <div style={{ fontSize: '0.65rem', color: '#9ca3af', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user?.email}
              </div>
            </div>
          </div>
          <button onClick={onLogout} className="btn-pill btn-danger" style={{ width: '100%', justifyContent: 'center', gap: '0.4rem', fontSize: '0.8rem', padding: '0.5rem' }}>
            <LogOut size={14} /> Sign Out
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
