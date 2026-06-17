import { forwardRef, useEffect, useState } from 'react'
import type { CSSProperties } from 'react'
import type { LandingElemento, Viewport, ProyectoCard } from '../../types/landing'
import { resolveSrc, isDisplayableUrl } from '../../lib/images'
import { fontStack, loadFont } from '../../lib/fonts'
import { elementBorderShadow } from '../../lib/effects'
import { resolveButtonAction } from '../../lib/acciones'
import { getCampos } from '../../lib/forms'

interface Props {
  element: LandingElemento
  viewport: Viewport
  isSelected?: boolean
  onSelect?: (e: React.MouseEvent) => void
  signedUrls?: Record<string, string>
}

export const ElementRenderer = forwardRef<HTMLDivElement, Props>(
  ({ element, viewport, isSelected, onSelect, signedUrls = {} }, ref) => {
    const geo = element.geometria[viewport]
    const { estilo } = element
    const interactive = !onSelect   // public page (no selection handler) → live behaviour
    // for project cards the radius/shadow/border apply to each card, not the wrapper
    const isProyectos = element.tipo === 'proyectos'

    const baseStyle: CSSProperties = {
      position: 'absolute',
      left:   geo.x,
      top:    geo.y,
      width:  geo.w,
      height: geo.h,
      zIndex: geo.z,
      borderRadius: !isProyectos && estilo.radio ? `${estilo.radio}px` : 0,
      opacity: estilo.opacidad ?? 1,
      overflow: 'hidden',
      cursor: onSelect ? 'pointer' : 'default',
      userSelect: 'none',
      ...(isProyectos ? {} : elementBorderShadow(estilo)),
    }

    return (
      <div
        ref={ref}
        data-element-id={element.id}
        data-selected={isSelected ? '1' : undefined}
        className={onSelect ? 'ed-elem-in orve-selectable' : undefined}
        style={baseStyle}
        onClick={(e) => { e.stopPropagation(); onSelect?.(e) }}
      >
        {element.tipo === 'bloque'     && <BloqueEl    element={element} />}
        {element.tipo === 'imagen'     && <ImagenEl    element={element} signedUrls={signedUrls} />}
        {element.tipo === 'texto'      && <TextoEl     element={element} />}
        {element.tipo === 'boton'      && <BotonEl     element={element} interactive={interactive} />}
        {element.tipo === 'galeria'    && <GaleriaEl   element={element} signedUrls={signedUrls} />}
        {element.tipo === 'proyectos'  && <ProyectosEl element={element} signedUrls={signedUrls} interactive={interactive} />}
        {element.tipo === 'formulario' && <FormularioEl element={element} interactive={interactive} />}
        {isSelected && <SelectionRing locked={element.bloqueado} />}
      </div>
    )
  }
)
ElementRenderer.displayName = 'ElementRenderer'

// ── sub-renderers ─────────────────────────────────────────────────────────

function BloqueEl({ element }: { element: LandingElemento }) {
  const { estilo } = element
  return (
    <div style={{
      width: '100%', height: '100%',
      background: estilo.bgColor || '#26323B',
    }} />
  )
}

function ImagenEl({ element, signedUrls }: { element: LandingElemento; signedUrls: Record<string, string> }) {
  const { contenido, estilo } = element
  const raw = (contenido.src || contenido.path) as string | undefined
  const src = resolveSrc(raw, signedUrls)

  if (!src) {
    return <ImagePlaceholder label={(contenido.label as string) || 'Subir foto'} />
  }

  return <LazyImg src={src} alt={(contenido.alt as string) || ''} fit={estilo.ajuste ?? 'cover'} />
}

// Progressive image: skeleton placeholder fades out as the image fades in.
function LazyImg({ src, alt, fit = 'cover' }: { src: string; alt?: string; fit?: 'cover' | 'contain' | 'fill' }) {
  const [loaded, setLoaded] = useState(false)
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(135deg,#0E1411 0%,#1a3320 100%)',
        opacity: loaded ? 0 : 1, transition: 'opacity .4s ease',
      }} />
      <img
        src={src}
        alt={alt || ''}
        loading="lazy"
        decoding="async"
        onLoad={() => setLoaded(true)}
        style={{
          position: 'absolute', inset: 0,
          width: '100%', height: '100%', objectFit: fit, display: 'block',
          opacity: loaded ? 1 : 0, transition: 'opacity .4s ease',
        }}
      />
    </div>
  )
}

