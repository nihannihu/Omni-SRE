import React from 'react';
import { BrowserRouter, Routes, Route, Outlet } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import ParticleBackground from './components/ParticleBackground';

// Placeholder Pages (we will create these next)
import Landing from './pages/Landing';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import NewReview from './pages/NewReview';
import LogIncident from './pages/LogIncident';

// Layout with Sidebar for app pages
const AppLayout = () => {
  return (
    <div className="app-container">
      <Sidebar />
      <div className="main-content" style={{ marginLeft: '240px' }}>
         <Outlet />
      </div>
    </div>
  );
};

// Layout without Sidebar for public pages (Landing, Login)
const PublicLayout = () => {
  return (
    <div className="app-container">
      <ParticleBackground />
      <div className="main-content">
        <Outlet />
      </div>
    </div>
  );
};

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<PublicLayout />}>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
        </Route>
        
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/new-review" element={<NewReview />} />
          <Route path="/log-incident" element={<LogIncident />} />
          
          {/* Fallbacks for navigation items not yet designed */}
          <Route path="/memory-bank" element={<div style={{padding: '40px'}}><h1 style={{fontSize: '28px'}}>Memory Bank</h1><p>Placeholder for future intelligence view.</p></div>} />
          <Route path="/conventions" element={<div style={{padding: '40px'}}><h1 style={{fontSize: '28px'}}>Conventions</h1><p>Placeholder for future conventions view.</p></div>} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
