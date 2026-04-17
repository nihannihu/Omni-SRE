import { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { supabase } from './lib/supabase';
import omniLogo from './assets/omni-logo.jpeg';

// Layout & UI
import AppLayout from './layouts/AppLayout';
import ConfettiBackground from './components/ui/ConfettiBackground';
import TiltCard from './components/ui/TiltCard';

// Pages
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import NewReviewPage from './pages/NewReviewPage';
import SecurityLogPage from './pages/SecurityLogPage';
import MemoryBankPage from './pages/MemoryBankPage';
import ConventionsPage from './pages/ConventionsPage';
import ReviewDetail from './pages/ReviewDetail';
import ReviewDashboard from './pages/ReviewDashboard';

export default function App() {
  const [session, setSession] = useState(null);
  const [workspaces, setWorkspaces] = useState([]);
  const [authInitialized, setAuthInitialized] = useState(false);
  const [workspacesLoaded, setWorkspacesLoaded] = useState(false);
  const [initError, setInitError] = useState('');
  const navigate = useNavigate();
  const location = useLocation();

  const ready = authInitialized && workspacesLoaded;

  // ═══════ FORCE CURSOR VISIBILITY (GLOBAL SYSTEM OVERRIDE) ═══════
  useEffect(() => {
    // 1. Force styles onto root elements
    document.body.style.setProperty('cursor', 'default', 'important');
    document.documentElement.style.setProperty('cursor', 'default', 'important');
    
    // 2. Inject a global style tag that wins everything
    let styleTag = document.getElementById('extreme-cursor-fix');
    if (!styleTag) {
      styleTag = document.createElement('style');
      styleTag.id = 'extreme-cursor-fix';
      document.head.appendChild(styleTag);
    }
    styleTag.innerHTML = `
      * { cursor: default !important; }
      a, button, [role="button"], input, select, textarea, [onclick], .landing-btn, .nav-item { 
         cursor: pointer !important; 
      }
    `;

    // 3. Periodic sanity check to clear rogue styles added by hidden libs
    const interval = setInterval(() => {
      if (document.body.style.cursor === 'none') {
        document.body.style.setProperty('cursor', 'default', 'important');
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [location.pathname]);

  // ═══════ AUTH & WORKSPACE LOGIC (Stay Protected) ═══════
  useEffect(() => {
    let mounted = true;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      if (!mounted) return;
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

  useEffect(() => {
    let mounted = true;
    if (!authInitialized || !session) return;

    const fetchWs = async () => {
      try {
        const { data, error } = await supabase.from('workspaces').select('*');
        if (!mounted) return;
        if (error) setInitError(error.message);
        else setWorkspaces(data || []);
      } catch (err) {
        if (mounted) setInitError(err.message);
      } finally {
        if (mounted) setWorkspacesLoaded(true);
      }
    };
    fetchWs();
    return () => { mounted = false; };
  }, [session, authInitialized]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setWorkspaces([]);
    navigate('/');
  };

  const createWorkspace = async () => {
    const name = prompt("Enter a name for your new workspace:");
    if (!name) return;
    const { data: wsData, error: wsError } = await supabase.from('workspaces')
      .insert([{ name, created_by: session.user.id }])
      .select().single();

    if (wsError) {
      alert("Failed to create workspace: " + wsError.message);
      return;
    }

    await supabase.from('workspace_members')
      .insert([{ workspace_id: wsData.id, user_id: session.user.id, role: 'admin' }]);

    setWorkspaces(prev => [...prev, wsData]);
    navigate(`/workspace/${wsData.id}`);
  };

  // ═══════ UI LOADER ═══════
  const FullPageLoader = ({ text }) => (
    <div style={{ 
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', 
      height: '100vh', background: 'transparent', position: 'relative', overflow: 'hidden',
      zIndex: 2
    }}>
      <ConfettiBackground />
      <div style={{
        width: 96, height: 96, borderRadius: '24px', background: '#fff',
        overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 12px 40px rgba(0,0,0,0.06)', marginBottom: '2.5rem', padding: '12px',
        border: '1px solid var(--border-subtle)', position: 'relative', zIndex: 1
      }}>
        <img src={omniLogo} alt="logo" style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: '14px' }} />
      </div>
      <div style={{ 
        width: 24, height: 24, border: '3px solid #f1f5f9', borderTopColor: 'var(--brand-primary)', 
        borderRadius: '50%', animation: 'spin 1s linear infinite',
        position: 'relative', zIndex: 1
      }} />
      <p style={{ 
        marginTop: '1.5rem', color: 'var(--text-muted)', fontSize: '0.7rem', 
        letterSpacing: '0.2em', fontWeight: 800, textTransform: 'uppercase',
        position: 'relative', zIndex: 1
      }}>{text}</p>
    </div>
  );

  // ═══════ RENDER GATES ═══════
  
  // 1. Wait for Supabase to resolve initial session (prevents OAuth flicker)
  if (!authInitialized) {
    return <FullPageLoader text="Authenticating..." />;
  }

  // 2. Serve public routes if no session
  if (location.pathname === '/' && !session) {
    return <LandingPage />;
  }

  if (location.pathname === '/auth' && !session) {
    return (
      <>
        <ConfettiBackground />
        <LoginPage />
      </>
    );
  }

  // 3. Fallback to ensure session exists for guarded routes
  if (!session) {
    return <Navigate to="/" replace />;
  }

  // 4. Wait for Workspaces to load if authenticated
  if (!workspacesLoaded) {
    return <FullPageLoader text="Synchronizing Signals" />;
  }

  // Authenticated but no session (shouldn't happen, but safety)
  if (!session) {
    return <Navigate to="/" replace />;
  }

  if (workspaces.length === 0) {
    return (
      <div style={{ 
        display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', 
        padding: '2rem', background: 'transparent', position: 'relative', overflow: 'hidden',
        zIndex: 2
      }}>
        <ConfettiBackground />
        <TiltCard>
          <div className="glass-card" style={{ maxWidth: '440px', textAlign: 'center', padding: '3.5rem' }}>
            <h3 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.75rem', color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>
              Initialize Workspace
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', marginBottom: '2.5rem', lineHeight: 1.6 }}>
              Welcome to Omni-SRE. Let's establish your first operational environment.
            </p>
            <div style={{ 
              margin: '0 auto 2.5rem', width: 96, height: 96, borderRadius: '24px', 
              background: '#fff', 
              overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', 
              boxShadow: '0 12px 40px rgba(0,0,0,0.06)', padding: '12px',
              border: '1px solid var(--border-subtle)'
            }}>
              <img 
                src={omniLogo} 
                alt="Omni-SRE" 
                style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: '14px' }}
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = "https://ui-avatars.com/api/?name=O&background=f1f5f9&color=2563eb";
                }}
              />
            </div>
            <button onClick={createWorkspace} className="btn-pill btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '1rem' }}>
              <Plus size={18} /> Create Workspace
            </button>
            <button onClick={handleLogout} style={{ marginTop: '1.5rem', background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}>
              Sign Out
            </button>
          </div>
        </TiltCard>
      </div>
    );
  }

  const wsMatch = location.pathname.match(/\/workspace\/([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})/i);
  const currentWs = wsMatch ? workspaces.find((w) => w.id === wsMatch[1]) : workspaces[0];

  return (
    <>
      <ConfettiBackground />
      <Routes>
        <Route path="/" element={<Navigate to={`/workspace/${currentWs?.id}`} replace />} />
        <Route path="/auth" element={<Navigate to={`/workspace/${currentWs?.id}`} replace />} />
        <Route element={<AppLayout session={session} currentWs={currentWs} onLogout={handleLogout} />}>
          <Route path="/interactive-demo" element={<ReviewDashboard />} />
          <Route path="/workspace/:workspaceId" element={<DashboardPage />} />
          <Route path="/workspace/:workspaceId/review/new" element={<NewReviewPage />} />
          <Route path="/workspace/:workspaceId/review/:reviewId" element={<ReviewDetail />} />
          <Route path="/workspace/:workspaceId/incident" element={<SecurityLogPage />} />
          <Route path="/workspace/:workspaceId/memory" element={<MemoryBankPage />} />
          <Route path="/workspace/:workspaceId/conventions" element={<ConventionsPage />} />
          <Route path="*" element={<Navigate to={`/workspace/${currentWs?.id}`} replace />} />
        </Route>
      </Routes>
    </>
  );
}
