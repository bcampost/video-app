import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import http from '../api/http';
import { useToast } from '../ui/ToastProvider.jsx';

const MASTER_KEY = 'Admin@LineaItalia2025';

export default function Login({ onLoginSuccess = () => {} }) {
  const [mode, setMode] = useState('register'); // 'login' | 'register'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('user'); // user | superadmin
  const [masterKey, setMasterKey] = useState('');

  const toast = useToast();
  const navigate = useNavigate();

  const saveSession = (token, user) => {
    localStorage.setItem('auth_token', token);
    localStorage.setItem('auth_user', JSON.stringify(user));
  };

  const handleRegister = async (e) => {
    e.preventDefault();

    if (!email || !password) {
      toast.warn('Completa correo y contraseña', { title: 'Campos incompletos' });
      return;
    }
    if (role !== 'user' && masterKey !== MASTER_KEY) {
      toast.error('Clave superadmin inválida', { title: 'Validación' });
      return;
    }

    try {
      const { data } = await http.post('/auth/register', {
        email,
        password,
        role: role === 'superadmin' ? 'superadmin' : 'user',
        master_key: role === 'superadmin' ? masterKey : undefined,
      });

      saveSession(data.token, data.user);
      onLoginSuccess(data.user);
      toast.success('Usuario creado', { title: 'Listo' });
      navigate('/', { replace: true });
    } catch (err) {
      console.error('[Register] error:', err);
      const msg = err?.response?.data?.message || 'No se pudo crear usuario.';
      toast.error(msg, { title: 'Error' });
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();

    if (!email || !password) {
      toast.warn('Completa correo y contraseña', { title: 'Campos incompletos' });
      return;
    }

    try {
      const { data } = await http.post('/auth/login', { email, password });
      saveSession(data.token, data.user);
      onLoginSuccess(data.user);
      toast.success('Bienvenido', { title: 'Sesión iniciada' });
      navigate('/', { replace: true });
    } catch (err) {
      console.error('[Login] error:', err);
      const msg = err?.response?.data?.message || 'No se pudo iniciar sesión.';
      toast.error(msg, { title: 'Error' });
    }
  };

  return (
    <div className="auth-container">
      <div className="card">
        <h2 style={{ textAlign: 'center' }}>
          {mode === 'register' ? 'Crear usuario' : 'Iniciar sesión'}
        </h2>

        <form onSubmit={mode === 'register' ? handleRegister : handleLogin} className="auth-form">
          <label>Correo</label>
          <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required />

          <label>Contraseña</label>
          <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" required />

          {mode === 'register' && (
            <>
              <label>Rol</label>
              <select value={role} onChange={(e) => setRole(e.target.value)}>
                <option value="user">Usuario</option>
                <option value="superadmin">Superadmin</option>
              </select>

              {role === 'superadmin' && (
                <>
                  <label>Clave superadmin</label>
                  <input
                    value={masterKey}
                    onChange={(e) => setMasterKey(e.target.value)}
                    type="password"
                    required
                  />
                </>
              )}
            </>
          )}

          <button type="submit" className="btn-primary" style={{ marginTop: 12 }}>
            {mode === 'register' ? 'Crear usuario' : 'Inicia sesión'}
          </button>
        </form>

        <div style={{ marginTop: 16, textAlign: 'center' }}>
          {mode === 'register' ? (
            <button className="link" onClick={() => setMode('login')}>¿Ya tienes cuenta? Inicia sesión</button>
          ) : (
            <button className="link" onClick={() => setMode('register')}>Crear usuario</button>
          )}
        </div>
      </div>

      <style>{`
        .auth-container { display:grid; place-items:center; min-height:100vh; }
        .card { width:min(520px, 92vw); background:var(--panel, #182532); padding:24px; border-radius:12px; box-shadow: 0 6px 28px rgba(0,0,0,.25); }
        .auth-form { display:grid; gap:10px; }
        .auth-form input, .auth-form select { padding:10px; border-radius:8px; border:1px solid var(--line,#2e3b47); background:#0f1a23; color:#e8f0f7; }
        .btn-primary { width:100%; padding:12px; border-radius:10px; border:0; background:#4c89ff; color:#fff; font-weight:600; }
        .link { background:none; border:0; color:#9fb4c3; cursor:pointer; }
      `}</style>
    </div>
  );
}
