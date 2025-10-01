import React, { createContext, useCallback, useContext, useMemo, useRef, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import './Toast.css';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timersRef = useRef(new Map());

  const remove = useCallback((id) => {
    setToasts((list) => list.filter(t => t.id !== id));
    const tm = timersRef.current.get(id);
    if (tm) {
      clearTimeout(tm);
      timersRef.current.delete(id);
    }
  }, []);

  const scheduleAutoClose = useCallback((id, duration) => {
    const tm = setTimeout(() => remove(id), duration);
    timersRef.current.set(id, tm);
  }, [remove]);

  const add = useCallback((type, message, opts = {}) => {
    const id = crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random());
    const duration = typeof opts.duration === 'number'
      ? opts.duration
      : (type === 'error' ? 6000 : 4000);

    const item = {
      id,
      type,                // 'success' | 'error' | 'info'
      title: opts.title || (type === 'success' ? 'Éxito' : type === 'error' ? 'Error' : 'Aviso'),
      message: String(message || ''),
      duration
    };

    setToasts((list) => [item, ...list]); // apila arriba
    scheduleAutoClose(id, duration);
    return id;
  }, [scheduleAutoClose]);

  const pause = (id) => {
    const tm = timersRef.current.get(id);
    if (tm) {
      clearTimeout(tm);
      timersRef.current.delete(id);
    }
  };

  const resume = (id, msLeft = 2500) => {
    // re-programa un cierre (simple); si quieres precisión, guarda timestamps
    scheduleAutoClose(id, msLeft);
  };

  const ctx = useMemo(() => ({
    toast: {
      success: (msg, opts) => add('success', msg, opts),
      error:   (msg, opts) => add('error',   msg, opts),
      info:    (msg, opts) => add('info',    msg, opts),
      remove
    }
  }), [add, remove]);

  // Limpieza al desmontar
  useEffect(() => () => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current.clear();
  }, []);

  return (
    <ToastContext.Provider value={ctx}>
      {children}
      {createPortal(
        <div className="tst-container" aria-live="polite" aria-atomic="false">
          {toasts.map(t => (
            <div
              key={t.id}
              className={`tst ${'tst--' + t.type}`}
              role={t.type === 'error' ? 'alert' : 'status'}
              onMouseEnter={() => pause(t.id)}
              onMouseLeave={() => resume(t.id)}
            >
              <span className="tst-icon" aria-hidden="true">
                {t.type === 'success' ? '✅' : t.type === 'error' ? '⛔' : 'ℹ️'}
              </span>
              <div className="tst-content">
                <div className="tst-title">{t.title}</div>
                {t.message ? <div className="tst-msg">{t.message}</div> : null}
              </div>
              <button
                className="tst-close"
                onClick={() => remove(t.id)}
                aria-label="Cerrar notificación"
                title="Cerrar"
              >
                ✕
              </button>
              <div className="tst-progress" style={{ animationDuration: `${t.duration}ms` }} />
            </div>
          ))}
        </div>,
        document.body
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast debe usarse dentro de <ToastProvider>');
  }
  return ctx.toast;
}
