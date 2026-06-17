import type { FondoAjustes } from '../../types/landing'

interface Props {
  tipo: 'color' | 'imagen'
  color?: string
  url?: string           // resolved displayable URL ('' if a path isn't signed yet)
  ajustes?: FondoAjustes
  fallback?: string      // base color shown behind / while loading
  zIndex?: number
}

// Absolute, non-interactive background layer used behind page / section content.
// Supports a solid color, or an image with opacity, color overlay and
// brightness/contrast filters (applied on its own layer so the content above is
// never filtered). Shared by canvas and the public page for identical render.
export function BackgroundLayer({ tipo, color, url, ajustes, fallback = '#0E1411', zIndex = 0 }: Props) {
  if (tipo === 'color') {
    return (
      <div style={{ position: 'absolute', inset: 0, zIndex, background: color || fallback, pointerEvents: 'none' }} />
    )
  }

  const a = ajustes ?? {}
  const brillo    = a.brillo ?? 100
  const contraste = a.contraste ?? 100
  const opac      = a.opacidad ?? 1
  const ovOpac    = a.overlayOpacidad ?? 0

  return (
    <div style={{ position: 'absolute', inset: 0, zIndex, overflow: 'hidden', background: fallback, pointerEvents: 'none' }}>
      {url && (
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: `url("${url}")`,
          backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat',
          opacity: opac,
          filter: `brightness(${brillo}%) contrast(${contraste}%)`,
        }} />
      )}
      {ovOpac > 0 && (
        <div style={{ position: 'absolute', inset: 0, background: a.overlayColor || '#000000', opacity: ovOpac }} />
      )}
    </div>
  )
}
