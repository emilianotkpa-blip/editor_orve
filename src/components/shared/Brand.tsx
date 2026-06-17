// Inline brand marks — instant load (no external image), crisp at any size.

// ORVE wheat / diamond-lattice mark.
export function OrveMark({ size = 26, color = '#38D030' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none"
      stroke={color} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round"
      style={{ flexShrink: 0 }} aria-label="ORVE">
      <path d="M16 8 L40 32" />
      <path d="M8 16 L32 40" />
      <path d="M32 8 L8 32" />
      <path d="M40 16 L16 40" />
      <path d="M24 39 L24 47" />
    </svg>
  )
}

// Brilliant-cut diamond — flat table, crown + pavilion facets, pointed bottom.
export function DiamondMark({
  size = 15, color = '#38D030', facet = '#0C3A12', facetOpacity = 0.5,
}: { size?: number; color?: string; facet?: string; facetOpacity?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{ flexShrink: 0 }} aria-hidden="true">
      <path d="M7 4 L17 4 L22 9 L12 21 L2 9 Z" fill={color} />
      <g stroke={facet} strokeWidth="0.9" strokeLinejoin="round" fill="none" opacity={facetOpacity}>
        <path d="M2 9 H22" />
        <path d="M7 4 L9.2 9 L12 21" />
        <path d="M17 4 L14.8 9 L12 21" />
        <path d="M12 4 L12 9" />
      </g>
    </svg>
  )
}
