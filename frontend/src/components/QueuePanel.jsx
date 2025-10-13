import { useEffect, useRef, useState } from 'react';
import http from '../api/http';

const REFRESH_MS = 4000;

// Normaliza axios: {data:[...]} o {data:{data:[...]}}
const normalize = (res) => {
  const p = res?.data;
  if (Array.isArray(p)) return p;
  if (Array.isArray(p?.data)) return p.data;
  return [];
};

export default function QueuePanel() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const timerRef = useRef(null);

  const load = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const res = await http.get('/branches/queue-status');
      setRows(normalize(res));
    } catch (e) {
      console.error('[QueuePanel] load', e);
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // auto refresh
    timerRef.current = setInterval(() => load(true), REFRESH_MS);

    // evento manual (por ej. al guardar asignación)
    const onChanged = () => load(true);
    window.addEventListener('queue:changed', onChanged);

    return () => {
      clearInterval(timerRef.current);
      window.removeEventListener('queue:changed', onChanged);
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
            const playing = r.now_playing?.title || '—';
            const inQueue = Array.isArray(r.queue) ? r.queue.map((q) => q.title).join(' • ') : '—';

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
                  <span className="qp-value">{inQueue || '—'}</span>
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
