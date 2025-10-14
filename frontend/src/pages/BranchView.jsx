// src/pages/BranchView.jsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './BranchView.css';
import { isLoggedFor, branchLogout } from '../auth/branchAuth';

const BACKEND =
  (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_BACKEND_URL) ||
  'http://127.0.0.1:8000';

const API = `${BACKEND}/api`;
const NOWPLAYING_PATH = (code) => `${API}/branch/${encodeURIComponent(code)}/now-playing`;

function toStorageUrl(input) {
  if (!input) return '';
  const s = String(input).trim();
  if (/^https?:\/\//i.test(s)) return s;
  const clean = s.replace(/^public\//i, '').replace(/^storage\//i, '');
  return `${BACKEND}/storage/${clean}`;
}
function fmtTime(sec) {
  if (!isFinite(sec)) return '00:00';
  const s = Math.floor(sec);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
}
function guessType(url) {
  const ext = (url.split('?')[0].split('.').pop() || '').toLowerCase();
  if (ext === 'webm') return 'video/webm';
  if (ext === 'ogg' || ext === 'ogv') return 'video/ogg';
  if (ext === 'mov') return 'video/quicktime';
  if (ext === 'mkv') return 'video/x-matroska';
  return 'video/mp4';
}

export default function BranchView() {
  const { code } = useParams();
  const navigate = useNavigate();

  // si no hay sesión → login
  useEffect(() => {
    if (!isLoggedFor(code)) {
      navigate(`/sucursal/login?code=${encodeURIComponent(code)}`, { replace: true });
    }
  }, [code, navigate]);

  const videoRef = useRef(null);
  const wakeLockRef = useRef(null);
  const switchingRef = useRef(false);
  const lastReportedRef = useRef(null);

  const [branchName, setBranchName] = useState(code || 'Sucursal');
  const [queue, setQueue] = useState([]);
  const [idx, setIdx] = useState(0);

  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [rate, setRate] = useState(1);
  const [progress, setProgress] = useState({ cur: 0, dur: 0, buf: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [message, setMessage] = useState('');
  const [clock, setClock] = useState(() => new Date().toLocaleTimeString());

  // Modo de llenado de video
  const [fillMode, setFillMode] = useState('cover'); // 'cover' | 'contain'

  const current = queue[idx] || null;

  // reloj
  useEffect(() => {
    const t = setInterval(() => setClock(new Date().toLocaleTimeString()), 1000);
    return () => clearInterval(t);
  }, []);

  // cargar cola
  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const res = await fetch(`${API}/branch/${encodeURIComponent(code)}/videos`, {
          headers: { 'Cache-Control': 'no-cache' },
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();

        const list = Array.isArray(data?.videos)
          ? data.videos
              .map((v) => {
                const raw = v.url || v.filename || v.file || v.path;
                const src = toStorageUrl(raw);
                return src ? { id: v.id, title: v.title || 'Video', src } : null;
              })
              .filter(Boolean)
          : [];

        if (!alive) return;
        setQueue(list);
        setBranchName(data?.branch?.name || code);
        if (list.length === 0) setIdx(0);
        else setIdx((i) => Math.min(i, list.length - 1));
      } catch (e) {
        console.error('[TV] load error', e);
      }
    };
    load();
    const t = setInterval(load, 30000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [code]);

  // Wake Lock
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        if ('wakeLock' in navigator && navigator.wakeLock.request) {
          const lock = await navigator.wakeLock.request('screen');
          if (mounted) wakeLockRef.current = lock;
          document.addEventListener('visibilitychange', async () => {
            if (document.visibilityState === 'visible') {
              try { wakeLockRef.current = await navigator.wakeLock.request('screen'); } catch {}
            }
          });
        }
      } catch {}
    })();
    return () => {
      mounted = false;
      try { wakeLockRef.current && wakeLockRef.current.release(); } catch {}
    };
  }, []);

  // preparar video
  useEffect(() => {
    const el = videoRef.current;
    setMessage('');
    setIsLoading(true);
    setPlaying(false);
    if (!el || !current) return;

    el.pause();
    el.removeAttribute('src');
    while (el.firstChild) el.removeChild(el.firstChild);

    const src = document.createElement('source');
    src.src = current.src;
    src.type = guessType(current.src);
    el.appendChild(src);

    el.load();
    el.play().then(
      () => {
        setIsLoading(false);
        setPlaying(true);
        if (lastReportedRef.current !== current.id) {
          lastReportedRef.current = current.id;
          fetch(NOWPLAYING_PATH(code), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ video_id: current.id }),
          }).catch(() => {});
        }
      },
      async () => {
        try {
          el.muted = true;
          setMuted(true);
          await el.play();
          setIsLoading(false);
          setPlaying(true);
          if (lastReportedRef.current !== current.id) {
            lastReportedRef.current = current.id;
            fetch(NOWPLAYING_PATH(code), {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ video_id: current.id }),
            }).catch(() => {});
          }
        } catch {
          setMessage('Toca ▶ para iniciar la reproducción');
          setIsLoading(false);
        }
      }
    );
  }, [current?.src, code]);

  // eventos de video
  const onLoadedMetadata = () => {
    const el = videoRef.current;
    const buf = el.buffered?.length ? el.buffered.end(el.buffered.length - 1) : 0;
    setProgress({ cur: el.currentTime || 0, dur: el.duration || 0, buf });
  };
  const onTimeUpdate = () => {
    const el = videoRef.current;
    const buf = el.buffered?.length ? el.buffered.end(el.buffered.length - 1) : 0;
    setProgress({ cur: el.currentTime || 0, dur: el.duration || 0, buf });
  };
  const onWaiting = () => setIsLoading(true);
  const onPlaying = () => setIsLoading(false);
  const onEnded = () => next();

  // controles
  const togglePlay = async () => {
    const el = videoRef.current;
    if (!el) return;
    if (el.paused) {
      try { await el.play(); setPlaying(true); }
      catch { setMessage('No se pudo iniciar automáticamente'); }
    } else { el.pause(); setPlaying(false); }
  };
  const seek = (t) => {
    const el = videoRef.current;
    if (!el || !isFinite(t)) return;
    el.currentTime = Math.max(0, Math.min(t, el.duration || t));
  };
  const seekBy = (delta) => seek((videoRef.current?.currentTime || 0) + delta);
  const setProgressFromClick = (e) => {
    const el = e.currentTarget;
    const rect = el.getBoundingClientRect();
    const ratio = Math.min(Math.max((e.clientX - rect.left) / rect.width, 0), 1);
    const dur = progress.dur || 0;
    seek(ratio * dur);
  };
  const setVol = (v) => {
    const el = videoRef.current;
    const val = Math.max(0, Math.min(1, v));
    setVolume(val);
    if (el) el.volume = val;
    setMuted(val === 0);
  };
  const toggleMute = () => {
    const el = videoRef.current;
    if (!el) return;
    el.muted = !el.muted;
    setMuted(el.muted);
  };
  const changeRate = (r) => {
    const el = videoRef.current;
    setRate(r);
    if (el) el.playbackRate = r;
  };
  const requestFS = () => {
    const el = videoRef.current;
    el && el.requestFullscreen && el.requestFullscreen();
  };

  // navegación
  const safeSwitch = async (nextIdx) => {
    if (!queue.length || switchingRef.current) return;
    switchingRef.current = true;
    setIsTransitioning(true);
    await new Promise((r) => setTimeout(r, 220));
    setIdx((nextIdx + queue.length) % queue.length);
    await new Promise((r) => setTimeout(r, 220));
    setIsTransitioning(false);
    switchingRef.current = false;
  };
  const next = () => safeSwitch(idx + 1);
  const prev = () => safeSwitch(idx - 1);

  // atajos
  useEffect(() => {
    const h = (e) => {
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes(e.target?.tagName)) return;
      if (e.code === 'Space') { e.preventDefault(); togglePlay(); }
      else if (e.key === 'ArrowRight') seekBy(5);
      else if (e.key === 'ArrowLeft') seekBy(-5);
      else if (e.key === 'ArrowUp') setVol(volume + 0.05);
      else if (e.key === 'ArrowDown') setVol(volume - 0.05);
      else if (e.key === 'm' || e.key === 'M') toggleMute();
      else if (e.key === 'f' || e.key === 'F') requestFS();
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [volume]);

  const prettyTitle = useMemo(() => current?.title || '—', [current]);
  const pct = progress.dur ? (progress.cur / progress.dur) * 100 : 0;
  const pctBuf = progress.dur ? (progress.buf / progress.dur) * 100 : 0;

  // logout sucursal
  const onLogout = async () => {
    await branchLogout(BACKEND);
    navigate(`/sucursal/login?code=${encodeURIComponent(code)}`, { replace: true });
  };

  return (
    <div className="tv-root">
      <header className="tv-header">
        <div className="brand"><span className="dot" /> {branchName}</div>
        <div className="now">
          <span className="label">Reproduciendo</span>
          <strong className="title" title={prettyTitle}>{prettyTitle}</strong>
        </div>
        <div className="right-zone">
          <span>{clock}</span>
          <button className="logout-btn" onClick={onLogout} title="Cerrar sesión">Salir</button>
        </div>
      </header>

      <main className="tv-stage">
        <div className={`tv-video-shell ${isTransitioning ? 'is-transitioning' : ''}`}>
          <video
            ref={videoRef}
            className={`tv-video ${fillMode === 'contain' ? 'fit-contain' : ''}`}
            preload="auto"
            playsInline
            onLoadedMetadata={onLoadedMetadata}
            onTimeUpdate={onTimeUpdate}
            onWaiting={onWaiting}
            onPlaying={onPlaying}
            onEnded={onEnded}
          />
          {isLoading && <div className="spinner" />}
          {!!message && <div className="info-msg">{message}</div>}
        </div>

        <aside className="tv-rail">
          <div className="rail-title">En cola</div>
          <ul className="rail-list">
            {queue.length === 0 ? (
              <li className="empty">Sin videos asignados</li>
            ) : (
              queue.map((v, i) => (
                <li
                  key={v.id || i}
                  className={i === idx ? 'is-active' : ''}
                  onClick={() => safeSwitch(i)}
                  title={v.title}
                >
                  <div className="pill">{i === idx ? '▶' : i + 1}</div>
                  <span className="text">{v.title}</span>
                </li>
              ))
            )}
          </ul>
        </aside>
      </main>

      <footer className="tv-controls">
        <div className="left">
          <button className="btn" onClick={prev} title="Anterior">⏮</button>
          <button className="btn primary" onClick={togglePlay} title="Play/Pause">
            {playing ? '⏸' : '▶'}
          </button>
          <button className="btn" onClick={next} title="Siguiente">⏭</button>
        </div>

        <div className="center">
          <div className="time">{fmtTime(progress.cur)}</div>
          <div className="bar" onClick={setProgressFromClick}>
            <div className="buffer" style={{ width: `${pctBuf}%` }} />
            <div className="progress" style={{ width: `${pct}%` }} />
          </div>
          <div className="time">{fmtTime(progress.dur)}</div>
        </div>

        <div className="right">
          <button
            className="btn ghost"
            title={fillMode === 'cover' ? 'Cambiar a “Ajustar”' : 'Cambiar a “Cubrir”'}
            onClick={() => setFillMode((m) => (m === 'cover' ? 'contain' : 'cover'))}
          >
            {fillMode === 'cover' ? '↔︎ Ajustar' : '⬛ Cubrir'}
          </button>

          <button className="btn" onClick={toggleMute} title="Mute">
            {muted ? '🔇' : '🔊'}
          </button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={volume}
            onChange={(e) => setVol(parseFloat(e.target.value))}
            className="vol"
            title="Volumen"
          />
          <select
            className="rate"
            value={rate}
            onChange={(e) => changeRate(parseFloat(e.target.value))}
            title="Velocidad"
          >
            <option value="0.5">0.5x</option>
            <option value="0.75">0.75x</option>
            <option value="1">1x</option>
            <option value="1.25">1.25x</option>
            <option value="1.5">1.5x</option>
            <option value="2">2x</option>
          </select>
          <button className="btn" onClick={requestFS} title="Pantalla completa">⛶</button>
        </div>
      </footer>
    </div>
  );
}
