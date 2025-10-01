import { useState } from 'react';
import axios from 'axios';

function CreateBranch() {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post('http://127.0.0.1:8000/api/branches', {
        name,
        code
      });
      setMessage('Sucursal creada correctamente');
      setName('');
      setCode('');
    } catch (err) {
      setMessage('Error al crear la sucursal');
      console.error(err);
    }
  };

  return (
    <div>
      <h2>Crear sucursal</h2>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Nombre"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <input
          type="text"
          placeholder="Código (ej. SCL01)"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          required
        />
        <button type="submit">Crear</button>
      </form>
      {message && <p>{message}</p>}
    </div>
  );
}

export default CreateBranch;
