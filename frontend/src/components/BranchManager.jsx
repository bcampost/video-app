import { useEffect, useState } from 'react';
import axios from 'axios';
import '../styles/BranchManager.css';


export default function BranchManager() {
  const [branches, setBranches] = useState([]);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');

  const token = localStorage.getItem('auth_token');

  const fetchBranches = async () => {
    try {
      const response = await axios.get('http://127.0.0.1:8000/api/branches');
      setBranches(response.data);
    } catch (err) {
      console.error('Error al obtener sucursales', err);
    }
  };

  useEffect(() => {
    fetchBranches();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await axios.post('http://127.0.0.1:8000/api/branches', {
        name,
        code
      }, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      alert('Sucursal creada');
      setName('');
      setCode('');
      fetchBranches();
    } catch (err) {
      console.error('Error al crear sucursal', err);
    }
  };

  return (
    <div className="branch-manager">
      <h2>Gestión de Sucursales</h2>

      <form onSubmit={handleCreate}>
        <input
          type="text"
          placeholder="Nombre"
          value={name}
          onChange={e => setName(e.target.value)}
          required
        />
        <input
          type="text"
          placeholder="Código"
          value={code}
          onChange={e => setCode(e.target.value)}
          required
        />
        <button type="submit">Agregar Sucursal</button>
      </form>

      <ul>
        {branches.map(branch => (
          <li key={branch.id}>
            <strong>{branch.name}</strong> - {branch.code}
          </li>
        ))}
      </ul>
    </div>
  );
}
