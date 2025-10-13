// src/components/BranchManager.jsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import http from '../api/http';
import { useToast } from '../ui/ToastProvider.jsx';
import FormModal from '../ui/FormModal.jsx';
import ConfirmModal from '../ui/ConfirmModal.jsx';

export default function BranchManager() {
  const toast = useToast();
  const navigate = useNavigate();

  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);

  // Estados para edición
  const [editOpen, setEditOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', code: '' });

  // Estados para nueva sucursal
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({ name: '', code: '' });

  // Estados para confirmación de eliminación
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  const normalize = (res) => {
    if (Array.isArray(res?.data)) return res.data;
    if (Array.isArray(res?.data?.data)) return res.data.data;
    return [];
  };

  const loadBranches = async () => {
    try {
      setLoading(true);
      const res = await http.get('/branches');
      setBranches(normalize(res));
    } catch (e) {
      console.error('[BranchManager] load', e);
      toast.error('No se pudieron cargar las sucursales', { title: 'Error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadBranches(); }, []);

  // --- Edición ---
  const onEditClick = (branch) => {
    setEditId(branch.id);
    setEditForm({ name: branch.name || '', code: branch.code || '' });
    setEditOpen(true);
  };

  const onModalChange = (name, value) => setEditForm((p) => ({ ...p, [name]: value }));
  const onModalCancel = () => { setEditOpen(false); setEditId(null); };

  const onModalConfirm = async () => {
    if (!editId) return;
    const payload = { name: editForm.name.trim(), code: editForm.code.trim() };
    if (!payload.name || !payload.code) {
      toast.warn('Completa ambos campos.', { title: 'Campos incompletos' });
      return;
    }
    try {
      await http.put(`/branches/${editId}`, payload);
      toast.success('Sucursal actualizada correctamente', { title: 'Listo' });
      setEditOpen(false); setEditId(null);
      loadBranches();
    } catch (e) {
      console.error('[BranchManager] update', e);
      const msg = e?.response?.status === 422
        ? e.response.data?.message || 'El código ya está en uso.'
        : 'No se pudo actualizar la sucursal.';
      toast.error(msg, { title: 'Error' });
    }
  };

  // --- Creación ---
  const onCreateModalChange = (name, value) => setCreateForm((p) => ({ ...p, [name]: value }));
  const onCreateCancel = () => { setCreateOpen(false); setCreateForm({ name: '', code: '' }); };

  const onCreateConfirm = async () => {
    const payload = { name: createForm.name.trim(), code: createForm.code.trim() };
    if (!payload.name || !payload.code) {
      toast.warn('Completa ambos campos.', { title: 'Campos incompletos' });
      return;
    }
    try {
      await http.post('/branches', payload);
      toast.success('Sucursal creada correctamente', { title: 'Listo' });
      onCreateCancel();
      loadBranches();
    } catch (e) {
      console.error('[BranchManager] create', e);
      const msg = e?.response?.status === 422
        ? e.response.data?.message || 'El código ya está en uso.'
        : 'No se pudo crear la sucursal.';
      toast.error(msg, { title: 'Error' });
    }
  };

  // --- Eliminación ---
  const onDeleteClick = (id) => { setDeleteId(id); setConfirmOpen(true); };
  const handleDelete = async () => {
    try {
      await http.delete(`/branches/${deleteId}`);
      toast.success('Sucursal eliminada correctamente', { title: 'Listo' });
      loadBranches();
    } catch (e) {
      console.error('[BranchManager] delete', e);
      toast.error('No se pudo eliminar la sucursal.', { title: 'Error' });
    } finally {
      setConfirmOpen(false); setDeleteId(null);
    }
  };

  return (
    <div>
      <h2>Gestión de Sucursales</h2>

      <div style={{ textAlign: 'right', marginBottom: 12 }}>
        <button className="btn-green" onClick={() => setCreateOpen(true)}>➕ Nueva Sucursal</button>
      </div>

      <table className="admin-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={{ textAlign: 'left', padding: '10px 8px' }}>Nombre</th>
            <th style={{ textAlign: 'left', padding: '10px 8px' }}>Código</th>
            <th style={{ padding: '10px 8px' }}>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr><td colSpan="3" style={{ padding: 10, color: '#9fb4c3' }}>Cargando sucursales...</td></tr>
          ) : branches.length === 0 ? (
            <tr><td colSpan="3" style={{ padding: 10, color: '#9fb4c3' }}>No hay sucursales registradas.</td></tr>
          ) : (
            branches.map((b) => (
              <tr key={b.id} style={{ borderTop: '1px solid rgba(255,255,255,.06)' }}>
                <td style={{ padding: '10px 8px' }}>{b.name}</td>
                <td style={{ padding: '10px 8px' }}>{b.code}</td>
                <td style={{ padding: '10px 8px', whiteSpace: 'nowrap' }}>
                  <button className="btn-edit" onClick={() => onEditClick(b)} style={{ marginRight: 8 }}>
                    ✏️ Editar
                  </button>
                  <button
                    className="btn-secondary"
                    onClick={() => navigate(`/branch/${b.id}`)}
                    style={{ marginRight: 8 }}
                  >
                    👁️ Ver Sucursal
                  </button>
                  <button className="btn-delete" onClick={() => onDeleteClick(b.id)}>
                    🗑️ Eliminar
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      {/* Modal de edición */}
      <FormModal
        open={editOpen}
        title="Editar sucursal"
        fields={[
          { name: 'name', label: 'Nombre', value: editForm.name },
          { name: 'code', label: 'Código', value: editForm.code, placeholder: 'p. ej. LI-01' },
        ]}
        onChange={onModalChange}
        onCancel={onModalCancel}
        onConfirm={onModalConfirm}
        confirmText="Guardar cambios"
        cancelText="Cancelar"
      />

      {/* Modal de creación */}
      <FormModal
        open={createOpen}
        title="Nueva sucursal"
        fields={[
          { name: 'name', label: 'Nombre', value: createForm.name },
          { name: 'code', label: 'Código', value: createForm.code, placeholder: 'p. ej. LI-01' },
        ]}
        onChange={onCreateModalChange}
        onCancel={onCreateCancel}
        onConfirm={onCreateConfirm}
        confirmText="Crear"
        cancelText="Cancelar"
      />

      {/* Modal de confirmación */}
      <ConfirmModal
        open={confirmOpen}
        title="Eliminar sucursal"
        message="¿Seguro que deseas eliminar esta sucursal?"
        confirmText="Sí, eliminar"
        cancelText="Cancelar"
        onConfirm={handleDelete}
        onCancel={() => { setConfirmOpen(false); setDeleteId(null); }}
      />
    </div>
  );
}
