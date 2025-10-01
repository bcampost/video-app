import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import './BranchView.css';

const API = 'http://127.0.0.1:8000/api';

// Heurística para resolver la URL del video según lo que devuelva tu API
function resolveSrc(v) {
  // campos comunes
  if (typeof v === 'string') return v;
  if (!v || typeof v !== 'object') return '';

  return (
    v.url ??
    v.file_url ??
    v.fileUrl ??
    v.path ??
    v.file ??
    (v.filename ? `http://127.0.0.1:8000/storage/videos/${v.filename}` : '')
  );
}

function labelFrom(v) {
  if (!v) return '';
  return (
    v.title ??
    v.name ??
    v.filename ??
    v.file?.name ??
    String(v.id ?? '')
  );
}

export default function BranchView() {
  const { code } = useParams();               // /sucursal/:code
  const videoRef = useRef(null);
  const [branch, setBranch] = useState(null); // {id, name, code}
  const [rawVideos, setRawVideos] = useState([]);
  const [index, setIndex] = useState(0);
  const [muted, setMuted] = useState(true);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  const storageKeyVol = `branch-player-volume:${code}`;
  const storageKeyIdx = `branch-player-index:${code}`;

  const playlist = useMemo(() => {
    return (rawVideos || [])
      .map(v => ({ id: v.id ?? labelFrom(v), title: labelFrom(v), src: resolveSrc(v) }))
      .filter(it => !!it.src);
  }, [rawVideos]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      setErr(null);
      try {
        // 1) Sucursales (para nombre legible)
        const bRes = await axios.get(`${API}/branches`);
        const branches = Array.isArray(bRes.data) ? bRes.data : [];
        const found = branches.find(b => String(b.code) === String(code));
        if (mounted) setBranch(found ?? { name: code, code });

        // 2) Playlist asignada a la sucursal (pública)
        const vRes = await axios.get(`${API}/branch/${encodeURIComponent(code)}/videos`);
        const list =
          Array.isArray(vRes.data) ? vRes.data
          : Array.isArray(vRes.data?.data) ? vRes.data.data
          : Array.isArray(vRes.data?.videos) ? vRes.data.videos
          : [];
        if (mounted) setRawVideos(list);
      } catch (e) {
        console.error('BranchView fetch error:', e);
        if (mounted) setErr('No se pudo cargar la lista de reproducción.');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [code]);

  // Restaurar volumen e índice
  useEffect(() => {
    const v = Number(localStorage.getItem(storageKeyVol));
    if (videoRef.current && !Number.isNaN(v) && v >= 0 && v <= 1) {
      videoRef.current.volume = v;
      if (v > 0) setMuted(false);
    }
    const savedIdx = Number(localStorage.getItem(storageKeyIdx));
    if (!Number.isNaN(savedIdx) && savedIdx >= 0) {
      setIndex(savedIdx);
    }
  }, [storageKeyVol, storageKeyIdx]);

  // Guardar índice al cambiar
  useEffect(() => {
    localStorage.setItem(storageKeyIdx, String(index));
  }, [index, storageKeyIdx]);

  const current = playlist[index];

  const next = () => {
    if (playlist.length === 0) return;
    setIndex((i) => (i + 1) % playlist.length);
  };

  const prev = () => {
    if (playlist.length === 0) return;
    setIndex((i) => (i - 1 + playlist.length) % playlist.length);
  };

  const onEnded = () => {
    if (playlist.length <= 1) {
      // si sólo hay uno, vuelve a empezar
      videoRef.current?.play?.();
      return;
    }
    next();
  };

  const onError = () => {
    // si falla, intenta pasar al siguiente para no “congelar” la pantalla
    console.warn('Error al reproducir, saltando al siguiente');
    next();
  };

  const onVolumeChange = () => {
    const v = videoRef.current?.volume ?? 1;
    localStorage.setItem(storageKeyVol, String(v));
    if (v > 0 && muted) setMuted(false);
  };

  const toggleMute = () => setMuted((m) => !m);

  const toggleFullscreen = () => {
    const el = videoRef.current;
    if (!el) return;
    if (document.fullscreenElement) document.exitFullscreen();
    else el.requestFullscreen?.();
  };

  const onKeyDown = (e) => {
    const el = videoRef.current;
    if (!el) return;
    const key = e.key.toLowerCase();
    if (key === 'f') {
      toggleFullscreen();
    } else if (key === 'm') {
      toggleMute();
    } else if (key === 'arrowright') {
      el.currentTime = Math.min((el.currentTime ?? 0) + 5, el.duration ?? Infinity);
    } else if (key === 'arrowleft') {
      el.currentTime = Math.max((el.currentTime ?? 0) - 5, 0);
    } else if (key === ' ') {
      e.preventDefault();
      if (el.paused) el.play(); else el.pause();
    }
  };

  return (
    <div className="branch-view" onKeyDown={onKeyDown} tabIndex={0}>
      <header className="bv-header">
        <h1 className="bv-title">Sucursal {branch?.name ?? code}</h1>
        <div className="bv-subtitle">
          {current ? <>Reproduciendo: <strong>{current.title}</strong></> : 'Sin videos asignados'}
        </div>
      </header>

      <main className="bv-main">
        {loading ? (
          <div className="bv-card bv-loading">Cargando…</div>
        ) : err ? (
          <div className="bv-card bv-error">{err}</div>
        ) : playlist.length === 0 ? (
          <div className="bv-card">No hay videos para esta sucursal.</div>
        ) : (
          <div className="player-wrapper">
            <video
              key={current?.src}          // reinicia al cambiar de fuente
              className="player"
              ref={videoRef}
              src={current?.src}
              controls
              controlsList="nodownload"
              preload="metadata"
              playsInline
              autoPlay
              muted={muted}
              onEnded={onEnded}
              onError={onError}
              onVolumeChange={onVolumeChange}
            />
            <div className="controls">
              <button className="btn" onClick={prev} title="Anterior">⏮</button>
              <button className="btn" onClick={() => videoRef.current?.pause?.()} title="Pausar">⏸</button>
              <button className="btn" onClick={() => videoRef.current?.play?.()} title="Reproducir">▶️</button>
              <button className="btn" onClick={next} title="Siguiente">⏭</button>
              <div className="spacer" />
              <button className="btn" onClick={toggleMute} title={muted ? 'Activar sonido (M)' : 'Silenciar (M)'}>{muted ? '🔇' : '🔊'}</button>
              <button className="btn" onClick={toggleFullscreen} title="Pantalla completa (F)">⛶</button>
            </div>
          </div>
        )}

        {playlist.length > 0 && (
          <ul className="playlist">
            {playlist.map((item, i) => (
              <li
                key={item.id ?? i}
                className={i === index ? 'active' : ''}
                onClick={() => setIndex(i)}
                title={item.title}
              >
                <span className="dot" />
                <span className="text">{item.title}</span>
              </li>
            ))}
          </ul>
        )}
      </main>

      <footer className="bv-footer">
        <small>Atajos: <kbd>F</kbd> pantalla completa, <kbd>M</kbd> mute, <kbd>←/→</kbd> ±5s, <kbd>Espacio</kbd> play/pausa.</small>
      </footer>
    </div>
  );
}
