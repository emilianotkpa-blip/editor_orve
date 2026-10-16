import { useEffect, useState } from 'react'

/**
 * HTML del asesor (seccion entera o pagina completa). Siempre va en un iframe con
 * `sandbox`: se puede pegar cualquier maquetado y aun asi queda encerrado, sin
 * alcanzar el formulario de leads ni el resto de la pagina.
 */

/** Sin tope explicito, una seccion "automatica" no pasa de aqui (corta un bucle de 100vh). */
export const TOPE_AUTO = 20000
const ALTO_MIN = 40

export const esDocumento = (html: string) => /<html[\s>]|<!doctype\s|<body[\s>]/i.test(html)
export const traeScripts = (html: string) => /<script[\s>]/i.test(html)

/**
 * Permisos del sandbox.
 * - Con scripts: corren, pero con origen opaco (sin `allow-same-origin`), asi que no
 *   ven las cookies ni el almacenamiento del editor ni de la pagina publica.
 * - Sin scripts: se suma `allow-same-origin` para poder medir el documento y atender
 *   sus enlaces desde fuera. Es seguro porque dentro no puede correr ningun codigo;
 *   juntar los dos permisos SI seria peligroso, por eso nunca van juntos.
 */
export function permisosSandbox(scripts: boolean): string {
  const p = ['allow-popups', 'allow-popups-to-escape-sandbox', 'allow-forms', 'allow-downloads',
    'allow-top-navigation-to-custom-protocols']
  if (scripts) p.push('allow-scripts', 'allow-modals')
  else p.push('allow-same-origin')
  return p.join(' ')
}

/** Alto real del contenido (no del iframe): asi tambien puede encoger. */
export function medirDocumento(d: Document): number {
  const b = d.body, h = d.documentElement
  if (!b || !h) return 0
  const cs = d.defaultView?.getComputedStyle(b)
  const margen = cs ? (parseFloat(cs.marginTop) || 0) + (parseFloat(cs.marginBottom) || 0) : 0
  return Math.ceil(Math.max(h.getBoundingClientRect().height, b.scrollHeight + margen))
}

/**
 * Un enlace normal dentro del iframe navegaria el propio iframe: WhatsApp, Instagram
 * y casi todos los sitios se niegan a abrirse ahi y queda una pagina rota. Se abren
 * en otra pestaña. Las anclas (#seccion) y los enlaces con su propio target no se tocan.
 */
export function abrirEnlaceAfuera(e: MouseEvent) {
  if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey) return
  const t = e.target as Element | null
  const a = t && typeof t.closest === 'function' ? (t.closest('a[href]') as HTMLAnchorElement | null) : null
  if (!a) return
  const destino = (a.getAttribute('target') || '').toLowerCase()
  if (destino && destino !== '_self' && destino !== '_top' && destino !== '_parent') return
  const href = a.getAttribute('href') || ''
  if (!href || href.charAt(0) === '#' || /^javascript:/i.test(href)) return
  e.preventDefault()
  window.open(a.href, '_blank', 'noopener')
}

// Con scripts no hay acceso desde fuera: este ayudante va dentro del documento,
// avisa su alto por postMessage y hace lo mismo que abrirEnlaceAfuera.
const AYUDANTE = '<script data-orve-ayudante>(function(){' +
  'var u=-1;' +
  'function m(){var d=document,b=d.body,h=d.documentElement;if(!b||!h)return;var c=getComputedStyle(b);' +
  'var x=Math.ceil(Math.max(h.getBoundingClientRect().height,b.scrollHeight+(parseFloat(c.marginTop)||0)+(parseFloat(c.marginBottom)||0)));' +
  'if(x!==u){u=x;try{parent.postMessage({orveAlto:x},"*")}catch(e){}}}' +
  'm();addEventListener("DOMContentLoaded",m);addEventListener("load",m);' +
  'try{var r=new ResizeObserver(m);r.observe(document.documentElement);r.observe(document.body)}catch(e){setInterval(m,700)}' +
  'document.addEventListener("click",function(e){if(e.defaultPrevented||e.button!==0||e.metaKey||e.ctrlKey||e.shiftKey)return;' +
  'var a=e.target&&e.target.closest?e.target.closest("a[href]"):null;if(!a)return;' +
  'var t=(a.getAttribute("target")||"").toLowerCase();if(t&&t!=="_self"&&t!=="_top"&&t!=="_parent")return;' +
  'var r=a.getAttribute("href")||"";if(!r||r.charAt(0)==="#"||/^javascript:/i.test(r))return;' +
  'e.preventDefault();window.open(a.href,"_blank","noopener")});' +
  '})();</' + 'script>'

/**
 * Documento listo para `srcDoc`. Un fragmento se envuelve (con el color de la seccion,
 * porque el iframe no hereda nada); un documento completo se respeta tal cual y solo
 * se le suma el ayudante cuando hay scripts.
 */
export function armarDocumento(html: string, { fondo, scripts }: { fondo?: string; scripts: boolean }): string {
  const ayudante = scripts ? AYUDANTE : ''
  if (esDocumento(html)) {
    if (!ayudante) return html
    const i = html.toLowerCase().lastIndexOf('</body')
    return i >= 0 ? html.slice(0, i) + ayudante + html.slice(i) : html + ayudante
  }
  return `<!doctype html><html><head><meta charset="utf-8">` +
    `<meta name="viewport" content="width=device-width,initial-scale=1">` +
    `<style>html,body{margin:0;padding:0;background:${fondo ?? 'transparent'};font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif}` +
    `img,video,iframe{max-width:100%}</style></head><body>${html}${ayudante}</body></html>`
}

/** Guardia del alto automatico. Un contenido que depende del alto del iframe (un
 *  `min-height:100vh`) crece cada vez que el iframe crece: siempre lo mismo. Al ver
 *  tres crecidas iguales seguidas se deja de seguirlo. */
export function crearGuardia() {
  return { d: 0, n: 0, t: 0, antes: 0, congelado: false }
}
export function siguienteAlto(
  guardia: ReturnType<typeof crearGuardia>, actual: number, medido: number, tope: number,
): number | null {
  if (guardia.congelado || !(medido > 0)) return null
  const nuevo = Math.min(tope, Math.max(ALTO_MIN, medido))
  const d = nuevo - actual
  if (Math.abs(d) < 2) return null
  const ahora = Date.now()
  if (d > 0 && Math.abs(d - guardia.d) <= 3 && ahora - guardia.t < 1500) guardia.n++
  else { guardia.n = 1; guardia.d = d; guardia.antes = actual }
  guardia.t = ahora
  if (guardia.n >= 3) {
    // Se queda con UNA crecida desde donde empezo la racha: el contenido entero, sin el eco.
    guardia.congelado = true
    const final = Math.min(tope, guardia.antes + guardia.d)
    return final !== actual ? final : null
  }
  return nuevo
}

/** El valor, pero tarde: mientras se escribe en el panel el iframe no se recarga en cada tecla. */
export function useDiferido<T>(valor: T, ms: number): T {
  const [v, setV] = useState(valor)
  useEffect(() => {
    if (Object.is(v, valor)) return
    const t = setTimeout(() => setV(valor), ms)
    return () => clearTimeout(t)
  }, [valor, ms, v])
  return v
}

export function tamanoHtml(html: string): string {
  const lineas = html ? html.split('\n').length : 0
  const kb = Math.max(1, Math.round(new Blob([html]).size / 1024))
  return `${lineas.toLocaleString('es-MX')} líneas · ${kb.toLocaleString('es-MX')} KB`
}
