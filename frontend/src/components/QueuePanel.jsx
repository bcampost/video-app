import { useEffect, useMemo, useRef, useState } from 'react';
import http from '../api/http';
import { useToast } from '../ui/ToastProvider.jsx';
import '../styles/QueuePanel.css'; // <— importa los estilos

/* ================= helpers ================= */

const norm = (res) => {
  if (Array.isArray(res)) return res;
  if (!res) return [];
  const d = res.data ?? res;
  if (Array.isArray(d)) return d;
  if (Array.isArray(d?.data)) return d.data;
  if (Array.isArray(d?.value)) return d.value;
  if (Array.isArray(d?.data?.data)) return d.data.data;
  if (Array.isArray(d?.data?.value)) return d.data.value;
  return [];
};

const CACHE_KEY = 'assign-grid-cache:v1';
const loadAssignCache = () => {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed?.branches || {}; // { [branchId]: [videoIds...] }
  } catch { return {}; }
};

const titleOf = (idOrObj, titleById) => {
  if (!idOrObj && idOrObj !== 0) return '—';
  const id = typeof idOrObj === 'object' ? idOrObj.id : idOrObj;
  return titleById.get(id) ?? (typeof idOrObj === 'object' ? (idOrObj.title || idOrObj.name) : null) ?? `Video ${id}`;
};

const extractNowPlayingId = (row) => {
  const cands = [
    row?.now_playing?.id,
    row?.nowPlaying?.id,
    row?.playing?.id,
    row?.current?.id,
    row?.now_playing_id,
    row?.nowPlayingId,
    row?.current_video_id,
    row?.playing_video_id,
    row?.currentVideoId,
    row?.video_id,
    row?.heartbeat?.video_id,
  ];
  return cands.find(v => Number.isInteger(v)) ?? null;
};

function enrich(base, titleById) {
  const assignCache = loadAssignCache(); // {branchId: [videoIds...]}

  return base.map((item) => {
    const branch = item.branch;

    // 1) Cola base (si viene en status) mapeada a títulos
    const statusQueue = Array.isArray(item.queue) ? item.queue : [];
    const statusQueueMapped = statusQueue.map(v => ({ id: v.id, title: titleOf(v, titleById) }));
    const byId = new Map(statusQueueMapped.map(v => [v.id, v]));

    // 2) Orden preferente por cache (si existe)
    const cached = assignCache?.[branch?.id];
    let ordered = Array.isArray(cached) && cached.length
      ? cached.map(id => byId.get(id) || { id, title: titleOf(id, titleById) })
      : statusQueueMapped;

    // 3) Extraer now playing; si no existe, usar el primero de la cola
    const nowId = extractNowPlayingId(item);
    let now = null;
    if (Number.isInteger(nowId)) {
      now = { id: nowId, title: titleOf(nowId, titleById) };
    } else if (ordered.length > 0) {
      now = { id: ordered[0].id, title: titleOf(ordered[0].id, titleById) };
    }

    // 4) Cola = todos menos el actual
    const queue = now ? ordered.filter(v => v.id !== now.id) : ordered;

    return { branch, now_playing: now, queue };
  });
}

/* ================= component ================= */

export default function QueuePanel() {
  const toast = useToast();
  const [rows, setRows] = useState([]);                // [{branch, now_playing, queue}]
  const [titleById, setTitleById] = useState(new Map());
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);
  const [lastUpdate, setLastUpdate] = useState(null);
  const mounted = useRef(true);

  // Auto refresh 15s
  useEffect(() => {
    mounted.current = true;
    const id = setInterval(() => setTick(t => t + 1), 15000);
    return () => { mounted.current = false; clearInterval(id); };
  }, []);

  // Carga inicial: títulos + estado
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const [videosRes, qsRes] = await Promise.all([
          http.get('/videos'),
          http.get('/branches/queue-status'),
        ]);
        const vids = norm(videosRes);
        const map = new Map(vids.map(v => [v.id, (v.title ?? v.name ?? `Video ${v.id}`)]));
        setTitleById(map);

        const base = norm(qsRes);
        setRows(enrich(base, map));
        setLastUpdate(new Date());
      } catch (e) {
        console.error('[QueuePanel] init', e);
        toast.error('No hay información.', { title: 'Error' });
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Refresh periódico solo de queue-status
  useEffect(() => {
    if (!titleById.size) return;
    (async () => {
      try {
        const qsRes = await http.get('/branches/queue-status');
        const base = norm(qsRes);
        setRows(enrich(base, titleById));
        setLastUpdate(new Date());
      } catch (e) {
        console.error('[QueuePanel] refresh', e);
      }
    })();
  }, [tick, titleById]);

  const sorted = useMemo(
    () => [...rows].sort((a, b) => (a.branch?.name || '').localeCompare(b.branch?.name || '')),
    [rows]
  );

  const stamp = lastUpdate ? lastUpdate.toLocaleTimeString() : '—';

  return (
    <aside className="queue-panel pro">
      <div className="qp__header">
        <div className="qp__title">
          <svg width="18" height="18" viewBox="0 0 24 24" className="qp__icon" aria-hidden>
            <path fill="currentColor" d="M12 8v5l3 1m6-2a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"/>
          </svg>
          <h3>En cola por sucursal</h3>
        </div>
        <div className="qp__actions">
          <span className="qp__stamp" title="Última actualización">Actualizado {stamp}</span>
          <button className="btn-ghost qp__refresh" onClick={() => setTick(t => t + 1)} title="Refrescar">
            <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden><path fill="currentColor" d="M21 12a9 9 0 1 1-3-6.7V3h2v6h-6V7h3.7A7 7 0 1 0 19 12"/></svg>
            <span>Actualizar</span>
          </button>
        </div>
      </div>

      {loading && !sorted.length ? (
        <div className="qp__skeleton">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="qp__sk-card">
              <div className="sk-line w40" />
              <div className="sk-line w70" />
              <div className="sk-list">
                <div className="sk-line w80" />
                <div className="sk-line w65" />
                <div className="sk-line w90" />
              </div>
            </div>
          ))}
        </div>
      ) : !sorted.length ? (
        <div className="qp__empty">
          <div className="emoji">🗂️</div>
          <div className="title">Sin datos para mostrar</div>
          <div className="hint">Aún no hay heartbeat o asignaciones.</div>
        </div>
      ) : (
        <div className="qp__list">
          {sorted.map((row) => (
            <section key={row.branch?.id} className="qp__card">
              <header className="qp__card__header">
                <div className="left">
                  <div className="circle">{(row.branch?.name || '?').charAt(0)}</div>
                  <div className="meta">
                    <strong>{row.branch?.name}</strong>
                    <span className="code">({row.branch?.code})</span>
                  </div>
                </div>
              </header>

              <div className="qp__now">
                <span className="pill now">
                  <span className="dot" />
                  Reproduciendo ahora
                </span>
                <div className="now-title" title={row.now_playing?.title || '—'}>
                  {row.now_playing?.title || '—'}
                </div>
              </div>

              <div className="qp__queue">
                <div className="pill ghost">En cola</div>
                {row.queue && row.queue.length ? (
                  <ol className="qp__queue__list">
                    {row.queue.map((v, idx) => (
                      <li key={v.id} title={v.title}>
                        <span className="num">{idx + 1}</span>
                        <span className="txt">{v.title}</span>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <div className="muted">—</div>
                )}
              </div>
            </section>
          ))}
        </div>
      )}
    </aside>
  );
}
