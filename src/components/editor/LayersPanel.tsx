import { useState } from 'react'
import { useLandingStore } from '../../store/useLandingStore'
import type { ElementoTipo } from '../../types/landing'

const TIPO_LABELS: Record<ElementoTipo, string> = {
  texto:      'Texto',
  imagen:     'Imagen',
  boton:      'Botón',
  galeria:    'Galería',
  formulario: 'Formulario',
  bloque:     'Bloque de color',
  proyectos:  'Proyectos',
}

const TIPO_ORDER: ElementoTipo[] = ['texto', 'imagen', 'boton', 'bloque', 'galeria', 'proyectos', 'formulario']

export function LayersPanel() {
  const {
    config, selectedIds, selectElement, toggleSelectElement, addElement, deleteElement,
    duplicateElement, reorderLayers, activeSectionId, setActiveSection,
    editingPage, setEditingPage, toggleLock,
    addSection, deleteSection, duplicateSection, moveSection,
  } = useLandingStore()
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [showAddMenu, setShowAddMenu] = useState(false)
  const [dragId, setDragId]       = useState<string | null>(null)
  const [dragOverId, setDragOverId] = useState<string | null>(null)

  const targetSectionId = activeSectionId ?? config.secciones[0]?.id

  // Drop `dragId` onto the row of `targetId`. `frontToBack` is the current
  // visual order (top of list = front). Store wants bottom→top, so reverse.
  function handleDrop(sectionId: string, frontToBack: string[], targetId: string) {
    if (!dragId || dragId === targetId) { setDragId(null); setDragOverId(null); return }
    const order = [...frontToBack]
    const from = order.indexOf(dragId)
    const to   = order.indexOf(targetId)
    if (from < 0 || to < 0) { setDragId(null); setDragOverId(null); return }
    order.splice(from, 1)
    order.splice(to, 0, dragId)
    reorderLayers(sectionId, [...order].reverse())
    setDragId(null); setDragOverId(null)
  }

  return (
    <div style={{
      width: 220, flexShrink: 0,
      background: 'var(--ed-panel)', borderRight: '1px solid var(--ed-border)',
      display: 'flex', flexDirection: 'column',
      overflow: 'hidden', position: 'relative',
    }}>
      {/* header */}
      <div style={{
        padding: '10px 14px',
        borderBottom: '1px solid var(--ed-border)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.8px', color: 'var(--ed-text-3)', textTransform: 'uppercase' }}>
          Capas
        </span>
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setShowAddMenu((v) => !v)}
            style={{
              background: showAddMenu ? '#38D030' : 'rgba(56,208,48,.12)',
              border: '1px solid rgba(56,208,48,.25)',
              color: showAddMenu ? '#063800' : '#38D030',
              fontSize: 18, width: 26, height: 26, borderRadius: 6,
              cursor: 'pointer', lineHeight: 1, padding: 0, fontFamily: 'inherit',
            }}
            title="Agregar elemento"
          >
            +
          </button>

          {showAddMenu && (
            <div style={{
              position: 'absolute', right: 0, top: 30, zIndex: 200,
              background: 'var(--ed-panel)', border: '1px solid var(--ed-border-2)',
              borderRadius: 10, padding: 6, minWidth: 150,
              boxShadow: '0 8px 28px rgba(0,0,0,.6)',
            }}>
              <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '.6px', color: '#4F5458', textTransform: 'uppercase', padding: '4px 8px 6px' }}>
                Agregar elemento
              </div>
              {TIPO_ORDER.map((tipo) => (
                <AddMenuBtn
                  key={tipo}
                  tipo={tipo}
                  onClick={() => {
                    if (targetSectionId) addElement(targetSectionId, tipo)
                    setShowAddMenu(false)
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* backdrop to close add menu */}
      {showAddMenu && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 199 }}
          onClick={() => setShowAddMenu(false)}
        />
      )}

      {/* layers list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
        {/* page properties entry */}
        <div
          onClick={() => setEditingPage(true)}
          title="Propiedades de la página (ancho, fondo)"
          style={{
            display: 'flex', alignItems: 'center', gap: 7,
            padding: '7px 14px', cursor: 'pointer', marginBottom: 4,
            background: editingPage ? 'rgba(56,208,48,.1)' : 'transparent',
            borderLeft: editingPage ? '2px solid #38D030' : '2px solid transparent',
          }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={editingPage ? '#38D030' : '#6C7278'} strokeWidth="2">
            <rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/>
          </svg>
          <span style={{ fontSize: 12, fontWeight: 700, color: editingPage ? '#ECEEEF' : '#9AA0A6' }}>Página</span>
          <span style={{ fontSize: 9, color: '#4F5458', marginLeft: 'auto', fontWeight: 700 }}>
            {(config.pagina?.ancho ?? 'completa') === 'acotada' ? 'ACOTADA' : 'COMPLETA'}
          </span>
        </div>

        {config.secciones.map((seccion, secIdx) => {
          const isActiveSection = seccion.id === activeSectionId
          const onlyOne = config.secciones.length <= 1
          return (
          <div key={seccion.id} className="ed-section-row">
            <div
              onClick={() => { setActiveSection(seccion.id); selectElement(null) }}
              title="Activar sección (los nuevos elementos van aquí)"
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '7px 8px 5px 14px', cursor: 'pointer',
                background: isActiveSection ? 'rgba(56,208,48,.07)' : 'transparent',
                borderLeft: isActiveSection ? '2px solid #38D030' : '2px solid transparent',
              }}>
              <svg width="9" height="9" viewBox="0 0 9 9" fill={isActiveSection ? '#38D030' : '#5A5F63'}><path d="M1.5 1.5l6 3-6 3z"/></svg>
              <span style={{ fontSize: 12, fontWeight: 700, color: isActiveSection ? 'var(--ed-text)' : 'var(--ed-text-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {seccion.nombre ?? seccion.id}
              </span>
              {isActiveSection && (
                <span style={{ fontSize: 8, fontWeight: 800, color: '#38D030', letterSpacing: '.4px', flexShrink: 0 }}>ACTIVA</span>
              )}
              <span style={{ fontSize: 10, color: 'var(--ed-text-3)', marginLeft: 'auto', flexShrink: 0 }}>
                {seccion.elementos.length}
              </span>
              {/* section controls (show on hover via CSS) */}
              <div className="ed-section-ctrls" style={{ display: 'flex', gap: 2, flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
                <SecBtn title="Subir" disabled={secIdx === 0} onClick={() => moveSection(seccion.id, 'up')}>↑</SecBtn>
                <SecBtn title="Bajar" disabled={secIdx === config.secciones.length - 1} onClick={() => moveSection(seccion.id, 'down')}>↓</SecBtn>
                <SecBtn title="Duplicar sección" onClick={() => duplicateSection(seccion.id)}><CopyIcon /></SecBtn>
                <SecBtn title={onlyOne ? 'Debe quedar al menos una' : 'Eliminar sección'} danger disabled={onlyOne} onClick={() => deleteSection(seccion.id)}><TrashIcon /></SecBtn>
              </div>
            </div>

            {(() => {
              // visual order: top of list = front (highest z)
              const frontToBack = [...seccion.elementos]
                .sort((a, b) => (b.geometria.escritorio.z - a.geometria.escritorio.z))
              const frontToBackIds = frontToBack.map((e) => e.id)

              return frontToBack.map((el) => {
                const isSelected = selectedIds.includes(el.id)
                const isHovered  = el.id === hoveredId
                const isDragging = el.id === dragId
                const isDropTarget = el.id === dragOverId && dragId !== null && dragId !== el.id

                return (
                  <div
                    key={el.id}
                    draggable
                    onDragStart={(e) => { setDragId(el.id); e.dataTransfer.effectAllowed = 'move' }}
                    onDragOver={(e) => { e.preventDefault(); if (dragId && dragId !== el.id) setDragOverId(el.id) }}
                    onDragLeave={() => { if (dragOverId === el.id) setDragOverId(null) }}
                    onDrop={(e) => { e.preventDefault(); handleDrop(seccion.id, frontToBackIds, el.id) }}
                    onDragEnd={() => { setDragId(null); setDragOverId(null) }}
                    onMouseEnter={() => setHoveredId(el.id)}
                    onMouseLeave={() => setHoveredId(null)}
                    onClick={(e) => {
                      if (e.ctrlKey || e.metaKey || e.shiftKey) toggleSelectElement(el.id)
                      else selectElement(isSelected && selectedIds.length === 1 ? null : el.id)
                    }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      padding: '6px 10px 6px 8px',
                      background: isSelected ? 'rgba(56,208,48,.12)' : isHovered ? 'var(--ed-hover)' : 'transparent',
                      borderLeft: isSelected ? '2px solid #38D030' : '2px solid transparent',
                      borderTop: isDropTarget ? '2px solid #38D030' : '2px solid transparent',
                      opacity: isDragging ? 0.4 : el.bloqueado ? 0.7 : 1,
                      cursor: 'pointer',
                    }}
                  >
                    <span
                      title="Arrastra para reordenar"
                      style={{ flexShrink: 0, display: 'flex', cursor: 'grab', color: isHovered || isSelected ? 'var(--ed-text-3)' : 'var(--ed-border-2)' }}
                    >
                      <GripIcon />
                    </span>
                    <ElementTypeIcon tipo={el.tipo} active={isSelected} />
                    <span style={{
                      fontSize: 12, fontWeight: 600,
                      color: isSelected ? 'var(--ed-text)' : 'var(--ed-text-2)',
                      flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {el.id}
                    </span>

                    <div style={{ display: 'flex', gap: 3, flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
                      {/* lock — always shown when locked, otherwise on hover/selection */}
                      {(el.bloqueado || isHovered || isSelected) && (
                        <LayerActionBtn
                          title={el.bloqueado ? 'Desbloquear' : 'Bloquear'}
                          active={el.bloqueado}
                          onClick={() => toggleLock(seccion.id, el.id)}
                        >
                          {el.bloqueado ? <LockClosedIcon /> : <LockOpenIcon />}
                        </LayerActionBtn>
                      )}
                      {(isHovered || isSelected) && (
                        <>
                          <LayerActionBtn title="Duplicar" onClick={() => duplicateElement(seccion.id, el.id)}>
                            <CopyIcon />
                          </LayerActionBtn>
                          <LayerActionBtn title="Eliminar" danger onClick={() => deleteElement(seccion.id, el.id)}>
                            <TrashIcon />
                          </LayerActionBtn>
                        </>
                      )}
                    </div>
                  </div>
                )
              })
            })()}
          </div>
          )
        })}

        {/* add section */}
        <div style={{ padding: '10px 12px 4px' }}>
          <button
            onClick={() => addSection()}
            style={{
              width: '100%', padding: '8px 0', borderRadius: 7,
              background: 'rgba(56,208,48,.12)', border: '1px dashed rgba(56,208,48,.4)',
              color: '#38D030', fontSize: 12, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}
          >
            + Agregar sección
          </button>
        </div>
      </div>
    </div>
  )
}

function SecBtn({ children, title, danger, disabled, onClick }: { children: React.ReactNode; title: string; danger?: boolean; disabled?: boolean; onClick: () => void }) {
  return (
    <button
      title={title}
      disabled={disabled}
      onClick={onClick}
      style={{
        width: 19, height: 19, borderRadius: 4, padding: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'transparent', border: 'none',
        color: disabled ? 'var(--ed-border-2)' : danger ? '#FF6B6B' : 'var(--ed-text-3)',
        cursor: disabled ? 'default' : 'pointer', fontSize: 12, fontWeight: 800, lineHeight: 1,
      }}
    >
      {children}
    </button>
  )
}

// ── sub-components ────────────────────────────────────────────────────────

function AddMenuBtn({ tipo, onClick }: { tipo: ElementoTipo; onClick: () => void }) {
  const [hov, setHov] = useState(false)
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '7px 8px', borderRadius: 7, cursor: 'pointer',
        background: hov ? 'rgba(56,208,48,.1)' : 'transparent',
        color: hov ? '#38D030' : '#C9CED0',
        fontSize: 12, fontWeight: 700,
      }}
    >
      <ElementTypeIcon tipo={tipo} active={hov} size={14} />
      {TIPO_LABELS[tipo]}
    </div>
  )
}

function LayerActionBtn({
  children, title, danger, active, onClick,
}: {
  children: React.ReactNode; title: string; danger?: boolean; active?: boolean; onClick: () => void
}) {
  const [hov, setHov] = useState(false)
  const lit = hov || active
  return (
    <div
      title={title}
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        width: 22, height: 22, borderRadius: 5,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer',
        background: lit ? (danger ? 'rgba(255,80,80,.15)' : active ? 'rgba(201,154,58,.18)' : 'rgba(56,208,48,.12)') : 'transparent',
        color: lit ? (danger ? '#FF6B6B' : active ? '#C99A3A' : '#38D030') : 'var(--ed-text-3)',
        transition: 'all .12s',
      }}
    >
      {children}
    </div>
  )
}

function LockClosedIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
      <rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>
    </svg>
  )
}
function LockOpenIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
      <rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 7.5-1.5"/>
    </svg>
  )
}