function ImagePlaceholder({ label, spinner }: { label: string; spinner?: boolean }) {
  return (
    <div style={{
      width: '100%', height: '100%',
      background: 'linear-gradient(135deg,#0E1411 0%,#1a3320 100%)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 10,
      color: '#38D030',
    }}>
      {spinner ? (
        <div style={{
          width: 28, height: 28,
          border: '3px solid rgba(56,208,48,.2)', borderTopColor: '#38D030',
          borderRadius: '50%', animation: 'spin .8s linear infinite',
        }} />
      ) : (
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <rect x="3" y="3" width="18" height="18" rx="3"/>
          <circle cx="8.5" cy="8.5" r="1.5"/>
          <path d="M21 15l-5-5L5 21"/>
        </svg>
      )}
      <span style={{ fontSize: 12, fontWeight: 700, fontFamily: 'Mulish,sans-serif' }}>
        {label}
      </span>
    </div>
  )
}

function TextoEl({ element }: { element: LandingElemento }) {
  const { contenido, estilo } = element
  const Tag = (contenido.tag as keyof JSX.IntrinsicElements) || 'div'

  // Ensure the chosen font is loaded (works for editor canvas AND public page).
  useEffect(() => { loadFont(estilo.fontFamily) }, [estilo.fontFamily])

  return (
    <Tag style={{
      margin: 0, padding: 0,
      width: '100%', height: '100%',
      fontSize:    estilo.fontSize   ? `${estilo.fontSize}px` : undefined,
      fontWeight:  estilo.fontWeight ?? '400',
      color:       estilo.color      ?? '#FFFFFF',
      textAlign:   estilo.textAlign  ?? 'left',
      fontFamily:  fontStack(estilo.fontFamily),
      lineHeight:  1.2,
      overflow:    'hidden',
    }}>
      {(contenido.texto as string) || ''}
    </Tag>
  )
}

function BotonEl({ element, interactive }: { element: LandingElemento; interactive: boolean }) {
  const { contenido, estilo } = element
  const label = (contenido.texto as string) || 'Botón'
  const btnStyle: CSSProperties = {
    width: '100%', height: '100%',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background:  estilo.bgColor  ?? '#38D030',
    color:       estilo.color    ?? '#063800',
    fontSize:    estilo.fontSize ? `${estilo.fontSize}px` : '14px',
    fontWeight:  estilo.fontWeight ?? '700',
    border: 'none', cursor: 'pointer',
    borderRadius: 'inherit',
    fontFamily: 'Mulish,sans-serif',
    textDecoration: 'none', boxSizing: 'border-box',
  }

  if (!interactive) {
    // editor preview — clicks fall through to select the element
    return <button style={{ ...btnStyle, pointerEvents: 'none' }} tabIndex={-1}>{label}</button>
  }

  const action = resolveButtonAction(contenido)
  if (action.href) {
    return (
      <a href={action.href} target={action.target} rel={action.target === '_blank' ? 'noreferrer' : undefined} style={btnStyle}>
        {label}
      </a>
    )
  }
  return (
    <button style={btnStyle} onClick={action.onClick}>{label}</button>
  )
}

