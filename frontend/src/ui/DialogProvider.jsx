// src/ui/DialogProvider.jsx
import React, { createContext, useContext, useState, useCallback } from 'react';

const DialogCtx = createContext(null);

export function DialogProvider({ children }) {
  const [modal, setModal] = useState(null);

  const close = useCallback(() => setModal(null), []);
  const open = useCallback((config) => setModal(config), []);

  const base = (variant, title, message, actions) =>
    open({ variant, title, message, actions });

  const alert = (title, message) =>
    base('alert', title ?? 'Aviso', message, [
      { label: 'Aceptar', onClick: close, primary: true },
    ]);

  const error = (title, message) =>
    base('error', title ?? 'Error', message, [
      { label: 'Aceptar', onClick: close, primary: true },
    ]);

  const success = (title, message) =>
    base('success', title ?? 'Éxito', message, [
      { label: 'Aceptar', onClick: close, primary: true },
    ]);

  const info = (title, message) =>
    base('info', title ?? 'Información', message, [
      { label: 'OK', onClick: close, primary: true },
    ]);

  const confirm = (title, message, onConfirm) =>
    base('confirm', title ?? 'Confirmar', message, [
      { label: 'Cancelar', onClick: close },
      {
        label: 'Aceptar',
        onClick: () => {
          close();
          onConfirm?.();
        },
        primary: true,
      },
    ]);

  const value = { open, close, alert, error, success, info, confirm };

  return (
    <DialogCtx.Provider value={value}>
      {children}
      {modal && <Modal {...modal} onClose={close} />}
    </DialogCtx.Provider>
  );
}

export const useDialog = () => {
  const ctx = useContext(DialogCtx);
  if (!ctx) throw new Error('useDialog must be used within <DialogProvider>');
  return ctx;
};

function Modal({ variant = 'info', title, message, actions = [], onClose }) {
  const color = {
    info: '#3b82f6',
    alert: '#f59e0b',
    error: '#ef4444',
    success: '#10b981',
    confirm: '#64748b',
  }[variant];

  return (
    <div style={backdrop} onClick={onClose}>
      <div style={sheet} onClick={(e) => e.stopPropagation()}>
        <div style={{ ...header, borderColor: color }}>
          <span style={{ ...dot, background: color }} />
          <h3 style={{ margin: 0 }}>{title}</h3>
        </div>
        {message && (
          <div style={body}>
            {Array.isArray(message) ? (
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                {message.map((m, i) => (
                  <li key={i}>{m}</li>
                ))}
              </ul>
            ) : (
              <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{message}</p>
            )}
          </div>
        )}
        <div style={footer}>
          {actions.map((a, i) => (
            <button
              key={i}
              onClick={a.onClick}
              style={{
                ...btn,
                ...(a.primary ? btnPrimary : {}),
              }}
            >
              {a.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// estilos inline sencillos
const backdrop = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,.55)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 9999,
};

const sheet = {
  width: 'min(520px, 92vw)',
  background: '#0f172a',
  color: 'white',
  border: '1px solid #334155',
  borderRadius: 12,
  boxShadow: '0 20px 50px rgba(0,0,0,.4)',
  overflow: 'hidden',
};

const header = {
  padding: '14px 16px',
  borderBottom: '2px solid',
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  background: '#0b1220',
};

const dot = {
  width: 10,
  height: 10,
  borderRadius: '50%',
  display: 'inline-block',
};

const body = {
  padding: '16px',
  lineHeight: 1.5,
};

const footer = {
  padding: '12px 16px',
  borderTop: '1px solid #1f2937',
  display: 'flex',
  justifyContent: 'flex-end',
  gap: 10,
  background: '#0b1220',
};

const btn = {
  padding: '8px 14px',
  borderRadius: 8,
  border: '1px solid #374151',
  background: '#111827',
  color: 'white',
  cursor: 'pointer',
};

const btnPrimary = {
  background: '#16a34a',
  borderColor: '#16a34a',
};
