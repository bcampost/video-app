// src/components/Login.jsx
import { useState, useEffect } from 'react';
import axios from 'axios';
import '../styles/Login.css';

export default function Login({ onLoginSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(true);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const resp = await axios.post('http://127.0.0.1:8000/api/login', { email, password });
      const data = resp.data;
      localStorage.setItem('auth_token', data.token);
      localStorage.setItem('auth_user', JSON.stringify(data.user));
      onLoginSuccess(data.user);
    } catch (err) {
      console.error('Error al iniciar sesión:', err);
      setError('Usuario o contraseña incorrectos');
    }
  };

  return (
    <div className="login-container">
      <form className={`login-form ${visible ? 'fade-in' : ''}`} onSubmit={handleSubmit}>
        <h2 className="login-title">Login</h2>

        {error && <div className="error-message">{error}</div>}

        <div className="input-group">
          <label>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="admin@admin.com"
          />
        </div>

        <div className="input-group">
          <label>Contraseña</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            placeholder="••••••••"
          />
        </div>

        <button type="submit" className="login-button">Entrar</button>
      </form>
    </div>
  );
}
