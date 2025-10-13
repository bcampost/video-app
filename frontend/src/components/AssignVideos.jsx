import { useEffect, useMemo, useState } from 'react';
import http from '../api/http';
import { useToast } from '../ui/ToastProvider.jsx';

export default function AssignVideos() {
  const toast = useToast();

  // datos
  const [branches, setBranches] = useState([]);
  const [videos, setVideos] = useState([]);
  const [queueStatus, setQueueStatus] = useState([]); // [{branch:{id,...}, queue:[...]}]

  // ui / selección
  const [selectedBranchId, setSelectedBranchId] = useState(null);
  const [selected, setSelected] = useState(new Set()); // ids de videos seleccionados
  const [filterBranch, setFilterBranch] = useState('');
  const [filterVideo, setFilterVideo] = useState('');

  // normalizador de respuestas {data:[...]} o [...]
  const normalize = (res) => {
    if (Array.isArray(res?.data)) return res.data;
    if (Array.isArray(res?.data?.data)) return res.data.data;
    return [];
  };

  // carga inicial
  useEffect(() => {
    (async () => {
      try {
        const [brRes, vdRes, qsRes] = await Promise.all([
          http.get('/branches'),
          http.get('/videos'),
          http.get('/branches/queue-status'),
        ]);
        setBranches(normalize(brRes));
        setVideos(normalize(vdRes));
        setQueueStatus(normalize(qsRes));
      } catch (e) {
        console.error('[AssignVideos] init load', e);
        toast.error('No se pudo cargar la información inicial', { title: 'Error' });
      }
    })();
  }, []);

  // cuando cambie la sucursal seleccionada, hidratar selección desde queue-status
  useEffect(() => {
    if (!selectedBranchId) { setSelected(new Set()); return; }
    const row = queueStatus.find(r => r.branch?.id === selectedBranchId);
    const ids = new Set((row?.queue || []).map(v => v.id));
    setSelected(ids);
  }, [selectedBranchId, queueStatus]);

  // helpers UI
  const filteredBranches = useMemo(() => {
    const term = filterBranch.trim().toLowerCase();
    const list = Array.isArray(branches) ? branches : [];
    if (!term) return list;
    return list.filter(b =>
      (b.name || '').toLowerCase().includes(term) ||
      (b.code || '').toLowerCase().includes(term)
    );
  }, [branches, filterBranch]);

  const filteredVideos = useMemo(() => {
    const term = filterVideo.trim().toLowerCase();
    const list = Array.isArray(videos) ? videos : [];
    if (!term) return list;
    return list.filter(v => (v.title || '').toLowerCase().includes(term));
  }, [videos, filterVideo]);

  const assignedCountByBranch = useMemo(() => {
    const map = new Map();
    queueStatus.forEach(r => map.set(r.branch?.id, (r.queue || []).length));
    return map;
  }, [queueStatus]);

  // acciones de selección
  const toggleVideo = (id) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const selectAll = () => setSelected(new Set(filteredVideos.map(v => v.id)));
  const clearAll = () => setSelected(new Set());

  // guardar asignación (ajusta la ruta a tu controlador si usas otra)
  const saveAssignment = async () => {
    if (!selectedBranchId) {
      toast.warn('Selecciona una sucursal primero', { title: 'Falta selección' });
      return;
    }
    try {
      // Si tu endpoint es otro, cámbialo aquí:
      // Ejemplo 1 (REST): POST /branches/{id}/videos  { video_ids: [...] }
      // Ejemplo 2 (custom): POST /assign-videos { branch_id, video_ids }
      await http.post(`/branches/${selectedBranchId}/videos`, {
        video_ids: Array.from(selected),
      });
      toast.success('Asignación guardada', { title: 'Listo' });

      // refrescar queue-status para ver los cambios en el panel y contador
      const qsRes = await http.get('/branches/queue-status');
      setQueueStatus(normalize(qsRes));
    } catch (e) {
      console.error('[AssignVideos] save', e);
      const msg = e?.response?.data?.message || 'No se pudo guardar la asignación';
      toast.error(msg, { title: 'Error' });
    }
  };

  return (
    <div className="assign-container">
      <h2>📺 Asignar Videos a una Sucursal</h2>
      <p>
        Selecciona una sucursal del listado y marca los videos que deben reproducirse en ella.
        También puedes quitar videos desde aquí.
      </p>

      <div className="grid" style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: 16 }}>
        {/* Sucursales */}
        <div className="panel">
          <div className="panel-header">
            <span>📂 Sucursales</span>
            <input
              placeholder="Buscar sucursal por nombre o código..."
              value={filterBranch}
              onChange={(e) => setFilterBranch(e.target.value)}
              className="input"
            />
          </div>

          <table className="admin-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', padding: '8px' }}>Sucursal</th>
                <th style={{ textAlign: 'left', padding: '8px' }}>Código</th>
                <th style={{ textAlign: 'left', padding: '8px' }}>Asignados</th>
              </tr>
            </thead>
            <tbody>
              {filteredBranches.length === 0 ? (
                <tr><td colSpan={3} style={{ padding: 10, color: '#9fb4c3' }}>No hay resultados</td></tr>
              ) : filteredBranches.map(b => (
                <tr
                  key={b.id}
                  className={selectedBranchId === b.id ? 'row-active' : ''}
                  onClick={() => setSelectedBranchId(b.id)}
                  style={{ cursor: 'pointer', borderTop: '1px solid rgba(255,255,255,.06)' }}
                >
                  <td style={{ padding: '8px' }}>{b.name}</td>
                  <td style={{ padding: '8px' }}>{b.code}</td>
                  <td style={{ padding: '8px' }}>{assignedCountByBranch.get(b.id) ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Videos */}
        <div className="panel">
          <div className="panel-header" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span>🎞️ Videos disponibles</span>
            <input
              placeholder="Buscar video por título..."
              value={filterVideo}
              onChange={(e) => setFilterVideo(e.target.value)}
              className="input"
            />
          </div>

          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
            <span style={{ opacity: .8 }}>
              {selectedBranchId ? 'Sucursal seleccionada' : 'Selecciona una sucursal'}
            </span>
            <span style={{ marginLeft: 'auto', opacity: .8 }}>Seleccionados: {selected.size}</span>
            <button className="btn-small" onClick={selectAll}>Seleccionar todo</button>
            <button className="btn-small" onClick={clearAll}>Quitar todo</button>
            <button className="btn-green" onClick={saveAssignment} disabled={!selectedBranchId}>
              Guardar asignación
            </button>
          </div>

          <table className="admin-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', padding: '8px' }}>Título</th>
                <th style={{ padding: '8px', width: 140 }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredVideos.length === 0 ? (
                <tr><td colSpan={2} style={{ padding: 10, color: '#9fb4c3' }}>
                  No hay videos que coincidan con la búsqueda.
                </td></tr>
              ) : filteredVideos.map(v => {
                const checked = selected.has(v.id);
                return (
                  <tr key={v.id} style={{ borderTop: '1px solid rgba(255,255,255,.06)' }}>
                    <td style={{ padding: '8px' }}>{v.title}</td>
                    <td style={{ padding: '8px' }}>
                      <button
                        className={checked ? 'btn-secondary' : 'btn-primary'}
                        onClick={() => toggleVideo(v.id)}
                      >
                        {checked ? 'Quitar' : 'Agregar'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <style>{`
        .panel { background: var(--panel, #15232f); padding: 12px; border-radius: 10px; }
        .panel-header { display:flex; gap:8px; align-items:center; margin-bottom:8px; }
        .input { flex:1; padding:8px; border-radius:8px; border:1px solid var(--line,#2e3b47); background:#0f1a23; color:#e8f0f7; }
        .btn-small { padding:6px 8px; border-radius:8px; border:0; background:#2e4764; color:#fff; }
        .btn-green { padding:8px 10px; border-radius:8px; border:0; background:#2b8a3e; color:#fff; font-weight:600; }
        .btn-primary { padding:6px 10px; border-radius:8px; border:0; background:#4c89ff; color:#fff; }
        .btn-secondary { padding:6px 10px; border-radius:8px; border:0; background:#5b6b7a; color:#fff; }
        .row-active { background: rgba(76,137,255,.12); }
      `}</style>
    </div>
  );
}
