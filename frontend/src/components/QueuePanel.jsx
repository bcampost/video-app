import React, { useEffect, useRef, useState } from 'react';
import http from '../api/http';
import '../styles/QueuePanel.css';
import { forwardRef, useImperativeHandle } from 'react';


function labelFrom(item) {
  if (item == null) return '';
  if (typeof item === 'string' || typeof item === 'number') return String(item);
  if (Array.isArray(item)) return item.map(labelFrom).join(', ');
  if (typeof item === 'object') {
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

const POLL_MS = 20000;

export default function QueuePanel({ reloadRef }) {
  const [status, setStatus] = useState([]);
  const [error, setError] = useState(null);
  const timerRef = useRef(null);
  const inFlight = useRef(null);

  const fetchStatus = async (signal) => {
    try {
      const { data } = await http.get('/branches/queue-status', { signal });
      setStatus(Array.isArray(data) ? data : []);
      setError(null);
    } catch (err) {
      if (err.name === 'CanceledError' || err.code === 'ERR_CANCELED') return;
      console.error('[QueuePanel] error:', err);
      setError('No se pudo cargar la información de las sucursales.');
    }
  };

  if (typeof reloadRef === 'function') {
    reloadRef(() => fetchStatus());
  }

useEffect(() => {
  const fetchStatus = async (signal) => {
    try {
      const { data } = await http.get('/branches/queue-status', { signal });
      setStatus(Array.isArray(data) ? data : []);
      setError(null);
    } catch (err) {
      if (err.name === 'CanceledError' || err.code === 'ERR_CANCELED') return;
      console.error('[QueuePanel] error:', err);
      setError('No se pudo cargar la información de las sucursales.');
    }
  };

  const schedule = () => {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(tick, POLL_MS);
  };

  const tick = async () => {
    if (document.hidden || !navigator.onLine) {
      schedule();
      return;
    }
    inFlight.current?.abort?.();
    const controller = new AbortController();
    inFlight.current = controller;
    await fetchStatus(controller.signal);
    schedule();
  };

  const onVisible = () => { if (!document.hidden) tick(); };
  const onOnline = () => tick();

  document.addEventListener('visibilitychange', onVisible);
  window.addEventListener('focus', onVisible);
  window.addEventListener('online', onOnline);

  // ✅ Escucha el evento personalizado para forzar recarga
  window.addEventListener('queue-status-refresh', tick);

  tick(); // Primera carga

  return () => {
    document.removeEventListener('visibilitychange', onVisible);
    window.removeEventListener('focus', onVisible);
    window.removeEventListener('online', onOnline);
    window.removeEventListener('queue-status-refresh', tick);
    clearTimeout(timerRef.current);
    inFlight.current?.abort?.();
  };
}, []);


  return (
    <div className="queue-panel">
      <h3>📡 En cola por sucursal</h3>
      {error && <p className="error">{error}</p>}

      {status.map((branchData, index) => {
        const { branch, now_playing, queue } = branchData;

        return (
          <div key={index} className="branch-status">
            <h4>📍 {labelFrom(branch)}</h4>

            <p>
              <strong>Reproduciendo:</strong>{' '}
              {now_playing ? labelFrom(now_playing) : 'N/A'}
            </p>

            <p><strong>En cola:</strong></p>
            {Array.isArray(queue) && queue.length > 0 ? (
              <ul className="queue-list">
                {queue.map((v) => (
                  <li key={v.id ?? labelFrom(v)}>{labelFrom(v)}</li>
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
