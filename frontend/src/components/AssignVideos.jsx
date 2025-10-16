import { useEffect, useMemo, useRef, useState } from 'react';
import http from '../api/http';
import { useToast } from '../ui/ToastProvider.jsx';

/**
 * Grilla tipo Excel:
 * - Se muestran 4 columnas de sucursales a la vez; si hay más, aparece scroll horizontal.
 * - Caché local por sucursal para mantener checks si el backend tarda/falla.
 * - Acciones por sucursal: Todos / Ninguno / Invertir (solo sobre lo filtrado).
 * - Sin barras superiores ni botones flotantes.
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

export default function AssignVideos() {
  const toast = useToast();

  // Data
  const [branches, setBranches] = useState([]);
  const [videos, setVideos] = useState([]);
  const [queueStatus, setQueueStatus] = useState([]);
  const [filterVideo, setFilterVideo] = useState('');
  const [isSavingCell, setIsSavingCell] = useState(null);
  const [loading, setLoading] = useState(true);

  // Cache
  const cacheRef = useRef(loadCache());

  // Normalizador
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
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Asignados por sucursal
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

  // Render
  return (
    <div className="assign excel">
      <div className="assign__header">
        <div className="assign__title">
          <span className="assign__icon">📺</span>
          <h2>Asignar Videos a Sucursales</h2>
        </div>
        <p className="assign__subtitle">
          Se muestran 4 sucursales a la vez; desplázate horizontalmente para ver más.
        </p>
      </div>

      <div className="card">
        <div className="card__header row">
          <h3>🎞️ Videos disponibles</h3>
          <div className="input-wrap">
            <input
              type="text"
              placeholder="Buscar video por título…"
              value={filterVideo}
              onChange={(e) => setFilterVideo(e.target.value)}
            />
          </div>
          <button className="btn ghost" onClick={refreshQueueStatus}>Refrescar estado</button>
        </div>

        <div className="table-wrap table-wrap--excel">
          <table className="table table--excel">
            <thead>
              <tr>
                <th className="sticky-left">Video</th>
                {branches.map(b => {
                  const set = assignedByBranch.get(b.id) || new Set();
                  const total = set.size;
                  let inFilter = 0;
                  set.forEach(id => { if (filteredIdSet.has(id)) inFilter++; });
                  const hidden = Math.max(0, total - inFilter);

                  return (
                    <th key={b.id} title={b.code} className="branch-col">
                      <div className="th-top">
                        <div>{b.name} <span className="muted mono">({b.code})</span></div>
                        <div className="meta">
                          <span className="badge">Asignados: {total}</span>
                          <span className="badge ghost">En vista: {inFilter}/{filteredVideos.length}</span>
                          {hidden > 0 && <span className="badge danger">Ocultos: {hidden}</span>}
                        </div>
                      </div>
                      <div className="col-actions">
                        <button className="mini ghost" disabled={!!isSavingCell} onClick={() => setAllForBranch(b.id, 'all')}>Todos</button>
                        <button className="mini ghost" disabled={!!isSavingCell} onClick={() => setAllForBranch(b.id, 'none')}>Ninguno</button>
                        <button className="mini ghost" disabled={!!isSavingCell} onClick={() => invertForBranch(b.id)}>Invertir</button>
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td className="sticky-left" colSpan={1 + branches.length}>Cargando…</td></tr>
              ) : filteredVideos.length === 0 ? (
                <tr><td className="sticky-left" colSpan={1 + branches.length}>No hay videos para mostrar.</td></tr>
              ) : (
                filteredVideos.map(v => (
                  <tr key={v.id}>
                    <td className="sticky-left">{v.title}</td>
                    {branches.map(b => {
                      const checked = assignedByBranch.get(b.id)?.has(v.id) || false;
                      const saving = isSavingCell && isSavingCell.branchId === b.id && isSavingCell.videoId === v.id;
                      return (
                        <td key={`${b.id}-${v.id}`} className="cell-center">
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
        </div>
      </div>
    </div>
  );
}
