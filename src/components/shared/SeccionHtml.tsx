import type { Seccion } from '../../types/landing'
import { IframeHtml } from './IframeHtml'
import { TOPE_AUTO } from '../../lib/html-libre'

/**
 * Una franja entera de la landing servida como HTML del asesor (iframe aislado, ver
 * IframeHtml). Va EN FLUJO y al ancho real de la pantalla — no dentro del lienzo
 * escalado de 900px —, asi el HTML responsivo se ve como celular en el celular.
 * El alto por defecto es automatico: la franja mide lo que mida el contenido.
 */
export function SeccionHtml({
  seccion, placeholder,
}: {
  seccion: Seccion
  /** En el editor se muestra una pista cuando aun no hay codigo. En publico, solo el fondo. */
  placeholder?: boolean
}) {
  const html = String(seccion.html ?? '')
  const altoFijo = seccion.altura?.escritorio ?? 580
  if (!html.trim()) {
    if (!placeholder) return <div style={{ height: altoFijo }} />
    return (
      <div style={{
        position: 'relative', zIndex: 1,
        height: altoFijo, display: 'flex', flexDirection: 'column', gap: 6,
        alignItems: 'center', justifyContent: 'center', textAlign: 'center',
        background: '#0E1411', color: 'rgba(255,255,255,.62)', padding: 28,
      }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,.85)' }}>
          Sección en HTML
        </div>
        <div style={{ fontSize: 12, maxWidth: 380, lineHeight: 1.5 }}>
          Pega el código (o carga tu archivo .html) en el panel de la derecha y aparecerá aquí.
        </div>
      </div>
    )
  }
  const auto = (seccion.htmlAlto ?? 'auto') === 'auto'
  const tope = seccion.htmlAltoMax && seccion.htmlAltoMax > 0 ? seccion.htmlAltoMax : TOPE_AUTO
  // El iframe no hereda nada de la pagina: el color de la seccion se copia dentro. Si el
  // fondo es una imagen no viaja al documento y manda lo que traiga el HTML.
  const fondo = seccion.fondo?.tipo === 'color' ? (seccion.fondo.valor || '#0E1411') : '#ffffff'
  return (
    <IframeHtml
      html={html}
      scripts={seccion.htmlPermitirScripts === true}
      fondo={fondo}
      alto={auto ? 'auto' : altoFijo}
      tope={tope}
      inicial={Math.min(altoFijo, tope)}
      title={seccion.nombre || 'Sección HTML'}
      style={{ position: 'relative', zIndex: 1 }}
    />
  )
}
