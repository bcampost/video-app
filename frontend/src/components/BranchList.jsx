// src/components/BranchList.jsx
import React from 'react';

export default function BranchList({ branches = [], onEdit, onDelete }) {
  return (
    <div>
      <h3 style={{ marginTop: 24 }}>📂 Sucursales</h3>
      <table>
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Código</th>
            <th style={{ width: 180 }}>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {branches.length === 0 ? (
            <tr>
              <td colSpan="3">No hay sucursales registradas.</td>
            </tr>
          ) : (
            branches.map((b) => (
              <tr key={b.id}>
                <td>{b.name}</td>
                <td>{b.code}</td>
                <td>
                  <button className="btn-edit" onClick={() => onEdit?.(b)}>
                    ✏️ Editar
                  </button>{' '}
                  <button className="btn-delete" onClick={() => onDelete?.(b)}>
                    🗑️ Eliminar
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
