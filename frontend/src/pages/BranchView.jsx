import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import './BranchView.css';



const BACKEND = 'http://127.0.0.1:8000';
const API = `${BACKEND}/api`;

function toStorageUrl(input) {
  if (!input) return '';
  const s = String(input).trim();
  if (/^https?:\/\//i.test(s)) return s;
  let p = s.replace(/^public\//i, '').replace(/^storage\//i, '');
  if (/^videos\//i.test(p)) return `${BACKEND}/storage/${p}`;
  return `${BACKEND}/storage/${p}`;
}
function guessMime(url) {
  const ext = url.split('?')[0].split('.').pop().toLowerCase();
  switch (ext) {
    case 'mp4':  return 'video/mp4';
    case 'webm': return 'video/webm';
    case 'ogg':
    case 'ogv':  return 'video/ogg';
    case 'mov':  return 'video/quicktime';
    case 'avi':  return 'video/x-msvideo';
    case 'mkv':  return 'video/x-matroska';
    default:     return 'video/mp4';
  }
}

export default function BranchView() {
  const { code } = useParams();

  const [branchName, setBranchName] = useState(code || 'Sucursal');
  const [videos, setVideos] = useState([]);
  const [index, setIndex] = useState(0);

  const [resolvedSrc, setResolvedSrc] = useState('');
  const [fading, setFading] = useState(false);
  const [transitioning, setTransitioning] = useState(false);
  const [needsClickForSound, setNeedsClickForSound] = useState(false);
  const [message, setMessage] = useState('');

  const videoRef = useRef(null);
  const switchingRef = useRef(false);
  const errorCountRef = useRef({});

  const queueRef = useRef(null);


  const now = videos[index] || null;

  // Carga periódica de cola + nombre de sucursal
  useEffect(() => {
    let alive = true;
    async function load() {
      try {
        const res = await fetch(`${API}/branch/${code}/videos`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        let list = Array.isArray(data) ? data : (data.videos || []);
        if (!Array.isArray(list)) list = [];
        if (alive) {
          setVideos(list);
          if (data?.branch?.name) setBranchName(data.branch.name);
          setIndex((i) => (list.length ? Math.min(i, list.length - 1) : 0));
        }
      } catch (e) {
        console.error('[BranchView] load', e);
      }
    }
    load();
    const t = setInterval(load, 15000);
    return () => { alive = false; clearInterval(t); };
  }, [code]);

// ⬇⬇⬇ Pon esto DESPUÉS del useEffect que carga la cola
useEffect(() => {
  let alive = true;
  (async () => {
    try {
      // Si ya tenemos nombre “humano”, no hacemos nada
      if (branchName && branchName !== code) return;

      const res = await fetch(`${API}/branches`);
      if (!res.ok) return;
      const list = await res.json();
      if (!alive) return;

      if (Array.isArray(list)) {
        const b = list.find((x) => String(x.code) === String(code));
        if (b?.name) setBranchName(b.name);
      }
    } catch (e) {
      // silencioso
    }
  })();
  return () => { alive = false; };
}, [code, branchName]);



  // Cambio con transición suave (fade + letterbox + zoom)
  const safeSwitch = async (nextIdx) => {
    if (!videos.length || switchingRef.current) return;
    switchingRef.current = true;

    // activa animaciones CSS
    setTransitioning(true);
    setFading(true);

    // tiempos suaves y coherentes con CSS (≈ 800ms out + 900ms in)
    await new Promise((r) => setTimeout(r, 800));
    setIndex((nextIdx + videos.length) % videos.length);
    await new Promise((r) => setTimeout(r, 900));

    setFading(false);
    setTransitioning(false);
    switchingRef.current = false;
  };
  const next = () => safeSwitch(index + 1);
  const prev = () => safeSwitch(index - 1);

  // Preparar el <video> al cambiar "now"
  useEffect(() => {
    setMessage('');
    setNeedsClickForSound(false);
    setResolvedSrc('');

    const el = videoRef.current;
    if (!el || !now) return;

    const file = now.filename || now.file || '';
    const url = toStorageUrl(file);
    setResolvedSrc(url);
    if (!url) return;

    // reiniciar fuentes
    el.pause();
    el.removeAttribute('src');
    while (el.firstChild) el.removeChild(el.firstChild);

    const source = document.createElement('source');
    source.src = url;
    source.type = guessMime(url);
    el.appendChild(source);

    // preferimos con sonido; si el navegador lo bloquea, caemos a mute + CTA
    el.playsInline = true;
    el.preload = 'auto';
    el.muted = false;
    el.load();

    el.play()
      .then(() => setNeedsClickForSound(false))
      .catch(async () => {
        try {
          el.muted = true;
          await el.play();
          setNeedsClickForSound(true);
        } catch {
          setNeedsClickForSound(true);
          setMessage('El navegador requiere una interacción para iniciar el video.');
        }
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [now?.id]);

  const onEnded = () => { if (videos.length) next(); };
  const onError = async () => {
    if (!now) return;
    const id = now.id ?? `i${index}`;
    errorCountRef.current[id] = (errorCountRef.current[id] || 0) + 1;

    const allFailed = videos.length &&
      videos.every((v, i) => (errorCountRef.current[v.id ?? `i${i}`] || 0) >= 2);
    if (allFailed) {
      setMessage('No fue posible reproducir ningún video. Verifica que /storage/videos/... sea accesible.');
      return;
    }
    await new Promise((r) => setTimeout(r, 600));
    next();
  };

  const enableSound = async () => {
    const el = videoRef.current;
    if (!el) return;
    try {
      el.muted = false;
      await el.play();
      setNeedsClickForSound(false);
      setMessage('');
    } catch {
      setMessage('No se pudo activar el sonido automáticamente. Intenta de nuevo.');
    }
  };

  const title = useMemo(() => now?.title || '—', [now]);

  return (
    <div className="branch-root">
      <div className="branch-card">
        <header className="branch-header">
          <h1 className="branch-title">{branchName}</h1>
          <div className="branch-sub">
            Reproduciendo: <strong>{title}</strong>
          </div>
        </header>

        <div className={`video-shell ${transitioning ? 'is-transitioning' : ''}`}>
          {/* Fade cinematográfico */}
          <div className={`fade-layer ${fading ? 'fade-in' : 'fade-out'}`} />

          {/* Barras letterbox + zoom durante la transición */}
          <div className="bars" aria-hidden="true" />

          <video
            id="branch-video"
            ref={videoRef}
            // ⬇⬇⬇  SIN UI nativa del video
            controls={false}
            playsInline
            disablePictureInPicture
            controlsList="nodownload noplaybackrate nofullscreen noremoteplayback"
            onContextMenu={(e) => e.preventDefault()}
            // eventos
            onEnded={onEnded}
            onError={onError}
          />
          {needsClickForSound && (
            <button className="sound-cta" onClick={enableSound} title="Activar sonido">
              🔊 Tocar para activar sonido
            </button>
          )}
        </div>

        <div className="controls">
          <button onClick={prev} title="Anterior">⏮️ Anterior</button>
          <button onClick={() => videoRef.current?.play()} title="Play">▶️ Play</button>
          <button onClick={() => videoRef.current?.pause()} title="Pausa">⏸️ Pausa</button>
          <button onClick={next} title="Siguiente">⏭️ Siguiente</button>
          <button
            className="is-muted"
            onClick={() => {
              const v = videoRef.current;
              if (!v) return;
              v.muted = !v.muted;
            }}
            title="Mute/Unmute"
          >
            🔊 / 🔇
          </button>
          <button
            className="is-cta"
            onClick={() => videoRef.current?.requestFullscreen?.()}
            title="Pantalla completa"
          >
            ⛶ Pantalla completa
          </button>
        </div>

        <div className="queue">
          {videos.length === 0 ? (
            <div className="notice">Sin videos en cola.</div>
          ) : (
            <ul>
              {videos.map((v, i) => (
                <li
                  key={v.id ?? `i${i}`}
                  className={i === index ? 'playing' : ''}
                  onClick={() => safeSwitch(i)}
                >
                  {v.title}
                </li>
              ))}
            </ul>
          )}
        </div>

        <footer className="branch-foot">
          <strong>URL:</strong> {resolvedSrc || '—'}
          {message ? <span style={{ marginInlineStart: 10, color: '#fca5a5' }}>• {message}</span> : null}
        </footer>
      </div>
    </div>
  );
}
