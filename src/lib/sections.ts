import type { Seccion, FondoAjustes } from '../types/landing'
import { resolveSrc } from './images'

export interface FondoLayerProps {
  tipo: 'color' | 'imagen'
  color?: string
  url?: string
  ajustes?: FondoAjustes
}

// Resolve a section fondo into props for <BackgroundLayer>. Image paths are
// resolved through the signed-url map (same mechanism as element images).
export function sectionFondoLayer(
  fondo: Seccion['fondo'],
  signedUrls: Record<string, string>,
): FondoLayerProps {
  if (!fondo || fondo.tipo === 'color') {
    return { tipo: 'color', color: fondo?.valor || '#0E1411' }
  }
  return { tipo: 'imagen', url: resolveSrc(fondo.valor, signedUrls), ajustes: fondo.ajustes }
}
