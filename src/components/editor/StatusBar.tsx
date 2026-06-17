import { useLandingStore } from '../../store/useLandingStore'
import type { Geometry } from '../../types/landing'

export function StatusBar() {
  const { config, selectedElementId, getSelectedElement, liveGeo, viewport } = useLandingStore()
  const el = getSelectedElement()
  const seccion = config.secciones?.[0]

  // Mobile is a scaled preview of the desktop layout → report escritorio geometry.
  const elGeo = el?.geometria?.escritorio
  const geo: Geometry | null = elGeo
    ? { ...elGeo, ...(liveGeo ?? {}) } as Geometry
    : null

  const canvasH = seccion?.altura?.escritorio ?? 580
  const canvasW = viewport === 'escritorio' ? '900×' : '390×'

  return (
    <div style={{
      height: 28, flexShrink: 0,
      background: 'var(--ed-bar)', borderTop: '1px solid var(--ed-border)',
      display: 'flex', alignItems: 'center',
      padding: '0 16px', gap: 20,
      fontSize: 11, color: 'var(--ed-text-3)', fontWeight: 700, fontFamily: 'Mulish,monospace',
    }}>
      <span style={{ color: '#38D030' }}>● ORVE</span>
      <span>Canvas {canvasW}{canvasH}px</span>

      {geo && selectedElementId && (
        <>
          <span style={{ color: '#3A3F44' }}>|</span>
          <span>
            <GeoChip label="X" value={geo.x ?? 0} />
            <GeoChip label="Y" value={geo.y ?? 0} />
            <GeoChip label="W" value={geo.w ?? 0} />
            <GeoChip label="H" value={geo.h ?? 0} />
          </span>
          <span style={{ color: '#4F5458' }}>{selectedElementId}</span>
        </>
      )}

      <div style={{ flex: 1 }} />
      <span>Fase 1-3 · v0.1</span>
    </div>
  )
}

function GeoChip({ label, value }: { label: string; value: number }) {
  return (
    <span style={{ marginRight: 10 }}>
      <span style={{ color: '#3A4045' }}>{label}:</span>
      <span style={{ color: '#38D030', marginLeft: 3 }}>{value}</span>
    </span>
  )
}
