import { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { supabase } from './lib/supabase';

// Layout & UI
import Sidebar from './components/layout/Sidebar';
import GlassCard from './components/ui/GlassCard';

// Pages
import Auth from './pages/Auth';
import Dashboard from './pages/Dashboard';
import ReviewDetail from './pages/ReviewDetail';
import NewReview from './pages/NewReview';
import IncidentForm from './pages/IncidentForm';
import ReviewDashboard from './pages/ReviewDashboard';

// Assets
import omniLogo from './assets/omni-logo.jpeg';

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
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--bg-deep)' }}>
        <div style={{ width: 40, height: 40, border: '3px solid var(--text-dim)', borderTopColor: 'var(--brand-primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        <p style={{ marginTop: '1rem', color: 'var(--text-muted)', fontSize: '0.9rem', letterSpacing: '0.05em' }}>BOOTING OMNI-SRE...</p>
      </div>
    );
  }

  if (!session) {
    return <Auth />;
  }

  if (workspaces.length === 0) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '2rem' }}>
        <GlassCard 
          style={{ maxWidth: '440px', textAlign: 'center', padding: '3rem' }}
          title="Welcome to Omni-SRE"
          subtitle="The next generation of context-aware engineering intelligence."
        >
          <div style={{ margin: '2rem 0' }}>
            <div style={{ width: 80, height: 80, borderRadius: '24px', background: 'linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem' }}>
              🚀
            </div>
          </div>
          <button onClick={createWorkspace} className="btn-premium btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
            <Plus size={18} /> Create Your First Workspace
          </button>
          <button onClick={handleLogout} style={{ marginTop: '1.5rem', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.9rem' }}>
            Sign Out
          </button>
        </GlassCard>
      </div>
    );
  }

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
