import { useState, useEffect, useRef } from 'react';
import { Routes, Route, Navigate, Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, GitPullRequest, ShieldAlert, Brain,
  BookOpen, Settings, LogOut, Plus, FolderGit2
} from 'lucide-react';
import { supabase } from './lib/supabase';
import Auth from './pages/Auth';
import Dashboard from './pages/Dashboard';
import ReviewDetail from './pages/ReviewDetail';
import NewReview from './pages/NewReview';
import IncidentForm from './pages/IncidentForm';
import ReviewDashboard from './pages/ReviewDashboard';
import omniLogo from './assets/omni-logo.jpeg';

function Sidebar({ user, workspaces, currentWs, onLogout }) {
  const location = useLocation();
  const isActive = (path) => location.pathname.includes(path);

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <img src={omniLogo} alt="Omni-SRE Logo" style={{ width: 28, height: 28, borderRadius: 6, objectFit: 'cover' }} />
        <h1>Omni-SRE</h1>
      </div>

      <nav className="sidebar-nav">
        {currentWs && (
          <>
            <div className="sidebar-section-label">Workspace</div>
            <Link to={`/workspace/${currentWs.id}`} className={`sidebar-link ${isActive(`/workspace/${currentWs.id}`) && !isActive('/review') && !isActive('/incident') ? 'active' : ''}`}>
              <LayoutDashboard /> Dashboard
            </Link>
            <Link to={`/workspace/${currentWs.id}/review/new`} className={`sidebar-link ${isActive('/review/new') ? 'active' : ''}`}>
              <Plus /> New Review
            </Link>
            <Link to={`/workspace/${currentWs.id}/incident`} className={`sidebar-link ${isActive('/incident') ? 'active' : ''}`}>
              <ShieldAlert /> Log Incident
            </Link>

            <div className="sidebar-section-label">Intelligence</div>
            <div className="sidebar-link" style={{ cursor: 'default', opacity: 0.5 }}>
              <Brain /> Memory Bank
            </div>
            <div className="sidebar-link" style={{ cursor: 'default', opacity: 0.5 }}>
              <BookOpen /> Conventions
            </div>
          </>
        )}

        {workspaces.length > 0 && (
          <>
            <div className="sidebar-section-label">Workspaces</div>
            {workspaces.map((ws) => (
              <Link key={ws.id} to={`/workspace/${ws.id}`} className={`sidebar-link ${currentWs?.id === ws.id ? 'active' : ''}`}>
                <FolderGit2 /> {ws.name}
              </Link>
            ))}
          </>
        )}
      </nav>

      <div className="sidebar-footer">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', marginBottom: 8 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 'var(--radius-full)',
            background: 'linear-gradient(135deg, var(--brand-primary), var(--accent-cyan))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 13, fontWeight: 700, color: 'white', flexShrink: 0,
            backgroundImage: user?.user_metadata?.avatar_url ? `url(${user.user_metadata.avatar_url})` : 'none',
            backgroundSize: 'cover'
          }}>
            {!user?.user_metadata?.avatar_url && (user?.user_metadata?.full_name?.charAt(0)?.toUpperCase() || '?')}
          </div>
          <div style={{ overflow: 'hidden' }}>
            <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.user_metadata?.full_name || user?.email}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.email}</div>
          </div>
        </div>
        <button className="sidebar-link" onClick={onLogout} style={{ color: 'var(--accent-red)', background: 'transparent', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer' }}>
          <LogOut /> Sign Out
        </button>
      </div>
    </aside>
  );
}

