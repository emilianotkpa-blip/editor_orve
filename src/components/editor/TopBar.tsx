import { useState } from 'react'
import { useLandingStore } from '../../store/useLandingStore'

export function TopBar() {
  const {
    viewport, setViewport, saveLanding, publishLanding,
    saveStatus, isSaving, isPublishing, config, email,
    setPreviewing, theme, toggleTheme,
    undo, redo, past, future,
  } = useLandingStore()

  const canUndo = past.length > 0
  const canRedo = future.length > 0

  const [linkOpen, setLinkOpen] = useState(false)

  const publicUrl = `${window.location.origin}/u/${config.slug}`
  const published = !!config.publicada

  const saveLabel =
    saveStatus === 'saving' ? 'Guardando…' :
    saveStatus === 'saved'  ? 'Guardado'   :
    saveStatus === 'error'  ? 'Error al guardar' :
    'Sin guardar'

  const saveDotColor =
    saveStatus === 'saved'  ? '#38D030' :
    saveStatus === 'saving' ? '#C99A3A' :
    saveStatus === 'error'  ? '#FF6B6B' :
    '#7C8388'

  const initials = email ? email.substring(0, 2).toUpperCase() : 'OR'

  async function handlePublish() {
    const ok = await publishLanding()
    if (ok) setLinkOpen(true)
  }

  return (
    <div style={{
      position: 'relative', height: 52, flexShrink: 0,
      background: 'var(--ed-bar)', borderBottom: '1px solid var(--ed-border-2)',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 14px', zIndex: 30,
    }}>
      {/* left: logo + breadcrumb + status */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            width: 22, height: 22,
            background: '#38D030', transform: 'rotate(45deg)',
            borderRadius: 5, display: 'inline-block',
          }} />
          <span style={{ fontSize: 16, fontWeight: 900, letterSpacing: '1.1px', color: '#fff' }}>ORVE</span>
        </div>
        <span style={{ width: 1, height: 22, background: 'var(--ed-border-2)' }} />
        <span style={{ color: 'var(--ed-text)', fontWeight: 800, fontSize: 13 }}>Mi Landing</span>

        {/* draft / published status */}
        <StatusChip
          published={published}
          onClick={() => published && setLinkOpen((v) => !v)}
        />
      </div>

      {/* center: device switch */}
      <div style={{
        position: 'absolute', left: '50%', top: '50%',
        transform: 'translate(-50%,-50%)',
        display: 'flex',
        background: '#262626', border: '1px solid #343434',
        borderRadius: 9, padding: 3, gap: 3,
      }}>
        <ViewBtn active={viewport === 'escritorio'} onClick={() => setViewport('escritorio')} icon="desk" label="Escritorio" />
        <ViewBtn active={viewport === 'movil'}      onClick={() => setViewport('movil')}      icon="mob"  label="Móvil" />
      </div>

      {/* right: undo/redo + theme + preview + save status + save + publish + avatar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
        <div style={{ display: 'flex', gap: 2 }}>
          <HistoryBtn title="Deshacer (Ctrl+Z)" disabled={!canUndo} onClick={undo}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 14L4 9l5-5"/><path d="M4 9h11a5 5 0 0 1 0 10h-1"/>
            </svg>
          </HistoryBtn>
          <HistoryBtn title="Rehacer (Ctrl+Shift+Z)" disabled={!canRedo} onClick={redo}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 14l5-5-5-5"/><path d="M20 9H9a5 5 0 0 0 0 10h1"/>
            </svg>
          </HistoryBtn>
        </div>
        <span style={{ width: 1, height: 22, background: 'var(--ed-border-2)' }} />

        <ThemeToggle theme={theme} onClick={toggleTheme} />

        <button
          onClick={() => setPreviewing(true)}
          title="Ver cómo se publicará"
          style={{
            display: 'flex', alignItems: 'center', gap: 7,
            background: 'transparent', border: '1px solid var(--ed-border-2)',
            color: 'var(--ed-text)', fontFamily: 'inherit', fontSize: 13, fontWeight: 700,
            padding: '7px 12px', borderRadius: 8, cursor: 'pointer',
          }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/>
          </svg>
          Vista previa
        </button>

        <span style={{ width: 1, height: 22, background: 'var(--ed-border-2)' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, color: 'var(--ed-text-3)', fontSize: 12, fontWeight: 700 }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: saveDotColor, display: 'inline-block' }} />
          {saveLabel}
        </div>
        <button
          onClick={() => saveLanding()}
          disabled={isSaving}
          style={{
            background: 'transparent', border: '1px solid var(--ed-border-2)',
            color: 'var(--ed-text)', fontFamily: 'inherit', fontSize: 13, fontWeight: 700,
            padding: '7px 14px', borderRadius: 8, cursor: isSaving ? 'wait' : 'pointer',
            opacity: isSaving ? 0.6 : 1,
          }}
        >
          Guardar
        </button>

        {/* publish + link popover */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={handlePublish}
            disabled={isPublishing}
            style={{
              background: '#38D030', border: 'none', color: '#063800',
              fontFamily: 'inherit', fontSize: 13, fontWeight: 800,
              padding: '8px 18px', borderRadius: 8, cursor: isPublishing ? 'wait' : 'pointer',
              boxShadow: '0 4px 12px rgba(56,208,48,.25)',
              opacity: isPublishing ? 0.7 : 1,
            }}
          >
            {isPublishing ? 'Publicando…' : published ? 'Republicar' : 'Publicar'}
          </button>

          {linkOpen && (
            <PublicLinkPopover url={publicUrl} onClose={() => setLinkOpen(false)} />
          )}
        </div>

        <div style={{
          width: 32, height: 32, borderRadius: '50%',
          background: 'linear-gradient(135deg,#108707,#38D030)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#063800', fontSize: 12, fontWeight: 900, marginLeft: 4,
        }}>
          {initials}
        </div>
      </div>
    </div>
  )
}

