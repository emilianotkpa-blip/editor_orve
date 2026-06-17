import { create } from 'zustand'
import type { LandingConfig, LandingElemento, Geometry, Viewport, ElementoTipo, Seccion } from '../types/landing'
import { DEFAULT_CONFIG, createDefaultElement, createDefaultSection, cloneSection } from '../types/landing'
import { apiLoadLanding, apiSaveLanding, apiSignedUrls } from '../api/webhooks'
import { isDisplayableUrl } from '../lib/images'
import { softSlugify } from '../lib/layout'

// Collect every storage path referenced by image / gallery elements that still
// needs signing (i.e. not already an http/blob/data URL).
function collectImagePaths(config: LandingConfig): string[] {
  const paths = new Set<string>()
  // page background image
  if (config.pagina?.fondoImagen && !isDisplayableUrl(config.pagina.fondoImagen)) {
    paths.add(config.pagina.fondoImagen)
  }
  for (const sec of config.secciones) {
    // section image backgrounds
    if (sec.fondo?.tipo === 'imagen' && sec.fondo.valor && !isDisplayableUrl(sec.fondo.valor)) {
      paths.add(sec.fondo.valor)
    }
    for (const el of sec.elementos) {
      if (el.tipo === 'imagen') {
        const raw = (el.contenido.src ?? el.contenido.path) as string | undefined
        if (raw && !isDisplayableUrl(raw)) paths.add(raw)
      }
      if (el.tipo === 'galeria') {
        const imgs = (el.contenido.imagenes as string[] | undefined) ?? []
        for (const p of imgs) if (p && !isDisplayableUrl(p)) paths.add(p)
      }
      if (el.tipo === 'proyectos') {
        const cards = (el.contenido.cards as { imagen?: string }[] | undefined) ?? []
        for (const c of cards) if (c.imagen && !isDisplayableUrl(c.imagen)) paths.add(c.imagen)
      }
    }
  }
  return [...paths]
}

// Ensure every section and element has required fields before rendering
function sanitizeConfig(raw: unknown): LandingConfig {
  if (!raw || typeof raw !== 'object') return DEFAULT_CONFIG
  const r = raw as Partial<LandingConfig>

  const secciones: Seccion[] = Array.isArray(r.secciones)
    ? r.secciones.map((s: Partial<Seccion>) => ({
        id:      s.id      ?? 'hero',
        nombre:  s.nombre,
        fondo:   s.fondo   ?? { tipo: 'color', valor: '#0E1411' },
        altura:  s.altura  ?? { escritorio: 580, movil: 520 },
        elementos: Array.isArray(s.elementos)
          ? s.elementos.map((el: Partial<LandingElemento>) => ({
              id:        el.id        ?? `el_${Math.random().toString(36).slice(2)}`,
              tipo:      el.tipo      ?? 'texto',
              bloqueado: el.bloqueado ?? false,
              contenido: el.contenido ?? {},
              estilo:    el.estilo    ?? {},
              geometria: el.geometria ?? {
                escritorio: { x: 0, y: 0, w: 200, h: 40, z: 1 },
                movil:      { x: 0, y: 0, w: 200, h: 40, z: 1 },
              },
            }))
          : [],
      }))
    : DEFAULT_CONFIG.secciones

  return {
    slug:      r.slug      ?? '',
    publicada: r.publicada ?? false,
    branding:  r.branding,
    pagina:    r.pagina    ?? { ancho: 'completa' },
    secciones,
  }
}

// Reassign z to every element of a section based on a bottom→top ordered id list.
// z runs 1..N (1 = back). Applies to both viewports so stacking stays consistent.
function applyZOrder(section: Seccion, orderedBottomToTop: string[]): Seccion {
  const zById = new Map(orderedBottomToTop.map((id, i) => [id, i + 1]))
  return {
    ...section,
    elementos: section.elementos.map((el) => {
      const z = zById.get(el.id)
      if (z == null) return el
      return {
        ...el,
        geometria: {
          escritorio: { ...el.geometria.escritorio, z },
          movil:      { ...el.geometria.movil, z },
        },
      }
    }),
  }
}