function GaleriaEl({ element, signedUrls }: { element: LandingElemento; signedUrls: Record<string, string> }) {
  const { contenido, estilo } = element
  const cols = (contenido.columnas as number) || 3
  const gap  = (contenido.gap     as number) || 8
  const imgs = (contenido.imagenes as string[] | undefined) ?? []
  // render at least one full row of slots so empty galleries still read as a grid
  const count = Math.max(imgs.length, cols * 2)
  const radius = Math.round((estilo.radio ?? 10) / 2)

  return (
    <div style={{
      width: '100%', height: '100%',
      display: 'grid',
      gridTemplateColumns: `repeat(${cols}, 1fr)`,
      gap,
      padding: gap,
      boxSizing: 'border-box',
      background: 'rgba(0,0,0,.15)',
    }}>
      {Array.from({ length: count }).map((_, i) => {
        const raw = imgs[i]
        const src = resolveSrc(raw, signedUrls)
        return (
          <div key={i} style={{
            background: 'linear-gradient(135deg,#0E1411,#1a3320)',
            borderRadius: radius,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            minHeight: 0, overflow: 'hidden',
          }}>
            {src ? (
              <LazyImg src={src} fit="cover" />
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#38D030" strokeWidth="1.5">
                <rect x="3" y="3" width="18" height="18" rx="2"/>
                <circle cx="8.5" cy="8.5" r="1.5"/>
                <path d="M21 15l-5-5L5 21"/>
              </svg>
            )}
          </div>
        )
      })}
    </div>
  )
}

