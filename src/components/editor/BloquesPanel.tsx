import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { m } from 'motion/react'
import { useLandingStore } from '../../store/useLandingStore'
import { CATEGORIAS, bloquesPorCategoria, type Bloque } from '../../lib/bloques'
import { POP, LAYOUT } from '../../lib/motion'

// Paleta de bloques pre-armados — la columna «SECCIONES LISTAS» del mockup.
//
// El arrastre NO usa `drag` de Motion sobre la tarjeta ni el drag nativo del
// navegador. Con `drag` la tarjeta se recorta al salir del panel (el panel
// tiene overflow hidden y la lista overflow auto), y el fantasma nativo no
// deja saber la posición exacta del puntero al soltar, que es justo lo que
// hace falta para colocar el bloque donde cayó.
//
// En su lugar: pointer events a mano + un fantasma en portal sobre <body>,
// fuera de todo contenedor que recorte.

interface Arrastre {
  bloque: Bloque
  x: number
  y: number
}

/** Busca la sección del lienzo bajo un punto de pantalla. */
function seccionEnPunto(clientX: number, clientY: number): HTMLElement | null {
  const pila = document.elementsFromPoint(clientX, clientY) as HTMLElement[]
  return pila.find((el) => el.hasAttribute?.('data-section-id')) ?? null
}

export function BloquesPanel() {
  const { viewport } = useLandingStore()
  // Solo se guarda QUÉ bloque se arrastra y dónde empezó. El seguimiento del
  // puntero vive dentro del fantasma, para que moverlo no re-renderice el
  // catálogo entero en cada frame.
  const [arrastre, setArrastre] = useState<Arrastre | null>(null)

  // En móvil el lienzo es una vista previa escalada, no se edita.
  const bloqueado = viewport === 'movil'

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '4px 0 12px' }}>
      <div style={{
        padding: '8px 14px 10px', fontSize: 11, fontWeight: 600,
        color: 'var(--ed-text-3)', lineHeight: 1.45,
      }}>
        {bloqueado
          ? 'Cambia a Escritorio para soltar bloques.'
          : 'Arrastra un bloque al lienzo. Cae armado y luego lo acomodas.'}
      </div>

      {CATEGORIAS.map((cat) => (
        <div key={cat.id} style={{ marginBottom: 6 }}>
          <div style={{ padding: '8px 14px 6px' }}>
            <div style={{
              fontSize: 10, fontWeight: 800, letterSpacing: '.7px',
              color: '#38D030', textTransform: 'uppercase',
            }}>
              {cat.label}
            </div>
            <div style={{ fontSize: 10, color: '#4F5458', fontWeight: 600, marginTop: 2 }}>
              {cat.nota}
            </div>
          </div>

          {bloquesPorCategoria(cat.id).map((bloque) => (
            <TarjetaBloque
              key={bloque.id}
              bloque={bloque}
              bloqueado={bloqueado}
              activo={arrastre?.bloque.id === bloque.id}
              onTomar={(x, y) => setArrastre({ bloque, x, y })}
            />
          ))}
        </div>
      ))}

      {arrastre && (
        <FantasmaArrastre arrastre={arrastre} onFin={() => setArrastre(null)} />
      )}
    </div>
  )
}

// Fantasma que sigue al puntero, y dueño del gesto completo: mueve, resalta la
// sección destino, y al soltar inserta el bloque. Va en portal sobre <body>
// para que ningún contenedor con overflow lo recorte.
function FantasmaArrastre({ arrastre, onFin }: { arrastre: Arrastre; onFin: () => void }) {
  const { addBloque, showToast, setDropSection } = useLandingStore()
  const [pos, setPos] = useState({ x: arrastre.x, y: arrastre.y })

  // Última sección resaltada. Sin esto se escribiría al store en cada frame y
  // el Canvas se re-renderizaría entero con cada píxel de movimiento.
  const ultimoDestino = useRef<string | null>(null)

  // Todo lo que el gesto necesita va por ref: el efecto se monta una sola vez,
  // al empezar el arrastre, y se desmonta al terminar. Si dependiera de las
  // funciones del store se re-suscribiría en cada cambio de estado y su
  // limpieza apagaría el resalte a media faena.
  const vivo = useRef({ arrastre, addBloque, showToast, setDropSection, onFin })
  vivo.current = { arrastre, addBloque, showToast, setDropSection, onFin }

  useEffect(() => {
    function marcar(id: string | null) {
      if (ultimoDestino.current === id) return
      ultimoDestino.current = id
      vivo.current.setDropSection(id)
    }

    function onMove(e: PointerEvent) {
      setPos({ x: e.clientX, y: e.clientY })
      marcar(seccionEnPunto(e.clientX, e.clientY)?.getAttribute('data-section-id') ?? null)
    }

    function onUp(e: PointerEvent) {
      const v = vivo.current
      marcar(null)
      v.onFin()
      const destino = seccionEnPunto(e.clientX, e.clientY)
      if (!destino) return   // soltado fuera del lienzo → no pasa nada
      const sectionId = destino.getAttribute('data-section-id')!
      const r = destino.getBoundingClientRect()
      v.addBloque(sectionId, v.arrastre.bloque.id, e.clientX - r.left, e.clientY - r.top)
      v.showToast('success', `«${v.arrastre.bloque.nombre}» agregado`)
    }

    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') { marcar(null); vivo.current.onFin() }
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('keydown', onKey)
      // Si el arrastre se corta por cualquier vía, no dejar el resalte prendido.
      if (ultimoDestino.current !== null) vivo.current.setDropSection(null)
    }
  }, [])

  return createPortal(
    <m.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={POP}
      style={{
        position: 'fixed', left: pos.x, top: pos.y,
        transform: 'translate(-50%,-50%)',
        zIndex: 10000, pointerEvents: 'none',
        display: 'flex', alignItems: 'center', gap: 9,
        padding: '9px 13px 9px 9px', borderRadius: 10,
        background: 'rgba(16,26,18,.96)', border: '1px solid rgba(56,208,48,.55)',
        boxShadow: '0 12px 34px rgba(0,0,0,.6)',
        fontFamily: 'Mulish, sans-serif',
      }}
    >
      <Miniatura bloque={arrastre.bloque} />
      <span style={{ fontSize: 12, fontWeight: 800, color: '#38D030', whiteSpace: 'nowrap' }}>
        {arrastre.bloque.nombre}
      </span>
    </m.div>,
    document.body,
  )
}