// Current stacking order (bottom→top) by escritorio z, stable for ties.
function orderByZ(section: Seccion): string[] {
  return section.elementos
    .map((el, i) => ({ id: el.id, z: el.geometria.escritorio.z, i }))
    .sort((a, b) => (a.z - b.z) || (a.i - b.i))
    .map((e) => e.id)
}

function sectionIdOf(config: LandingConfig, elementId: string): string | null {
  for (const s of config.secciones) {
    if (s.elementos.some((e) => e.id === elementId)) return s.id
  }
  return null
}

export type ActiveTool = 'select' | ElementoTipo

export interface ToastMsg {
  id: number
  type: 'success' | 'error'
  message: string
}

let toastTimer: ReturnType<typeof setTimeout> | null = null

// ── undo/redo history ────────────────────────────────────────────────────
const HISTORY_LIMIT = 50
// coalescing: continuous edits sharing a key within this window count as one step
const COALESCE_MS = 600
let histLast: { key: string; time: number } = { key: '', time: 0 }
let suppressHistory = false   // true while applying an undo/redo

interface LandingStore {
  email: string
  config: LandingConfig
  selectedElementId: string | null
  selectedIds: string[]
  viewport: Viewport
  liveGeo: Partial<Geometry> | null
  isDirty: boolean
  isSaving: boolean
  isPublishing: boolean
  saveStatus: 'saved' | 'saving' | 'error' | 'unsaved'
  isLoading: boolean
  toast: ToastMsg | null
  activeTool: ActiveTool
  signedUrls: Record<string, string>
  activeSectionId: string | null
  editingPage: boolean
  previewing: boolean
  theme: 'dark' | 'light'
  past: LandingConfig[]
  future: LandingConfig[]

  undo: () => void
  redo: () => void
  setEmail: (email: string) => void
  setPreviewing: (v: boolean) => void
  toggleTheme: () => void
  setViewport: (v: Viewport) => void
  selectElement: (id: string | null) => void
  toggleSelectElement: (id: string) => void
  setSelectedIds: (ids: string[]) => void
  deleteSelected: () => void
  moveSelected: (dx: number, dy: number) => void
  commitGroupGeometry: (updates: { sectionId: string; elementId: string; x: number; y: number; w?: number; h?: number }[]) => void
  alignSelected: (mode: 'left' | 'centerH' | 'right' | 'top' | 'middleV' | 'bottom') => void
  setLiveGeo: (geo: Partial<Geometry> | null) => void
  setActiveTool: (tool: ActiveTool) => void
  setActiveSection: (id: string | null) => void
  setEditingPage: (v: boolean) => void
  setSlug: (slug: string) => void
  setPagina: (patch: Partial<NonNullable<LandingConfig['pagina']>>) => void
  mergeSignedUrls: (map: Record<string, string>) => void
  resolveSignedUrls: () => Promise<void>
  showToast: (type: 'success' | 'error', message: string) => void
  dismissToast: () => void

  updateElementGeometry: (sectionId: string, elementId: string, geo: Partial<Geometry>) => void
  updateElementStyle: (sectionId: string, elementId: string, style: Partial<LandingElemento['estilo']>) => void
  updateElementContent: (sectionId: string, elementId: string, content: Partial<LandingElemento['contenido']>) => void

  addElement: (sectionId: string, tipo: ElementoTipo, x?: number, y?: number) => void
  deleteElement: (sectionId: string, elementId: string) => void
  duplicateElement: (sectionId: string, elementId: string) => void
  reassignElement: (fromSectionId: string, toSectionId: string, elementId: string, x: number, y: number) => void
  toggleLock: (sectionId: string, elementId: string) => void

  addSection: () => void
  deleteSection: (sectionId: string) => void
  duplicateSection: (sectionId: string) => void
  moveSection: (sectionId: string, dir: 'up' | 'down') => void

