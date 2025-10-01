import { useEffect, useState } from 'react';
import axios from 'axios';

const VideoList = () => {
  const [videos, setVideos] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [newTitle, setNewTitle] = useState('');
  const token = localStorage.getItem('auth_token');

  const fetchVideos = () => {
    axios.get('http://127.0.0.1:8000/api/videos', {
      headers: { Authorization: `Bearer ${token}` }
    })
    .then(response => setVideos(response.data))
    .catch(error => console.error('Error al obtener videos', error));
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Estás seguro de eliminar este video?')) return;

    try {
      await axios.delete(`http://127.0.0.1:8000/api/videos/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchVideos();
    } catch (error) {
      console.error('Error al eliminar video', error);
      alert('Error eliminando el video.');
    }
  };

  const startEditing = (video) => {
    setEditingId(video.id);
    setNewTitle(video.title);
  };

  const saveTitle = async (id) => {
    try {
      await axios.put(`http://127.0.0.1:8000/api/videos/${id}`, {
        title: newTitle
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setEditingId(null);
      setNewTitle('');
      fetchVideos();
    } catch (error) {
      console.error('Error actualizando título', error);
      alert('No se pudo actualizar el título');
    }
  };

  useEffect(() => {
    fetchVideos();
  }, []);

  return (
    <div>
      <h2>🎥 Lista de Videos</h2>
      {videos.length === 0 ? (
        <p>No hay videos aún.</p>
      ) : (
        <ul>
          {videos.map((video) => (
            <li key={video.id}>
              {editingId === video.id ? (
                <>
                  <input
                    type="text"
                    value={newTitle}
                    onChange={e => setNewTitle(e.target.value)}
                  />
                  <button onClick={() => saveTitle(video.id)}>💾 Guardar</button>
                  <button onClick={() => setEditingId(null)}>❌ Cancelar</button>
                </>
              ) : (
                <>
                  <strong>{video.title}</strong> - {video.filename} <br />
                  Sucursales: {video.branches?.map(branch => branch.name).join(', ') || 'Ninguna'} <br />
                  <button onClick={() => startEditing(video)}>✏️ Editar</button>
                  <button onClick={() => handleDelete(video.id)}>🗑 Eliminar</button>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default VideoList;
