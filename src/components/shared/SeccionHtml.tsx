import type { Seccion } from '../../types/landing'

/**
 * Una franja entera de la landing servida como HTML del asesor. Va en un iframe con
 * `sandbox`, igual que el bloque suelto y que la pagina completa: se puede pegar
 * cualquier maquetado y aun asi queda encerrado — no alcanza al formulario de leads
 * ni al resto de la pagina. Sin `allow-scripts` los <script> ni corren.
 */
export function SeccionHtml({
  seccion, alto, placeholder,
}: {
  seccion: Seccion
  alto: number
  /** En el editor se muestra una pista cuando aun no hay codigo. En publico, nada. */
  placeholder?: boolean
}) {
  const html = String(seccion.html ?? '')
  if (!html.trim()) {
    if (!placeholder) return null
    return (
      <div style={{
        position: 'absolute', inset: 0, zIndex: 1,
        height: alto, display: 'flex', flexDirection: 'column', gap: 6,
        alignItems: 'center', justifyContent: 'center', textAlign: 'center',
        background: '#0E1411', color: 'rgba(255,255,255,.62)', padding: 28,
      }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,.85)' }}>
          Sección en HTML
        </div>
        <div style={{ fontSize: 12, maxWidth: 380, lineHeight: 1.5 }}>
          Pega el código en el panel de la derecha y aparecerá aquí.
        </div>
      </div>
    )
  }
  // El iframe va aislado, asi que no hereda nada de la pagina: el color de la
  // seccion se copia dentro. Si el fondo es una imagen no se puede (no viaja al
  // documento) y manda lo que traiga el HTML.
  const fondoSeccion = seccion.fondo?.tipo === 'color' ? (seccion.fondo.valor || '#0E1411') : '#ffffff'
  const esDocumento = /<html[\s>]/i.test(html)
  const doc = esDocumento
    ? html
    : `<!doctype html><html><head><meta charset="utf-8">` +
      `<meta name="viewport" content="width=device-width,initial-scale=1">` +
      `<style>html,body{margin:0;padding:0;background:${fondoSeccion};font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif}` +
      `img,video,iframe{max-width:100%}</style></head><body>${html}</body></html>`
  const permisos = ['allow-popups', 'allow-popups-to-escape-sandbox', 'allow-forms']
  if (seccion.htmlPermitirScripts) permisos.push('allow-scripts')
  return (
    <iframe
      srcDoc={doc}
      title={seccion.nombre || 'Sección HTML'}
      sandbox={permisos.join(' ')}
      style={{
        // el fondo de la seccion es absoluto: en flujo normal el iframe queda tapado.
        position: 'absolute', inset: 0, zIndex: 1,
        display: 'block', width: '100%', height: alto, border: 0,
        background: fondoSeccion,
      }}
    />
  )
}
