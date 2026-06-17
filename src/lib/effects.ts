import type { CSSProperties } from 'react'
import type { LandingElemento, Sombra } from '../types/landing'

export const DEFAULT_SOMBRA: Sombra = {
  activa: true, x: 0, y: 10, blur: 24, spread: 0, color: 'rgba(0,0,0,0.35)',
}

// box-shadow + border for an element (radius/opacity are applied separately in
// the renderer's base style). Shared so canvas and public render identically.
export function elementBorderShadow(estilo: LandingElemento['estilo']): CSSProperties {
  const s: CSSProperties = {}
  if (estilo.borde && estilo.borde.ancho > 0) {
    s.border = `${estilo.borde.ancho}px solid ${estilo.borde.color || '#000'}`
  }
  if (estilo.sombra && estilo.sombra.activa) {
    const { x, y, blur, spread, color } = estilo.sombra
    s.boxShadow = `${x}px ${y}px ${blur}px ${spread}px ${color || 'rgba(0,0,0,.35)'}`
  }
  return s
}
