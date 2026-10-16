import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import {
  armarDocumento, permisosSandbox, medirDocumento, abrirEnlaceAfuera,
  crearGuardia, siguienteAlto, useDiferido, TOPE_AUTO,
} from '../../lib/html-libre'

/**
 * El HTML del asesor dibujado en un iframe aislado. Tres formas de ocupar el alto:
 * - 'auto': crece lo que mida el contenido (hasta `tope`); pasado el tope se desplaza dentro.
 * - un numero: alto fijo en px; lo que sobre se desplaza dentro.
 * - 'llenar': el 100% de su contenedor (pagina completa: se desplaza dentro, como un sitio normal).
 */
export function IframeHtml({
  html, scripts, fondo, alto, tope = TOPE_AUTO, inicial = 480, title, style, diferir = 400,
}: {
  html: string
  scripts: boolean
  fondo?: string
  alto: 'auto' | 'llenar' | number
  tope?: number
  /** Alto con el que arranca 'auto' mientras se mide. */
  inicial?: number
  title: string
  style?: CSSProperties
  diferir?: number
}) {
  const ref = useRef<HTMLIFrameElement>(null)
  const htmlListo = useDiferido(html, diferir)
  const doc = useMemo(() => armarDocumento(htmlListo, { fondo, scripts }), [htmlListo, fondo, scripts])
  const auto = alto === 'auto'

  const [altoPx, setAltoPx] = useState(() => Math.min(inicial, tope))
  const altoRef = useRef(altoPx)
  const guardia = useRef(crearGuardia())
  const aplicar = useRef<(h: number) => void>(() => {})
  aplicar.current = (h: number) => {
    const n = siguienteAlto(guardia.current, altoRef.current, h, tope)
    if (n == null) return
    altoRef.current = n
    setAltoPx(n)
  }

  // Cada documento (o cambio de tope) empieza con la guardia limpia.
  useEffect(() => { guardia.current = crearGuardia() }, [doc, tope])
  // Si el tope baja por debajo del alto actual, se respeta de inmediato.
  useEffect(() => {
    if (altoRef.current > tope) { altoRef.current = tope; setAltoPx(tope) }
  }, [tope])

  // Con scripts: el ayudante inyectado manda su alto por postMessage.
  useEffect(() => {
    if (!scripts || !auto) return
    const onMsg = (e: MessageEvent) => {
      if (e.source !== ref.current?.contentWindow) return
      const h = Number((e.data as { orveAlto?: unknown } | null)?.orveAlto)
      if (h > 0) aplicar.current(h)
    }
    window.addEventListener('message', onMsg)
    return () => window.removeEventListener('message', onMsg)
  }, [scripts, auto])

  // Sin scripts: es del mismo origen, asi que se mide y se atienden los enlaces desde aqui.
  const soltar = useRef<(() => void) | undefined>(undefined)
  useEffect(() => () => soltar.current?.(), [])
  function alCargar() {
    soltar.current?.()
    soltar.current = undefined
    if (scripts) return
    let d: Document | null = null
    try { d = ref.current?.contentDocument ?? null } catch { d = null }
    if (!d) return
    const doc2 = d
    doc2.addEventListener('click', abrirEnlaceAfuera)
    let ro: ResizeObserver | undefined
    let reloj: ReturnType<typeof setInterval> | undefined
    if (auto) {
      const medir = () => aplicar.current(medirDocumento(doc2))
      medir()
      try {
        ro = new ResizeObserver(medir)
        ro.observe(doc2.documentElement)
        if (doc2.body) ro.observe(doc2.body)
      } catch { /* sin ResizeObserver queda el reloj */ }
      // Respaldo: fuentes e imagenes que tardan, por si el observador no avisa.
      let vueltas = 0
      reloj = setInterval(() => { medir(); if (++vueltas >= 20) clearInterval(reloj) }, 500)
    }
    soltar.current = () => {
      doc2.removeEventListener('click', abrirEnlaceAfuera)
      ro?.disconnect()
      if (reloj) clearInterval(reloj)
    }
  }

  const height = alto === 'llenar' ? '100%' : auto ? altoPx : alto
  return (
    <iframe
      // Cambiar entre automatico y fijo recarga el documento para volver a medir.
      key={auto ? 'auto' : 'fijo'}
      ref={ref}
      srcDoc={doc}
      title={title}
      sandbox={permisosSandbox(scripts)}
      onLoad={alCargar}
      style={{ display: 'block', width: '100%', height, border: 0, background: fondo ?? '#fff', ...style }}
    />
  )
}
