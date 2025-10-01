import { useEffect, useState } from 'react';
import axios from 'axios';

export default function BranchList({ onSelectBranch }) {
    const [branches, setBranches] = useState([]);

    useEffect(() => {
        axios.get('http://127.0.0.1:8000/api/branches')
            .then(response => setBranches(response.data))
            .catch(error => console.error('Error al cargar las sucursales', error));
    }, []);

    return (
        <div>
            <h2>Sucursales</h2>
            <ul>
                {branches.map(branch => (
                    <li key={branch.id}>
                        <button onClick={() => onSelectBranch(branch.code)}>
                            {branch.name} ({branch.code})
                        </button>
                    </li>
                ))}
            </ul>
        </div>
    );
}
