import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import QueuePanel from './QueuePanel';
import '../styles/MobileQueueSidebar.css';


export default function MobileQueueSidebar() {
  const [open, setOpen] = useState(false);
  const lastFocusedRef = useRef(null);

  const openDrawer = useCallback(() => {
    lastFocusedRef.current = document.activeElement;
    setOpen(true);
  }, []);

  const closeDrawer = useCallback(() => {
    setOpen(false);
    // devolver foco al invocador
    if (lastFocusedRef.current && typeof lastFocusedRef.current.focus === 'function') {
      lastFocusedRef.current.focus();
    }
  }, []);

  // Bloquear scroll + cerrar con ESC cuando está abierto
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => e.key === 'Escape' && closeDrawer();
    document.addEventListener('keydown', onKey, true);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener('keydown', onKey, true);
    };
  }, [open, closeDrawer]);

  return (
    <>
      {/* FAB en móviles */}
      <button
        type="button"
        className="mq-fab"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls="mq-drawer"
        onClick={openDrawer}
      >
        📺 Ver Cola
      </button>

      {/* Riel (rail) en vista media */}
      <div className="mq-rail" aria-hidden={open}>
        <button
          type="button"
          className="mq-rail-btn"
          onClick={openDrawer}
          title="Abrir cola de videos"
          aria-label="Abrir cola de videos"
        >
          📺 <span className="mq-rail-text">Cola</span>
        </button>
      </div>

      {/* Drawer */}
      {open &&
        createPortal(
          <div className="mq-overlay" role="presentation" onClick={closeDrawer}>
            <aside
              id="mq-drawer"
              className="mq-drawer"
              role="dialog"
              aria-modal="true"
              aria-label="Cola de videos"
              onClick={(e) => e.stopPropagation()}
            >
              <header className="mq-header">
                <h2 className="mq-title">Cola de videos</h2>
                <button
                  type="button"
                  className="mq-close"
                  onClick={closeDrawer}
                  aria-label="Cerrar panel"
                  title="Cerrar"
                >
                  ✕
                </button>
              </header>

              {/* wrapper para aplicar overrides sin tocar tu App.css */}
              <div className="mq-body" data-in-drawer="queue">
                <QueuePanel />
              </div>
            </aside>
          </div>,
          document.body
        )}
    </>
  );
}
