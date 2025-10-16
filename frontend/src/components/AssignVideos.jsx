import { useEffect, useMemo, useRef, useState } from 'react';
import http from '../api/http';
import { useToast } from '../ui/ToastProvider.jsx';
import '../styles/AssignVideos.css';

/**
 * Grilla tipo Excel (look pro):
 * - 4 sucursales visibles; si hay más, aparece scroll horizontal (solo barra personalizada).
 * - Acciones por sucursal (Todos / Ninguno / Invertir) solo sobre lo filtrado.
 * - Caché local por sucursal para mantener checks si el backend tarda/falla.
 * - Barra inferior personalizada + panorámica con drag e inercia.
 */

const CACHE_KEY = 'assign-grid-cache:v1';
const CACHE_TTL_MS = 10 * 60 * 1000;

function loadCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return { updatedAt: 0, branches: {} };
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : { updatedAt: 0, branches: {} };
  } catch { return { updatedAt: 0, branches: {} }; }
}
function saveCache(cache) { try { localStorage.setItem(CACHE_KEY, JSON.stringify(cache)); } catch {} }
const isExpired = (ts) => Date.now() - (ts || 0) > CACHE_TTL_MS;

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

export default function AssignVideos() {
  const toast = useToast();

  // Data
  const [branches, setBranches] = useState([]);
  const [videos, setVideos] = useState([]);
  const [queueStatus, setQueueStatus] = useState([]);

  // UI
  const [filterVideo, setFilterVideo] = useState('');
  const [isSavingCell, setIsSavingCell] = useState(null);
  const [loading, setLoading] = useState(true);

  // Cache
  const cacheRef = useRef(loadCache());

  // Scroll refs (contenedor + barra inferior)
  const wrapRef = useRef(null);
  const railRef = useRef(null);
  const railInnerRef = useRef(null);

  // Drag state de la barra inferior
  const railDrag = useRef({ active: false, startX: 0, startLeft: 0 });

  // Pan (drag para desplazar toda la tabla con inercia)
  const pan = useRef({
    active: false,
    lastX: 0,
    lastT: 0,
    vx: 0, // px/ms
    raf: null
  });

  // Carga inicial
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const [br, vd, qs] = await Promise.all([
          http.get('/branches'),
          http.get('/videos'),
          http.get('/branches/queue-status'),
        ]);
        const branchesR = norm(br);
        const videosR   = norm(vd);
        const qsR       = norm(qs);

        setBranches(branchesR);
        setVideos(videosR);

        // aplicar cache si no expiró
        let nextQS = qsR;
        if (!isExpired(cacheRef.current.updatedAt)) {
          const byId = new Map(qsR.map(r => [r?.branch?.id, r]));
          branchesR.forEach(b => { if (!byId.has(b.id)) byId.set(b.id, { branch: b, queue: [] }); });
          nextQS = Array.from(byId.values()).map(item => {
            const cached = cacheRef.current.branches?.[item?.branch?.id];
            if (!cached) return item;
            const set = new Set(cached);
            return {
              ...item,
              queue: Array.from(set).map(id => {
                const vv = videosR.find(v => v.id === id);
                return vv ? { id: vv.id, title: vv.title } : { id };
              })
            };
          });
        }
        setQueueStatus(nextQS);
      } catch (e) {
        console.error('[AssignVideos] init', e);
        toast.error('No se pudo cargar la información inicial', { title: 'Error' });
      } finally {
        setLoading(false);
        setTimeout(syncRailSize, 0);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Map: branchId -> Set(videoId)
  const assignedByBranch = useMemo(() => {
    const m = new Map();
    for (const row of queueStatus) {
      const bId = row?.branch?.id;
      const ids = new Set((row?.queue || []).map(v => v.id));
      m.set(bId, ids);
    }
    return m;
  }, [queueStatus]);

  // Filtrado
  const filteredVideos = useMemo(() => {
    const t = filterVideo.trim().toLowerCase();
    if (!t) return videos;
    return videos.filter(v => (v.title || '').toLowerCase().includes(t));
  }, [videos, filterVideo]);
  const filteredIdSet = useMemo(() => new Set(filteredVideos.map(v => v.id)), [filteredVideos]);

  // Cache helpers
  const writeCache = (branchId, idSet) => {
    const obj = cacheRef.current || { updatedAt: 0, branches: {} };
    obj.updatedAt = Date.now();
    (obj.branches ||= {})[branchId] = Array.from(idSet);
    cacheRef.current = obj;
    saveCache(obj);
  };

  // Refresh queue-status (mezclando cache para no rebotar UI)
  const refreshQueueStatus = async () => {
    try {
      const qsRes = await http.get('/branches/queue-status');
      const qs = norm(qsRes);
      const byId = new Map(qs.map(r => [r?.branch?.id, r]));
      branches.forEach(b => { if (!byId.has(b.id)) byId.set(b.id, { branch: b, queue: [] }); });
      let next = Array.from(byId.values());
      if (!isExpired(cacheRef.current.updatedAt)) {
        next = next.map(item => {
          const cached = cacheRef.current.branches?.[item?.branch?.id];
          if (!cached) return item;
          const set = new Set(cached);
          return {
            ...item,
            queue: Array.from(set).map(id => {
              const vv = videos.find(v => v.id === id);
              return vv ? { id: vv.id, title: vv.title } : { id };
            })
          };
        });
      }
      setQueueStatus(next);
      syncRailSize();
    } catch (e) {
      console.error('[AssignVideos] refresh', e);
    }
  };

  // Toggle celda
  const toggleCell = async ({ videoId, branchId, nextChecked }) => {
    const current = new Set(assignedByBranch.get(branchId) || []);
    if (nextChecked) current.add(videoId); else current.delete(videoId);

    // Optimismo + cache
    writeCache(branchId, current);
    setQueueStatus(prev => {
      const copy = [...prev];
      const idx = copy.findIndex(r => r.branch?.id === branchId);
      const mapped = Array.from(current).map(id => {
        const vv = videos.find(v => v.id === id);
        return vv ? { id: vv.id, title: vv.title } : { id };
      });
      if (idx >= 0) copy[idx] = { ...copy[idx], queue: mapped };
      else {
        const branch = branches.find(b => b.id === branchId) || { id: branchId, name: `Sucursal ${branchId}`, code: `B-${branchId}` };
        copy.push({ branch, queue: mapped });
      }
      return copy;
    });

    try {
      setIsSavingCell({ branchId, videoId });
      await http.post(`/branches/${branchId}/videos`, { video_ids: Array.from(current) });
      await refreshQueueStatus();
    } catch (e) {
      console.error('[AssignVideos] toggle', e);
      toast.error(e?.response?.data?.message || 'No se pudo actualizar la asignación', { title: 'Error' });
    } finally {
      setIsSavingCell(null);
    }
  };

  // Masivos (solo visibles)
  const setAllForBranch = async (branchId, mode) => {
    const base = new Set(assignedByBranch.get(branchId) || []);
    if (mode === 'all') filteredVideos.forEach(v => base.add(v.id));
    else filteredVideos.forEach(v => base.delete(v.id));

    writeCache(branchId, base);
    setQueueStatus(prev => {
      const mapped = Array.from(base).map(id => {
        const vv = videos.find(v => v.id === id);
        return vv ? { id: vv.id, title: vv.title } : { id };
      });
      const copy = [...prev];
      const idx = copy.findIndex(r => r.branch?.id === branchId);
      if (idx >= 0) copy[idx] = { ...copy[idx], queue: mapped };
      else copy.push({ branch: branches.find(b => b.id === branchId), queue: mapped });
      return copy;
    });

    try {
      setIsSavingCell({ branchId, videoId: -1 });
      await http.post(`/branches/${branchId}/videos`, { video_ids: Array.from(base) });
      await refreshQueueStatus();
    } catch (e) {
      console.error('[AssignVideos] setAll', e);
      toast.error('No se pudo completar la acción masiva', { title: 'Error' });
    } finally {
      setIsSavingCell(null);
    }
  };

  const invertForBranch = async (branchId) => {
    const base = new Set(assignedByBranch.get(branchId) || []);
    filteredVideos.forEach(v => base.has(v.id) ? base.delete(v.id) : base.add(v.id));

    writeCache(branchId, base);
    setQueueStatus(prev => {
      const mapped = Array.from(base).map(id => {
        const vv = videos.find(v => v.id === id);
        return vv ? { id: vv.id, title: vv.title } : { id };
      });
      const copy = [...prev];
      const idx = copy.findIndex(r => r.branch?.id === branchId);
      if (idx >= 0) copy[idx] = { ...copy[idx], queue: mapped };
      else copy.push({ branch: branches.find(b => b.id === branchId), queue: mapped });
      return copy;
    });

    try {
      setIsSavingCell({ branchId, videoId: -2 });
      await http.post(`/branches/${branchId}/videos`, { video_ids: Array.from(base) });
      await refreshQueueStatus();
    } catch (e) {
      console.error('[AssignVideos] invert', e);
      toast.error('No se pudo invertir la selección', { title: 'Error' });
    } finally {
      setIsSavingCell(null);
    }
  };

  /* ====== Barra inferior personalizada (scroll sync + drag extendido) ====== */
  const syncRailSize = () => {
    const wrap = wrapRef.current;
    const rail = railRef.current;
    const inner = railInnerRef.current;
    if (!wrap || !rail || !inner) return;
    inner.style.width = `${wrap.scrollWidth}px`;
    rail.scrollLeft = wrap.scrollLeft;
  };

  useEffect(() => {
    const wrap = wrapRef.current;
    const rail = railRef.current;
    if (!wrap || !rail) return;

    const onWrapScroll = () => { rail.scrollLeft = wrap.scrollLeft; };
    const onRailScroll = () => { wrap.scrollLeft = rail.scrollLeft; };

    wrap.addEventListener('scroll', onWrapScroll, { passive: true });
    rail.addEventListener('scroll', onRailScroll, { passive: true });

    const ro = new ResizeObserver(syncRailSize);
    ro.observe(wrap);
    setTimeout(syncRailSize, 0);

    // Drag extendido sobre el rail
    const onMouseDown = (e) => {
      railDrag.current = { active: true, startX: e.clientX, startLeft: rail.scrollLeft };
      document.body.classList.add('dragging-hrail');
    };
    const onMouseMove = (e) => {
      if (!railDrag.current.active) return;
      const dx = e.clientX - railDrag.current.startX;
      rail.scrollLeft = railDrag.current.startLeft + dx; // sincroniza al wrap via onRailScroll
    };
    const onMouseUp = () => {
      if (!railDrag.current.active) return;
      railDrag.current.active = false;
      document.body.classList.remove('dragging-hrail');
    };

    rail.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    // Shift + rueda => desplazamiento horizontal
    const onWheel = (e) => {
      if (e.shiftKey) {
        wrap.scrollLeft += e.deltaY;
        e.preventDefault();
      }
    };
    wrap.addEventListener('wheel', onWheel, { passive: false });

    // Panorámica con drag sobre toda el área (con inercia)
    const onPanDown = (e) => {
      const t = e.target;
      if (t.closest('label') || t.tagName === 'INPUT' || t.tagName === 'BUTTON') return;
      pan.current.active = true;
      pan.current.lastX = e.clientX;
      pan.current.lastT = performance.now();
      pan.current.vx = 0;
      document.body.classList.add('panning-x');
    };
    const onPanMove = (e) => {
      if (!pan.current.active) return;
      const now = performance.now();
      const dx = e.clientX - pan.current.lastX;
      wrap.scrollLeft -= dx;
      const dt = Math.max(1, now - pan.current.lastT);
      pan.current.vx = (dx / dt);
      pan.current.lastX = e.clientX;
      pan.current.lastT = now;
    };
    const stopInertia = () => {
      if (pan.current.raf) {
        cancelAnimationFrame(pan.current.raf);
        pan.current.raf = null;
      }
    };
    const inertiaStep = () => {
      const w = wrapRef.current;
      if (!w) return;
      pan.current.vx *= 0.95;
      if (Math.abs(pan.current.vx) < 0.01) { pan.current.vx = 0; pan.current.raf = null; return; }
      w.scrollLeft -= pan.current.vx * 16;
      pan.current.raf = requestAnimationFrame(inertiaStep);
    };
    const onPanUp = () => {
      if (!pan.current.active) return;
      pan.current.active = false;
      document.body.classList.remove('panning-x');
      stopInertia();
      if (Math.abs(pan.current.vx) > 0.02) {
        pan.current.raf = requestAnimationFrame(inertiaStep);
      }
    };

    wrap.addEventListener('mousedown', onPanDown);
    window.addEventListener('mousemove', onPanMove);
    window.addEventListener('mouseup', onPanUp);

    return () => {
      wrap.removeEventListener('scroll', onWrapScroll);
      rail.removeEventListener('scroll', onRailScroll);
      rail.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      wrap.removeEventListener('wheel', onWheel);
      wrap.removeEventListener('mousedown', onPanDown);
      window.removeEventListener('mousemove', onPanMove);
      window.removeEventListener('mouseup', onPanUp);
      stopInertia();
      ro.disconnect();
    };
  }, []);

  return (
    <div className="assign pro">
      <div className="assign__header">
        <div className="assign__title">
          <svg width="26" height="26" viewBox="0 0 24 24" className="assign__icon" aria-hidden>
            <path fill="currentColor" d="M3 5h18v2H3zm2 4h14l3 4v6H2v-6l3-4zm1 2-2 3v3h16v-3l-2-3H6z"/>
          </svg>
          <h2>Asignar Videos a Sucursales</h2>
        </div>
        <p className="assign__subtitle">
          Se muestran 4 sucursales a la vez — desplázate horizontalmente para ver más. Marca/desmarca para agregar o quitar.
        </p>
      </div>

      <div className="card">
        <div className="card__header row">
          <div className="left">
            <h3>🎞️ Videos disponibles</h3>
            <span className="hint">Filtra por título</span>
          </div>
          <div className="right">
            <div className="input-wrap">
              <input
                type="text"
                placeholder="Buscar video por título…"
                value={filterVideo}
                onChange={(e) => setFilterVideo(e.target.value)}
              />
            </div>
            <button className="btn-ghost" onClick={refreshQueueStatus}>Refrescar estado</button>
          </div>
        </div>

        {/* Contenedor con solo scroll vertical; horizontal lo maneja el rail */}
        <div className="table-wrap table-wrap--excel" ref={wrapRef}>
          <table className="table table--excel">
            <thead>
              <tr>
                <th className="sticky-left th-video">
                  <div className="th-video-title">Video</div>
                </th>

                {branches.map(b => {
                  const set = assignedByBranch.get(b.id) || new Set();
                  const total = set.size;
                  let inFilter = 0;
                  set.forEach(id => { if (filteredIdSet.has(id)) inFilter++; });
                  const hidden = Math.max(0, total - inFilter);

                  return (
                    <th key={b.id} className="branch-col">
                      <div className="th-card">
                        <div className="th-card__head">
                          <div className="th-circle">{(b.name || '?').charAt(0)}</div>
                          <div className="th-meta">
                            <strong>{b.name}</strong>
                            <span className="code">({b.code})</span>
                          </div>
                        </div>

                        <div className="th-badges">
                          <span className="badge">Asignados: {total}</span>
                          <span className="badge ghost">En vista: {inFilter}/{filteredVideos.length}</span>
                          {hidden > 0 && <span className="badge danger">Ocultos: {hidden}</span>}
                        </div>

                        <div className="col-actions">
                          <button className="pill ghost" disabled={!!isSavingCell} onClick={() => setAllForBranch(b.id, 'all')}>Todos</button>
                          <button className="pill ghost" disabled={!!isSavingCell} onClick={() => setAllForBranch(b.id, 'none')}>Ninguno</button>
                          <button className="pill ghost" disabled={!!isSavingCell} onClick={() => invertForBranch(b.id)}>Invertir</button>
                        </div>
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td className="sticky-left" colSpan={1 + branches.length}>
                    <div className="sk-row" />
                    <div className="sk-row" />
                    <div className="sk-row" />
                  </td>
                </tr>
              ) : filteredVideos.length === 0 ? (
                <tr>
                  <td className="sticky-left" colSpan={1 + branches.length}>
                    <div className="empty">No hay videos para mostrar.</div>
                  </td>
                </tr>
              ) : (
                filteredVideos.map(v => (
                  <tr key={v.id}>
                    <td className="sticky-left video-title" title={v.title}>
                      {v.title}
                    </td>

                    {branches.map(b => {
                      const checked = assignedByBranch.get(b.id)?.has(v.id) || false;
                      const saving = isSavingCell && isSavingCell.branchId === b.id && isSavingCell.videoId === v.id;
                      return (
                        <td key={`${b.id}-${v.id}`} className="cell-center branch-cell">
                          <label className={`chk ${saving ? 'is-loading' : ''}`}>
                            <input
                              type="checkbox"
                              checked={checked}
                              disabled={!!isSavingCell}
                              onChange={(e) => toggleCell({ videoId: v.id, branchId: b.id, nextChecked: e.target.checked })}
                            />
                            <span className="box" />
                          </label>
                        </td>
                      );
                    })}
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {/* Barra inferior personalizada (única barra horizontal) */}
          <div className="hscroll-rail-bottom" ref={railRef} aria-label="Desplazamiento horizontal">
            <div ref={railInnerRef} />
          </div>
        </div>
      </div>
    </div>
  );
}