function ElementTypeIcon({ tipo, active, size = 13 }: { tipo: string; active: boolean; size?: number }) {
  const color = active ? '#38D030' : '#555B60'
  const s = size
  if (tipo === 'imagen') return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
      <rect x="3" y="3" width="18" height="18" rx="2"/>
      <circle cx="8.5" cy="8.5" r="1.5"/>
      <path d="M21 15l-5-5L5 21"/>
    </svg>
  )
  if (tipo === 'texto') return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
      <path d="M4 7V5h16v2M12 5v14M9 19h6"/>
    </svg>
  )
  if (tipo === 'boton') return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
      <rect x="2" y="8" width="20" height="8" rx="4"/>
    </svg>
  )
  if (tipo === 'bloque') return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill={color} stroke="none">
      <rect x="3" y="5" width="18" height="14" rx="2"/>
    </svg>
  )
  if (tipo === 'galeria') return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
      <rect x="2" y="2" width="9" height="9" rx="1.5"/>
      <rect x="13" y="2" width="9" height="9" rx="1.5"/>
      <rect x="2" y="13" width="9" height="9" rx="1.5"/>
      <rect x="13" y="13" width="9" height="9" rx="1.5"/>
    </svg>
  )
  if (tipo === 'proyectos') return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
      <rect x="2" y="5" width="8" height="14" rx="2"/>
      <rect x="14" y="5" width="8" height="14" rx="2"/>
    </svg>
  )
  if (tipo === 'formulario') return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
      <rect x="3" y="3" width="18" height="18" rx="2"/>
      <path d="M7 8h10M7 12h10M7 16h5"/>
    </svg>
  )
  return <span style={{ width: s, height: s, borderRadius: 3, background: color, display: 'inline-block' }} />
}

function CopyIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
      <rect x="9" y="9" width="13" height="13" rx="2"/>
      <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
    </svg>
  )
}

function TrashIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
      <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/>
    </svg>
  )
}

function GripIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
      <circle cx="9" cy="5" r="1.6"/><circle cx="15" cy="5" r="1.6"/>
      <circle cx="9" cy="12" r="1.6"/><circle cx="15" cy="12" r="1.6"/>
      <circle cx="9" cy="19" r="1.6"/><circle cx="15" cy="19" r="1.6"/>
    </svg>
  )
}
