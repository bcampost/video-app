// src/components/QueuePanel.jsx
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import '../styles/QueuePanel.css';

// Etiqueta legible para cualquier item de video/cola
function labelFrom(item) {
  if (item == null) return '';
  if (typeof item === 'string' || typeof item === 'number') return String(item);
  if (Array.isArray(item)) return item.map(labelFrom).join(', ');
  if (typeof item === 'object') {
    // casos anidados comunes
    if (item.video) return labelFrom(item.video);
    return (
      item.title ??
      item.name ??
      item.filename ??
      item.file?.name ??
      String(item.id ?? '')
    );
  }
  return String(item);
}

export default function QueuePanel() {
  const [status, setStatus] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const fetchStatus = async () => {
      try {
        const token = localStorage.getItem('auth_token');
        const { data } = await axios.get(
          'http://127.0.0.1:8000/api/branches/queue-status',
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (!mounted) return;
        setStatus(Array.isArray(data) ? data : []);
        setError(null);
      } catch (err) {
        if (!mounted) return;
        console.error('Error al obtener cola de videos:', err);
        setError('No se pudo cargar la información de las sucursales.');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 10000); // cada 10s
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="queue-panel">
      <h3>📡 En cola por sucursal</h3>

      {loading && <p className="muted">Cargando…</p>}
      {error && <p className="error">{error}</p>}

      {status.map((branch, index) => {
        const key =
          branch.id ?? branch.code ?? branch.branch ?? `branch-${index}`;
        return (
          <div key={key} className="branch-status">
            <h4>📍 {branch.branch ?? branch.name ?? branch.code ?? 'Sucursal'}</h4>

            <p>
              <strong>Reproduciendo:</strong>{' '}
              {branch.nowPlaying ? labelFrom(branch.nowPlaying) : 'N/A'}
            </p>

            <p><strong>En cola:</strong></p>
            {Array.isArray(branch.queue) && branch.queue.length > 0 ? (
              <ul className="queue-list">
                {branch.queue.map((v, i) => (
                  <li key={v.id ?? labelFrom(v) ?? i}>{labelFrom(v)}</li>
                ))}
              </ul>
            ) : (
              <em>(sin videos en cola)</em>
            )}
          </div>
        );
      })}
    </div>
  );
}
