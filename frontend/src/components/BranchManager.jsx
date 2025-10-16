// src/components/BranchManager.jsx
import { useEffect, useState } from 'react';
import http from '../api/http';
import { useToast } from '../ui/ToastProvider.jsx';
import FormModal from '../ui/FormModal.jsx';
import ConfirmModal from '../ui/ConfirmModal.jsx';

// Normaliza respuestas {data:[...]} o [...]:
const getArray = (res) => {
  if (Array.isArray(res?.data)) return res.data;
  if (Array.isArray(res?.data?.data)) return res.data.data;
  return [];
};

/* ========== Modal de credenciales (usuario/contraseña con ojo) ========== */
function CredentialModal({ open, onClose, onSave, initial = {} }) {
  const [user, setUser] = useState(initial.login_user || '');
  const [pass, setPass] = useState('');
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (open) {
      setUser(initial.login_user || '');
      setPass('');
      setShow(false);
    }
  }, [open, initial]);

  if (!open) return null;

  return (
    <div className="cmask" onClick={onClose}>
      <div className="cmodal" onClick={(e) => e.stopPropagation()}>
        <h3 style={{ marginTop: 0 }}>Editar perfil de sucursal</h3>

        <label className="clabel">Usuario</label>
        <input
          className="cinput"
          placeholder="usuario"
          value={user}
          onChange={(e) => setUser(e.target.value)}
        />

        <label className="clabel">Contraseña</label>
        <div className="cpasswrap">
          <input
            className="cinput"
            type={show ? 'text' : 'password'}
            placeholder="••••••••"
            value={pass}
            onChange={(e) => setPass(e.target.value)}
          />
          <button
            type="button"
            className="ceye"
            title={show ? 'Ocultar' : 'Mostrar'}
            onClick={() => setShow((s) => !s)}
          >
            {show ? '🙈' : '👁️'}
          </button>
        </div>

        <div className="cactions">
          <button className="btn-ghost" onClick={onClose}>Cancelar</button>
          <button
            className="btn-primary"
            onClick={() => onSave({ user: user.trim(), password: pass })}
          >
            Guardar
          </button>
        </div>
      </div>

      {/* estilos mínimos del modal */}
<style>{`
  .cmask {
    position:fixed; inset:0; background:rgba(0,0,0,.45);
    display:grid; place-items:center; z-index:50;
  }
  .cmodal {
    width:min(520px,92vw);
    background:var(--panel,#182532); color:#e8f0f7;
    border:1px solid rgba(255,255,255,.06);
    border-radius:14px; padding:18px;
    box-shadow:0 18px 60px rgba(0,0,0,.35);
    overflow:hidden;                 /* ⬅️ evita que algo se salga del card */
  }
  .cmodal * { box-sizing: border-box; } /* ⬅️ asegura cálculo correcto de ancho */

  .clabel { display:block; margin:.6rem 0 .25rem; color:#9fb4c3; font-size:.9rem; }
  .cinput {
    width:100%;                      /* ⬅️ no más de 100% del contenedor */
    max-width:100%;
    min-width:0;                     /* ⬅️ por si el contenedor usa grid/flex */
    padding:10px 12px;
    border-radius:10px;
    border:1px solid var(--line,#2e3b47);
    background:#0f1a23; color:#e8f0f7; outline:none;
  }

  .cpasswrap { position:relative; min-width:0; }
  .cpasswrap .cinput {
    padding-right:44px;              /* ⬅️ deja espacio para el “ojo” */
  }
  .ceye {
    position:absolute; right:10px; top:50%;
    transform:translateY(-50%);
    border:0; background:transparent; font-size:18px;
    cursor:pointer; color:#cfe1ff;
  }

  .cactions { display:flex; justify-content:flex-end; gap:8px; margin-top:14px; }
  .btn-ghost { background:#223346; color:#cfe3ff; border:1px solid rgba(255,255,255,.08); padding:8px 12px; border-radius:10px; }
  .btn-primary { background:#4c89ff; color:#fff; border:0; padding:10px 14px; border-radius:10px; font-weight:700; }
`}</style>

    </div>
  );
}

