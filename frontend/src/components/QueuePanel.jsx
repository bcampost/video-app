import { useEffect, useMemo, useRef, useState } from 'react';
import http from '../api/http';
import { useToast } from '../ui/ToastProvider.jsx';
import '../styles/QueuePanel.css';

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

// normaliza id a number si es posible
const toNum = (v) => (v === null || v === undefined ? v : (isNaN(Number(v)) ? v : Number(v)));

const titleOf = (idOrObj, titleById) => {
  if (!idOrObj && idOrObj !== 0) return '—';
  if (typeof idOrObj === 'object' && (idOrObj.title || idOrObj.name)) {
    return idOrObj.title || idOrObj.name;
  }
  const id = typeof idOrObj === 'object' ? idOrObj.id : idOrObj;
  const nid = toNum(id);
  return titleById.get(nid) ?? `Video ${nid}`;
};

// Intenta devolver el objeto {id, title} del "now" desde múltiples variantes
const getNowEntry = (row, titleById) => {
  const candidatesObj = [
    row?.now_playing, row?.nowPlaying,
    row?.current, row?.playing,
  ].filter(Boolean);

  if (candidatesObj.length) {
    const obj = candidatesObj.find(x => x && (x.id ?? x.video_id ?? x.videoId) != null) || candidatesObj[0];
    const id = toNum(obj?.id ?? obj?.video_id ?? obj?.videoId);
    const title = (obj?.title || obj?.name) ?? titleOf(id, titleById);
    return (id != null) ? { id, title } : null;
  }

  // Si no vino objeto, buscar ids sueltos
  const candidatesId = [
    row?.now_playing_id, row?.nowPlayingId,
    row?.current_video_id, row?.playing_video_id,
    row?.heartbeat?.video_id,
  ].filter(v => v !== undefined && v !== null);

  const rawId = candidatesId.find(v => Number.isInteger(toNum(v)));
  if (rawId !== undefined) {
    const id = toNum(rawId);
    return { id, title: titleOf(id, titleById) };
  }

  return null;
};

function enrich(base, titleById) {
  const assignCache = loadAssignCache(); // {branchId: [videoIds...]}

  return base.map((item) => {
    const branch = item.branch;

    // Cola base del status
    const statusQueue = Array.isArray(item.queue) ? item.queue : [];
    const statusQueueMapped = statusQueue.map(v => {
      const id = toNum(v?.id ?? v?.video_id ?? v?.videoId);
      return { id, title: titleOf(v, titleById) };
    });

    // Mapa por id para lookup rápido
    const byId = new Map(statusQueueMapped.map(v => [v.id, v]));

    // Orden preferente por cache (si existe)
    const cached = assignCache?.[branch?.id];
    const ordered = Array.isArray(cached) && cached.length
      ? cached.map(id => {
          const nid = toNum(id);
          return byId.get(nid) || { id: nid, title: titleOf(nid, titleById) };
        })
      : statusQueueMapped;

    // Resolver "now" con prioridad a lo que venga del backend
    let now = getNowEntry(item, titleById);

    // Fallback: si no hay "now" en status, usa el primero visible de la cola ordenada
    if (!now && ordered.length > 0) {
      now = { id: ordered[0].id, title: ordered[0].title };
    }

    // Cola final = ordered sin el "now"
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

  // Auto refresh 5s
  useEffect(() => {
    mounted.current = true;
    const id = setInterval(() => setTick(t => t + 1), 5000);
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
        const map = new Map(vids.map(v => [toNum(v.id), (v.title ?? v.name ?? `Video ${v.id}`)]));
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
          <h3>En cola </h3>
        </div>
        <div className="qp__actions">
          <span className="qp__stamp" title="Última actualización">  {stamp}</span>
          <button className="btn-ghost qp__refresh" onClick={() => setTick(t => t + 1)} title="Refrescar">
            <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden><path fill="currentColor" d="M21 12a9 9 0 1 1-3-6.7V3h2v6h-6V7h3.7A7 7 0 1 0 19 12"/></svg>
            <span></span>
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
                  Live On
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
