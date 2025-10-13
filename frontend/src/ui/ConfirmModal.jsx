// src/ui/ConfirmModal.jsx
import React from 'react';
import Modal from './Modal';
import './modal.css'; // si no se está aplicando por defecto


export default function ConfirmModal({
  open,
  title = '¿Estás seguro?',
  message = 'Esta acción no se puede deshacer.',
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  onConfirm,
  onCancel,
}) {
  if (!open) return null;

  return (
    <Modal open={open} onClose={onCancel}>
      <div style={{ padding: 24, textAlign: 'center', minWidth: 320 }}>
        <h3 style={{ marginBottom: 10 }}>{title}</h3>
        <p style={{ marginBottom: 20, color: 'var(--muted, #9fb4c3)' }}>{message}</p>

        <div style={{ display: 'flex', justifyContent: 'center', gap: 12 }}>
          <button className="btn-cancel" onClick={onCancel}>
            {cancelText}
          </button>
          <button className="btn-delete" onClick={onConfirm}>
            {confirmText}
          </button>
        </div>
      </div>
    </Modal>
  );
}
