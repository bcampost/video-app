// src/auth/branchAuth.js
const KEY = 'branch_auth';

export function setBranchAuth({ token, branch }) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ token, branch }));
  } catch {}
}

export function getBranchAuth() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearBranchAuth() {
  try { localStorage.removeItem(KEY); } catch {}
}

export function isLoggedFor(code) {
  const a = getBranchAuth();
  return !!a?.token && String(a?.branch?.code || '').toLowerCase() === String(code || '').toLowerCase();
}

export function tokenHeader() {
  const a = getBranchAuth();
  return a?.token ? { Authorization: `Bearer ${a.token}` } : {};
}

/** Cierra sesión de sucursal en backend (si hay token) y limpia el storage */
export async function branchLogout(BACKEND_BASE) {
  const a = getBranchAuth();
  try {
    if (a?.token) {
      await fetch(`${BACKEND_BASE}/api/branch/logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${a.token}` },
      });
    }
  } catch {}
  clearBranchAuth();
}
