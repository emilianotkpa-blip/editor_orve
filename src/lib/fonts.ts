// ── Curated Google Fonts catalog + on-demand loader ─────────────────────────

export type FontCategory = 'sans' | 'serif' | 'display' | 'handwriting'

export interface FontDef {
  name: string         // exact Google Fonts family name
  category: FontCategory
  weights: string      // css2 wght list, only weights the family actually ships
}

export const FONT_CATEGORY_LABEL: Record<FontCategory, string> = {
  sans: 'Sans',
  serif: 'Serif',
  display: 'Display',
  handwriting: 'Manuscrita',
}

// ~30 varied families. Mulish first (ORVE brand).
export const FONTS: FontDef[] = [
  { name: 'Mulish',            category: 'sans',        weights: '400;500;600;700;800;900' },
  { name: 'Inter',             category: 'sans',        weights: '400;500;600;700;800;900' },
  { name: 'Poppins',           category: 'sans',        weights: '400;500;600;700;800;900' },
  { name: 'Montserrat',        category: 'sans',        weights: '400;500;600;700;800;900' },
  { name: 'Work Sans',         category: 'sans',        weights: '400;500;600;700;800' },
  { name: 'Raleway',           category: 'sans',        weights: '400;500;600;700;800;900' },
  { name: 'Nunito',            category: 'sans',        weights: '400;500;600;700;800;900' },
  { name: 'DM Sans',           category: 'sans',        weights: '400;500;700' },
  { name: 'Manrope',           category: 'sans',        weights: '400;500;600;700;800' },
  { name: 'Lato',              category: 'sans',        weights: '400;700;900' },
  { name: 'Open Sans',         category: 'sans',        weights: '400;500;600;700;800' },
  { name: 'Playfair Display',  category: 'serif',       weights: '400;500;600;700;800;900' },
  { name: 'Lora',              category: 'serif',       weights: '400;500;600;700' },
  { name: 'Merriweather',      category: 'serif',       weights: '400;700;900' },
  { name: 'PT Serif',          category: 'serif',       weights: '400;700' },
  { name: 'Cormorant Garamond',category: 'serif',       weights: '400;500;600;700' },
  { name: 'EB Garamond',       category: 'serif',       weights: '400;500;600;700;800' },
  { name: 'Libre Baskerville', category: 'serif',       weights: '400;700' },
  { name: 'Bebas Neue',        category: 'display',     weights: '400' },
  { name: 'Oswald',            category: 'display',     weights: '400;500;600;700' },
  { name: 'Anton',             category: 'display',     weights: '400' },
  { name: 'Archivo Black',     category: 'display',     weights: '400' },
  { name: 'Righteous',         category: 'display',     weights: '400' },
  { name: 'Abril Fatface',     category: 'display',     weights: '400' },
  { name: 'Pacifico',          category: 'handwriting', weights: '400' },
  { name: 'Dancing Script',    category: 'handwriting', weights: '400;500;600;700' },
  { name: 'Caveat',            category: 'handwriting', weights: '400;500;600;700' },
  { name: 'Lobster',           category: 'handwriting', weights: '400' },
  { name: 'Great Vibes',       category: 'handwriting', weights: '400' },
  { name: 'Sacramento',        category: 'handwriting', weights: '400' },
]

const FONT_BY_NAME = new Map(FONTS.map((f) => [f.name, f]))

const FALLBACK: Record<FontCategory, string> = {
  sans: 'sans-serif',
  serif: 'serif',
  display: 'sans-serif',
  handwriting: 'cursive',
}

// CSS font-family stack for a chosen family (with a sensible fallback).
export function fontStack(family?: string): string {
  if (!family) return "'Mulish', sans-serif"
  const def = FONT_BY_NAME.get(family)
  const fb = def ? FALLBACK[def.category] : 'sans-serif'
  return `'${family}', ${fb}`
}

// Inject the <link> for a single family on demand (idempotent).
const requested = new Set<string>()
export function loadFont(family?: string): void {
  if (!family || requested.has(family)) return
  requested.add(family)
  const id = 'gf-' + family.replace(/[^a-zA-Z0-9]+/g, '-')
  if (document.getElementById(id)) return
  const def = FONT_BY_NAME.get(family)
  const fam = family.replace(/\s+/g, '+')
  const weights = def?.weights ?? '400;700'
  const link = document.createElement('link')
  link.id = id
  link.rel = 'stylesheet'
  link.href = `https://fonts.googleapis.com/css2?family=${fam}:wght@${weights}&display=swap`
  document.head.appendChild(link)
}
