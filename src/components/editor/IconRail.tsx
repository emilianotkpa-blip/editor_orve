import { useState } from 'react'
import { useLandingStore, type ActiveTool } from '../../store/useLandingStore'
import type { ElementoTipo } from '../../types/landing'

type ToolDef = { id: ActiveTool; label: string; shortcut: string; icon: React.ReactNode }

const TOOLS: ToolDef[] = [
  { id: 'select',    label: 'Seleccionar',    shortcut: 'V', icon: <PointerIcon /> },
  { id: 'texto',     label: 'Texto',          shortcut: 'T', icon: <TextIcon /> },
  { id: 'imagen',    label: 'Imagen',         shortcut: 'I', icon: <ImageIcon /> },
  { id: 'bloque',    label: 'Bloque de color',shortcut: 'R', icon: <BlockIcon /> },
  { id: 'boton',     label: 'Botón',          shortcut: 'B', icon: <BtnIcon /> },
  { id: 'galeria',   label: 'Galería',        shortcut: 'G', icon: <GalIcon /> },
  { id: 'proyectos', label: 'Proyectos',      shortcut: 'P', icon: <ProyIcon /> },
  { id: 'formulario',label: 'Formulario',     shortcut: 'F', icon: <FormIcon /> },
]

const ADDABLE = TOOLS.filter((t) => t.id !== 'select') as Array<ToolDef & { id: ElementoTipo }>

export function IconRail() {
  const { activeTool, setActiveTool, addElement, config, activeSectionId } = useLandingStore()
  const [tooltip, setTooltip] = useState<string | null>(null)

  const targetSectionId = activeSectionId ?? config.secciones[0]?.id

  function handleToolClick(tool: ToolDef) {
    if (tool.id === 'select') {
      setActiveTool('select')
      return
    }
    // If already in this tool's place-mode, add to the active section at default position
    if (activeTool === tool.id) {
      if (targetSectionId) addElement(targetSectionId, tool.id as ElementoTipo)
    } else {
      setActiveTool(tool.id as ElementoTipo)
    }
  }

  return (
    <div style={{
      width: 58, flexShrink: 0,
      background: 'var(--ed-panel)', borderRight: '1px solid var(--ed-border)',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: '10px 0', gap: 2, position: 'relative',
    }}>
      {/* separator after select */}
      {TOOLS.map((tool, i) => (
        <div key={tool.id}>
          <RailBtn
            active={activeTool === tool.id}
            isPlaceMode={activeTool === tool.id && tool.id !== 'select'}
            label={`${tool.label} (${tool.shortcut})`}
            onClick={() => handleToolClick(tool)}
            onMouseEnter={() => setTooltip(tool.id)}
            onMouseLeave={() => setTooltip(null)}
          >
            {tool.icon}
          </RailBtn>
          {i === 0 && (
            <div style={{ width: 30, height: 1, background: '#2B2B2B', margin: '6px auto' }} />
          )}
        </div>
      ))}

      {/* place-mode hint */}
      {activeTool !== 'select' && (
        <div style={{
          position: 'absolute', left: 62, top: '50%', transform: 'translateY(-50%)',
          background: '#1B2A1C', border: '1px solid rgba(56,208,48,.3)',
          borderRadius: 8, padding: '8px 12px', whiteSpace: 'nowrap', zIndex: 100,
          fontSize: 11, fontWeight: 700, color: '#38D030',
          pointerEvents: 'none',
        }}>
          Click en canvas para colocar
          <br />
          <span style={{ color: '#5A8060', fontWeight: 600 }}>Esc o clic aquí para cancelar</span>
        </div>
      )}

      <div style={{ flex: 1 }} />

      <ZoomDisplay />
    </div>
  )
}

function RailBtn({
  children, label, active, isPlaceMode, onClick, onMouseEnter, onMouseLeave,
}: {
  children: React.ReactNode; label: string; active?: boolean; isPlaceMode?: boolean
  onClick: () => void; onMouseEnter: () => void; onMouseLeave: () => void
}) {
  return (
    <div
      title={label}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      style={{
        width: 42, height: 42, borderRadius: 10,
        background: isPlaceMode
          ? 'rgba(56,208,48,.22)'
          : active ? 'rgba(56,208,48,.12)' : 'transparent',
        border: isPlaceMode
          ? '1.5px solid rgba(56,208,48,.6)'
          : active ? '1px solid rgba(56,208,48,.25)' : '1px solid transparent',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer',
        color: active ? '#38D030' : '#6C7278',
        transition: 'all .14s',
        boxShadow: isPlaceMode ? '0 0 8px rgba(56,208,48,.18)' : 'none',
      }}
    >
      {children}
    </div>
  )
}

function ZoomDisplay() {
  return (
    <div style={{
      fontSize: 11, fontWeight: 700, color: '#5A5F63',
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
      padding: '10px 0',
    }}>
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="11" cy="11" r="8"/>
        <path d="M21 21l-4.35-4.35"/>
      </svg>
      <span>100%</span>
    </div>
  )
}

// ── icons ─────────────────────────────────────────────────────────────────

function PointerIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M4 2l16 9.5L12.5 13 10 20 4 2z"/>
    </svg>
  )
}

function TextIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 7V5h16v2M12 5v14M9 19h6"/>
    </svg>
  )
}

function ImageIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="18" height="18" rx="3"/>
      <circle cx="8.5" cy="8.5" r="1.5"/>
      <path d="M21 15l-5-5L5 21"/>
    </svg>
  )
}

function BlockIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <rect x="3" y="5" width="18" height="14" rx="2"/>
    </svg>
  )
}

function BtnIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="2" y="8" width="20" height="8" rx="4"/>
      <path d="M9 12h6"/>
    </svg>
  )
}

function GalIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="2" y="2" width="9" height="9" rx="2"/>
      <rect x="13" y="2" width="9" height="9" rx="2"/>
      <rect x="2" y="13" width="9" height="9" rx="2"/>
      <rect x="13" y="13" width="9" height="9" rx="2"/>
    </svg>
  )
}

function ProyIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="2" y="5" width="8" height="14" rx="2"/>
      <rect x="14" y="5" width="8" height="14" rx="2"/>
    </svg>
  )
}

function FormIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="18" height="18" rx="3"/>
      <path d="M7 8h10M7 12h10M7 16h5"/>
    </svg>
  )
}
