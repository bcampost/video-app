// src/components/QueuePanel.jsx
import { useEffect, useRef, useState } from 'react';
import http from '../api/http';

const REFRESH_MS = 5000; // cada 5s

// Normaliza payloads: {data:[...]} o directamente [...]
const pickRows = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
};

export default function QueuePanel() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const timerRef = useRef(null);
  const abortRef = useRef(null); // ← ahora sí existe

  const load = async (silent = false) => {
    try {
      // cancela petición anterior si sigue viva
      if (abortRef.current) abortRef.current.abort();
      abortRef.current = new AbortController();

      if (!silent) setLoading(true);

      // usa el endpoint correcto del backend
      const res = await http.get('/branches/queue-status', {
        signal: abortRef.current.signal,
        headers: {
          'Cache-Control': 'no-cache',
          Pragma: 'no-cache',
        },
      });

      setRows(pickRows(res.data));
    } catch (e) {
      // axios usa CanceledError / ERR_CANCELED al abortar: lo ignoramos
      if (e?.name === 'CanceledError' || e?.code === 'ERR_CANCELED') return;
      console.error('[QueuePanel] load', e);
      setRows([]);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    load();

    // auto refresh
    timerRef.current = setInterval(() => load(true), REFRESH_MS);

    // refresca si algo del front avisa que cambió la cola o el now playing
    const onChanged = () => load(true);
    window.addEventListener('queue:changed', onChanged);
    window.addEventListener('tv:now-playing', onChanged);

    return () => {
      clearInterval(timerRef.current);
      window.removeEventListener('queue:changed', onChanged);
      window.removeEventListener('tv:now-playing', onChanged);
      if (abortRef.current) abortRef.current.abort();
    };
  }, []);

  return (
    <aside className="queue-panel-rt">
      <div className="qph">
        <span>📌 En cola por sucursal</span>
        <button className="qp-refresh" title="Actualizar" onClick={() => load()}>
          ↻
        </button>
      </div>

      {loading && rows.length === 0 ? (
        <div className="qp-empty">Cargando…</div>
      ) : rows.length === 0 ? (
        <div className="qp-empty">No hay información.</div>
      ) : (
        <div className="qp-list">
          {rows.map((r) => {
            // si tu backend no manda "now_playing", tomamos el primero de la cola
            const playing = r.now_playing?.title || r.queue?.[0]?.title || '—';
            const inQueue = (r.queue || []).slice(r.now_playing ? 0 : 1).map((q) => q.title);

            return (
              <div key={r.branch.id} className="qp-item">
                <div className="qp-branch">
                  {r.branch.name} <span className="qp-code">({r.branch.code})</span>
                </div>
                <div className="qp-row">
                  <span className="qp-label">Reproduciendo:</span>
                  <span className="qp-value">{playing}</span>
                </div>
                <div className="qp-row">
                  <span className="qp-label">En cola:</span>
                  <span className="qp-value">{inQueue.length ? inQueue.join(' • ') : '—'}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <style>{`
        .queue-panel-rt { height: 100%; background: var(--panel, #15232f); border-left: 1px solid rgba(255,255,255,.06); padding: 12px; overflow:auto; }
        .qph { display:flex; align-items:center; justify-content:space-between; font-weight:700; margin-bottom:8px; }
        .qp-refresh { border:0; background:#223346; color:#cfe3ff; padding:6px 8px; border-radius:8px; cursor:pointer; }
        .qp-empty { color:#9fb4c3; padding:8px; }
        .qp-list { display:grid; gap:10px; }
        .qp-item { background:#0f1a23; border:1px solid rgba(255,255,255,.06); border-radius:10px; padding:10px; }
        .qp-branch { font-weight:600; margin-bottom:6px; }
        .qp-code { opacity:.7; font-weight:400; }
        .qp-row { display:flex; gap:6px; margin:2px 0; line-height:1.4; }
        .qp-label { color:#9fb4c3; min-width:110px; }
        .qp-value { color:#e8f0f7; flex:1; }
      `}</style>
    </aside>
  );
}
