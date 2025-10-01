import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { useToast } from '../ui/ToastProvider.jsx';

const API = 'http://127.0.0.1:8000/api';

export default function AssignVideos() {
  const [branches, setBranches] = useState([]);
  const [videos, setVideos] = useState([]);
  const [branchId, setBranchId] = useState('');
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const toast = useToast();

  const token = localStorage.getItem('auth_token');
  const headers = useMemo(
    () => (token ? { Authorization: `Bearer ${token}` } : {}),
    [token]
  );

  // Carga inicial: sucursales + videos
  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [bRes, vRes] = await Promise.all([
          axios.get(`${API}/branches`, { headers }),
          axios.get(`${API}/videos`, { headers }),
        ]);
        const b = Array.isArray(bRes.data) ? bRes.data : [];
        const v = Array.isArray(vRes.data) ? vRes.data : [];
        if (!mounted) return;
        setBranches(b);
        setVideos(v);
        // selecciona primera sucursal por defecto
        if (b.length > 0) setBranchId(String(b[0].id));
      } catch (err) {
        console.error('Error inicial AssignVideos:', err);
        if (mounted) setError('No se pudieron cargar sucursales o videos.');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [headers]);

  // Deriva los asignados a partir de videos.branches
  useEffect(() => {
    if (!branchId) return;
    const branch = branches.find(x => String(x.id) === String(branchId));
    if (!branch) return;

    const byThisBranch = (v) => {
      // v.branches puede ser array de objetos {id, code, name}
      if (!Array.isArray(v.branches)) return false;
      const idMatch = v.branches.some(b => String(b.id) === String(branch.id));
      const codeMatch = branch.code
        ? v.branches.some(b => String(b.code) === String(branch.code))
        : false;
      return idMatch || codeMatch;
    };

    const assigned = videos.filter(byThisBranch).map(v => v.id);
    setSelectedIds(new Set(assigned));
  }, [branchId, branches, videos]);

  const toggle = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

const handleSave = async () => {
  if (!branchId) return;

  const video_ids = Array.from(selectedIds);
  const saving = toast.info('Guardando asignación...', {
    title: 'Procesando',
    duration: 20000,
  });

  try {
    // ✅ Usa tu endpoint real por ID de sucursal
    await axios.post(
      `${API}/branch/${branchId}/assign-videos`,
      { video_ids },
      { headers } // Authorization: Bearer <token>
    );

    toast.remove(saving);
    toast.success('Asignación guardada', { title: 'Listo' });

    // Refresca el catálogo; tu efecto que deriva "selectedIds" desde videos.branches
    // se volverá a ejecutar y actualizará los checks automáticamente.
    const vRes = await axios.get(`${API}/videos`, { headers });
    const v = Array.isArray(vRes.data) ? vRes.data : [];
    setVideos(v);
  } catch (err) {
    console.error('Error al guardar asignación:', err);
    toast.remove(saving);
    const msg =
      err?.response?.data?.message ||
      (err?.response?.status === 401
        ? 'Sesión expirada. Vuelve a iniciar sesión.'
        : 'No se pudo guardar la asignación');
    toast.error(msg, { title: 'Error' });
  }
};



  return (
    <div>
      <h2>📺 Asignar Videos a una Sucursal</h2>

      {loading ? (
        <p>Cargando…</p>
      ) : error ? (
        <p className="error">{error}</p>
      ) : (
        <>
          <div style={{ marginBottom: 12 }}>
            <label htmlFor="branch">Sucursal:&nbsp;</label>
            <select
              id="branch"
              value={branchId}
              onChange={(e) => setBranchId(e.target.value)}
            >
              {branches.map(b => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.code})
                </option>
              ))}
            </select>
          </div>

          <div>
            <h3>Videos disponibles:</h3>
            <ul style={{ listStyle: 'none', paddingLeft: 0 }}>
              {videos.map(v => (
                <li key={v.id} style={{ margin: '6px 0' }}>
                  <label style={{ cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={selectedIds.has(v.id)}
                      onChange={() => toggle(v.id)}
                      style={{ marginRight: 8 }}
                    />
                    {v.title}
                  </label>
                </li>
              ))}
            </ul>
          </div>

          <button onClick={handleSave} style={{ marginTop: 12 }}>
            Guardar asignación
          </button>
        </>
      )}
    </div>
  );
}
