// Reglas de uso de la marca ORVE, sacadas del «Manual de Marca ORVE 2026»
// (p. 6, «Márgenes seguros y tamaños»). Viven aquí para que el editor, el
// inspector y la página pública apliquen exactamente los mismos límites.
import { logoRatio, type LogoVariante } from '../components/shared/Brand'

// El manual acota el logotipo horizontal entre 190×76 px y 550×220 px. El alto
// es el lado que manda: aplicado a las otras variantes da el mismo peso óptico
// (para el lockup, 76×2.488 ≈ 190 y 220×2.488 ≈ 550, o sea el rango original).
export const LOGO_H_MIN = 76
export const LOGO_H_MAX = 220

// Margen seguro: el ancho de la «O» del logotipo alrededor de toda la marca.
// Sobre el vector original, esa «O» mide 57 px de un logotipo de 459.25 px.
export const MARGEN_SEGURO_RATIO = 57 / 459.25

/** Anchos mínimo y máximo permitidos para una variante. */
export function logoLimites(variante: LogoVariante): { min: number; max: number } {
  const ratio = logoRatio(variante)
  return { min: Math.round(LOGO_H_MIN * ratio), max: Math.round(LOGO_H_MAX * ratio) }
}

/** Ancho recortado al rango del manual. */
export function clampLogoW(variante: LogoVariante, w: number): number {
  const { min, max } = logoLimites(variante)
  return Math.round(Math.max(min, Math.min(max, w)))
}

/**
 * Caja válida para el logo: ancho dentro del rango y alto derivado de la
 * proporción original. Es la única forma de dimensionarlo — así no hay
 * distorsión ni cambio de proporción, que el manual prohíbe.
 */
export function logoGeo(variante: LogoVariante, w: number): { w: number; h: number } {
  const ancho = clampLogoW(variante, w)
  return { w: ancho, h: Math.round(ancho / logoRatio(variante)) }
}

/** Margen seguro en px para un logo de ancho `w`. */
export function margenSeguro(w: number): number {
  return Math.round(w * MARGEN_SEGURO_RATIO)
}
