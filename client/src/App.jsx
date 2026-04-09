import { useState, useEffect } from 'react';
import { Routes, Route, Navigate, Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, GitPullRequest, ShieldAlert, Brain,
  BookOpen, Settings, LogOut, Plus, FolderGit2
} from 'lucide-react';
import { authAPI, workspaceAPI } from './services/api';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import ReviewDetail from './pages/ReviewDetail';
import NewReview from './pages/NewReview';
import IncidentForm from './pages/IncidentForm';
import ReviewDashboard from './pages/ReviewDashboard';

function Sidebar({ user, workspaces, currentWs, onLogout }) {
  const location = useLocation();

  const isActive = (path) => location.pathname.includes(path);

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="sidebar-brand-icon">Ω</div>
        <h1>Omni-SRE</h1>
      </div>

      <nav className="sidebar-nav">
        {currentWs && (
          <>
            <div className="sidebar-section-label">Workspace</div>
            <Link to={`/workspace/${currentWs._id}`} className={`sidebar-link ${isActive(`/workspace/${currentWs._id}`) && !isActive('/review') && !isActive('/incident') ? 'active' : ''}`}>
              <LayoutDashboard /> Dashboard
            </Link>
            <Link to={`/workspace/${currentWs._id}/review/new`} className={`sidebar-link ${isActive('/review/new') ? 'active' : ''}`}>
              <Plus /> New Review
            </Link>
            <Link to={`/workspace/${currentWs._id}/incident`} className={`sidebar-link ${isActive('/incident') ? 'active' : ''}`}>
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

        {workspaces.length > 1 && (
          <>
            <div className="sidebar-section-label">Workspaces</div>
            {workspaces.map((ws) => (
              <Link key={ws._id} to={`/workspace/${ws._id}`} className={`sidebar-link ${currentWs?._id === ws._id ? 'active' : ''}`}>
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
          }}>
            {user?.name?.charAt(0)?.toUpperCase() || '?'}
          </div>
          <div style={{ overflow: 'hidden' }}>
            <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.name}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.email}</div>
          </div>
        </div>
        <button className="sidebar-link" onClick={onLogout} style={{ color: 'var(--accent-red)' }}>
          <LogOut /> Sign Out
        </button>
      </div>
    </aside>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [workspaces, setWorkspaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  // Try to restore session
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      setLoading(false);
      return;
    }
    authAPI.me()
      .then(({ data }) => {
        setUser(data.user);
        return workspaceAPI.list();
      })
      .then(({ data }) => setWorkspaces(data.workspaces || []))
      .catch(() => {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
      })
      .finally(() => setLoading(false));
  }, []);

  const handleLogin = (userData) => {
    setUser(userData);
    workspaceAPI.list().then(({ data }) => setWorkspaces(data.workspaces || []));
  };

  const handleLogout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    setUser(null);
    setWorkspaces([]);
    navigate('/login');
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--bg-base)' }}>
        <div className="loader"><span className="spinner" style={{ width: 28, height: 28 }} /> Loading Omni-SRE...</div>
      </div>
    );
  }

  // Auth routes
  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<Login onLogin={handleLogin} />} />
        <Route path="/register" element={<Register onLogin={handleLogin} />} />
        <Route path="/interactive-demo" element={<ReviewDashboard />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  // Get current workspace from URL
  const wsMatch = location.pathname.match(/\/workspace\/([a-f0-9]+)/i);
  const currentWs = wsMatch ? workspaces.find((w) => w._id === wsMatch[1]) : workspaces[0];

  return (
    <div className="app-layout">
      <Sidebar user={user} workspaces={workspaces} currentWs={currentWs} onLogout={handleLogout} />

      <main className="main-content">
        <Routes>
          <Route path="/" element={
            workspaces.length > 0
              ? <Navigate to={`/workspace/${workspaces[0]._id}`} replace />
              : <Navigate to="/interactive-demo" replace />
          } />
          <Route path="/interactive-demo" element={<ReviewDashboard />} />
          <Route path="/workspace/:workspaceId" element={<Dashboard />} />
          <Route path="/workspace/:workspaceId/review/new" element={<NewReview />} />
          <Route path="/workspace/:workspaceId/review/:reviewId" element={<ReviewDetail />} />
          <Route path="/workspace/:workspaceId/incident" element={<IncidentForm />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}
