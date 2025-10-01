import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  componentDidCatch(error, info) {
    // Puedes enviar a un servicio de logs si quieres
    console.error('[ErrorBoundary]', error, info);
  }
  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    return (
      <div style={{
        padding: 16,
        margin: 16,
        borderRadius: 12,
        border: '1px solid rgba(255,255,255,.15)',
        background: 'rgba(0,0,0,.35)',
        color: '#fff',
        fontFamily: 'system-ui, sans-serif'
      }}>
        <h3 style={{marginTop:0}}>⚠️ Falló un componente</h3>
        <pre style={{whiteSpace:'pre-wrap'}}>{String(error?.message || error)}</pre>
        <button
          onClick={() => this.setState({ error: null })}
          style={{
            marginTop: 12, padding: '8px 12px', borderRadius: 8, border: '1px solid #3b82f6',
            background: 'rgba(59,130,246,.15)', color:'#e5e7eb', cursor:'pointer'
          }}
        >
          Reintentar render
        </button>
      </div>
    );
  }
}
