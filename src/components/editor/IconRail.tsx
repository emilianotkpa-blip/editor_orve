import { useState } from 'react'
import { AnimatePresence, m } from 'motion/react'
import { useLandingStore, type ActiveTool } from '../../store/useLandingStore'
import type { ElementoTipo } from '../../types/landing'
import { LAYOUT, POP } from '../../lib/motion'

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
  { id: 'logo',      label: 'Logo ORVE',      shortcut: 'L', icon: <LogoIcon /> },
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
      <AnimatePresence>
        {activeTool !== 'select' && (
          <m.div
            key="hint"
            initial={{ opacity: 0, x: -8, y: '-50%' }}
            animate={{ opacity: 1, x: 0,  y: '-50%' }}
            exit={{    opacity: 0, x: -8, y: '-50%' }}
            transition={POP}
            style={{
              position: 'absolute', left: 62, top: '50%',
              background: '#1B2A1C', border: '1px solid rgba(56,208,48,.3)',
              borderRadius: 8, padding: '8px 12px', whiteSpace: 'nowrap', zIndex: 100,
              fontSize: 11, fontWeight: 700, color: '#38D030',
              pointerEvents: 'none',
            }}
          >
            Click en canvas para colocar
            <br />
            <span style={{ color: '#5A8060', fontWeight: 600 }}>Esc o clic aquí para cancelar</span>
          </m.div>
        )}
      </AnimatePresence>

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
    <m.div
      title={label}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      whileHover={{ scale: 1.08 }}
      whileTap={{ scale: 0.92 }}
      style={{
        position: 'relative',
        width: 42, height: 42, borderRadius: 10,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer',
        color: active ? '#38D030' : '#6C7278',
        transition: 'color .14s',
      }}
    >
      {/* Un solo fondo compartido por todo el rail: al cambiar de herramienta
          se desliza al botón nuevo en vez de prender y apagar dos cuadros. */}
      {active && (
        <m.div
          layoutId="rail-activo"
          transition={LAYOUT}
          style={{
            position: 'absolute', inset: 0, borderRadius: 10,
            background: isPlaceMode ? 'rgba(56,208,48,.22)' : 'rgba(56,208,48,.12)',
            border: isPlaceMode
              ? '1.5px solid rgba(56,208,48,.6)'
              : '1px solid rgba(56,208,48,.25)',
            boxShadow: isPlaceMode ? '0 0 8px rgba(56,208,48,.18)' : 'none',
          }}
        />
      )}
      <span style={{ position: 'relative', zIndex: 1, display: 'flex' }}>{children}</span>
    </m.div>
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

// Espiga ORVE, simplificada al trazo del resto del rail.
function LogoIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M12 22v-6"/>
      <path d="M12 16 3 7M12 16l9-9"/>
      <path d="M8 12l7-7M16 12 9 5"/>
    </svg>
  )
}
