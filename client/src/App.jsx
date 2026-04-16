import { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { supabase } from './lib/supabase';
import omniLogo from './assets/omni-logo.jpeg';

// Layout & UI
import AppLayout from './layouts/AppLayout';
import CursorGlow from './components/ui/CursorGlow';
import ConfettiBackground from './components/ui/ConfettiBackground';
import TiltCard from './components/ui/TiltCard';

// Pages — New Premium
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import NewReviewPage from './pages/NewReviewPage';
import SecurityLogPage from './pages/SecurityLogPage';
import MemoryBankPage from './pages/MemoryBankPage';
import ConventionsPage from './pages/ConventionsPage';

// Pages — Original (still used)
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

  // ═══════ RENDER GATES ═══════

  if (!ready) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#ffffff' }}>
        <CursorGlow />
        <div style={{
          width: 80, height: 80, borderRadius: '50%', background: '#ffffff',
          overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 8px 32px rgba(56, 189, 248, 0.2)', marginBottom: '2rem', padding: '8px',
          border: '1px solid rgba(56, 189, 248, 0.1)'
        }}>
          <img src={omniLogo} alt="logo" style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: '50%' }} />
        </div>
        <div style={{ width: 28, height: 28, border: '2.5px solid #f3f4f6', borderTopColor: '#0a0a0a', borderRadius: '50%', animation: 'spin 1.2s cubic-bezier(0.5, 0, 0.5, 1) infinite' }} />
        <p style={{ marginTop: '1.25rem', color: '#9ca3af', fontSize: '0.7rem', letterSpacing: '0.2em', fontWeight: 800, textTransform: 'uppercase' }}>Synchronizing Intelligence</p>
      </div>
    );
  }

  if (!session) {
    return (
      <>
        <CursorGlow />
        <LoginPage />
      </>
    );
  }

  if (workspaces.length === 0) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '2rem', background: '#ffffff', position: 'relative', overflow: 'hidden' }}>
        <CursorGlow />
        <ConfettiBackground />
        <TiltCard
          style={{ maxWidth: '440px', textAlign: 'center', padding: '3rem', position: 'relative', zIndex: 1 }}
        >
          <h3 style={{ fontSize: '1.5rem', fontWeight: 900, marginBottom: '0.5rem' }}>Welcome to Omni-SRE</h3>
          <p style={{ color: '#9ca3af', fontSize: '0.875rem', marginBottom: '2rem' }}>
            The next generation of context-aware engineering intelligence.
          </p>
          <div style={{ margin: '0 auto 2rem', width: 84, height: 84, borderRadius: '50%', background: '#ffffff', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 24px rgba(56, 189, 248, 0.15)', padding: '8px', border: '1px solid rgba(56, 189, 248, 0.1)' }}>
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
          <button onClick={createWorkspace} className="btn-pill btn-dark" style={{ width: '100%', justifyContent: 'center' }}>
            <Plus size={16} /> Create Your First Workspace
          </button>
          <button onClick={handleLogout} style={{ marginTop: '1.25rem', background: 'none', border: 'none', color: '#9ca3af', fontSize: '0.8rem', fontWeight: 500 }}>
            Sign Out
          </button>
        </TiltCard>
      </div>
    );
  }

  const wsMatch = location.pathname.match(/\/workspace\/([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})/i);
  const currentWs = wsMatch ? workspaces.find((w) => w.id === wsMatch[1]) : workspaces[0];

  return (
    <>
      <CursorGlow />
      <Routes>
        <Route element={<AppLayout session={session} currentWs={currentWs} onLogout={handleLogout} />}>
          <Route path="/" element={<Navigate to={`/workspace/${currentWs?.id}`} replace />} />
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