export default function BranchManager() {
  const toast = useToast();
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);

  // Edición básica
  const [editOpen, setEditOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', code: '' });

  // Crear
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({ name: '', code: '' });

  // Eliminar
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  // Credenciales
  const [credOpen, setCredOpen] = useState(false);
  const [credBranch, setCredBranch] = useState(null); // {id, name, code, login_user?}

  const loadBranches = async () => {
    try {
      setLoading(true);
      const res = await http.get('/branches');
      setBranches(getArray(res));
    } catch (e) {
      console.error('[BranchManager] load', e);
      toast.error('No se pudieron cargar las sucursales', { title: 'Error' });
      setBranches([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBranches();
  }, []);

  /* ===== Edición básica (nombre/código) ===== */
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
      setEditOpen(false);
      setEditId(null);
      loadBranches();
    } catch (e) {
      console.error('[BranchManager] update', e);
      const msg = e?.response?.status === 422
        ? e.response.data?.message || 'El código ya está en uso.'
        : 'No se pudo actualizar la sucursal.';
      toast.error(msg, { title: 'Error' });
    }
  };

  /* ===== Crear ===== */
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

  /* ===== Eliminar ===== */
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
      setConfirmOpen(false);
      setDeleteId(null);
    }
  };

  /* ===== Credenciales ===== */
  const openCreds = (b) => {
    setCredBranch(b);
    setCredOpen(true);
  };

  // ⬇⬇⬇ Aquí el FIX: nombres coherentes y endpoint /credentials
  const saveCreds = async ({ user, password }) => {
    if (!credBranch?.id) return;

    if (!user) {
      toast.warn('El usuario es obligatorio.', { title: 'Campos incompletos' });
      return;
    }

    const payload = {
      login_user: user.trim(),
      ...(password ? { password } : {}),
    };

    try {
      await http.put(`/branches/${credBranch.id}/credentials`, payload);
      toast.success('Perfil actualizado', { title: 'Listo' });
      setCredOpen(false);
      setCredBranch(null);
      loadBranches();
    } catch (e) {
      console.error('[BranchManager] saveCreds', e);
      const msg = e?.response?.data?.message || 'No se pudo actualizar el perfil.';
      toast.error(msg, { title: 'Error' });
    }
  };

  return (
    <div>
      <h2>Gestión de Sucursales</h2>

      <div style={{ textAlign: 'right', marginBottom: 12 }}>
        <button className="btn-green" onClick={() => setCreateOpen(true)}>
          ➕ Nueva Sucursal
        </button>
      </div>

      <table className="admin-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={{ textAlign: 'left', padding: '10px 8px' }}>Nombre</th>
            <th style={{ textAlign: 'left', padding: '10px 8px' }}>Código</th>
            <th style={{ textAlign: 'left', padding: '10px 8px' }}>Usuario</th>
            <th style={{ padding: '10px 8px' }}>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan="4" style={{ padding: 10, color: '#9fb4c3' }}>
                Cargando sucursales...
              </td>
            </tr>
          ) : branches.length === 0 ? (
            <tr>
              <td colSpan="4" style={{ padding: 10, color: '#9fb4c3' }}>
                No hay sucursales registradas.
              </td>
            </tr>
          ) : (
            branches.map((b) => (
              <tr key={b.id} style={{ borderTop: '1px solid rgba(255,255,255,.06)' }}>
                <td style={{ padding: '10px 8px' }}>{b.name}</td>
                <td style={{ padding: '10px 8px' }}>{b.code}</td>
                <td style={{ padding: '10px 8px' }}>{b.login_user || '—'}</td>
                <td style={{ padding: '10px 8px', whiteSpace: 'nowrap' }}>
                  <button
                    className="btn-edit"
                    onClick={() => onEditClick(b)}
                    style={{ marginRight: 8 }}
                  >
                    ✏️ Editar
                  </button>

                  {/* Ver Sucursal (se mantiene) */}
                  <button
                    className="btn-secondary"
                    onClick={() => window.open(`/sucursal/${encodeURIComponent(b.code)}`, '_blank')}
                    style={{ marginRight: 8 }}
                    title="Abrir reproductor de la sucursal"
                  >
                    👁️ Ver Sucursal
                  </button>

                  {/* Editar Perfil */}
                  <button
                    className="btn-secondary"
                    onClick={() => openCreds(b)}
                    style={{ marginRight: 8 }}
                    title="Editar usuario y contraseña de esta sucursal"
                  >
                    👤 Editar perfil
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

      {/* Modal de edición básica */}
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

      {/* Confirmación de borrado */}
      <ConfirmModal
        open={confirmOpen}
        title="Eliminar sucursal"
        message="¿Seguro que deseas eliminar esta sucursal?"
        confirmText="Sí, eliminar"
        cancelText="Cancelar"
        onConfirm={handleDelete}
        onCancel={() => {
          setConfirmOpen(false);
          setDeleteId(null);
        }}
      />

      {/* Modal de credenciales */}
      <CredentialModal
        open={credOpen}
        initial={credBranch || {}}
        onClose={() => { setCredOpen(false); setCredBranch(null); }}
        onSave={saveCreds}
      />
    </div>
  );
}
