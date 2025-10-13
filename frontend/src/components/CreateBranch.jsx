// src/components/CreateBranch.jsx
import { useState } from 'react';
import http from '../api/http';

export default function CreateBranch({ onCreated }) {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name || !code) return;

    setSaving(true);
    try {
      await http.post('/branches', { name, code });
      setName('');
      setCode('');
      onCreated?.();
    } catch (err) {
      console.error('[CreateBranch] error:', err);
      alert('No se pudo crear la sucursal');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ marginTop: 16, marginBottom: 24 }}>
      <h3>➕ Crear sucursal</h3>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <input
          type="text"
          placeholder="Nombre"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <input
          type="text"
          placeholder="Código (ej. LI-01)"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          required
        />
        <button type="submit" disabled={saving}>
          {saving ? 'Guardando…' : 'Guardar'}
        </button>
      </div>
    </form>
  );
}
