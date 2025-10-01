import { useEffect, useState } from 'react';
import axios from 'axios';
import { useToast } from '../ui/ToastProvider.jsx';
import ConfirmDialog from '../ui/ConfirmDialog.jsx';

export default function VideoManager() {
  const [videos, setVideos] = useState([]);
  const [title, setTitle] = useState('');
  const [file, setFile] = useState(null);
  const [branches, setBranches] = useState([]);
  const [selectedBranchCode, setSelectedBranchCode] = useState('');
  const [uploading, setUploading] = useState(false);

  // Estado para el confirm "profesional"
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(null); // { id, title? }

  const toast = useToast();

  useEffect(() => {
    fetchVideos();
    fetchBranches();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getToken = () => localStorage.getItem('auth_token');

  const fetchVideos = async () => {
    try {
      const res = await axios.get('http://127.0.0.1:8000/api/videos', {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      setVideos(res.data || []);
    } catch (err) {
      console.error('Error al cargar videos:', err);
      toast.error('No se pudieron cargar los videos', { title: 'Error' });
    }
  };

  const fetchBranches = async () => {
    try {
      const res = await axios.get('http://127.0.0.1:8000/api/branches', {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      setBranches(res.data || []);
    } catch (err) {
      console.error('Error al cargar sucursales:', err);
      toast.error('No se pudieron cargar las sucursales', { title: 'Error' });
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();

    if (!title || !file || !selectedBranchCode) {
      toast.info('Completa todos los campos requeridos', { title: 'Campos incompletos' });
      return;
    }

    const formData = new FormData();
    formData.append('title', title);
    formData.append('video', file);               // 👈 campo del backend actual
    formData.append('branch_code', selectedBranchCode);

    setUploading(true);
    const inProgressId = toast.info('Subiendo video...', { title: 'Subiendo', duration: 60000 });

    try {
      await axios.post('http://127.0.0.1:8000/api/videos', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${getToken()}`,
        },
      });

      toast.remove(inProgressId);
      toast.success('Video subido correctamente', { title: '¡Listo!' });

      setTitle('');
      setFile(null);
      setSelectedBranchCode('');
      fetchVideos();
    } catch (err) {
      console.error('Error al subir el video:', err);
      toast.remove(inProgressId);
      const msg = err?.response?.data?.message || 'No se pudo subir el video';
      toast.error(msg, { title: 'Error' });
    } finally {
      setUploading(false);
    }
  };

  // Abre el confirm “pro”
  const handleAskDelete = (video) => {
    setPendingDelete({ id: video.id, title: video.title });
    setConfirmOpen(true);
  };

  // Ejecuta el delete tras confirmar
  const handleConfirmDelete = async () => {
    if (!pendingDelete) return;
    const { id, title } = pendingDelete;

    const inProgressId = toast.info('Eliminando...', { title: 'Procesando', duration: 20000 });

    try {
      await axios.delete(`http://127.0.0.1:8000/api/videos/${id}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      toast.remove(inProgressId);
      toast.success(`"${title || 'Video'}" eliminado`, { title: 'Hecho' });
      setConfirmOpen(false);
      setPendingDelete(null);
      fetchVideos();
    } catch (err) {
      console.error('Error al eliminar video:', err);
      toast.remove(inProgressId);
      toast.error('No se pudo eliminar el video', { title: 'Error' });
    }
  };

  const handleCancelDelete = () => {
    setConfirmOpen(false);
    setPendingDelete(null);
  };

  const handleEdit = () => {
    toast.info('Función de edición aún no implementada', { title: 'Próximamente' });
  };

  return (
    <div>
      <h2>Gestión de Videos</h2>

      <form onSubmit={handleUpload}>
        <input
          type="text"
          placeholder="Título del video"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
        <input
          type="file"
          accept="video/*"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          required
        />
        <select
          value={selectedBranchCode}
          onChange={(e) => setSelectedBranchCode(e.target.value)}
          required
        >
          <option value="">Selecciona una sucursal</option>
          {branches.map((branch) => (
            <option key={branch.id} value={branch.code}>
              {branch.name} ({branch.code})
            </option>
          ))}
        </select>
        <button type="submit" disabled={uploading}>
          {uploading ? 'Subiendo…' : 'Subir Video'}
        </button>
      </form>

      <h3>📋 Listado de Videos</h3>

      <table>
        <thead>
          <tr>
            <th>Título</th>
            <th>Sucursales</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {videos.length === 0 && (
            <tr>
              <td colSpan="3">No hay videos subidos.</td>
            </tr>
          )}
          {videos.map((video) => (
            <tr key={video.id}>
              <td>{video.title}</td>
              <td>
                {video.branches && video.branches.length > 0
                  ? video.branches.map((b) => `${b.name} (${b.code})`).join(', ')
                  : 'No asignado'}
              </td>
              <td>
                <button className="btn-edit" onClick={handleEdit}>
                  ✏️ Editar
                </button>{' '}
                <button className="btn-delete" onClick={() => handleAskDelete(video)}>
                  🗑️ Eliminar
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Diálogo de confirmación profesional */}
      <ConfirmDialog
        open={confirmOpen}
        title="Eliminar video"
        message={
          pendingDelete?.title
            ? `¿Seguro que deseas eliminar "${pendingDelete.title}"?`
            : '¿Seguro que deseas eliminar este video?'
        }
        confirmText="Eliminar"
        cancelText="Cancelar"
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
      />
    </div>
  );
}
