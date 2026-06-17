import { useLandingStore } from '../../store/useLandingStore'
import { LandingView } from '../../pages/PublicPage'

// Full-screen preview of the landing exactly as it will be published:
// clean (no handles/controls), respecting width mode + page background.
export function PreviewOverlay() {
  const { config, signedUrls, setPreviewing } = useLandingStore()

  return (
    <div
      className="ed-fade-in"
      style={{
        position: 'fixed', inset: 0, zIndex: 5000,
        background: '#0A0A0A', overflow: 'auto',
      }}
    >
      <LandingView config={config} signedUrls={signedUrls} />

      {/* floating bar to return to editing */}
      <div style={{
        position: 'fixed', top: 16, left: '50%', transform: 'translateX(-50%)',
        zIndex: 5001, display: 'flex', alignItems: 'center', gap: 10,
        background: 'rgba(20,20,20,.92)', border: '1px solid rgba(255,255,255,.12)',
        borderRadius: 999, padding: '7px 8px 7px 16px',
        boxShadow: '0 10px 30px rgba(0,0,0,.5)', fontFamily: 'Mulish, sans-serif',
        backdropFilter: 'blur(6px)',
      }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, fontWeight: 700, color: '#9AA0A6' }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#38D030' }} />
          Vista previa
        </span>
        <button
          onClick={() => setPreviewing(false)}
          style={{
            display: 'flex', alignItems: 'center', gap: 7,
            background: '#38D030', border: 'none', color: '#063800',
            fontFamily: 'inherit', fontSize: 13, fontWeight: 800,
            padding: '7px 16px', borderRadius: 999, cursor: 'pointer',
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-5" />
            <path d="M18.5 2.5a2.1 2.1 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
          Volver a editar
        </button>
      </div>
    </div>
  )
}