  setSectionHeight: (sectionId: string, height: number) => void
  setSectionFondo: (sectionId: string, fondo: Seccion['fondo']) => void

  moveLayer: (sectionId: string, elementId: string, dir: 'front' | 'back' | 'up' | 'down') => void
  reorderLayers: (sectionId: string, orderedIdsBottomToTop: string[]) => void

  loadLanding: () => Promise<void>
  saveLanding: () => Promise<boolean>
  publishLanding: () => Promise<boolean>

  getSelectedElement: () => LandingElemento | null
  getSelectedSectionId: () => string | null
}

export const useLandingStore = create<LandingStore>((set, get) => {
  // Snapshot the CURRENT config into the past stack before a mutation.
  // `key` coalesces continuous edits (typing, sliders, drags) into one step.
  function record(key = '') {
    if (suppressHistory) return
    const now = Date.now()
    const coalesce = key !== '' && key === histLast.key && (now - histLast.time) < COALESCE_MS
    histLast = { key, time: now }
    if (coalesce) return
    const prev = get().config
    set((s) => ({ past: [...s.past, prev].slice(-HISTORY_LIMIT), future: [] }))
  }

  return {
  email: new URLSearchParams(window.location.search).get('email') ?? '',
  config: DEFAULT_CONFIG,
  selectedElementId: null,
  selectedIds: [],
  viewport: 'escritorio',
  liveGeo: null,
  isDirty: false,
  isSaving: false,
  isPublishing: false,
  saveStatus: 'saved',
  isLoading: false,
  activeTool: 'select',
  signedUrls: {},
  toast: null,
  activeSectionId: DEFAULT_CONFIG.secciones[0]?.id ?? null,
  editingPage: false,
  previewing: false,
  theme: (localStorage.getItem('orve-editor-theme') as 'dark' | 'light') || 'dark',
  past: [],
  future: [],

  undo: () => {
    const { past, config } = get()
    if (!past.length) return
    histLast = { key: '', time: 0 }
    const prev = { ...past[past.length - 1], publicada: config.publicada }
    suppressHistory = true
    set((s) => ({
      config: prev,
      past: s.past.slice(0, -1),
      future: [config, ...s.future].slice(0, HISTORY_LIMIT),
      selectedElementId: null, selectedIds: [], liveGeo: null,
      activeSectionId: prev.secciones[0]?.id ?? null,
      isDirty: true, saveStatus: 'unsaved' as const,
    }))
    suppressHistory = false
  },

  redo: () => {
    const { future, config } = get()
    if (!future.length) return
    histLast = { key: '', time: 0 }
    const next = { ...future[0], publicada: config.publicada }
    suppressHistory = true
    set((s) => ({
      config: next,
      future: s.future.slice(1),
      past: [...s.past, config].slice(-HISTORY_LIMIT),
      selectedElementId: null, selectedIds: [], liveGeo: null,
      activeSectionId: next.secciones[0]?.id ?? null,
      isDirty: true, saveStatus: 'unsaved' as const,
    }))
    suppressHistory = false
  },

  setEmail: (email) => set({ email }),
  setPreviewing: (previewing) => set({ previewing }),
  toggleTheme: () =>
    set((state) => {
      const theme = state.theme === 'dark' ? 'light' : 'dark'
      try { localStorage.setItem('orve-editor-theme', theme) } catch { /* noop */ }
      return { theme }
    }),
  setViewport: (viewport) => set({ viewport, selectedElementId: null, selectedIds: [], liveGeo: null }),
  selectElement: (id) =>
    set((state) => {
      if (!id) return { selectedElementId: null, selectedIds: [], liveGeo: null, editingPage: false }
      const secId = sectionIdOf(state.config, id)
      return {
        selectedElementId: id, selectedIds: [id],
        activeSectionId: secId ?? state.activeSectionId,
        liveGeo: null, editingPage: false,
      }
    }),
  toggleSelectElement: (id) =>
    set((state) => {
      const secId = sectionIdOf(state.config, id)
      const cur = state.selectedIds
      const curSec = cur.length ? sectionIdOf(state.config, cur[0]) : null
      let ids: string[]
      if (curSec && secId && curSec !== secId) ids = [id]           // multi-select stays within one section
      else if (cur.includes(id)) ids = cur.filter((x) => x !== id)
      else ids = [...cur, id]
      return {
        selectedIds: ids,
        selectedElementId: ids.length === 1 ? ids[0] : null,
        activeSectionId: secId ?? state.activeSectionId,
        liveGeo: null, editingPage: false,
      }
    }),
  setSelectedIds: (ids) =>
    set((state) => {
      if (!ids.length) return { selectedIds: [], selectedElementId: null }
      const secId = sectionIdOf(state.config, ids[0])
      const filtered = ids.filter((id) => sectionIdOf(state.config, id) === secId)
      return {
        selectedIds: filtered,
        selectedElementId: filtered.length === 1 ? filtered[0] : null,
        activeSectionId: secId ?? state.activeSectionId,
        liveGeo: null, editingPage: false,
      }
    }),
  setLiveGeo: (liveGeo) => set({ liveGeo }),
  setActiveTool: (activeTool) => set({ activeTool, selectedElementId: null, selectedIds: [], liveGeo: null }),
  setActiveSection: (activeSectionId) => set({ activeSectionId, editingPage: false }),
  setEditingPage: (editingPage) =>
    set(editingPage ? { editingPage, selectedElementId: null, selectedIds: [], liveGeo: null } : { editingPage }),

  setSlug: (slug) => {
    record('slug')
    set((state) => ({
      config: { ...state.config, slug: softSlugify(slug) },
      isDirty: true, saveStatus: 'unsaved' as const,
    }))
  },

  setPagina: (patch) => {
    record('pagina')
    set((state) => ({
      config: { ...state.config, pagina: { ...(state.config.pagina ?? { ancho: 'completa' }), ...patch } },
      isDirty: true,
      saveStatus: 'unsaved' as const,
    }))
  },

  showToast: (type, message) => {
    if (toastTimer) clearTimeout(toastTimer)
    set({ toast: { id: Date.now(), type, message } })
    toastTimer = setTimeout(() => set({ toast: null }), 4000)
  },
  dismissToast: () => {
    if (toastTimer) clearTimeout(toastTimer)
    set({ toast: null })
  },

  mergeSignedUrls: (map) =>
    set((state) => ({ signedUrls: { ...state.signedUrls, ...map } })),

  resolveSignedUrls: async () => {
    const { config, signedUrls } = get()
    const missing = collectImagePaths(config).filter((p) => !signedUrls[p])
    if (!missing.length) return
    const map = await apiSignedUrls(missing)
    if (Object.keys(map).length) {
      set((state) => ({ signedUrls: { ...state.signedUrls, ...map } }))
    }
  },

  updateElementGeometry: (sectionId, elementId, geo) => {
    record('geo:' + elementId)
    set((state) => {
      const vp = state.viewport
      return {
        config: {
          ...state.config,
          secciones: state.config.secciones.map((s) =>
            s.id !== sectionId ? s : {
              ...s,
              elementos: s.elementos.map((el) =>
                el.id !== elementId ? el : {
                  ...el,
                  geometria: { ...el.geometria, [vp]: { ...el.geometria[vp], ...geo } },
                }
              ),
            }
          ),
        },
        isDirty: true,
        saveStatus: 'unsaved' as const,
        liveGeo: null,
      }
    })
  },

  updateElementStyle: (sectionId, elementId, style) => {
    record('style:' + elementId)
    set((state) => ({
      config: {
        ...state.config,
        secciones: state.config.secciones.map((s) =>
          s.id !== sectionId ? s : {
            ...s,
            elementos: s.elementos.map((el) =>
              el.id !== elementId ? el : { ...el, estilo: { ...el.estilo, ...style } }
            ),
          }
        ),
      },
      isDirty: true,
      saveStatus: 'unsaved' as const,
    }))
  },

  updateElementContent: (sectionId, elementId, content) => {
    record('content:' + elementId)
    set((state) => ({
      config: {
        ...state.config,
        secciones: state.config.secciones.map((s) =>
          s.id !== sectionId ? s : {
            ...s,
            elementos: s.elementos.map((el) =>
              el.id !== elementId ? el : {
                ...el,
                contenido: { ...el.contenido, ...content } as LandingElemento['contenido'],
              }
            ),
          }
        ),
      },
      isDirty: true,
      saveStatus: 'unsaved' as const,
    }))
  },

  addElement: (sectionId, tipo, x, y) => {
    record()
    const state = get()
    const sec = state.config.secciones.find((s) => s.id === sectionId)
    if (!sec) return

    const maxZ = sec.elementos.reduce((m, el) => {
      return Math.max(m, el.geometria.escritorio.z, el.geometria.movil.z)
    }, 0)

    const defaultX = x ?? 60 + (sec.elementos.length % 6) * 18
    const defaultY = y ?? 60 + (sec.elementos.length % 4) * 18

    const newEl = createDefaultElement(tipo, defaultX, defaultY, maxZ)

    set((state) => ({
      config: {
        ...state.config,
        secciones: state.config.secciones.map((s) =>
          s.id !== sectionId ? s : { ...s, elementos: [...s.elementos, newEl] }
        ),
      },
      selectedElementId: newEl.id,
      selectedIds: [newEl.id],
      activeTool: 'select',
      isDirty: true,
      saveStatus: 'unsaved' as const,
    }))
  },

  deleteElement: (sectionId, elementId) => {
    record()
    set((state) => ({
      config: {
        ...state.config,
        secciones: state.config.secciones.map((s) =>
          s.id !== sectionId ? s : {
            ...s,
            elementos: s.elementos.filter((el) => el.id !== elementId),
          }
        ),
      },
      selectedElementId: state.selectedElementId === elementId ? null : state.selectedElementId,
      selectedIds: state.selectedIds.filter((x) => x !== elementId),
      isDirty: true,
      saveStatus: 'unsaved' as const,
    }))
  },

  toggleLock: (sectionId, elementId) => {
    record()
    set((state) => ({
      config: {
        ...state.config,
        secciones: state.config.secciones.map((s) =>
          s.id !== sectionId ? s : {
            ...s,
            elementos: s.elementos.map((el) =>
              el.id !== elementId ? el : { ...el, bloqueado: !el.bloqueado }
            ),
          }
        ),
      },
      isDirty: true,
      saveStatus: 'unsaved' as const,
    }))
  },

  // ── multi-selection operations ─────────────────────────────────────────
  deleteSelected: () => {
    const { selectedIds } = get()
    if (!selectedIds.length) return
    record()
    const idset = new Set(selectedIds)
    set((state) => ({
      config: {
        ...state.config,
        secciones: state.config.secciones.map((s) => ({
          ...s,
          elementos: s.elementos.filter((el) => !idset.has(el.id) || el.bloqueado),
        })),
      },
      selectedElementId: null, selectedIds: [],
      isDirty: true, saveStatus: 'unsaved' as const,
    }))
  },

  moveSelected: (dx, dy) => {
    const { selectedIds } = get()
    if (!selectedIds.length) return
    record('movemany')
    const idset = new Set(selectedIds)
    set((state) => ({
      config: {
        ...state.config,
        secciones: state.config.secciones.map((s) => ({
          ...s,
          elementos: s.elementos.map((el) =>
            !idset.has(el.id) || el.bloqueado ? el : {
              ...el,
              geometria: {
                ...el.geometria,
                escritorio: { ...el.geometria.escritorio, x: el.geometria.escritorio.x + dx, y: el.geometria.escritorio.y + dy },
              },
            }
          ),
        })),
      },
      isDirty: true, saveStatus: 'unsaved' as const,
    }))
  },

  commitGroupGeometry: (updates) => {
    if (!updates.length) return
    record()
    const byId = new Map(updates.map((u) => [u.elementId, u]))
    set((state) => ({
      config: {
        ...state.config,
        secciones: state.config.secciones.map((s) => ({
          ...s,
          elementos: s.elementos.map((el) => {
            const u = byId.get(el.id)
            if (!u) return el
            const g = el.geometria.escritorio
            return {
              ...el,
              geometria: {
                ...el.geometria,
                escritorio: { ...g, x: u.x, y: u.y, w: u.w ?? g.w, h: u.h ?? g.h },
              },
            }
          }),
        })),
      },
      isDirty: true, saveStatus: 'unsaved' as const, liveGeo: null,
    }))
  },

  alignSelected: (mode) => {
    const { selectedIds, config } = get()
    if (selectedIds.length < 2) return
    const idset = new Set(selectedIds)
    const els = config.secciones.flatMap((s) => s.elementos).filter((e) => idset.has(e.id))
    const boxes = els.map((e) => ({ id: e.id, ...e.geometria.escritorio }))
    const minX = Math.min(...boxes.map((b) => b.x))
    const maxR = Math.max(...boxes.map((b) => b.x + b.w))
    const minY = Math.min(...boxes.map((b) => b.y))
    const maxB = Math.max(...boxes.map((b) => b.y + b.h))
    const cx = (minX + maxR) / 2
    const cy = (minY + maxB) / 2
    const nx = (b: typeof boxes[number]) =>
      mode === 'left' ? minX : mode === 'right' ? maxR - b.w : mode === 'centerH' ? Math.round(cx - b.w / 2) : b.x
    const ny = (b: typeof boxes[number]) =>
      mode === 'top' ? minY : mode === 'bottom' ? maxB - b.h : mode === 'middleV' ? Math.round(cy - b.h / 2) : b.y
    record()
    const pos = new Map(boxes.map((b) => [b.id, { x: nx(b), y: ny(b) }]))
    set((state) => ({
      config: {
        ...state.config,
        secciones: state.config.secciones.map((s) => ({
          ...s,
          elementos: s.elementos.map((el) => {
            const p = pos.get(el.id)
            return p ? { ...el, geometria: { ...el.geometria, escritorio: { ...el.geometria.escritorio, x: p.x, y: p.y } } } : el
          }),
        })),
      },
      isDirty: true, saveStatus: 'unsaved' as const,
    }))
  },

  // ── section operations ─────────────────────────────────────────────────
  addSection: () => {
    record()
    const sec = createDefaultSection()
    set((state) => ({
      config: { ...state.config, secciones: [...state.config.secciones, sec] },
      activeSectionId: sec.id, editingPage: false,
      selectedElementId: null, selectedIds: [],
      isDirty: true, saveStatus: 'unsaved' as const,
    }))
  },

  deleteSection: (sectionId) => {
    const { config } = get()
    if (config.secciones.length <= 1) return   // keep at least one section
    record()
    set((state) => {
      const secciones = state.config.secciones.filter((s) => s.id !== sectionId)
      const active = state.activeSectionId === sectionId ? secciones[0]?.id ?? null : state.activeSectionId
      return {
        config: { ...state.config, secciones },
        activeSectionId: active,
        selectedElementId: null, selectedIds: [],
        isDirty: true, saveStatus: 'unsaved' as const,
      }
    })
  },

  duplicateSection: (sectionId) => {
    record()
    set((state) => {
      const idx = state.config.secciones.findIndex((s) => s.id === sectionId)
      if (idx < 0) return {}
      const copy = cloneSection(state.config.secciones[idx])
      const secciones = [...state.config.secciones]
      secciones.splice(idx + 1, 0, copy)
      return {
        config: { ...state.config, secciones },
        activeSectionId: copy.id,
        selectedElementId: null, selectedIds: [],
        isDirty: true, saveStatus: 'unsaved' as const,
      }
    })
  },

  moveSection: (sectionId, dir) => {
    record()
    set((state) => {
      const arr = [...state.config.secciones]
      const i = arr.findIndex((s) => s.id === sectionId)
      const j = dir === 'up' ? i - 1 : i + 1
      if (i < 0 || j < 0 || j >= arr.length) return {}
      ;[arr[i], arr[j]] = [arr[j], arr[i]]
      return { config: { ...state.config, secciones: arr }, isDirty: true, saveStatus: 'unsaved' as const }
    })
  },

  duplicateElement: (sectionId, elementId) => {
    record()
    const state = get()
    const sec = state.config.secciones.find((s) => s.id === sectionId)
    const orig = sec?.elementos.find((el) => el.id === elementId)
    if (!orig || !sec) return

    const newId = `${orig.tipo}_${Date.now().toString(36)}`
    const offset = 20
    const copy: LandingElemento = {
      ...orig,
      id: newId,
      geometria: {
        escritorio: { ...orig.geometria.escritorio, x: orig.geometria.escritorio.x + offset, y: orig.geometria.escritorio.y + offset },
        movil:      { ...orig.geometria.movil,      x: orig.geometria.movil.x + offset,      y: orig.geometria.movil.y + offset },
      },
    }

    set((state) => ({
      config: {
        ...state.config,
        secciones: state.config.secciones.map((s) =>
          s.id !== sectionId ? s : { ...s, elementos: [...s.elementos, copy] }
        ),
      },
      selectedElementId: newId,
      selectedIds: [newId],
      isDirty: true,
      saveStatus: 'unsaved' as const,
    }))
  },

  // Move an element to a different section, with new section-relative x/y.
  reassignElement: (fromSectionId, toSectionId, elementId, x, y) => {
    record()
    set((state) => {
      if (fromSectionId === toSectionId) return {}
      let moved: LandingElemento | undefined
      const stripped = state.config.secciones.map((s) => {
        if (s.id !== fromSectionId) return s
        moved = s.elementos.find((e) => e.id === elementId)
        return { ...s, elementos: s.elementos.filter((e) => e.id !== elementId) }
      })
      if (!moved) return {}
      const target = stripped.find((s) => s.id === toSectionId)
      if (!target) return {}
      const maxZ = target.elementos.reduce(
        (m, e) => Math.max(m, e.geometria.escritorio.z, e.geometria.movil.z), 0)
      const movedEl: LandingElemento = {
        ...moved,
        geometria: {
          escritorio: { ...moved.geometria.escritorio, x, y, z: maxZ + 1 },
          movil:      { ...moved.geometria.movil,      x, y, z: maxZ + 1 },
        },
      }
      const secciones = stripped.map((s) =>
        s.id === toSectionId ? { ...s, elementos: [...s.elementos, movedEl] } : s)
      return {
        config: { ...state.config, secciones },
        activeSectionId: toSectionId,
        isDirty: true,
        saveStatus: 'unsaved' as const,
      }
    })
  },

  setSectionHeight: (sectionId, height) => {
    record('secH:' + sectionId)
    set((state) => ({
      config: {
        ...state.config,
        secciones: state.config.secciones.map((s) =>
          s.id !== sectionId ? s : {
            ...s,
            altura: { ...s.altura, escritorio: Math.round(height) },
          }
        ),
      },
      isDirty: true,
      saveStatus: 'unsaved' as const,
    }))
  },

  setSectionFondo: (sectionId, fondo) => {
    record('secFondo:' + sectionId)
    set((state) => ({
      config: {
        ...state.config,
        secciones: state.config.secciones.map((s) =>
          s.id !== sectionId ? s : { ...s, fondo }
        ),
      },
      isDirty: true,
      saveStatus: 'unsaved' as const,
    }))
  },

  moveLayer: (sectionId, elementId, dir) => {
    record()
    set((state) => {
      const secciones = state.config.secciones.map((s) => {
        if (s.id !== sectionId) return s
        const order = orderByZ(s)          // bottom → top
        const idx = order.indexOf(elementId)
        if (idx < 0) return s
        order.splice(idx, 1)
        if (dir === 'front')      order.push(elementId)
        else if (dir === 'back')  order.unshift(elementId)
        else if (dir === 'up')    order.splice(Math.min(idx + 1, order.length), 0, elementId)
        else /* down */           order.splice(Math.max(idx - 1, 0), 0, elementId)
        return applyZOrder(s, order)
      })
      return { config: { ...state.config, secciones }, isDirty: true, saveStatus: 'unsaved' as const }
    })
  },

  reorderLayers: (sectionId, orderedIdsBottomToTop) => {
    record()
    set((state) => ({
      config: {
        ...state.config,
        secciones: state.config.secciones.map((s) =>
          s.id === sectionId ? applyZOrder(s, orderedIdsBottomToTop) : s
        ),
      },
      isDirty: true,
      saveStatus: 'unsaved' as const,
    }))
  },

  loadLanding: async () => {
    const { email } = get()
    if (!email) return
    set({ isLoading: true })
    try {
      const res = await apiLoadLanding(email)
      if (res.existe && res.config) {
        // sanitize in case NocoDB returns partially-formed data
        const safe = sanitizeConfig(
          typeof res.config === 'string' ? JSON.parse(res.config) : res.config
        )
        set({ config: safe, activeSectionId: safe.secciones[0]?.id ?? null, isLoading: false, saveStatus: 'saved', isDirty: false, past: [], future: [] })
      } else {
        const slug = email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '-')
        const fresh = { ...DEFAULT_CONFIG, slug }
        set({ config: fresh, activeSectionId: fresh.secciones[0]?.id ?? null, isLoading: false, saveStatus: 'unsaved', isDirty: true, past: [], future: [] })
      }
      histLast = { key: '', time: 0 }
      // images use stable public URLs (resolveSrc) — no signing round-trip needed
    } catch {
      set({ isLoading: false })
    }
  },

  saveLanding: async () => {
    const { email, config } = get()
    if (!email) return false
    set({ isSaving: true, saveStatus: 'saving' })
    try {
      const res = await apiSaveLanding(email, config)
      if (res && res.ok) {
        set({ isSaving: false, isDirty: false, saveStatus: 'saved' })
        get().showToast('success', 'Guardado ✓')
        return true
      }
      set({ isSaving: false, saveStatus: 'error' })
      get().showToast('error', res?.error || 'No se pudo guardar. Intenta de nuevo.')
      return false
    } catch {
      set({ isSaving: false, saveStatus: 'error' })
      get().showToast('error', 'No se pudo guardar. Revisa tu conexión.')
      return false
    }
  },

  publishLanding: async () => {
    const { email } = get()
    if (!email) return false
    const prev = get().config.publicada
    // optimistic: mark as published in the config we send + store
    const config = { ...get().config, publicada: true }
    set({ config, isPublishing: true, isSaving: true, saveStatus: 'saving' })
    try {
      const res = await apiSaveLanding(email, config)
      if (res && res.ok) {
        set({ isPublishing: false, isSaving: false, isDirty: false, saveStatus: 'saved' })
        get().showToast('success', 'Publicado ✓')
        return true
      }
      // revert publish flag on failure
      set((s) => ({ config: { ...s.config, publicada: prev }, isPublishing: false, isSaving: false, saveStatus: 'error' }))
      get().showToast('error', res?.error || 'No se pudo publicar. Intenta de nuevo.')
      return false
    } catch {
      set((s) => ({ config: { ...s.config, publicada: prev }, isPublishing: false, isSaving: false, saveStatus: 'error' }))
      get().showToast('error', 'No se pudo publicar. Revisa tu conexión.')
      return false
    }
  },

  getSelectedElement: () => {
    const { config, selectedElementId } = get()
    if (!selectedElementId) return null
    for (const s of config.secciones) {
      const el = s.elementos.find((e) => e.id === selectedElementId)
      if (el) return el
    }
    return null
  },

  getSelectedSectionId: () => {
    const { config, selectedElementId } = get()
    if (!selectedElementId) return null
    for (const s of config.secciones) {
      if (s.elementos.some((e) => e.id === selectedElementId)) return s.id
    }
    return null
  },
  }
})