function StatusChip({ published, onClick }: { published: boolean; onClick: () => void }) {
  if (published) {
    return (
      <span
        onClick={onClick}
        title="Ver enlace público"
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          fontSize: 11, fontWeight: 800, letterSpacing: '.5px',
          color: '#38D030', cursor: 'pointer',
          background: 'rgba(56,208,48,.14)', border: '1px solid rgba(56,208,48,.35)',
          padding: '3px 9px', borderRadius: 6,
        }}>
        <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#38D030' }} />
        PUBLICADO
      </span>
    )
  }
  return (
    <span style={{
      fontSize: 11, fontWeight: 800, letterSpacing: '.5px',
      color: '#C99A3A',
      background: 'rgba(201,154,58,.14)', border: '1px solid rgba(201,154,58,.3)',
      padding: '3px 9px', borderRadius: 6,
    }}>BORRADOR</span>
  )
}

function PublicLinkPopover({ url, onClose }: { url: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    try {
      await navigator.clipboard.writeText(url)
    } catch {
      // fallback for non-secure contexts
      const ta = document.createElement('textarea')
      ta.value = url; document.body.appendChild(ta); ta.select()
      try { document.execCommand('copy') } catch { /* noop */ }
      document.body.removeChild(ta)
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }

  return (
    <>
      <div style={{ position: 'fixed', inset: 0, zIndex: 40 }} onClick={onClose} />
      <div style={{
        position: 'absolute', top: 'calc(100% + 8px)', right: 0, zIndex: 41,
        width: 320, background: '#1E1E1E', border: '1px solid #303030',
        borderRadius: 12, padding: 14, boxShadow: '0 14px 40px rgba(0,0,0,.6)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#38D030' }} />
          <span style={{ fontSize: 13, fontWeight: 800, color: '#ECEEEF' }}>Tu landing está publicada</span>
        </div>

        <div style={{ fontSize: 10, color: '#6C7278', fontWeight: 700, marginBottom: 5, textTransform: 'uppercase', letterSpacing: '.5px' }}>
          Enlace público
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <input
            readOnly
            value={url}
            onFocus={(e) => e.currentTarget.select()}
            style={{
              flex: 1, background: '#141414', border: '1px solid #2B2B2B',
              borderRadius: 7, padding: '8px 9px', fontSize: 12, color: '#C9CED0',
              fontFamily: 'monospace', outline: 'none', boxSizing: 'border-box',
            }}
          />
          <button
            onClick={copy}
            style={{
              flexShrink: 0, padding: '8px 12px', borderRadius: 7, cursor: 'pointer',
              background: copied ? '#38D030' : 'rgba(56,208,48,.14)',
              border: '1px solid rgba(56,208,48,.4)',
              color: copied ? '#063800' : '#38D030', fontSize: 12, fontWeight: 800, fontFamily: 'inherit',
            }}
          >
            {copied ? 'Copiado ✓' : 'Copiar'}
          </button>
        </div>

        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            marginTop: 8, padding: '8px 0', borderRadius: 7,
            background: 'transparent', border: '1px solid #3A3A3A',
            color: '#ECEEEF', fontSize: 12, fontWeight: 700, textDecoration: 'none',
          }}
        >
          Abrir en nueva pestaña ↗
        </a>
      </div>
    </>
  )
}

function HistoryBtn({ children, title, disabled, onClick }: { children: React.ReactNode; title: string; disabled: boolean; onClick: () => void }) {
  return (
    <button
      title={title}
      disabled={disabled}
      onClick={onClick}
      style={{
        width: 32, height: 32, borderRadius: 7, padding: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'transparent', border: 'none',
        color: disabled ? 'var(--ed-border-2)' : 'var(--ed-text-2)',
        cursor: disabled ? 'default' : 'pointer',
      }}
    >
      {children}
    </button>
  )
}

function ThemeToggle({ theme, onClick }: { theme: 'dark' | 'light'; onClick: () => void }) {
  const dark = theme === 'dark'
  return (
    <button
      onClick={onClick}
      title={dark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
      style={{
        width: 34, height: 34, borderRadius: 8, cursor: 'pointer',
        background: 'transparent', border: '1px solid var(--ed-border-2)',
        color: 'var(--ed-text-2)', display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'color .15s, border-color .15s',
      }}
    >
      {dark ? (
        // sun
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <circle cx="12" cy="12" r="4"/>
          <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>
        </svg>
      ) : (
        // moon
        <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor">
          <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>
        </svg>
      )}
    </button>
  )
}

function ViewBtn({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: string; label: string }) {
  const iconEl = icon === 'desk'
    ? <span style={{ width: 15, height: 11, border: `1.7px solid ${active ? '#063800' : '#9AA0A6'}`, borderRadius: 2, display: 'inline-block' }} />
    : <span style={{ width: 9, height: 14, border: `1.7px solid ${active ? '#063800' : '#9AA0A6'}`, borderRadius: 2, display: 'inline-block' }} />
  return (
    <button onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: 7,
      padding: '6px 14px', borderRadius: 6, border: 'none', cursor: 'pointer',
      background: active ? '#38D030' : 'transparent',
      color: active ? '#063800' : '#9AA0A6',
      fontSize: 13, fontWeight: active ? 800 : 700,
      fontFamily: 'inherit',
    }}>
      {iconEl} {label}
    </button>
  )
}
