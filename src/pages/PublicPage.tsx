import { useEffect, useState } from 'react'
import { apiPublicLanding } from '../api/webhooks'
import { ElementRenderer } from '../components/shared/ElementRenderer'
import type { LandingConfig } from '../types/landing'
import { STAGE_W } from '../lib/layout'
import { sectionFondoLayer } from '../lib/sections'
import { BackgroundLayer } from '../components/shared/BackgroundLayer'
import { resolveSrc } from '../lib/images'

type Status = 'loading' | 'ready' | 'unavailable'

export function PublicPage({ slug }: { slug: string }) {
  const [status, setStatus]       = useState<Status>('loading')
  const [config, setConfig]       = useState<LandingConfig | null>(null)
  const [signedUrls, setSigned]   = useState<Record<string, string>>({})

  // public page needs scrolling; editor locks overflow
  useEffect(() => {
    document.body.style.overflow = 'auto'
    document.title = `ORVE · ${slug}`
    return () => { document.body.style.overflow = '' }
  }, [slug])

  useEffect(() => {
    apiPublicLanding(slug)
      .then((res) => {
        if (res.disponible && res.config) {
          setConfig(res.config)
          setSigned(res.signedUrls ?? {})
          setStatus('ready')
        } else {
          setStatus('unavailable')
        }
      })
      .catch(() => setStatus('unavailable'))
  }, [slug])

  if (status === 'loading')     return <LoadingScreen />
  if (status === 'unavailable') return <UnavailableScreen slug={slug} />

  return <LandingView config={config!} signedUrls={signedUrls} />
}

// ── Landing View ───────────────────────────────────────────────────────────

export function LandingView({ config, signedUrls }: { config: LandingConfig; signedUrls: Record<string, string> }) {
  const [vw, setVw] = useState(typeof window !== 'undefined' ? document.documentElement.clientWidth : STAGE_W)
  useEffect(() => {
    const onResize = () => setVw(document.documentElement.clientWidth)
    onResize()
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const pagina   = config.pagina ?? { ancho: 'completa' as const }
  const acotada  = pagina.ancho === 'acotada'
  const maxW     = pagina.maxWidth ?? 1000
  const hPad     = acotada ? 32 : 0   // horizontal breathing room for the floating card
  // render width of the stage: full viewport, or capped to maxWidth when acotada
  const renderW  = acotada ? Math.min(vw - hPad, maxW) : vw
  const scale    = renderW / STAGE_W

  const pageFondoTipo = pagina.fondoTipo ?? 'color'
  const pageBgUrl     = resolveSrc(pagina.fondoImagen, signedUrls)

  // card-like shadow around the landing container (acotada only)
  const sombraActiva = pagina.sombraActiva !== false
  const cardShadow   = acotada && sombraActiva ? pageContainerShadow(pagina.sombraIntensidad ?? 60) : undefined

  return (
    <div style={{
      position: 'relative',
      minHeight: '100vh',
      width: '100%',
      overflowX: 'hidden',
      background: '#0A0A0A',
      fontFamily: 'Mulish, sans-serif',
    }}>
      {/* page-around background (visible when acotada) */}
      {acotada && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 0 }}>
          <BackgroundLayer
            tipo={pageFondoTipo}
            color={pagina.fondo || '#0A0A0A'}
            url={pageBgUrl}
            ajustes={pagina.fondoAjustes}
            fallback="#0A0A0A"
          />
        </div>
      )}

      {/* content centered; in acotada it becomes a floating card */}
      <div style={{
        position: 'relative', zIndex: 1,
        display: 'flex', justifyContent: 'center',
        padding: acotada ? '40px 16px' : 0,
      }}>
        <div style={{
          width: renderW,
          maxWidth: '100%',
          borderRadius: acotada ? 12 : 0,
          overflow: 'hidden',
          boxShadow: cardShadow,
        }}>
          {config.secciones.map((sec) => {
            const sectionH = sec.altura?.escritorio ?? 580
            const fondoLayer = sectionFondoLayer(sec.fondo, signedUrls)
            return (
              <div
                key={sec.id}
                id={sec.id}
                style={{
                  position: 'relative',
                  width: renderW,
                  maxWidth: '100%',
                  height: Math.round(sectionH * scale),
                  overflow: 'hidden',
                }}
              >
                <div style={{
                  position: 'absolute', top: 0, left: 0,
                  width: STAGE_W, height: sectionH,
                  transform: `scale(${scale})`, transformOrigin: 'top left',
                }}>
                  <BackgroundLayer {...fondoLayer} />
                  {sec.elementos
                    .slice()
                    .sort((a, b) => a.geometria.escritorio.z - b.geometria.escritorio.z)
                    .map((el) => (
                      <ElementRenderer
                        key={el.id}
                        element={el}
                        viewport="escritorio"
                        signedUrls={signedUrls}
                        isSelected={false}
                      />
                    ))
                  }
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// Elegant, intensity-scaled shadow for the landing card (acotada mode).
function pageContainerShadow(intensidad: number): string {
  const t = Math.max(0, Math.min(100, intensidad)) / 100
  const y     = Math.round(8 + t * 24)         // 8..32
  const blur  = Math.round(28 + t * 64)        // 28..92
  const alpha = (0.18 + t * 0.42).toFixed(2)   // .18..0.60
  return `0 ${y}px ${blur}px rgba(0,0,0,${alpha})`
}

// ── Loading ────────────────────────────────────────────────────────────────

function LoadingScreen() {
  return (
    <div style={{
      minHeight: '100vh', background: '#0A0A0A',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      fontFamily: 'Mulish, sans-serif', gap: 16,
    }}>
      <div style={{
        width: 38, height: 38,
        border: '3px solid #1E1E1E',
        borderTopColor: '#38D030',
        borderRadius: '50%',
        animation: 'spin .75s linear infinite',
      }} />
      <span style={{ color: '#4F5458', fontSize: 13, fontWeight: 700 }}>Cargando…</span>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}

// ── Unavailable ────────────────────────────────────────────────────────────

function UnavailableScreen({ slug }: { slug: string }) {
  return (
    <div style={{
      minHeight: '100vh', background: '#0A0A0A',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'Mulish, sans-serif',
    }}>
      <div style={{ textAlign: 'center', padding: '40px 24px' }}>
        {/* ORVE diamond */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, marginBottom: 40 }}>
          <div style={{
            width: 44, height: 44,
            background: '#38D030',
            transform: 'rotate(45deg)',
            borderRadius: 10,
            flexShrink: 0,
            boxShadow: '0 0 28px rgba(56,208,48,.18)',
          }} />
          <span style={{ fontSize: 26, fontWeight: 900, color: '#ECEEEF', letterSpacing: '1.5px' }}>
            ORVE
          </span>
        </div>

        <div style={{
          fontSize: 44, marginBottom: 20,
          filter: 'grayscale(1)', opacity: .5,
          lineHeight: 1,
        }}>💎</div>

        <div style={{ fontSize: 22, fontWeight: 900, color: '#ECEEEF', marginBottom: 8 }}>
          Perfil no disponible
        </div>
        <div style={{ fontSize: 14, color: '#5A5F63', fontWeight: 600, marginBottom: 4 }}>
          /{slug}
        </div>
        <div style={{ fontSize: 13, color: '#3A4045', fontWeight: 600 }}>
          Este asesor aún no ha publicado su landing.
        </div>
      </div>
    </div>
  )
}
