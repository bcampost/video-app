// src/components/VideoManager.jsx
import { useEffect, useState } from 'react';
import http from '../api/http';
import { useToast } from '../ui/ToastProvider.jsx';
import PromptModal from '../ui/PromptModal.jsx';
import React from 'react';

export default function VideoManager() {
  const [videos, setVideos] = useState([]);
  const [title, setTitle] = useState('');
  const [file, setFile] = useState(null);

  const [openEdit, setOpenEdit] = useState(false);
  const [editingVideo, setEditingVideo] = useState(null);

  const toast = useToast();

  useEffect(() => { fetchVideos(); }, []);

  const fetchVideos = async () => {
    try {
      const res = await http.get('/videos');
      const payload = res?.data ?? [];
      const list = Array.isArray(payload)
        ? payload
        : (Array.isArray(payload.data) ? payload.data : []);
      setVideos(list);
    } catch (err) {
      console.error('Error al cargar videos:', err);
      toast.error('No se pudieron cargar los videos', { title: 'Error' });
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!title || !file) {
      toast.warn('Completa el título y selecciona un archivo de video.', { title: 'Campos incompletos' });
      return;
    }

    const allowed = ['video/mp4','video/webm','video/ogg','video/quicktime','video/x-msvideo','video/x-matroska'];
    if (!allowed.includes(file.type)) {
      toast.warn('Solo se permiten MP4, WEBM, OGG, MOV, AVI o MKV.', { title: 'Formato no permitido' });
      return;
    }

    const formData = new FormData();
    formData.append('title', title);
    formData.append('video', file);

    const loadingId = toast.info('Subiendo video...', { title: 'Procesando', duration: 20000 });

    try {
      await http.post('/videos', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.remove(loadingId);
      toast.success('Video subido correctamente', { title: 'Listo' });
      setTitle(''); setFile(null);
      fetchVideos();
    } catch (err) {
      toast.remove(loadingId);
      console.error('Error al subir el video:', err);
      const data = err?.response?.data;
      const msg = data?.message || 'Revisa tu conexión o el formato del archivo e inténtalo nuevamente.';
      toast.error(msg, { title: 'No se pudo subir' });
    }
  };

  const handleDelete = async (video) => {
    try {
      await http.delete(`/videos/${video.id}`);
      toast.success('Video eliminado', { title: 'Listo' });
      fetchVideos();
    } catch (err) {
      console.error('Error al eliminar video:', err);
      toast.error('No se pudo eliminar. Inténtalo más tarde.', { title: 'Error' });
    }
  };

  const openRename = (video) => {
    setEditingVideo(video);
    setOpenEdit(true);
  };

  const handleModalClose = async (newTitleOrNull) => {
    setOpenEdit(false);
    if (!editingVideo) return;

    if (newTitleOrNull && newTitleOrNull !== editingVideo.title) {
      try {
        await http.put(`/videos/${editingVideo.id}`, { title: newTitleOrNull });
        toast.success('Título actualizado', { title: 'Listo' });
        fetchVideos();
      } catch (err) {
        console.error('Error al actualizar título:', err);
        toast.error('No se pudo actualizar el título', { title: 'Error' });
      }
    }

    setEditingVideo(null);
  };

  return (
    <div>
      <h2>Gestión de Videos</h2>

      <form onSubmit={handleUpload} style={{ display: 'grid', gap: 10, maxWidth: 560 }}>
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
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          required
        />
        <button type="submit">Subir Video</button>
      </form>

      <p style={{ marginTop: 10, color: 'var(--muted, #9fb4c3)' }}>
        Tip: La asignación de videos a sucursales se realiza en <strong>“Asignar Videos”</strong>.
      </p>

      <h3>📋 Listado de Videos</h3>

      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={{ textAlign: 'left', padding: '8px 6px' }}>Título</th>
            <th style={{ textAlign: 'left', padding: '8px 6px' }}>Sucursales</th>
            <th style={{ padding: '8px 6px' }}>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {videos.length === 0 && (
            <tr>
              <td colSpan="3" style={{ padding: 10, color: 'var(--muted, #9fb4c3)' }}>
                No hay videos subidos.
              </td>
            </tr>
          )}
          {videos.map((video) => (
            <tr key={video.id}>
              <td style={{ padding: '8px 6px' }}>{video.title}</td>
              <td style={{ padding: '8px 6px' }}>
                {Array.isArray(video.branches) && video.branches.length > 0
                  ? video.branches.map((b) => `${b.name} (${b.code})`).join(', ')
                  : 'No asignado'}
              </td>
              <td style={{ padding: '8px 6px', whiteSpace: 'nowrap' }}>
                <button className="btn-edit" onClick={() => openRename(video)} style={{ marginRight: 8 }}>
                  ✏️ Editar
                </button>
                <button className="btn-delete" onClick={() => handleDelete(video)}>🗑️ Eliminar</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <PromptModal
        open={openEdit}
        title="Editar video"
        label="Nuevo título del video:"
        initialValue={editingVideo?.title || ''}
        confirmText="Guardar"
        cancelText="Cancelar"
        onClose={handleModalClose}
      />
    </div>
  );
}
