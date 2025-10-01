import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import './ConfirmDialog.css';

export default function ConfirmDialog({
  open,
  title = 'Confirmar',
  message = '¿Deseas continuar?',
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  onConfirm,
  onCancel,
}) {
  const cancelRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === 'Escape') onCancel?.();
    };
    document.addEventListener('keydown', onKey, true);
    const id = requestAnimationFrame(() => cancelRef.current?.focus());
    return () => {
      cancelAnimationFrame(id);
      document.removeEventListener('keydown', onKey, true);
    };
  }, [open, onCancel]);

  if (!open) return null;

  return createPortal(
    <div className="cdg-overlay" onClick={onCancel}>
      <div
        className="cdg-window"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cdg-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="cdg-header">
          <h3 id="cdg-title" className="cdg-title">{title}</h3>
          <button className="cdg-x" onClick={onCancel} aria-label="Cerrar">✕</button>
        </header>

        <div className="cdg-body">
          <p className="cdg-message">{message}</p>
        </div>

        <footer className="cdg-actions">
          <button
            ref={cancelRef}
            className="cdg-btn cdg-btn--secondary"
            onClick={onCancel}
            type="button"
          >
            {cancelText}
          </button>
          <button
            className="cdg-btn cdg-btn--danger"
            onClick={onConfirm}
            type="button"
            autoFocus
          >
            {confirmText}
          </button>
        </footer>
      </div>
    </div>,
    document.body
  );
}