function TarjetaBloque({
  bloque, bloqueado, activo, onTomar,
}: {
  bloque: Bloque
  bloqueado: boolean
  activo: boolean
  onTomar: (clientX: number, clientY: number) => void
}) {
  const [hov, setHov] = useState(false)

  return (
    <m.div
      onPointerDown={(e) => {
        if (bloqueado || e.button !== 0) return
        e.preventDefault()
        onTomar(e.clientX, e.clientY)
      }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      whileHover={bloqueado ? undefined : { scale: 1.015 }}
      whileTap={bloqueado ? undefined : { scale: 0.98 }}
      transition={POP}
      style={{
        margin: '0 10px 6px',
        padding: '9px 10px',
        borderRadius: 9,
        display: 'flex', alignItems: 'center', gap: 10,
        background: activo ? 'rgba(56,208,48,.14)' : hov ? 'var(--ed-hover)' : 'transparent',
        border: `1px solid ${activo ? 'rgba(56,208,48,.5)' : hov ? 'var(--ed-border-2)' : 'transparent'}`,
        cursor: bloqueado ? 'not-allowed' : activo ? 'grabbing' : 'grab',
        opacity: bloqueado ? 0.45 : activo ? 0.5 : 1,
        touchAction: 'none',
        userSelect: 'none',
      }}
    >
      <Miniatura bloque={bloque} />
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{
          fontSize: 12, fontWeight: 700, color: 'var(--ed-text)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {bloque.nombre}
        </div>
        <div style={{ fontSize: 10, color: 'var(--ed-text-3)', fontWeight: 600, marginTop: 1 }}>
          {bloque.piezas.length} {bloque.piezas.length === 1 ? 'elemento' : 'elementos'}
        </div>
      </div>
    </m.div>
  )
}

// Esquema del bloque a escala: cada pieza es un rectángulo en su sitio. Vale
// más que un ícono genérico — se reconoce la composición de un vistazo.
function Miniatura({ bloque }: { bloque: Bloque }) {
  const CAJA = 42
  const escala = Math.min(CAJA / bloque.w, CAJA / Math.max(bloque.h, 1))
  const w = bloque.w * escala
  const h = bloque.h * escala

  return (
    <div style={{
      width: CAJA, height: CAJA, flexShrink: 0,
      borderRadius: 6, background: '#0E1411', border: '1px solid var(--ed-border)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      overflow: 'hidden',
    }}>
      <div style={{ position: 'relative', width: w, height: Math.max(h, 2) }}>
        {bloque.piezas.map((p, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: p.x * escala, top: p.y * escala,
              width: Math.max(p.w * escala, 1), height: Math.max(p.h * escala, 1),
              borderRadius: 1,
              background: p.tipo === 'bloque'  ? 'rgba(255,255,255,.10)'
                        : p.tipo === 'boton'   ? '#38D030'
                        : p.tipo === 'imagen'  ? 'rgba(56,208,48,.35)'
                        : p.tipo === 'logo'    ? 'rgba(56,208,48,.7)'
                        : 'rgba(255,255,255,.45)',
            }}
          />
        ))}
      </div>
    </div>
  )
}

// Pestañas del panel izquierdo.
export function TabsPanel({ tab, onTab }: { tab: 'capas' | 'bloques'; onTab: (t: 'capas' | 'bloques') => void }) {
  return (
    <div style={{ display: 'flex', gap: 2, position: 'relative' }}>
      {(['bloques', 'capas'] as const).map((t) => (
        <m.button
          key={t}
          onClick={() => onTab(t)}
          whileTap={{ scale: 0.96 }}
          transition={POP}
          style={{
            position: 'relative', border: 'none', background: 'transparent',
            padding: '4px 9px', borderRadius: 6, cursor: 'pointer',
            fontFamily: 'inherit', fontSize: 11, fontWeight: 800,
            letterSpacing: '.5px', textTransform: 'uppercase',
            color: tab === t ? '#38D030' : 'var(--ed-text-3)',
          }}
        >
          {tab === t && (
            <m.span
              layoutId="tab-panel-izq"
              transition={LAYOUT}
              style={{
                position: 'absolute', inset: 0, borderRadius: 6,
                background: 'rgba(56,208,48,.12)', border: '1px solid rgba(56,208,48,.25)',
              }}
            />
          )}
          <span style={{ position: 'relative', zIndex: 1 }}>{t}</span>
        </m.button>
      ))}
    </div>
  )
}
