import { useRef, useState, useCallback, useEffect } from 'react'
import Moveable, { type OnDrag, type OnDragEnd, type OnResize, type OnResizeEnd, type OnDragGroup, type OnDragGroupEnd } from 'react-moveable'
import Selecto from 'react-selecto'
import { useLandingStore } from '../../store/useLandingStore'
import { ElementRenderer } from '../shared/ElementRenderer'
import type { ElementoTipo } from '../../types/landing'
import { STAGE_W, MIN_SECTION_H, MAX_SECTION_H } from '../../lib/layout'
import { sectionFondoLayer } from '../../lib/sections'
import { BackgroundLayer } from '../shared/BackgroundLayer'
import { resolveSrc } from '../../lib/images'

const MOBILE_W = 390

function findSectionId(config: { secciones: { id: string; elementos: { id: string }[] }[] }, elementId: string): string | null {
  for (const s of config.secciones) if (s.elementos.some((e) => e.id === elementId)) return s.id
  return null
}

export function Canvas() {
  const {
    config, viewport, selectedElementId, selectedIds, selectElement, toggleSelectElement, setSelectedIds,
    setLiveGeo, updateElementGeometry, getSelectedSectionId,
    activeTool, setActiveTool, addElement, deleteSelected, moveSelected, commitGroupGeometry,
    signedUrls, activeSectionId, setActiveSection,
    reassignElement, setSectionHeight, undo, redo,
  } = useLandingStore()

  const frameRef   = useRef<HTMLDivElement>(null)
  const sectionEls = useRef<Map<string, HTMLDivElement>>(new Map())
  const elemRefs   = useRef<Map<string, HTMLDivElement>>(new Map())

  const [moveableTargets, setMoveableTargets]     = useState<HTMLElement[]>([])
  const [moveableContainer, setMoveableContainer] = useState<HTMLDivElement | null>(null)
  const [isDragging, setIsDragging]   = useState(false)
  const [hoverSection, setHoverSection] = useState<string | null>(null)

  const isMobile  = viewport === 'movil'
  const scale     = isMobile ? MOBILE_W / STAGE_W : 1

  const selectedSectionId = getSelectedSectionId() ?? (selectedIds.length ? findSectionId(config, selectedIds[0]) : null)
  const isPlacing         = activeTool !== 'select' && !isMobile
  const multi             = moveableTargets.length > 1

  // Resolve Moveable targets + container after commit. Locked elements are
  // excluded (no handles → can't move/resize them).
  useEffect(() => {
    if (isPlacing || isMobile || !selectedSectionId || !selectedIds.length) {
      setMoveableTargets([]); setMoveableContainer(null); return
    }
    const sec = config.secciones.find((s) => s.id === selectedSectionId)
    const locked = new Set((sec?.elementos ?? []).filter((e) => e.bloqueado).map((e) => e.id))
    const nodes = selectedIds
      .filter((id) => !locked.has(id))
      .map((id) => elemRefs.current.get(id))
      .filter((n): n is HTMLDivElement => !!n)
    setMoveableTargets(nodes)
    setMoveableContainer(sectionEls.current.get(selectedSectionId) ?? null)
  }, [selectedIds, selectedSectionId, isPlacing, isMobile, viewport, config])

  // ── keyboard ──────────────────────────────────────────────────────────
  useEffect(() => {
    const ARROWS: Record<string, [number, number]> = {
      ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1],
    }
    function onKey(e: KeyboardEvent) {
      const tag = document.activeElement?.tagName
      const typing = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT'

      // undo / redo (skip while typing so native field undo still works)
      if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z')) {
        if (typing) return
        e.preventDefault()
        if (e.shiftKey) redo(); else undo()
        return
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || e.key === 'Y')) {
        if (typing) return
        e.preventDefault(); redo(); return
      }

      if (e.key === 'Escape') { setActiveTool('select'); selectElement(null); return }
      if (typing) return

      if ((e.key === 'Delete' || e.key === 'Backspace')) {
        deleteSelected()   // deletes all selected (skips locked)
        return
      }

      // arrow-key nudge: 1px, or 10px with Shift (desktop only — mobile is preview)
      const delta = ARROWS[e.key]
      if (delta && selectedIds.length && !isMobile) {
        e.preventDefault()
        const step = e.shiftKey ? 10 : 1
        moveSelected(delta[0] * step, delta[1] * step)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selectedIds, deleteSelected, moveSelected, setActiveTool, selectElement, isMobile, undo, redo])

  // which section contains a viewport Y coordinate
  const sectionAtPointY = useCallback((clientY: number): string | null => {
    for (const [id, node] of sectionEls.current) {
      const r = node.getBoundingClientRect()
      if (clientY >= r.top && clientY <= r.bottom) return id
    }
    return null
  }, [])

  // ── placement click (into the section that was clicked) ────────────────
  function handlePlacementClick(sectionId: string, e: React.MouseEvent<HTMLDivElement>) {
    if (!isPlacing) return
    const rect = e.currentTarget.getBoundingClientRect()
    const x = Math.round(e.clientX - rect.left)
    const y = Math.round(e.clientY - rect.top)
    addElement(sectionId, activeTool as ElementoTipo, x, y)
  }

  // ── moveable callbacks ─────────────────────────────────────────────────
  const handleDragStart = useCallback(() => { setIsDragging(true) }, [])

  const handleDrag = useCallback((e: OnDrag) => {
    const x = Math.round(e.left)
    const y = Math.round(e.top)
    e.target.style.left = `${x}px`
    e.target.style.top  = `${y}px`
    setLiveGeo({ x, y })
    const over = sectionAtPointY(e.clientY)
    setHoverSection(over && over !== selectedSectionId ? over : null)
  }, [setLiveGeo, sectionAtPointY, selectedSectionId])

  const handleDragEnd = useCallback((e: OnDragEnd) => {
    setIsDragging(false)
    setHoverSection(null)
    if (!selectedElementId || !selectedSectionId) return
    const t = e.target as HTMLElement
    const r = t.getBoundingClientRect()
    const targetId = sectionAtPointY(r.top + r.height / 2)

    // dropped over a different section → reassign + recompute relative pos
    if (targetId && targetId !== selectedSectionId) {
      const tr = sectionEls.current.get(targetId)?.getBoundingClientRect()
      if (tr) {
        const nx = Math.round(r.left - tr.left)
        const ny = Math.round(r.top - tr.top)
        reassignElement(selectedSectionId, targetId, selectedElementId, nx, ny)
        return
      }
    }
    // same section → persist new position
    const x = Math.round(parseFloat(t.style.left) || 0)
    const y = Math.round(parseFloat(t.style.top)  || 0)
    updateElementGeometry(selectedSectionId, selectedElementId, { x, y })
  }, [selectedElementId, selectedSectionId, updateElementGeometry, reassignElement, sectionAtPointY])

  const handleResize = useCallback((e: OnResize) => {
    const t = e.target as HTMLElement
    const x = Math.round(e.drag.left)
    const y = Math.round(e.drag.top)
    const w = Math.round(e.width)
    const h = Math.round(e.height)
    t.style.width = `${w}px`; t.style.height = `${h}px`
    t.style.left = `${x}px`;  t.style.top = `${y}px`
    setLiveGeo({ x, y, w, h })
  }, [setLiveGeo])

  const handleResizeEnd = useCallback((e: OnResizeEnd) => {
    if (!selectedElementId || !selectedSectionId) return
    const t = e.target as HTMLElement
    const x = Math.round(parseFloat(t.style.left)   || 0)
    const y = Math.round(parseFloat(t.style.top)    || 0)
    const w = Math.round(parseFloat(t.style.width)  || 0)
    const h = Math.round(parseFloat(t.style.height) || 0)
    updateElementGeometry(selectedSectionId, selectedElementId, { x, y, w, h })
  }, [selectedElementId, selectedSectionId, updateElementGeometry])

  // ── group (multi-select) move ──────────────────────────────────────────
  const handleDragGroupStart = useCallback(() => { setIsDragging(true) }, [])

  const handleDragGroup = useCallback((e: OnDragGroup) => {
    e.events.forEach((ev) => {
      ev.target.style.left = `${Math.round(ev.left)}px`
      ev.target.style.top  = `${Math.round(ev.top)}px`
    })
  }, [])

  const handleDragGroupEnd = useCallback((e: OnDragGroupEnd) => {
    setIsDragging(false)
    if (!selectedSectionId) return
    const updates = e.events.map((ev) => {
      const t = ev.target as HTMLElement
      return {
        sectionId: selectedSectionId,
        elementId: t.getAttribute('data-element-id') || '',
        x: Math.round(parseFloat(t.style.left) || 0),
        y: Math.round(parseFloat(t.style.top)  || 0),
      }
    }).filter((u) => u.elementId)
    commitGroupGeometry(updates)
  }, [selectedSectionId, commitGroupGeometry])

  // ── section height drag ────────────────────────────────────────────────
  function startSectionResize(sectionId: string, startH: number, e: React.MouseEvent) {
    e.preventDefault(); e.stopPropagation()
    const startY = e.clientY
    function onMove(ev: MouseEvent) {
      const next = Math.max(MIN_SECTION_H, Math.min(MAX_SECTION_H, startH + (ev.clientY - startY)))
      setSectionHeight(sectionId, next)
    }
    function onUp() {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  const frameW = isMobile ? MOBILE_W : STAGE_W

  // page-around backdrop (only meaningful in the editor when 'acotada')
  const pagina        = config.pagina ?? { ancho: 'completa' as const }
  const acotada       = pagina.ancho === 'acotada'
  const pageFondoTipo = pagina.fondoTipo ?? 'color'
  const pageBgUrl     = resolveSrc(pagina.fondoImagen, signedUrls)

  return (
    <div style={{ flex: 1, position: 'relative', overflow: 'hidden', background: 'var(--ed-canvas)' }}>
      {!isMobile && acotada && (
        <BackgroundLayer
          tipo={pageFondoTipo}
          color={pagina.fondo || '#0A0A0A'}
          url={pageBgUrl}
          ajustes={pagina.fondoAjustes}
          fallback="#0A0A0A"
        />
      )}

      <div
        style={{
          position: 'absolute', inset: 0, overflow: 'auto',
          display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
          padding: '28px 20px 120px',
          cursor: isPlacing ? 'crosshair' : 'default',
        }}
      >
      <div ref={frameRef} className="orve-frame" style={{
        position: 'relative', width: frameW, flexShrink: 0,
        boxShadow: '0 8px 48px rgba(0,0,0,.7)',
        borderRadius: 10, overflow: 'hidden',
      }}>
        {config.secciones.map((sec, idx) => {
          const sectionH = sec.altura?.escritorio ?? 580
          const fondoLayer = sectionFondoLayer(sec.fondo, signedUrls)

          // ── mobile: faithful scaled preview ──
          if (isMobile) {
            return (
              <div key={sec.id} style={{
                position: 'relative', width: MOBILE_W, height: Math.round(sectionH * scale),
                overflow: 'hidden', background: '#0E1411',
              }}>
                <div style={{
                  position: 'absolute', top: 0, left: 0,
                  width: STAGE_W, height: sectionH,
                  transform: `scale(${scale})`, transformOrigin: 'top left',
                }}>
                  <BackgroundLayer {...fondoLayer} />
                  {sec.elementos.map((el) => (
                    <ElementRenderer key={el.id} element={el} viewport="escritorio" signedUrls={signedUrls} isSelected={false} />
                  ))}
                </div>
              </div>
            )
          }

          // ── desktop: editable section (its own coordinate space) ──
          const isActive  = sec.id === activeSectionId
          const dragLift  = isDragging && sec.id === selectedSectionId
          const isHover   = hoverSection === sec.id

          return (
            <div
              key={sec.id}
              ref={(node) => { if (node) sectionEls.current.set(sec.id, node); else sectionEls.current.delete(sec.id) }}
              onClick={isPlacing ? undefined : () => { setActiveSection(sec.id); selectElement(null) }}
              style={{
                position: 'relative',
                width: STAGE_W,
                height: sectionH,
                overflow: dragLift ? 'visible' : 'hidden',
                zIndex: dragLift ? 50 : 'auto',
                outline: isHover ? '3px solid #38D030' : isActive ? '2px solid rgba(56,208,48,.45)' : 'none',
                outlineOffset: -2,
              }}
            >
              <BackgroundLayer {...fondoLayer} />

              {/* dot grid */}
              <div style={{
                position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0,
                backgroundImage: 'radial-gradient(circle, rgba(56,208,48,.1) 1px, transparent 1px)',
                backgroundSize: '24px 24px',
              }} />

              {/* section label */}
              <div style={{
                position: 'absolute', top: 8, left: 8, zIndex: 20,
                display: 'flex', alignItems: 'center', gap: 6,
                pointerEvents: 'none',
              }}>
                <span style={{
                  fontSize: 10, fontWeight: 800, letterSpacing: '.4px',
                  padding: '3px 8px', borderRadius: 5,
                  background: isActive ? 'rgba(56,208,48,.9)' : 'rgba(0,0,0,.5)',
                  color: isActive ? '#063800' : '#9AA0A6',
                  textTransform: 'uppercase',
                }}>
                  {sec.nombre ?? sec.id}{isActive ? ' · activa' : ''}
                </span>
              </div>

              {sec.elementos.map((el) => (
                <ElementRenderer
                  key={el.id}
                  element={el}
                  viewport={viewport}
                  signedUrls={signedUrls}
                  isSelected={!isPlacing && selectedIds.includes(el.id)}
                  onSelect={isPlacing ? undefined : (e) => {
                    if (e.ctrlKey || e.metaKey || e.shiftKey) toggleSelectElement(el.id)
                    else selectElement(el.id)
                  }}
                  ref={(node) => { if (node) elemRefs.current.set(el.id, node); else elemRefs.current.delete(el.id) }}
                />
              ))}

              {/* Moveable for the selected element(s) of this section */}
              {!isPlacing && sec.id === selectedSectionId && moveableTargets.length > 0 &&
               moveableContainer === sectionEls.current.get(sec.id) && (
                <Moveable
                  target={multi ? moveableTargets : moveableTargets[0]}
                  container={moveableContainer}
                  draggable
                  resizable={!multi}
                  throttleDrag={0} throttleResize={0}
                  renderDirections={['nw','n','ne','w','e','sw','s','se']}
                  origin={false}
                  onDragStart={handleDragStart}
                  onDrag={handleDrag}
                  onDragEnd={handleDragEnd}
                  onResize={handleResize}
                  onResizeEnd={handleResizeEnd}
                  onDragGroupStart={handleDragGroupStart}
                  onDragGroup={handleDragGroup}
                  onDragGroupEnd={handleDragGroupEnd}
                  className="orve-moveable"
                />
              )}

              {/* placement overlay — places into THIS section */}
              {isPlacing && (
                <div
                  onClick={(e) => handlePlacementClick(sec.id, e)}
                  style={{
                    position: 'absolute', inset: 0, zIndex: 9000, cursor: 'crosshair',
                    background: 'rgba(56,208,48,.025)',
                    border: '1.5px dashed rgba(56,208,48,.35)',
                  }}
                />
              )}

              {/* section height handle */}
              {!isPlacing && (
                <div
                  className="ed-no-rubber"
                  title="Arrastra para ajustar la altura de la sección"
                  onMouseDown={(e) => startSectionResize(sec.id, sectionH, e)}
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    position: 'absolute', left: 0, right: 0, bottom: 0, height: 10, zIndex: 8000,
                    cursor: 'ns-resize',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: isActive ? 'rgba(56,208,48,.18)' : 'rgba(255,255,255,.04)',
                  }}
                >
                  <div style={{ width: 44, height: 3, borderRadius: 2, background: isActive ? '#38D030' : '#4F5458' }} />
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* rubber-band multi-select (desktop, select mode) */}
      {!isMobile && !isPlacing && (
        <Selecto
          dragContainer={'.orve-frame'}
          boundContainer={'.orve-frame'}
          selectableTargets={['.orve-selectable']}
          hitRate={0}
          selectByClick={false}
          selectFromInside={false}
          toggleContinueSelect={['shift', 'ctrl', 'meta']}
          ratio={0}
          onDragStart={(e) => {
            const t = e.inputEvent.target as HTMLElement
            // let Moveable handle the drag when starting on a handle or a selected
            // element; don't rubber-band off the section resize handle
            if (t.closest('.moveable-control-box') || t.closest('[data-selected="1"]') || t.closest('.ed-no-rubber')) e.stop()
          }}
          onSelectEnd={(e) => {
            const ids = e.selected
              .map((n) => (n as HTMLElement).getAttribute('data-element-id'))
              .filter((id): id is string => !!id)
            setSelectedIds(ids)
          }}
        />
      )}
      </div>
    </div>
  )
}