function ProyectosEl({ element, signedUrls, interactive }: { element: LandingElemento; signedUrls: Record<string, string>; interactive: boolean }) {
  const { contenido, estilo } = element
  const cards     = (contenido.cards as ProyectoCard[] | undefined) ?? []
  const animar    = contenido.animar !== false
  const direccion = (contenido.direccion as string) || 'izquierda'
  const duracion  = Math.max(4, Number(contenido.duracion) || 30)
  const cardAncho = Number(contenido.cardAncho) || 240
  const cardAlto  = Number(contenido.cardAlto) || 280
  const gap       = Number(contenido.gap) || 16
  const radio     = estilo.radio ?? 14

  const sombra = estilo.sombra
  const cardShadow = sombra && sombra.activa
    ? `${sombra.x}px ${sombra.y}px ${sombra.blur}px ${sombra.spread}px ${sombra.color || 'rgba(0,0,0,.35)'}`
    : undefined

  // animate only on the published page; static preview in the editor
  const marquee = interactive && animar && cards.length > 0

  const renderCard = (card: ProyectoCard, key: string) => {
    const src = resolveSrc(card.imagen, signedUrls)
    return (
      <div key={key} style={{
        width: cardAncho, height: cardAlto, flexShrink: 0, marginRight: gap,
        borderRadius: radio, boxShadow: cardShadow, overflow: 'hidden',
        position: 'relative', background: '#14201A', fontFamily: 'Mulish,sans-serif',
      }}>
        {src
          ? <LazyImg src={src} fit="cover" />
          : (
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg,#0E1411,#1a3320)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#38D030" strokeWidth="1.5">
                <rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/>
              </svg>
            </div>
          )}

        {/* status badge */}
        {card.badge && (
          <div style={{
            position: 'absolute', top: 12, left: 12, zIndex: 2,
            background: card.badgeColor || '#38D030', color: '#fff',
            fontSize: 11, fontWeight: 800, letterSpacing: '.5px',
            padding: '4px 11px', borderRadius: 20, textTransform: 'uppercase',
            boxShadow: '0 2px 8px rgba(0,0,0,.3)',
          }}>
            {card.badge}
          </div>
        )}

        {/* name + location */}
        <div style={{
          position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 2,
          padding: '26px 14px 14px',
          background: 'linear-gradient(to top, rgba(0,0,0,.88) 30%, rgba(0,0,0,0))',
        }}>
          <div style={{ color: '#fff', fontWeight: 800, fontSize: 16, lineHeight: 1.2 }}>{card.nombre}</div>
          {card.ubicacion && (
            <div style={{ color: '#9AA0A6', fontSize: 12, fontWeight: 600, marginTop: 2 }}>{card.ubicacion}</div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="orve-marquee" style={{ width: '100%', height: '100%', overflow: 'hidden', display: 'flex', alignItems: 'center' }}>
      <div
        className="orve-marquee-track"
        style={{
          display: 'flex', alignItems: 'center', width: 'max-content',
          animation: marquee ? `orve-marquee ${duracion}s linear infinite` : undefined,
          animationDirection: direccion === 'derecha' ? 'reverse' : undefined,
          willChange: marquee ? 'transform' : undefined,
        }}
      >
        {cards.map((c) => renderCard(c, c.id))}
        {/* duplicate set for a seamless loop */}
        {marquee && cards.map((c) => renderCard(c, `${c.id}__dup`))}
      </div>
    </div>
  )
}

function FormularioEl({ element, interactive }: { element: LandingElemento; interactive: boolean }) {
  const { contenido, estilo } = element
  const titulo  = (contenido.titulo as string) || 'Contáctame'
  const botonTx = (contenido.boton  as string) || 'Enviar'
  const campos  = getCampos(contenido)
  const [sent, setSent] = useState(false)

  const inputStyle: CSSProperties = {
    width: '100%', boxSizing: 'border-box',
    background: 'rgba(255,255,255,0.07)',
    border: '1px solid rgba(255,255,255,0.16)',
    borderRadius: 7, padding: '9px 11px',
    fontSize: 13, color: '#fff', fontFamily: 'Mulish,sans-serif', outline: 'none',
    // in the editor the form is a preview — let clicks fall through to select it
    pointerEvents: interactive ? 'auto' : 'none',
  }

  function renderInput(campo: typeof campos[number]) {
    const common = { name: campo.id, required: campo.requerido, disabled: !interactive, style: inputStyle, placeholder: campo.label }
    if (campo.tipo === 'textarea') return <textarea {...common} rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
    if (campo.tipo === 'select') {
      const opts = (campo.opciones ?? []).map((o) => o.trim()).filter(Boolean)
      return (
        <select {...common} defaultValue="" style={{ ...inputStyle, color: '#fff' }}>
          <option value="" disabled>{campo.label}</option>
          {opts.map((o, i) => <option key={i} value={o} style={{ color: '#000' }}>{o}</option>)}
        </select>
      )
    }
    const htmlType = campo.tipo === 'email' ? 'email' : campo.tipo === 'telefono' ? 'tel' : 'text'
    return <input {...common} type={htmlType} />
  }

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); if (interactive) setSent(true) }}
      style={{
        width: '100%', height: '100%',
        background: estilo.bgColor || 'rgba(20,28,22,0.92)',
        padding: '18px 20px', boxSizing: 'border-box',
        display: 'flex', flexDirection: 'column', gap: 10,
        fontFamily: 'Mulish,sans-serif', overflow: 'auto',
      }}
    >
      <div style={{ fontSize: estilo.fontSize || 18, fontWeight: 800, color: estilo.color || '#fff' }}>
        {titulo}
      </div>

      {sent ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', color: '#fff', fontWeight: 700, gap: 8, flexDirection: 'column' }}>
          <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#38D030', color: '#063800', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 900 }}>✓</div>
          ¡Gracias! Te contactaré pronto.
        </div>
      ) : (
        <>
          {campos.map((campo) => (
            <label key={campo.id} style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: estilo.color ? `${estilo.color}` : 'rgba(255,255,255,.75)' }}>
                {campo.label}{campo.requerido ? ' *' : ''}
              </span>
              {renderInput(campo)}
            </label>
          ))}
          <button type="submit" disabled={!interactive} style={{
            marginTop: 'auto', background: '#38D030', border: 'none', borderRadius: 7,
            padding: '10px 0', textAlign: 'center', fontSize: 13, fontWeight: 800, color: '#063800',
            cursor: interactive ? 'pointer' : 'default', flexShrink: 0, fontFamily: 'Mulish,sans-serif',
            pointerEvents: interactive ? 'auto' : 'none',
          }}>
            {botonTx}
          </button>
        </>
      )}
    </form>
  )
}

function SelectionRing({ locked }: { locked?: boolean }) {
  const color = locked ? '#C99A3A' : '#38D030'
  return (
    <div style={{
      position: 'absolute', inset: -2,
      border: `2px ${locked ? 'dashed' : 'solid'} ${color}`,
      borderRadius: 'inherit',
      pointerEvents: 'none',
      zIndex: 9999,
    }}>
      {locked && (
        <div style={{
          position: 'absolute', top: -11, right: -2,
          background: '#C99A3A', color: '#3a2a00',
          width: 20, height: 20, borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>
          </svg>
        </div>
      )}
    </div>
  )
}
