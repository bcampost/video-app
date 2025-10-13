// src/components/VideoList.jsx
import { useEffect, useState } from 'react';
import http from '../api/http';

export default function VideoList() {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const res = await http.get('/videos');
      setVideos(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('[VideoList] load:', err);
      alert('No se pudo cargar el listado de videos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const remove = async (video) => {
    const ok = confirm(`¿Eliminar el video “${video.title}”?`);
    if (!ok) return;

    try {
      await http.delete(`/videos/${video.id}`);
      load();
    } catch (err) {
      console.error('[VideoList] remove:', err);
      alert('No se pudo eliminar el video');
    }
  };

  return (
    <div>
      <h2>Listado de Videos</h2>
      {loading ? (
        <p>Cargando…</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Título</th>
              <th>Sucursales</th>
              <th style={{ width: 160 }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {videos.length === 0 ? (
              <tr>
                <td colSpan="3">No hay videos subidos.</td>
              </tr>
            ) : (
              videos.map((v) => (
                <tr key={v.id}>
                  <td>{v.title}</td>
                  <td>
                    {Array.isArray(v.branches) && v.branches.length > 0
                      ? v.branches.map((b) => `${b.name} (${b.code})`).join(', ')
                      : 'No asignado'}
                  </td>
                  <td>
                    <button className="btn-delete" onClick={() => remove(v)}>
                      🗑️ Eliminar
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}
