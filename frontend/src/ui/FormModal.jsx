// src/ui/FormModal.jsx
import React, { useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import './PromptModal.css'; // Reusa el mismo CSS del modal anterior

export default function FormModal({
  open,
  title = 'Editar',
  fields = [], // [{name:'name', label:'Nombre', value:''}, ...]
  onChange,    // (name, newValue) => void
  onCancel,    // () => void
  onConfirm,   // () => void
  confirmText = 'Guardar',
  cancelText = 'Cancelar',
}) {
  const firstInputRef = useRef(null);

  useEffect(() => {
    if (open) {
      const t = setTimeout(() => firstInputRef.current?.focus(), 60);
      document.body.style.overflow = 'hidden';
      return () => { clearTimeout(t); document.body.style.overflow = ''; };
    }
  }, [open]);

  useEffect(() => {
    const onKey = (e) => {
      if (!open) return;
      if (e.key === 'Escape') onCancel?.();
      if (e.key === 'Enter') onConfirm?.();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onConfirm, onCancel]);

  if (!open) return null;

  return ReactDOM.createPortal(
    <div className="pm-overlay" onMouseDown={onCancel}>
      <div className="pm-dialog" onMouseDown={(e) => e.stopPropagation()}>
        <div className="pm-header">
          <h3>{title}</h3>
        </div>

        <div className="pm-content">
          {fields.map((f, idx) => (
            <div key={f.name} style={{ marginBottom: 12 }}>
              <label className="pm-label" htmlFor={`f-${f.name}`}>{f.label}</label>
              <input
                id={`f-${f.name}`}
                ref={idx === 0 ? firstInputRef : null}
                className="pm-input"
                value={f.value}
                onChange={(e) => onChange?.(f.name, e.target.value)}
                placeholder={f.placeholder || ''}
                type="text"
              />
            </div>
          ))}
        </div>

        <div className="pm-actions">
          <button className="pm-btn pm-ghost" onClick={onCancel}>
            {cancelText}
          </button>
          <button className="pm-btn pm-primary" onClick={onConfirm}>
            {confirmText}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