export default function App() {
  const [session, setSession] = useState(null);
  const [workspaces, setWorkspaces] = useState([]);
  const [authInitialized, setAuthInitialized] = useState(false);
  const [workspacesLoaded, setWorkspacesLoaded] = useState(false);
  const [initError, setInitError] = useState('');
  const navigate = useNavigate();
  const location = useLocation();

  const ready = authInitialized && workspacesLoaded;

  // ═══════ TIMEOUT FAILSAFE ═══════
  useEffect(() => {
    const failsafe = setTimeout(() => {
      if (!ready) {
        console.error('[FAILSAFE] Init timeout — forcing ready state');
        setInitError('Initialization timed out. Supabase may be unreachable. Try refreshing.');
        setAuthInitialized(true);
        setWorkspacesLoaded(true);
      }
    }, 6000);
    return () => clearTimeout(failsafe);
  }, [ready]);

  // ═══════ 1. AUTH LISTENER (NO ASYNC DB CALLS HERE) ═══════
  // The Supabase SDK holds an internal navigator.lock during this callback.
  // We CANNOT await database queries inside it, or it will deadlock.
  useEffect(() => {
    let mounted = true;
    
    // This fires immediately on mount with INITIAL_SESSION
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      if (!mounted) return;
      console.log('[AUTH] Event:', _event, '| Session:', !!currentSession);
      
      // Synchronously set the session state and release the callback
      setSession(currentSession);
      setAuthInitialized(true);
      
      if (!currentSession) {
        setWorkspaces([]);
        setWorkspacesLoaded(true);
      }
    });

    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
  }, []);

  // ═══════ 2. WORKSPACE FETCHER ═══════
  // This reacts to the session state AFTER the auth callback has completed.
  useEffect(() => {
    let mounted = true;

    if (!authInitialized) return; // Wait for INITIAL_SESSION event
    if (!session) return;         // Handled by auth listener

    const fetchWs = async () => {
      console.log('[SUPABASE] Fetch started for user:', session.user.id);
      try {
        const { data, error } = await supabase.from('workspaces').select('*');
        
        if (!mounted) return;
        
        console.log('[SUPABASE] Fetch complete. Data:', data?.length);
        
        if (error) {
          console.error('[SUPABASE] Fetch error:', error);
          setInitError(error.message);
        } else {
          setWorkspaces(data || []);
        }
      } catch (err) {
        if (mounted) {
          console.error('[SUPABASE] Fetch exception:', err);
          setInitError(err.message);
        }
      } finally {
        if (mounted) setWorkspacesLoaded(true);
      }
    };

    fetchWs();

    return () => {
      mounted = false;
    };
  }, [session, authInitialized]);

  // ═══════ ACTIONS ═══════

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setWorkspaces([]);
    navigate('/');
  };

  const createWorkspace = async () => {
    const name = prompt("Enter a name for your new workspace:");
    if (!name) return;

    console.log('[CREATE] Starting workspace creation:', name);

    // Step 1: Insert workspace
    const { data: wsData, error: wsError } = await supabase.from('workspaces')
      .insert([{ name, created_by: session.user.id }])
      .select()
      .single();

    if (wsError) {
      console.error("[CREATE] Step 1 FAILED:", wsError);
      alert("Failed to create workspace: " + wsError.message);
      return;
    }
    console.log('[CREATE] Step 1 OK — workspace:', wsData.id);

    // Step 2: Insert membership
    const { error: memberError } = await supabase.from('workspace_members')
      .insert([{ workspace_id: wsData.id, user_id: session.user.id, role: 'admin' }]);

    if (memberError) {
      console.error("[CREATE] Step 2 FAILED:", memberError);
      // Non-fatal — SELECT policy checks created_by as fallback
    } else {
      console.log('[CREATE] Step 2 OK — member added');
    }

    // Step 3: Update local state and navigate
    const newWs = { id: wsData.id, name: wsData.name, created_by: wsData.created_by };
    setWorkspaces(prev => [...prev, newWs]);
    setTimeout(() => navigate(`/workspace/${wsData.id}`), 0);
  };

  // ═══════ RENDER GATES ═══════

  // Gate 0: Still initializing — show spinner
  if (!ready) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--bg-base)' }}>
        <div className="loader"><span className="spinner" style={{ width: 28, height: 28 }} /> Loading Omni-SRE...</div>
      </div>
    );
  }

  // Gate 0.5: Initialization error — show error with retry
  if (initError && !session) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--bg-base)' }}>
        <div style={{ background: 'var(--bg-surface)', padding: '32px', borderRadius: '16px', border: '1px solid rgba(239,68,68,0.3)', textAlign: 'center', maxWidth: '420px' }}>
          <div style={{ width: 48, height: 48, margin: '0 auto 16px', background: 'rgba(239,68,68,0.15)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444', fontSize: 20 }}>⚠</div>
          <h3 style={{ color: '#ef4444', marginBottom: 12, fontSize: 18 }}>Initialization Error</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 20, lineHeight: 1.6 }}>{initError}</p>
          <button onClick={() => window.location.reload()} style={{ padding: '10px 24px', background: 'var(--brand-primary)', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Gate 1: Not authenticated — show login
  if (!session) {
    return <Auth />;
  }

  // Gate 2: Authenticated but no workspaces — show create screen
  if (workspaces.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--bg-base)', color: '#fff' }}>
        <div style={{ background: 'var(--bg-surface)', padding: '40px', borderRadius: '16px', border: '1px solid var(--border-color)', textAlign: 'center', maxWidth: '400px' }}>
          <img src={omniLogo} alt="Omni Logo" style={{ width: 64, height: 64, margin: '0 auto 24px', borderRadius: '50%', objectFit: 'cover' }} />
          <h2 style={{ fontSize: '24px', fontWeight: '700', marginBottom: '12px' }}>Welcome to Omni-SRE</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '32px' }}>Create your first workspace to start using the Context-Aware Code Review Agent.</p>
          <button onClick={createWorkspace} style={{ width: '100%', padding: '12px 24px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', background: 'var(--brand-primary)', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}>
            <Plus size={18} /> Create Workspace
          </button>
          <div style={{ marginTop: '24px' }}>
            <button onClick={handleLogout} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '14px' }}>Sign Out</button>
          </div>
          {initError && (
            <div style={{ marginTop: 16, padding: 12, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, color: '#ef4444', fontSize: 12, textAlign: 'left' }}>
              ⚠ {initError}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Gate 3: Dashboard — fully operational
  const wsMatch = location.pathname.match(/\/workspace\/([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})/i);
  const currentWs = wsMatch ? workspaces.find((w) => w.id === wsMatch[1]) : workspaces[0];

  return (
    <div className="app-layout">
      <Sidebar user={session.user} workspaces={workspaces} currentWs={currentWs} onLogout={handleLogout} />

      <main className="main-content">
        <Routes>
          <Route path="/" element={<Navigate to={`/workspace/${currentWs?.id}`} replace />} />
          <Route path="/interactive-demo" element={<ReviewDashboard />} />
          <Route path="/workspace/:workspaceId" element={<Dashboard />} />
          <Route path="/workspace/:workspaceId/review/new" element={<NewReview />} />
          <Route path="/workspace/:workspaceId/review/:reviewId" element={<ReviewDetail />} />
          <Route path="/workspace/:workspaceId/incident" element={<IncidentForm />} />
          <Route path="*" element={<Navigate to={`/workspace/${currentWs?.id}`} replace />} />
        </Routes>
      </main>
    </div>
  );
}
