// Auto-detecta un API base funcional y lo cachea.
// Prioriza VITE_API_BASE_URL si está definida.
import axios from 'axios';

const CANDIDATES = [
  import.meta.env.VITE_API_BASE_URL,            // p.ej. "http://127.0.0.1:8000/api"
  'http://127.0.0.1:8000/api',
  'http://localhost:8000/api',
  // Si usas XAMPP/Apache sirviendo Laravel desde /public:
  'http://localhost/video-app/public/api',
].filter(Boolean);

function getCachedBase() {
  const x = localStorage.getItem('api_base_cache');
  return x || null;
}
function setCachedBase(b) {
  localStorage.setItem('api_base_cache', b);
}

const http = axios.create({
  baseURL: getCachedBase() || CANDIDATES[0],
});

// Bearer token siempre
http.interceptors.request.use((config) => {
  const raw = localStorage.getItem('auth_token');
  const token = raw ? raw.replace(/^"|"$/g, '') : null;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Si hay error de red, reintenta contra otros API base
let retrying = false;
http.interceptors.response.use(
  (res) => {
    const base = res?.config?.baseURL;
    if (base) setCachedBase(base);
    return res;
  },
  async (err) => {
    const isNetwork = err?.code === 'ERR_NETWORK' || err?.message?.includes('Network Error');
    const url = err?.config?.url || '';
    const usedBase = err?.config?.baseURL || '';

    if (isNetwork && !retrying) {
      retrying = true;
      // prueba siguiente candidato
      const currentIndex = CANDIDATES.findIndex((b) => b === usedBase);
      for (let i = 0; i < CANDIDATES.length; i++) {
        const idx = (currentIndex + 1 + i) % CANDIDATES.length;
        const candidate = CANDIDATES[idx];
        try {
          // prueba /health
          await axios.get(candidate.replace(/\/+$/,'') + '/health', { timeout: 1500 });
          setCachedBase(candidate);
          // reintenta la petición original con el nuevo baseURL
          const newReq = { ...err.config, baseURL: candidate };
          const resp = await axios.request(newReq);
          retrying = false;
          return resp;
        } catch (_) { /* intenta el siguiente */ }
      }
      retrying = false;
    }

    if (err?.response?.status === 401) {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_user');
      if (!location.pathname.startsWith('/login')) location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default http;
