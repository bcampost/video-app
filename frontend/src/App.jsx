// src/App.jsx
import React, { useEffect, useState, Suspense, lazy } from 'react';
import './App.css';
import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { applyTheme } from './utils/theme';
import ErrorBoundary from './ui/ErrorBoundary.jsx';
import http from './api/http';

// Toast global
import Toast from './components/Toast';
import './styles/Toast.css';

// Lazy load de módulos del panel
const Login = lazy(() => import('./components/Login'));
const Sidebar = lazy(() => import('./components/Sidebar'));
const VideoManager = lazy(() => import('./components/VideoManager'));
const BranchManager = lazy(() => import('./components/BranchManager'));
const AssignVideos = lazy(() => import('./components/AssignVideos'));
const VideoList = lazy(() => import('./components/VideoList'));
const QueuePanel = lazy(() => import('./components/QueuePanel'));
const MobileQueueSidebar = lazy(() => import('./components/MobileQueueSidebar'));

function RequireAuth({ user }) {
  return user ? <Outlet /> : <Navigate to="/login" replace />;
}

function AdminLayout({ user, view, setView, theme, toggleTheme, isMobile, handleLogout }) {
  const showQueue = true;

  return (
    <div className="app-container" data-theme={theme}>
      {/* Sidebar */}
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

      {/* Drawer móvil con la cola */}
      <ErrorBoundary>
        <Suspense fallback={null}>
          <MobileQueueSidebar />
        </Suspense>
      </ErrorBoundary>

      {/* Contenido principal */}
      <div className={`main-content-wrapper ${!isMobile && showQueue ? 'with-queue' : ''}`}>
        <div className="top-bar">
          <h1 className="panel-title">🎬 Panel de Administración</h1>
        </div>

        <p>Bienvenido, {user.email}</p>
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

      {/* Cola de la derecha en desktop */}
      {!isMobile && (
        <div className="queue-panel-wrapper">
          <ErrorBoundary>
            <Suspense fallback={null}>
              <QueuePanel />
            </Suspense>
          </ErrorBoundary>
        </div>
      )}

      {/* Toasts globales */}
      <Toast />
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [view, setView] = useState('videos');
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  // Restaurar sesión y tema
  useEffect(() => {
    const storedUser = localStorage.getItem('auth_user');
    if (storedUser) setUser(JSON.parse(storedUser));
    applyTheme(theme);

    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Persistir theme
  useEffect(() => {
    applyTheme(theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme((p) => (p === 'dark' ? 'light' : 'dark'));

  const handleLogout = async () => {
    try {
      await http.post('/auth/logout'); // endpoint correcto
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    } finally {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_user');
      setUser(null);
      window.dispatchEvent(new CustomEvent('toast', {
        detail: { type: 'info', message: 'Sesión cerrada correctamente' },
      }));
    }
  };

  return (
    <ErrorBoundary>
      <Suspense fallback={null}>
        <Routes>
          <Route path="/login" element={<Login onLoginSuccess={setUser} />} />
          <Route element={<RequireAuth user={user} />}>
            <Route
              path="/"
              element={
                <AdminLayout
                  user={user}
                  view={view}
                  setView={setView}
                  theme={theme}
                  toggleTheme={toggleTheme}
                  isMobile={isMobile}
                  handleLogout={handleLogout}
                />
              }
            />
          </Route>

          {/* Fallback */}
          <Route
            path="*"
            element={user ? <Navigate to="/" replace /> : <Navigate to="/login" replace />}
          />
        </Routes>
      </Suspense>
    </ErrorBoundary>
  );
}
