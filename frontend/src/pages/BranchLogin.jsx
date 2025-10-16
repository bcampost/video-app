// src/pages/BranchLogin.jsx
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { setBranchAuth, getBranchAuth, isLoggedFor } from '../auth/branchAuth';

const BACKEND =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_BACKEND_URL) ||
  'http://127.0.0.1:8000';

export default function BranchLogin() {
  const navigate = useNavigate();
  const [sp] = useSearchParams();

  const [user, setUser] = useState(sp.get('user') || sp.get('code') || '');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Si ya hay sesión guardada para esa sucursal, redirige
  useEffect(() => {
    if (user && isLoggedFor(sp.get('code') ?? '')) {
      // Mantengo esta lógica por si llegas con ?code=... desde otro lado
      navigate(`/sucursal/${sp.get('code')}`, { replace: true });
    }
  }, [user, sp, navigate]);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const u = user.trim();
    const p = password.trim();

    if (!u || !p) {
      setError('Ingresa usuario y contraseña.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`${BACKEND}/api/branch/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user: u, password: p }),
      });

      // El backend devuelve JSON con {token, branch} o {message}
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data?.message || 'Error de autenticación');
        return;
      }

      setBranchAuth({ token: data.token, branch: data.branch });
      navigate(`/sucursal/${data.branch.code}`, { replace: true });
    } catch (err) {
      setError('No se pudo contactar el servidor');
    } finally {
      setSubmitting(false);
    }
  };

  const auth = getBranchAuth();

  return (
    <div style={styles.wrap}>
      <form style={styles.card} onSubmit={onSubmit}>
        <div style={styles.header}>
          <div style={styles.logo}>LI</div>
          <div>
            <div style={styles.titleTop}>Acceso a Sucursal</div>
            <div style={styles.subtitle}>
              Ingresa tu <b>usuario</b> y <b>contraseña</b>.
            </div>
          </div>
        </div>

        <label style={styles.label}>Usuario</label>
        <input
          style={styles.input}
          placeholder="p. ej. guadalajara"
          value={user}
          onChange={(e) => setUser(e.target.value)}
          autoFocus
          autoCapitalize="none"
          autoCorrect="off"
        />

        <label style={{ ...styles.label, marginTop: 10 }}>Contraseña</label>
        <div style={styles.passWrap}>
          <input
            style={{ ...styles.input, paddingRight: 44 }}
            type={show ? 'text' : 'password'}
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            title={show ? 'Ocultar' : 'Mostrar'}
            style={styles.eye}
          >
            {show ? '🙈' : '👁️'}
          </button>
        </div>

        {error && <div style={styles.error}>{error}</div>}

        <button style={styles.btn} disabled={submitting}>
          {submitting ? 'Verificando…' : 'Entrar'}
        </button>

        {auth?.branch && (
          <div style={styles.hint}>
            Sesión guardada: <b>{auth.branch.name}</b> ({auth.branch.code})
          </div>
        )}
      </form>
    </div>
  );
}

const styles = {
  wrap: {
    minHeight: '100vh',
    width: '100%',
    background:
      'radial-gradient(1200px 600px at 20% -10%, rgba(76,137,255,.18), transparent 70%), radial-gradient(900px 500px at 110% 10%, rgba(76,137,255,.08), transparent 65%), #0B1520',
    display: 'grid',
    placeItems: 'center',
    padding: 20,
  },
  card: {
    width: 460,
    maxWidth: '92vw',
    background: 'rgba(18,30,42,.92)',
    color: '#E7F0FA',
    border: '1px solid rgba(255,255,255,.08)',
    borderRadius: 16,
    padding: 20,
    boxShadow: '0 18px 60px rgba(0,0,0,.45)',
    backdropFilter: 'blur(6px)',
    overflow: 'hidden', // recorta cualquier detalle que se salga del card
  },
  header: { display: 'flex', gap: 12, alignItems: 'center', marginBottom: 8 },
  logo: {
    width: 36,
    height: 36,
    borderRadius: 10,
    background:
      'linear-gradient(180deg, rgba(76,137,255,.9), rgba(76,137,255,.6))',
    display: 'grid',
    placeItems: 'center',
    color: '#fff',
    fontWeight: 800,
    boxShadow: '0 6px 18px rgba(76,137,255,.45)',
  },
  titleTop: { fontSize: 16, fontWeight: 700, margin: 0 },
  subtitle: { color: '#9fb4c3', fontSize: 13, marginTop: 2 },
  label: { fontSize: 13, color: '#9fb4c3', margin: '10px 0 6px', display: 'block' },
  input: {
    width: '100%',
    maxWidth: '100%',      // nunca excede el ancho del card
    minWidth: 0,           // evita desborde en contenedores flex/grid
    boxSizing: 'border-box',
    background: '#0F1A23',
    color: '#E7F0FA',
    border: '1px solid rgba(255,255,255,.08)',
    borderRadius: 12,
    padding: '12px 12px',
    outline: 'none',
  },
  passWrap: { position: 'relative', minWidth: 0 },
  eye: {
    position: 'absolute',
    right: 8,
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'transparent',
    border: 0,
    cursor: 'pointer',
    fontSize: 18,
    color: '#cfe1ff',
  },
  error: {
    marginTop: 12,
    background: '#3b1216',
    color: '#f9b2b9',
    padding: '10px 12px',
    borderRadius: 10,
    fontSize: 13,
    border: '1px solid rgba(255,0,0,.15)',
  },
  btn: {
    marginTop: 16,
    width: '100%',
    padding: '12px 14px',
    background: '#4C89FF',
    color: '#fff',
    fontWeight: 800,
    borderRadius: 12,
    border: 'none',
    cursor: 'pointer',
    boxShadow: '0 8px 24px rgba(76,137,255,.35)',
  },
  hint: { marginTop: 10, color: '#9fb4c3', fontSize: 12 },
};
