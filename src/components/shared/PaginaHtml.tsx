import type { EstiloPagina } from '../../types/landing'
import { BackgroundLayer } from './BackgroundLayer'
import { IframeHtml } from './IframeHtml'

// Elegant, intensity-scaled shadow for the landing card (acotada mode).
export function pageContainerShadow(intensidad: number): string {
  const t = Math.max(0, Math.min(100, intensidad)) / 100
  const y     = Math.round(8 + t * 24)         // 8..32
  const blur  = Math.round(28 + t * 64)        // 28..92
  const alpha = (0.18 + t * 0.42).toFixed(2)   // .18..0.60
  return `0 ${y}px ${blur}px rgba(0,0,0,${alpha})`
}

/**
 * Pagina completa en HTML ocupando su contenedor (que debe tener tamaño). Se desplaza
 * DENTRO del iframe, como un sitio normal, para que sus 100vh, menus fijos y anclas
 * funcionen igual que si se abriera solo.
 * - Completa: todo el contenedor.
 * - Acotada: tarjeta centrada (ancho maximo, sombra) con el fondo de la pagina alrededor.
 * La usan la pagina publica y el lienzo, asi lo que se ve al editar es lo que se publica.
 */
export function PaginaHtml({
  html, scripts, pagina, fondoUrl, ancho, title,
}: {
  html: string
  scripts: boolean
  pagina: EstiloPagina
  fondoUrl?: string
  /** Ancho de la pantalla donde se ve (para el margen de la tarjeta en celular). */
  ancho: number
  title: string
}) {
  const acotada = pagina.ancho === 'acotada'
  const sombra = acotada && pagina.sombraActiva !== false ? pageContainerShadow(pagina.sombraIntensidad ?? 60) : undefined
  const doc = (
    <IframeHtml
      html={html}
      scripts={scripts}
      alto="llenar"
      title={title}
      style={acotada ? { borderRadius: 12, boxShadow: sombra } : undefined}
    />
  )
  if (!acotada) return <div style={{ position: 'absolute', inset: 0 }}>{doc}</div>
  const angosta = ancho < 640
  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <BackgroundLayer
        tipo={pagina.fondoTipo ?? 'color'}
        color={pagina.fondo || '#0A0A0A'}
        url={fondoUrl}
        ajustes={pagina.fondoAjustes}
        fallback="#0A0A0A"
      />
      <div style={{
        position: 'absolute', inset: 0, boxSizing: 'border-box',
        display: 'flex', justifyContent: 'center',
        padding: angosta ? '10px 8px' : '40px 16px',
      }}>
        <div style={{ width: '100%', maxWidth: pagina.maxWidth ?? 1000, height: '100%', position: 'relative' }}>{doc}</div>
      </div>
    </div>
  )
}
