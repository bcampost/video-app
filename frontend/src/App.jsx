// src/App.jsx
import { useEffect, useState, Suspense, lazy } from 'react';
import './App.css';
import axios from 'axios';
import { applyTheme } from './utils/theme';
import ErrorBoundary from './ui/ErrorBoundary.jsx';

// Lazy de vistas internas del admin (NO BranchView aquí)
const Login = lazy(() => import('./components/Login'));
const Sidebar = lazy(() => import('./components/Sidebar'));
const VideoManager = lazy(() => import('./components/VideoManager'));
const BranchManager = lazy(() => import('./components/BranchManager'));
const AssignVideos = lazy(() => import('./components/AssignVideos'));
const VideoList = lazy(() => import('./components/VideoList'));
const QueuePanel = lazy(() => import('./components/QueuePanel'));
const MobileQueueSidebar = lazy(() => import('./components/MobileQueueSidebar'));

function AdminLayout({ user, view, setView, theme, toggleTheme, isMobile, handleLogout }) {
  const showQueue = true;

  return (
    <div className="app-container" data-theme={theme}>
      <ErrorBoundary>
        <Suspense fallback={null}>
          <Sidebar
            setView={setView}
            view={view}
            theme={theme}
            toggleTheme={toggleTheme}
            isMobile={isMobile}
            onLogout={handleLogout}
          />
        </Suspense>
      </ErrorBoundary>

      <ErrorBoundary>
        <Suspense fallback={null}>
          <MobileQueueSidebar />
        </Suspense>
      </ErrorBoundary>

      <div className={`main-content-wrapper ${!isMobile && showQueue ? 'with-queue' : ''}`}>
        <div className="top-bar">
          <h1 className="panel-title">🎬 Panel de Administración</h1>
        </div>

        <p>Bienvenido, {user.name}</p>
        <hr />

        <div className="content-container">
          <ErrorBoundary>
            <Suspense fallback={null}>
              {view === 'videos' && <VideoManager />}
              {view === 'branches' && <BranchManager />}
              {view === 'assign' && <AssignVideos />}
              {view === 'list' && <VideoList />}
            </Suspense>
          </ErrorBoundary>
        </div>
      </div>

      {!isMobile && (
        <div className="queue-panel-wrapper">
          <ErrorBoundary>
            <Suspense fallback={null}>
              <QueuePanel />
            </Suspense>
          </ErrorBoundary>
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [view, setView] = useState('videos');
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const storedUser = localStorage.getItem('auth_user');
    if (storedUser) setUser(JSON.parse(storedUser));
    applyTheme(theme);

    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    applyTheme(theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme((p) => (p === 'dark' ? 'light' : 'dark'));
  const handleLoginSuccess = (userData) => setUser(userData);

  const handleLogout = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      await axios.post('http://127.0.0.1:8000/api/logout', {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_user');
      setUser(null);
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  };

  // App decide login/admin; las rutas viven en main.jsx
  if (!user) {
    return (
      <ErrorBoundary>
        <Suspense fallback={null}>
          <Login onLoginSuccess={handleLoginSuccess} />
        </Suspense>
      </ErrorBoundary>
    );
  }

  return (
    <AdminLayout
      user={user}
      view={view}
      setView={setView}
      theme={theme}
      toggleTheme={toggleTheme}
      isMobile={isMobile}
      handleLogout={handleLogout}
    />
  );
}
