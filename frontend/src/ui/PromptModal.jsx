// src/ui/PromptModal.jsx
import React, { useEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import './PromptModal.css';

export default function PromptModal({
  open,
  title = 'Editar',
  label = 'Nuevo valor',
  initialValue = '',
  confirmText = 'Guardar',
  cancelText = 'Cancelar',
  onClose, // (value|null) => void
}) {
  const [value, setValue] = useState(initialValue);
  const inputRef = useRef(null);

  useEffect(() => {
    if (open) {
      setValue(initialValue);
      const t = setTimeout(() => inputRef.current?.focus(), 50);
      document.body.style.overflow = 'hidden';
      return () => { clearTimeout(t); document.body.style.overflow = ''; };
    }
  }, [open, initialValue]);

  useEffect(() => {
    const onKey = (e) => {
      if (!open) return;
      if (e.key === 'Escape') onClose?.(null);
      if (e.key === 'Enter') onClose?.(value.trim() || null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, value, onClose]);

  if (!open) return null;

  const body = (
    <div className="pm-overlay" onMouseDown={() => onClose?.(null)}>
      <div
        className="pm-dialog"
        onMouseDown={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="pm-header">
          <h3>{title}</h3>
        </div>

        <div className="pm-content">
          <label className="pm-label">{label}</label>
          <input
            ref={inputRef}
            className="pm-input"
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Escribe aquí…"
          />
        </div>

        <div className="pm-actions">
          <button className="pm-btn pm-ghost" onClick={() => onClose?.(null)}>
            {cancelText}
          </button>
          <button
            className="pm-btn pm-primary"
            onClick={() => onClose?.(value.trim() || null)}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );

  return ReactDOM.createPortal(body, document.body);
}
