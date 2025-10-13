import React, { useEffect, useState } from 'react';
import '../styles/Sidebar.css';
import logoImg from '../assets/media/logo-li.png';
import QueuePanel from './QueuePanel';


export default function Sidebar({
  setView,
  view,
  theme,
  toggleTheme,
  isMobile,
  onLogout
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [showMobileQueue, setShowMobileQueue] = useState(false);

  const toggleSidebar = () => setIsOpen(!isOpen);

  useEffect(() => {
    if (isMobile) {
      document.body.style.overflow = isOpen ? 'hidden' : 'auto';
    }
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [isOpen, isMobile]);

  if (isMobile) {
    return (
      <>
        {!isOpen && (
          <div className="hamburger-float" onClick={toggleSidebar}>
            ☰
          </div>
        )}
        {isOpen && <div className="sidebar-overlay" onClick={toggleSidebar} />}

        <aside className={`sidebar-mobile ${isOpen ? 'sidebar-expanded' : 'sidebar-collapsed'}`}>
          {isOpen && (
            <>
              <div className="sidebar-header">
                <button className="close-btn" onClick={toggleSidebar}>✕</button>
              </div>

              <div className="sidebar-logo-center">
                <img src={logoImg} alt="Logo" className="logo-img" />
              </div>

              <nav className="sidebar-nav">
                <button className={`nav-button ${view === 'videos' ? 'active' : ''}`}
                        onClick={() => { setView('videos'); setIsOpen(false); }}>
                  📁 Videos
                </button>
                <button className={`nav-button ${view === 'branches' ? 'active' : ''}`}
                        onClick={() => { setView('branches'); setIsOpen(false); }}>
                  🏢 Sucursales
                </button>
                <button className={`nav-button ${view === 'assign' ? 'active' : ''}`}
                        onClick={() => { setView('assign'); setIsOpen(false); }}>
                  🔗 Asignar Videos
                </button>
                <button className={`nav-button ${view === 'list' ? 'active' : ''}`}
                        onClick={() => { setView('list'); setIsOpen(false); }}>
                  📃 Lista (pública)
                </button>


              </nav>

              {/* Siempre renderizamos el panel de cola, pero lo ocultamos con CSS */}
              <div className={`mobile-queue-wrapper ${showMobileQueue ? 'visible' : 'hidden'}`}>
                <div className="mobile-queue-scroll">
                  <QueuePanel />
                </div>
              </div>

              <div className="sidebar-footer">
                <button className="theme-toggle-btn" onClick={toggleTheme}>
                  {theme === 'dark' ? '🌞 Modo Claro' : '🌙 Modo Oscuro'}
                </button>
                <button className="logout-btn" onClick={onLogout}>
                  🔓 Cerrar sesión
                </button>
              </div>
            </>
          )}
        </aside>
      </>
    );
  }

  // Versión escritorio
  return (
    <aside className="sidebar desktop-sidebar">
      <div className="sidebar-logo">
        <img src={logoImg} alt="Logo" className="logo-img" />
      </div>
      <nav className="sidebar-nav">
        <button className={`nav-button ${view === 'videos' ? 'active' : ''}`} onClick={() => setView('videos')}>📁 Videos</button>
        <button className={`nav-button ${view === 'branches' ? 'active' : ''}`} onClick={() => setView('branches')}>🏢 Sucursales</button>
        <button className={`nav-button ${view === 'assign' ? 'active' : ''}`} onClick={() => setView('assign')}>🔗 Asignar Videos</button>
      </nav>
      <div className="sidebar-footer">
        <button className="theme-toggle-btn" onClick={toggleTheme}>
          {theme === 'dark' ? '🌞 Modo Claro' : '🌙 Modo Oscuro'}
        </button>
        <button className="logout-btn" onClick={onLogout}>
          🔓 Cerrar sesión
        </button>
      </div>
    </aside>
  );
}
