import { useState, useRef, useEffect } from 'react'
import { useLandingStore } from '../../store/useLandingStore'
import type { Geometry, LandingElemento } from '../../types/landing'
import { apiUploadImage, apiCheckSlug } from '../../api/webhooks'
import { slugify } from '../../lib/layout'
import { validateImageFile, compressImage, resolveSrc, ALLOWED_IMAGE_TYPES, ALLOWED_LABEL } from '../../lib/images'
import { FONTS, FONT_CATEGORY_LABEL, fontStack, loadFont } from '../../lib/fonts'
import { DEFAULT_SOMBRA } from '../../lib/effects'
import { getCampos, newCampo, CAMPO_TIPOS, CAMPO_TIPO_LABEL } from '../../lib/forms'
import type { FormCampo, FondoAjustes, ProyectoCard } from '../../types/landing'

function newProyectoCard(): ProyectoCard {
  return {
    id: `p_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`,
    imagen: '', badge: 'EN VENTA', badgeColor: '#38D030', nombre: 'Nuevo proyecto', ubicacion: '',
  }
}

const clamp01 = (n: number) => Math.max(0, Math.min(1, n))

// Image-background adjustments (opacity, color overlay, brightness, contrast).
// Shared by the page background and section image backgrounds.
function FondoAjustesControls({ ajustes, onChange }: { ajustes?: FondoAjustes; onChange: (p: Partial<FondoAjustes>) => void }) {
  const a = ajustes ?? {}
  return (
    <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
        <NumInput label="Opacidad imagen %" value={Math.round((a.opacidad ?? 1) * 100)} onChange={(v) => onChange({ opacidad: clamp01(v / 100) })} />
        <NumInput label="Overlay %" value={Math.round((a.overlayOpacidad ?? 0) * 100)} onChange={(v) => onChange({ overlayOpacidad: clamp01(v / 100) })} />
      </div>
      <ColorInput label="Color del overlay" value={a.overlayColor ?? '#000000'} onChange={(v) => onChange({ overlayColor: v })} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
        <NumInput label="Brillo %" value={a.brillo ?? 100} onChange={(v) => onChange({ brillo: Math.max(0, Math.min(300, v)) })} />
        <NumInput label="Contraste %" value={a.contraste ?? 100} onChange={(v) => onChange({ contraste: Math.max(0, Math.min(300, v)) })} />
      </div>
    </div>
  )
}

// Shared upload logic: validate → compress to WebP → upload to the public
// bucket via n8n. Display uses the stable public URL (no signed URLs).
function useImageUpload() {
  const { email, config } = useLandingStore()
  const slug = config.slug || (email.split('@')[0] || 'asesor').toLowerCase().replace(/[^a-z0-9]/g, '-')
  const [busy, setBusy]   = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function upload(file: File): Promise<string | null> {
    const v = validateImageFile(file)
    if (!v.ok) { setError(v.error!); return null }
    setBusy(true); setError(null)
    try {
      const c = await compressImage(file)
      const res = await apiUploadImage({ email, slug, filename: c.filename, mime: c.mime, data: c.base64 })
      if (!res.ok || !res.path) { setError(res.error || 'No se pudo subir la imagen'); return null }
      return res.path
    } catch {
      setError('No se pudo subir la imagen')
      return null
    } finally {
      setBusy(false)
    }
  }

  return { upload, busy, error, setError }
}

const ACCEPT = ALLOWED_IMAGE_TYPES.join(',')

export function InspectorPanel() {
  const {
    getSelectedElement, liveGeo, viewport, config,
    updateElementStyle, updateElementContent, updateElementGeometry,
    getSelectedSectionId, deleteElement, duplicateElement, moveLayer,
    activeSectionId, reassignElement, editingPage, toggleLock, selectedIds,
  } = useLandingStore()

  const el    = getSelectedElement()
  const secId = getSelectedSectionId()

  if (editingPage) return <PageInspector />

  if (selectedIds.length > 1) return <MultiSelectInspector count={selectedIds.length} />

  if (!el || !secId) {
    // no element selected → show the active section's properties (height, background)
    const activeSec = config.secciones.find((s) => s.id === activeSectionId)
    if (activeSec) return <SectionInspector key={activeSec.id} sectionId={activeSec.id} />
    return <EmptyInspector />
  }

  // Mobile is a scaled preview of the desktop layout → always show/edit escritorio geometry.
  const isMobile = viewport === 'movil'
  const geo: Geometry = { ...el.geometria.escritorio, ...(liveGeo ?? {}) } as Geometry

  function patchGeo(field: keyof Geometry, value: number) {
    updateElementGeometry(secId!, el!.id, { [field]: value })
  }

  function patchStyle(patch: Partial<LandingElemento['estilo']>) {
    updateElementStyle(secId!, el!.id, patch)
  }

  function patchContent(patch: Partial<LandingElemento['contenido']>) {
    updateElementContent(secId!, el!.id, patch)
  }

  return (
    <div style={{
      width: 252, flexShrink: 0,
      background: 'var(--ed-panel)', borderLeft: '1px solid var(--ed-border)',
      display: 'flex', flexDirection: 'column',
      overflow: 'hidden',
    }}>
      {/* header */}
      <div style={{
        padding: '10px 14px 9px',
        borderBottom: '1px solid var(--ed-border)',
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '.8px', color: 'var(--ed-text-3)', textTransform: 'uppercase' }}>
            Inspector
          </div>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ed-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {el.id}
            <span style={{ marginLeft: 6, fontSize: 10, color: 'var(--ed-text-3)', fontWeight: 600 }}>[{el.tipo}]</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          <HeaderActionBtn title={el.bloqueado ? 'Desbloquear' : 'Bloquear'} active={el.bloqueado} onClick={() => toggleLock(secId, el.id)}>
            {el.bloqueado ? (
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>
              </svg>
            ) : (
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 7.5-1.5"/>
              </svg>
            )}
          </HeaderActionBtn>
          <HeaderActionBtn title="Duplicar" onClick={() => duplicateElement(secId, el.id)}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="9" y="9" width="13" height="13" rx="2"/>
              <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
            </svg>
          </HeaderActionBtn>
          <HeaderActionBtn title="Eliminar (Del)" danger onClick={() => deleteElement(secId, el.id)}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/>
            </svg>
          </HeaderActionBtn>
        </div>
      </div>

      {el.bloqueado && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '8px 14px', background: 'rgba(201,154,58,.12)',
          borderBottom: '1px solid var(--ed-border)', color: '#C99A3A',
          fontSize: 11, fontWeight: 700,
        }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>
          Bloqueado. Desbloquea para editar.
        </div>
      )}

      {/* scrollable body (locked → not editable) */}
      <div
        key={el.id}
        className="ed-panel-in"
        style={{
          flex: 1, overflowY: 'auto', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 0,
          pointerEvents: el.bloqueado ? 'none' : 'auto',
          opacity: el.bloqueado ? 0.5 : 1,
        }}
      >

        {/* ── section assignment ── */}
        {config.secciones.length > 1 && (
          <>
            <Section title="Sección">
              <SelectInput
                label="Pertenece a"
                value={secId}
                options={config.secciones.map((s) => ({ value: s.id, label: s.nombre ?? s.id }))}
                onChange={(toId) => {
                  if (toId !== secId) {
                    const g = el!.geometria.escritorio
                    reassignElement(secId!, toId, el!.id, g.x, g.y)
                  }
                }}
              />
            </Section>
            <Divider />
          </>
        )}

        {/* ── geometry ── */}
        <Section title="Posición y tamaño">
          {isMobile && (
            <div style={{
              fontSize: 10, fontWeight: 600, color: '#C99A3A',
              background: 'rgba(201,154,58,.1)', border: '1px solid rgba(201,154,58,.25)',
              borderRadius: 6, padding: '6px 8px', marginBottom: 8, lineHeight: 1.4,
            }}>
              Vista previa móvil. Las posiciones se editan en <b>Escritorio</b>.
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
            <EditableGeoInput label="X" value={geo.x ?? 0} onChange={(v) => patchGeo('x', v)} live={liveGeo != null} readOnly={isMobile} />
            <EditableGeoInput label="Y" value={geo.y ?? 0} onChange={(v) => patchGeo('y', v)} live={liveGeo != null} readOnly={isMobile} />
            <EditableGeoInput label="W" value={geo.w ?? 0} onChange={(v) => patchGeo('w', v)} live={liveGeo != null} readOnly={isMobile} />
            <EditableGeoInput label="H" value={geo.h ?? 0} onChange={(v) => patchGeo('h', v)} live={liveGeo != null} readOnly={isMobile} />
          </div>
          <div style={{ marginTop: 8 }}>
            <div style={{ fontSize: 10, color: '#4F5458', fontWeight: 700, marginBottom: 5 }}>Orden de capa</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5 }}>
              <LayerOrderBtn label="Traer al frente" onClick={() => moveLayer(secId!, el!.id, 'front')}>
                <FrontIcon />
              </LayerOrderBtn>
              <LayerOrderBtn label="Enviar al fondo" onClick={() => moveLayer(secId!, el!.id, 'back')}>
                <BackIcon />
              </LayerOrderBtn>
              <LayerOrderBtn label="Subir una capa" onClick={() => moveLayer(secId!, el!.id, 'up')}>
                <UpIcon />
              </LayerOrderBtn>
              <LayerOrderBtn label="Bajar una capa" onClick={() => moveLayer(secId!, el!.id, 'down')}>
                <DownIcon />
              </LayerOrderBtn>
            </div>
          </div>
          <div style={{ marginTop: 6 }}>
            <EditableGeoInput label="Z (capas)" value={geo.z ?? 0} onChange={(v) => patchGeo('z', v)} readOnly={isMobile} />
          </div>
        </Section>

        <Divider />

        {/* ── content (type-specific) ── */}
        {el.tipo === 'bloque' && (
          <BloqueInspector el={el} patchStyle={patchStyle} patchContent={patchContent} />
        )}
        {el.tipo === 'texto' && (
          <TextoInspector el={el} patchStyle={patchStyle} patchContent={patchContent} />
        )}
        {el.tipo === 'imagen' && (
          <ImagenInspector el={el} patchStyle={patchStyle} patchContent={patchContent} />
        )}
        {el.tipo === 'boton' && (
          <BotonInspector el={el} patchStyle={patchStyle} patchContent={patchContent} />
        )}
        {el.tipo === 'galeria' && (
          <GaleriaInspector el={el} patchStyle={patchStyle} patchContent={patchContent} />
        )}
        {el.tipo === 'proyectos' && (
          <ProyectosInspector el={el} patchStyle={patchStyle} patchContent={patchContent} />
        )}
        {el.tipo === 'formulario' && (
          <FormularioInspector el={el} patchStyle={patchStyle} patchContent={patchContent} />
        )}

        <Divider />

        {/* ── effects (all elements) ── */}
        <EfectosControls el={el} patchStyle={patchStyle} />

      </div>
    </div>
  )
}

// Reusable effects panel: rounded corners, opacity, shadow, border. Lives on the
// element (color block, images, etc.).
function EfectosControls({ el, patchStyle }: { el: LandingElemento; patchStyle: (p: Partial<LandingElemento['estilo']>) => void }) {
  const sombra = el.estilo.sombra ?? { ...DEFAULT_SOMBRA, activa: false }
  const borde  = el.estilo.borde ?? { ancho: 0, color: '#000000' }
  return (
    <Section title="Efectos">
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
        <NumInput label="Esquinas px" value={el.estilo.radio ?? 0} onChange={(v) => patchStyle({ radio: Math.max(0, v) })} />
        <NumInput label="Opacidad %" value={Math.round((el.estilo.opacidad ?? 1) * 100)} onChange={(v) => patchStyle({ opacidad: Math.max(0, Math.min(100, v)) / 100 })} />
      </div>

      {/* shadow */}
      <div style={{ marginTop: 12 }}>
        <ToggleRow label="Sombra" checked={sombra.activa} onChange={(c) => patchStyle({ sombra: { ...sombra, activa: c } })} />
        {sombra.activa && (
          <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
              <NumInput label="Desenfoque" value={sombra.blur} onChange={(v) => patchStyle({ sombra: { ...sombra, blur: Math.max(0, v) } })} />
              <NumInput label="Despl. Y" value={sombra.y} onChange={(v) => patchStyle({ sombra: { ...sombra, y: v } })} />
            </div>
            <ColorInput label="Color sombra" value={sombra.color} onChange={(v) => patchStyle({ sombra: { ...sombra, color: v } })} />
          </div>
        )}
      </div>

      {/* border */}
      <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
        <NumInput label="Borde px" value={borde.ancho} onChange={(v) => patchStyle({ borde: { ...borde, ancho: Math.max(0, v) } })} />
        <ColorInput label="Color borde" value={borde.color} onChange={(v) => patchStyle({ borde: { ...borde, color: v } })} />
      </div>
    </Section>
  )
}

// ── type-specific inspectors ───────────────────────────────────────────────

interface SubProps {
  el: LandingElemento
  patchStyle: (p: Partial<LandingElemento['estilo']>) => void
  patchContent: (p: Partial<LandingElemento['contenido']>) => void
}

function BloqueInspector({ el, patchStyle }: SubProps) {
  return (
    <Section title="Bloque de color">
      <ColorInput
        label="Color de relleno"
        value={el.estilo.bgColor ?? '#26323B'}
        onChange={(v) => patchStyle({ bgColor: v })}
      />
      <div style={{ fontSize: 10, color: '#4F5458', marginTop: 6, lineHeight: 1.4 }}>
        Forma decorativa. Usa las capas para mandarla al frente o al fondo.
      </div>
    </Section>
  )
}

function TextoInspector({ el, patchStyle, patchContent }: SubProps) {
  return (
    <>
      <Section title="Texto">
        <Textarea
          label="Contenido"
          value={(el.contenido.texto as string) ?? ''}
          onChange={(v) => patchContent({ texto: v })}
        />
        <div style={{ marginTop: 8 }}>
          <SelectInput
            label="Etiqueta HTML"
            value={(el.contenido.tag as string) ?? 'p'}
            options={[
              { value: 'h1', label: 'H1 — Título principal' },
              { value: 'h2', label: 'H2 — Subtítulo' },
              { value: 'h3', label: 'H3 — Título 3' },
              { value: 'p',  label: 'P — Párrafo' },
              { value: 'span', label: 'Span — Inline' },
            ]}
            onChange={(v) => patchContent({ tag: v })}
          />
        </div>
      </Section>
      <Divider />
      <Section title="Tipografía">
        <FontPicker
          value={el.estilo.fontFamily}
          onChange={(f) => patchStyle({ fontFamily: f })}
        />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginTop: 8 }}>
          <NumInput label="Tamaño" value={el.estilo.fontSize ?? 16} onChange={(v) => patchStyle({ fontSize: v })} />
          <SelectInput
            label="Peso"
            value={el.estilo.fontWeight ?? '400'}
            options={[
              { value: '400', label: 'Regular' },
              { value: '500', label: 'Medium' },
              { value: '600', label: 'SemiBold' },
              { value: '700', label: 'Bold' },
              { value: '800', label: 'ExtraBold' },
              { value: '900', label: 'Black' },
            ]}
            onChange={(v) => patchStyle({ fontWeight: v })}
          />
        </div>
        <div style={{ marginTop: 8 }}>
          <ColorInput
            label="Color"
            value={el.estilo.color ?? '#FFFFFF'}
            onChange={(v) => patchStyle({ color: v })}
          />
        </div>
        <div style={{ marginTop: 8 }}>
          <AlignButtons
            value={el.estilo.textAlign ?? 'left'}
            onChange={(v) => patchStyle({ textAlign: v })}
          />
        </div>
      </Section>
    </>
  )
}

function ImagenInspector({ el, patchStyle, patchContent }: SubProps) {
  const currentPath = (el.contenido.src || el.contenido.path) as string | undefined

  return (
    <Section title="Imagen">
      <SingleImageField
        path={currentPath}
        onUploaded={(path) => patchContent({ src: path, path })}
        onRemove={() => patchContent({ src: '', path: '' })}
      />
      <div style={{ marginTop: 10 }}>
        <TextInput
          label="Texto alternativo"
          placeholder="Descripción para accesibilidad"
          value={(el.contenido.alt as string) ?? ''}
          onChange={(v) => patchContent({ alt: v })}
        />
      </div>
      <div style={{ marginTop: 8 }}>
        <SelectInput
          label="Ajuste"
          value={el.estilo.ajuste ?? 'cover'}
          options={[
            { value: 'cover',   label: 'Cover — recorta' },
            { value: 'contain', label: 'Contain — cabe todo' },
            { value: 'fill',    label: 'Fill — estira' },
          ]}
          onChange={(v) => patchStyle({ ajuste: v as 'cover' | 'contain' | 'fill' })}
        />
      </div>
    </Section>
  )
}

// Single-image upload control (foto asesor, proyectos)
function SingleImageField({
  path, onUploaded, onRemove,
}: {
  path?: string; onUploaded: (path: string) => void; onRemove: () => void
}) {
  const { signedUrls } = useLandingStore()
  const { upload, busy, error, setError } = useImageUpload()
  const inputRef = useRef<HTMLInputElement>(null)
  const preview = resolveSrc(path, signedUrls)
  const hasImage = !!path

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = '' // allow re-selecting the same file
    if (!file) return
    const newPath = await upload(file)
    if (newPath) onUploaded(newPath)
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        onChange={handleFile}
        style={{ display: 'none' }}
      />

      {/* preview / drop zone */}
      <div
        onClick={() => !busy && inputRef.current?.click()}
        style={{
          width: '100%', height: 120, borderRadius: 8,
          border: '1px dashed #2F2F2F', background: 'var(--ed-input-2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          overflow: 'hidden', cursor: busy ? 'wait' : 'pointer', position: 'relative',
        }}
      >
        {preview ? (
          <img src={preview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <div style={{ textAlign: 'center', color: '#4F5458' }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#38D030" strokeWidth="1.5" style={{ marginBottom: 4 }}>
              <rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/>
            </svg>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#6C7278' }}>Sin imagen</div>
          </div>
        )}
        {busy && (
          <div style={{
            position: 'absolute', inset: 0, background: 'rgba(10,10,10,.65)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <div style={{
              width: 24, height: 24, border: '3px solid rgba(56,208,48,.25)',
              borderTopColor: '#38D030', borderRadius: '50%', animation: 'spin .8s linear infinite',
            }} />
          </div>
        )}
      </div>

      {/* actions */}
      <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
        <UploadButton onClick={() => inputRef.current?.click()} disabled={busy}>
          {busy ? 'Subiendo…' : hasImage ? 'Cambiar imagen' : 'Subir imagen'}
        </UploadButton>
        {hasImage && !busy && (
          <button
            onClick={() => { setError(null); onRemove() }}
            style={{
              padding: '7px 10px', borderRadius: 6, cursor: 'pointer',
              background: 'var(--ed-input)', border: '1px solid var(--ed-border-2)',
              color: '#9AA0A6', fontSize: 11, fontWeight: 700, fontFamily: 'inherit',
            }}
          >
            Quitar
          </button>
        )}
      </div>

      <div style={{ fontSize: 10, color: '#4F5458', marginTop: 6 }}>{ALLOWED_LABEL}</div>
      {error && <div style={{ fontSize: 11, color: '#FF6B6B', marginTop: 4, fontWeight: 600 }}>{error}</div>}
    </div>
  )
}

function UploadButton({ children, onClick, disabled }: { children: React.ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        flex: 1, padding: '7px 10px', borderRadius: 6,
        cursor: disabled ? 'wait' : 'pointer',
        background: disabled ? '#1A2A18' : 'rgba(56,208,48,.14)',
        border: '1px solid rgba(56,208,48,.35)',
        color: '#38D030', fontSize: 11, fontWeight: 800, fontFamily: 'inherit',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
      }}
    >
      {children}
    </button>
  )
}

function BotonInspector({ el, patchStyle, patchContent }: SubProps) {
  const { config } = useLandingStore()
  const accion = (el.contenido.accion as string) || 'url'

  return (
    <>
      <Section title="Botón">
        <TextInput
          label="Texto"
          placeholder="Llamar a acción"
          value={(el.contenido.texto as string) ?? ''}
          onChange={(v) => patchContent({ texto: v })}
        />
        <div style={{ marginTop: 8 }}>
          <SelectInput
            label="Acción al hacer clic"
            value={accion}
            options={[
              { value: 'url',      label: 'Abrir enlace (URL)' },
              { value: 'whatsapp', label: 'WhatsApp' },
              { value: 'email',    label: 'Enviar email' },
              { value: 'scroll',   label: 'Ir a una sección' },
            ]}
            onChange={(v) => patchContent({ accion: v })}
          />
        </div>

        {accion === 'url' && (
          <div style={{ marginTop: 8 }}>
            <TextInput
              label="URL de destino"
              placeholder="https://…"
              value={(el.contenido.href as string) ?? ''}
              onChange={(v) => patchContent({ href: v })}
            />
          </div>
        )}

        {accion === 'whatsapp' && (
          <>
            <div style={{ marginTop: 8 }}>
              <TextInput
                label="Número (con lada, sin +)"
                placeholder="5215512345678"
                value={(el.contenido.telefono as string) ?? ''}
                onChange={(v) => patchContent({ telefono: v })}
              />
            </div>
            <div style={{ marginTop: 8 }}>
              <TextInput
                label="Mensaje predefinido (opcional)"
                placeholder="Hola, quiero información…"
                value={(el.contenido.mensaje as string) ?? ''}
                onChange={(v) => patchContent({ mensaje: v })}
              />
            </div>
          </>
        )}

        {accion === 'email' && (
          <div style={{ marginTop: 8 }}>
            <TextInput
              label="Correo de destino"
              placeholder="asesor@orve.mx"
              value={(el.contenido.email as string) ?? ''}
              onChange={(v) => patchContent({ email: v })}
            />
          </div>
        )}

        {accion === 'scroll' && (
          <div style={{ marginTop: 8 }}>
            <SelectInput
              label="Sección destino"
              value={(el.contenido.seccionId as string) ?? ''}
              options={[
                { value: '', label: '— Elegir sección —' },
                ...config.secciones.map((s) => ({ value: s.id, label: s.nombre ?? s.id })),
              ]}
              onChange={(v) => patchContent({ seccionId: v })}
            />
          </div>
        )}
      </Section>
      <Divider />
      <Section title="Estilo botón">
        <ColorInput
          label="Color texto"
          value={el.estilo.color ?? '#063800'}
          onChange={(v) => patchStyle({ color: v })}
        />
        <div style={{ marginTop: 8 }}>
          <ColorInput
            label="Color fondo"
            value={el.estilo.bgColor ?? '#38D030'}
            onChange={(v) => patchStyle({ bgColor: v })}
          />
        </div>
        <div style={{ marginTop: 8 }}>
          <NumInput
            label="Tamaño fuente"
            value={el.estilo.fontSize ?? 14}
            onChange={(v) => patchStyle({ fontSize: v })}
          />
        </div>
      </Section>
    </>
  )
}

function GaleriaInspector({ el, patchContent }: SubProps) {
  const imagenes = (el.contenido.imagenes as string[] | undefined) ?? []
  return (
    <>
      <Section title="Galería">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
          <NumInput
            label="Columnas"
            value={(el.contenido.columnas as number) ?? 3}
            onChange={(v) => patchContent({ columnas: Math.max(1, Math.min(6, v)) })}
          />
          <NumInput
            label="Espacio px"
            value={(el.contenido.gap as number) ?? 8}
            onChange={(v) => patchContent({ gap: v })}
          />
        </div>
      </Section>
      <Divider />
      <Section title={`Imágenes (${imagenes.length})`}>
        <GalleryImagesField
          imagenes={imagenes}
          onChange={(next) => patchContent({ imagenes: next })}
        />
      </Section>
    </>
  )
}

function ProyectosInspector({ el, patchContent }: SubProps) {
  const cards = (el.contenido.cards as ProyectoCard[] | undefined) ?? []
  const animar = el.contenido.animar !== false

  function setCards(next: ProyectoCard[]) { patchContent({ cards: next }) }
  function updateCard(id: string, patch: Partial<ProyectoCard>) {
    setCards(cards.map((c) => (c.id === id ? { ...c, ...patch } : c)))
  }
  function removeCard(id: string) { setCards(cards.filter((c) => c.id !== id)) }
  function moveCard(idx: number, dir: -1 | 1) {
    const to = idx + dir
    if (to < 0 || to >= cards.length) return
    const next = [...cards]
    ;[next[idx], next[to]] = [next[to], next[idx]]
    setCards(next)
  }

  return (
    <>
      <Section title="Carrusel">
        <ToggleRow label="Animar (marquee)" checked={animar} onChange={(c) => patchContent({ animar: c })} />
        {animar && (
          <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <SelectInput
              label="Dirección"
              value={(el.contenido.direccion as string) || 'izquierda'}
              options={[
                { value: 'izquierda', label: '← Izquierda' },
                { value: 'derecha',   label: '→ Derecha' },
              ]}
              onChange={(v) => patchContent({ direccion: v })}
            />
            <NumInput
              label="Velocidad (seg por vuelta · menos = más rápido)"
              value={(el.contenido.duracion as number) ?? 30}
              onChange={(v) => patchContent({ duracion: Math.max(4, Math.min(180, v)) })}
            />
          </div>
        )}
        <div style={{ fontSize: 10, color: '#4F5458', marginTop: 6, lineHeight: 1.4 }}>
          La animación se ve en la landing publicada. Pausa al pasar el mouse.
        </div>
      </Section>

      <Divider />

      <Section title="Tamaño de card">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
          <NumInput label="Ancho px" value={(el.contenido.cardAncho as number) ?? 240} onChange={(v) => patchContent({ cardAncho: Math.max(120, v) })} />
          <NumInput label="Alto px" value={(el.contenido.cardAlto as number) ?? 280} onChange={(v) => patchContent({ cardAlto: Math.max(120, v) })} />
        </div>
        <div style={{ marginTop: 6 }}>
          <NumInput label="Separación px" value={(el.contenido.gap as number) ?? 16} onChange={(v) => patchContent({ gap: Math.max(0, v) })} />
        </div>
      </Section>

      <Divider />

      <Section title={`Proyectos (${cards.length})`}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {cards.map((card, idx) => (
            <ProyectoCardEditor
              key={card.id}
              card={card}
              isFirst={idx === 0}
              isLast={idx === cards.length - 1}
              onChange={(p) => updateCard(card.id, p)}
              onRemove={() => removeCard(card.id)}
              onUp={() => moveCard(idx, -1)}
              onDown={() => moveCard(idx, 1)}
            />
          ))}
        </div>
        <button
          onClick={() => setCards([...cards, newProyectoCard()])}
          style={{
            marginTop: 10, width: '100%', padding: '8px 0', borderRadius: 7,
            background: 'rgba(56,208,48,.14)', border: '1px solid rgba(56,208,48,.35)',
            color: '#38D030', fontSize: 12, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          + Agregar proyecto
        </button>
      </Section>
    </>
  )
}

function ProyectoCardEditor({
  card, isFirst, isLast, onChange, onRemove, onUp, onDown,
}: {
  card: ProyectoCard
  isFirst: boolean; isLast: boolean
  onChange: (p: Partial<ProyectoCard>) => void
  onRemove: () => void
  onUp: () => void; onDown: () => void
}) {
  return (
    <div style={{ background: 'var(--ed-input)', border: '1px solid var(--ed-border-2)', borderRadius: 8, padding: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 8 }}>
        <span style={{ flex: 1, fontSize: 11, fontWeight: 800, color: '#9AA0A6', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {card.nombre || 'Proyecto'}
        </span>
        <MiniBtn title="Subir" disabled={isFirst} onClick={onUp}>↑</MiniBtn>
        <MiniBtn title="Bajar" disabled={isLast} onClick={onDown}>↓</MiniBtn>
        <MiniBtn title="Quitar" danger onClick={onRemove}>×</MiniBtn>
      </div>

      <SingleImageField
        path={card.imagen || undefined}
        onUploaded={(path) => onChange({ imagen: path })}
        onRemove={() => onChange({ imagen: '' })}
      />

      <div style={{ marginTop: 8 }}>
        <TextInput label="Nombre" placeholder="Residencial Norte" value={card.nombre} onChange={(v) => onChange({ nombre: v })} />
      </div>
      <div style={{ marginTop: 8 }}>
        <TextInput label="Ubicación / descripción" placeholder="Monterrey, N.L." value={card.ubicacion} onChange={(v) => onChange({ ubicacion: v })} />
      </div>
      <div style={{ marginTop: 8, display: 'grid', gridTemplateColumns: '1fr', gap: 8 }}>
        <TextInput label="Texto del badge" placeholder="EN VENTA" value={card.badge} onChange={(v) => onChange({ badge: v })} />
        <ColorInput label="Color del badge" value={card.badgeColor || '#38D030'} onChange={(v) => onChange({ badgeColor: v })} />
      </div>
    </div>
  )
}

// Multi-image upload control for galleries
function GalleryImagesField({
  imagenes, onChange,
}: {
  imagenes: string[]; onChange: (next: string[]) => void
}) {
  const { signedUrls } = useLandingStore()
  const { upload, busy, error } = useImageUpload()
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    e.target.value = ''
    if (!files.length) return
    const added: string[] = []
    for (const file of files) {
      const path = await upload(file)
      if (path) added.push(path)
    }
    if (added.length) onChange([...imagenes, ...added])
  }

  function removeAt(i: number) {
    onChange(imagenes.filter((_, idx) => idx !== i))
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        multiple
        onChange={handleFiles}
        style={{ display: 'none' }}
      />

      {imagenes.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, marginBottom: 8 }}>
          {imagenes.map((path, i) => {
            const src = resolveSrc(path, signedUrls)
            return (
              <div key={`${path}-${i}`} style={{
                position: 'relative', paddingBottom: '100%', borderRadius: 6,
                overflow: 'hidden', background: 'var(--ed-input-2)', border: '1px solid var(--ed-border)',
              }}>
                {src ? (
                  <img src={src} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <div style={{
                    position: 'absolute', inset: 0, display: 'flex',
                    alignItems: 'center', justifyContent: 'center',
                  }}>
                    <div style={{
                      width: 16, height: 16, border: '2px solid rgba(56,208,48,.25)',
                      borderTopColor: '#38D030', borderRadius: '50%', animation: 'spin .8s linear infinite',
                    }} />
                  </div>
                )}
                <button
                  onClick={() => removeAt(i)}
                  title="Quitar"
                  style={{
                    position: 'absolute', top: 2, right: 2, width: 18, height: 18,
                    borderRadius: 4, border: 'none', cursor: 'pointer',
                    background: 'rgba(10,10,10,.75)', color: '#FF6B6B',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 12, fontWeight: 900, lineHeight: 1, padding: 0,
                  }}
                >
                  ×
                </button>
              </div>
            )
          })}
        </div>
      )}

      <UploadButton onClick={() => inputRef.current?.click()} disabled={busy}>
        {busy ? 'Subiendo…' : '+ Agregar imágenes'}
      </UploadButton>

      <div style={{ fontSize: 10, color: '#4F5458', marginTop: 6 }}>{ALLOWED_LABEL}</div>
      {error && <div style={{ fontSize: 11, color: '#FF6B6B', marginTop: 4, fontWeight: 600 }}>{error}</div>}
    </div>
  )
}

function FormularioInspector({ el, patchStyle, patchContent }: SubProps) {
  const campos = getCampos(el.contenido)

  function setCampos(next: FormCampo[]) {
    patchContent({ campos: next })
  }
  function updateCampo(id: string, patch: Partial<FormCampo>) {
    setCampos(campos.map((c) => (c.id === id ? { ...c, ...patch } : c)))
  }
  function removeCampo(id: string) {
    setCampos(campos.filter((c) => c.id !== id))
  }
  function moveCampo(idx: number, dir: -1 | 1) {
    const to = idx + dir
    if (to < 0 || to >= campos.length) return
    const next = [...campos]
    ;[next[idx], next[to]] = [next[to], next[idx]]
    setCampos(next)
  }

  return (
    <>
      <Section title="Formulario">
        <TextInput
          label="Título"
          placeholder="Contáctame"
          value={(el.contenido.titulo as string) ?? ''}
          onChange={(v) => patchContent({ titulo: v })}
        />
        <div style={{ marginTop: 8 }}>
          <TextInput
            label="Texto botón enviar"
            placeholder="Enviar"
            value={(el.contenido.boton as string) ?? ''}
            onChange={(v) => patchContent({ boton: v })}
          />
        </div>
      </Section>
      <Divider />

      <Section title={`Campos (${campos.length})`}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {campos.map((campo, idx) => (
            <CampoEditor
              key={campo.id}
              campo={campo}
              isFirst={idx === 0}
              isLast={idx === campos.length - 1}
              onChange={(p) => updateCampo(campo.id, p)}
              onRemove={() => removeCampo(campo.id)}
              onUp={() => moveCampo(idx, -1)}
              onDown={() => moveCampo(idx, 1)}
            />
          ))}
        </div>
        <button
          onClick={() => setCampos([...campos, newCampo()])}
          style={{
            marginTop: 10, width: '100%', padding: '8px 0', borderRadius: 7,
            background: 'rgba(56,208,48,.14)', border: '1px solid rgba(56,208,48,.35)',
            color: '#38D030', fontSize: 12, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          + Agregar campo
        </button>
      </Section>
      <Divider />
      <Section title="Estilo formulario">
        <ColorInput
          label="Fondo"
          value={el.estilo.bgColor ?? 'rgba(20,28,22,0.92)'}
          onChange={(v) => patchStyle({ bgColor: v })}
        />
        <div style={{ marginTop: 8 }}>
          <ColorInput
            label="Color texto"
            value={el.estilo.color ?? '#FFFFFF'}
            onChange={(v) => patchStyle({ color: v })}
          />
        </div>
      </Section>
    </>
  )
}

// One editable form field row
function CampoEditor({
  campo, isFirst, isLast, onChange, onRemove, onUp, onDown,
}: {
  campo: FormCampo
  isFirst: boolean; isLast: boolean
  onChange: (p: Partial<FormCampo>) => void
  onRemove: () => void
  onUp: () => void; onDown: () => void
}) {
  return (
    <div style={{ background: 'var(--ed-input)', border: '1px solid var(--ed-border-2)', borderRadius: 8, padding: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 6 }}>
        <input
          value={campo.label}
          onChange={(e) => onChange({ label: e.target.value })}
          onKeyDown={(e) => e.stopPropagation()}
          placeholder="Etiqueta"
          style={{
            flex: 1, background: 'var(--ed-input-2)', border: '1px solid var(--ed-border-2)', borderRadius: 6,
            padding: '5px 8px', fontSize: 12, color: 'var(--ed-text)', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
          }}
        />
        <MiniBtn title="Subir" disabled={isFirst} onClick={onUp}>↑</MiniBtn>
        <MiniBtn title="Bajar" disabled={isLast} onClick={onDown}>↓</MiniBtn>
        <MiniBtn title="Quitar" danger onClick={onRemove}>×</MiniBtn>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 6, alignItems: 'center' }}>
        <select
          value={campo.tipo}
          onChange={(e) => onChange({ tipo: e.target.value as FormCampo['tipo'] })}
          style={{
            background: 'var(--ed-input-2)', border: '1px solid var(--ed-border-2)', borderRadius: 6,
            padding: '5px 8px', fontSize: 11, color: 'var(--ed-text)', fontFamily: 'inherit', outline: 'none',
          }}
        >
          {CAMPO_TIPOS.map((t) => <option key={t} value={t}>{CAMPO_TIPO_LABEL[t]}</option>)}
        </select>
        <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#9AA0A6', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>
          <input type="checkbox" checked={campo.requerido} onChange={(e) => onChange({ requerido: e.target.checked })} />
          Requerido
        </label>
      </div>
      {campo.tipo === 'select' && (
        <OptionsEditor
          opciones={campo.opciones ?? []}
          onChange={(opciones) => onChange({ opciones })}
        />
      )}
    </div>
  )
}

// Editable list of choices for a 'select' field — add/edit/remove as many as you want.
function OptionsEditor({ opciones, onChange }: { opciones: string[]; onChange: (next: string[]) => void }) {
  const list = opciones.length ? opciones : ['']
  function setAt(i: number, v: string) {
    const next = [...list]
    next[i] = v
    onChange(next)
  }
  function removeAt(i: number) {
    onChange(list.filter((_, idx) => idx !== i))
  }
  const optStyle: React.CSSProperties = {
    flex: 1, background: 'var(--ed-input-2)', border: '1px solid var(--ed-border-2)', borderRadius: 6,
    padding: '5px 8px', fontSize: 11, color: 'var(--ed-text)', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
  }
  return (
    <div style={{ marginTop: 6 }}>
      <div style={{ fontSize: 10, color: 'var(--ed-text-3)', fontWeight: 700, marginBottom: 4 }}>Opciones</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {list.map((opt, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <input
              value={opt}
              onChange={(e) => setAt(i, e.target.value)}
              onKeyDown={(e) => e.stopPropagation()}
              placeholder={`Opción ${i + 1}`}
              style={optStyle}
            />
            <MiniBtn title="Quitar opción" danger disabled={list.length <= 1} onClick={() => removeAt(i)}>×</MiniBtn>
          </div>
        ))}
      </div>
      <button
        onClick={() => onChange([...list, ''])}
        style={{
          marginTop: 6, width: '100%', padding: '6px 0', borderRadius: 6,
          background: 'rgba(56,208,48,.12)', border: '1px solid rgba(56,208,48,.3)',
          color: '#38D030', fontSize: 11, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit',
        }}
      >
        + Agregar opción
      </button>
    </div>
  )
}

function MiniBtn({ children, title, danger, disabled, onClick }: { children: React.ReactNode; title: string; danger?: boolean; disabled?: boolean; onClick: () => void }) {
  return (
    <button
      title={title}
      disabled={disabled}
      onClick={onClick}
      style={{
        width: 22, height: 22, flexShrink: 0, borderRadius: 5,
        border: '1px solid var(--ed-border-2)', background: 'var(--ed-input-2)',
        color: disabled ? '#3A3F44' : danger ? '#FF6B6B' : '#9AA0A6',
        cursor: disabled ? 'default' : 'pointer', fontSize: 13, fontWeight: 800, lineHeight: 1,
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, fontFamily: 'inherit',
      }}
    >
      {children}
    </button>
  )
}

// Editable public slug with live availability check + uniqueness.
function SlugField() {
  const { config, email, setSlug } = useLandingStore()
  const slug = config.slug || ''
  const [status, setStatus] = useState<'idle' | 'checking' | 'free' | 'taken' | 'empty'>('idle')

  // debounced availability check whenever the slug changes
  useEffect(() => {
    if (!slug) { setStatus('empty'); return }
    setStatus('checking')
    let cancelled = false
    const t = setTimeout(async () => {
      const res = await apiCheckSlug(slug, email)
      if (!cancelled) setStatus(res.disponible ? 'free' : 'taken')
    }, 450)
    return () => { cancelled = true; clearTimeout(t) }
  }, [slug, email])

  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  const color = status === 'free' ? '#38D030' : status === 'taken' ? '#FF6B6B' : '#6C7278'
  const msg =
    status === 'checking' ? 'Verificando…' :
    status === 'free'     ? 'Disponible ✓' :
    status === 'taken'    ? 'Ya está en uso, elige otro ✗' :
    status === 'empty'    ? 'Escribe tu enlace' : ''

  return (
    <div>
      <div style={{ fontSize: 10, color: 'var(--ed-text-3)', fontWeight: 700, marginBottom: 3 }}>Identificador (slug)</div>
      <div style={{ display: 'flex', alignItems: 'center', background: 'var(--ed-input)', border: `1px solid ${status === 'taken' ? 'rgba(255,107,107,.5)' : 'var(--ed-border-2)'}`, borderRadius: 6, overflow: 'hidden' }}>
        <span style={{ fontSize: 11, color: 'var(--ed-text-3)', padding: '0 0 0 8px', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>/u/</span>
        <input
          type="text"
          value={slug}
          placeholder="tu-nombre"
          onChange={(e) => setSlug(e.target.value)}
          onBlur={(e) => setSlug(slugify(e.target.value))}
          onKeyDown={(e) => e.stopPropagation()}
          style={{
            flex: 1, background: 'transparent', border: 'none',
            padding: '6px 8px 6px 1px', fontSize: 12, color: 'var(--ed-text)',
            fontFamily: 'monospace', outline: 'none', boxSizing: 'border-box', minWidth: 0,
          }}
        />
      </div>
      <div style={{ fontSize: 10, fontWeight: 700, color, marginTop: 5 }}>{msg}</div>
      {slug && (
        <div style={{ fontSize: 10, color: 'var(--ed-text-3)', marginTop: 4, wordBreak: 'break-all', lineHeight: 1.4 }}>
          {origin}/u/{slug}
        </div>
      )}
      <div style={{ fontSize: 10, color: 'var(--ed-text-3)', marginTop: 6, lineHeight: 1.4 }}>
        Se guarda al pulsar <b style={{ color: 'var(--ed-text-2)' }}>Guardar</b>. Si otro asesor ya lo tomó, no podrás usarlo.
      </div>
    </div>
  )
}

// ── page inspector (global page properties) ─────────────────────────────────

function PageInspector() {
  const { config, setPagina } = useLandingStore()
  const pagina = config.pagina ?? { ancho: 'completa' as const }
  const acotada = pagina.ancho === 'acotada'

  return (
    <div style={{
      width: 252, flexShrink: 0,
      background: 'var(--ed-panel)', borderLeft: '1px solid var(--ed-border)',
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
    }}>
      <div style={{ padding: '10px 14px 9px', borderBottom: '1px solid var(--ed-border)' }}>
        <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '.8px', color: '#6C7278', textTransform: 'uppercase' }}>
          Propiedades
        </div>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#C9CED0' }}>Página</div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px' }}>
        <Section title="Tu enlace (URL)">
          <SlugField />
        </Section>

        <Divider />

        <Section title="Ancho de la landing">
          <SelectInput
            label="Modo"
            value={pagina.ancho}
            options={[
              { value: 'completa', label: 'Completa (full-width)' },
              { value: 'acotada',  label: 'Acotada (centrada)' },
            ]}
            onChange={(v) => setPagina({ ancho: v as 'completa' | 'acotada' })}
          />
          {acotada && (
            <div style={{ marginTop: 8 }}>
              <NumInput
                label="Ancho máx (px)"
                value={pagina.maxWidth ?? 1000}
                onChange={(v) => setPagina({ maxWidth: Math.max(600, Math.min(1600, v)) })}
              />
            </div>
          )}
          <div style={{ fontSize: 10, color: '#4F5458', marginTop: 6, lineHeight: 1.4 }}>
            {acotada
              ? 'La landing se centra con un ancho máximo. El editor siempre muestra el diseño a 900px.'
              : 'La landing ocupa todo el ancho del navegador.'}
          </div>
        </Section>

        {acotada && (
          <>
            <Divider />
            <Section title="Fondo de la página">
              <SelectInput
                label="Tipo"
                value={pagina.fondoTipo ?? 'color'}
                options={[
                  { value: 'color',  label: 'Color sólido' },
                  { value: 'imagen', label: 'Imagen (archivo)' },
                ]}
                onChange={(v) => setPagina({ fondoTipo: v as 'color' | 'imagen' })}
              />
              <div style={{ marginTop: 8 }}>
                {(pagina.fondoTipo ?? 'color') === 'color' ? (
                  <ColorInput
                    label="Color alrededor"
                    value={pagina.fondo ?? '#0A0A0A'}
                    onChange={(v) => setPagina({ fondo: v })}
                  />
                ) : (
                  <>
                    <SingleImageField
                      path={pagina.fondoImagen || undefined}
                      onUploaded={(path) => setPagina({ fondoImagen: path })}
                      onRemove={() => setPagina({ fondoImagen: '' })}
                    />
                    <FondoAjustesControls
                      ajustes={pagina.fondoAjustes}
                      onChange={(p) => setPagina({ fondoAjustes: { ...(pagina.fondoAjustes ?? {}), ...p } })}
                    />
                  </>
                )}
              </div>
              <div style={{ fontSize: 10, color: '#4F5458', marginTop: 6, lineHeight: 1.4 }}>
                Es el área detrás de la landing (a los lados).
              </div>
            </Section>

            <Divider />
            <Section title="Sombra del contenedor">
              <ToggleRow
                label="Sombra (tarjeta flotante)"
                checked={pagina.sombraActiva !== false}
                onChange={(c) => setPagina({ sombraActiva: c })}
              />
              {pagina.sombraActiva !== false && (
                <div style={{ marginTop: 8 }}>
                  <NumInput
                    label="Intensidad %"
                    value={pagina.sombraIntensidad ?? 60}
                    onChange={(v) => setPagina({ sombraIntensidad: Math.max(0, Math.min(100, v)) })}
                  />
                </div>
              )}
              <div style={{ fontSize: 10, color: '#4F5458', marginTop: 6, lineHeight: 1.4 }}>
                Se aplica en la landing publicada cuando el ancho es acotado.
              </div>
            </Section>
          </>
        )}
      </div>
    </div>
  )
}

// ── section inspector (no element selected) ─────────────────────────────────

function SectionInspector({ sectionId }: { sectionId: string }) {
  const { config, setSectionHeight, setSectionFondo } = useLandingStore()
  const sec = config.secciones.find((s) => s.id === sectionId)
  if (!sec) return <EmptyInspector />

  const height  = sec.altura?.escritorio ?? 580
  const isColor = sec.fondo.tipo === 'color'

  return (
    <div style={{
      width: 252, flexShrink: 0,
      background: 'var(--ed-panel)', borderLeft: '1px solid var(--ed-border)',
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
    }}>
      <div style={{ padding: '10px 14px 9px', borderBottom: '1px solid var(--ed-border)' }}>
        <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '.8px', color: '#6C7278', textTransform: 'uppercase' }}>
          Sección (bloque)
        </div>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#C9CED0' }}>
          {sec.nombre ?? sec.id}
          <span style={{ marginLeft: 6, fontSize: 10, color: '#38D030', fontWeight: 700 }}>activa</span>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px' }}>
        <Section title="Tamaño">
          <NumInput label="Altura (px)" value={height} onChange={(v) => setSectionHeight(sectionId, Math.max(160, v))} />
        </Section>

        <Divider />

        <Section title="Fondo">
          <SelectInput
            label="Tipo"
            value={sec.fondo.tipo}
            options={[
              { value: 'color',  label: 'Color sólido' },
              { value: 'imagen', label: 'Imagen (archivo)' },
            ]}
            onChange={(v) => setSectionFondo(sectionId, {
              tipo: v as 'color' | 'imagen',
              valor: v === 'color' ? (isColor ? sec.fondo.valor : '#0E1411') : (isColor ? '' : sec.fondo.valor),
            })}
          />
          <div style={{ marginTop: 8 }}>
            {isColor ? (
              <ColorInput label="Color" value={sec.fondo.valor || '#0E1411'} onChange={(v) => setSectionFondo(sectionId, { tipo: 'color', valor: v })} />
            ) : (
              <>
                <SingleImageField
                  path={sec.fondo.valor || undefined}
                  onUploaded={(path) => setSectionFondo(sectionId, { tipo: 'imagen', valor: path, ajustes: sec.fondo.ajustes })}
                  onRemove={() => setSectionFondo(sectionId, { tipo: 'imagen', valor: '', ajustes: sec.fondo.ajustes })}
                />
                <FondoAjustesControls
                  ajustes={sec.fondo.ajustes}
                  onChange={(p) => setSectionFondo(sectionId, { tipo: 'imagen', valor: sec.fondo.valor, ajustes: { ...(sec.fondo.ajustes ?? {}), ...p } })}
                />
              </>
            )}
          </div>
        </Section>

        <Divider />
        <div style={{ fontSize: 11, color: '#5A5F63', lineHeight: 1.5, paddingTop: 10 }}>
          La sección solo define el fondo y la altura. Para sombras, bordes o formas decorativas usa un <b style={{ color: '#9AA0A6' }}>Bloque de color</b> dentro de la sección.
        </div>
      </div>
    </div>
  )
}

function ToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (c: boolean) => void }) {
  return (
    <div
      onClick={() => onChange(!checked)}
      style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
    >
      <span style={{ fontSize: 11, fontWeight: 700, color: '#C9CED0' }}>{label}</span>
      <div style={{
        width: 34, height: 19, borderRadius: 10, padding: 2,
        background: checked ? '#38D030' : '#2B2B2B', transition: 'background .15s',
        display: 'flex', justifyContent: checked ? 'flex-end' : 'flex-start',
      }}>
        <div style={{ width: 15, height: 15, borderRadius: '50%', background: checked ? '#063800' : '#6C7278' }} />
      </div>
    </div>
  )
}

// ── multi-selection ─────────────────────────────────────────────────────────

function MultiSelectInspector({ count }: { count: number }) {
  const { alignSelected, deleteSelected } = useLandingStore()
  const aligns: { mode: Parameters<typeof alignSelected>[0]; label: string; icon: React.ReactNode }[] = [
    { mode: 'left',    label: 'Izquierda',       icon: <AlignIcon d="vL" /> },
    { mode: 'centerH', label: 'Centro horiz.',   icon: <AlignIcon d="vC" /> },
    { mode: 'right',   label: 'Derecha',         icon: <AlignIcon d="vR" /> },
    { mode: 'top',     label: 'Arriba',          icon: <AlignIcon d="hT" /> },
    { mode: 'middleV', label: 'Centro vert.',    icon: <AlignIcon d="hC" /> },
    { mode: 'bottom',  label: 'Abajo',           icon: <AlignIcon d="hB" /> },
  ]
  return (
    <div style={{
      width: 252, flexShrink: 0,
      background: 'var(--ed-panel)', borderLeft: '1px solid var(--ed-border)',
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
    }}>
      <div style={{ padding: '10px 14px 9px', borderBottom: '1px solid var(--ed-border)' }}>
        <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '.8px', color: 'var(--ed-text-3)', textTransform: 'uppercase' }}>
          Selección múltiple
        </div>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ed-text)' }}>{count} elementos</div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px' }}>
        <Section title="Alinear entre sí">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
            {aligns.map((a) => (
              <button
                key={a.mode}
                title={a.label}
                onClick={() => alignSelected(a.mode)}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  padding: '9px 0', borderRadius: 7, cursor: 'pointer',
                  background: 'var(--ed-input)', border: '1px solid var(--ed-border-2)',
                  color: 'var(--ed-text-2)',
                }}
              >
                {a.icon}
              </button>
            ))}
          </div>
        </Section>

        <Divider />

        <Section title="Acciones">
          <button
            onClick={() => deleteSelected()}
            style={{
              width: '100%', padding: '9px 0', borderRadius: 7, cursor: 'pointer',
              background: 'rgba(255,80,80,.12)', border: '1px solid rgba(255,107,107,.35)',
              color: '#FF6B6B', fontSize: 12, fontWeight: 800, fontFamily: 'inherit',
            }}
          >
            Eliminar seleccionados
          </button>
          <div style={{ fontSize: 10, color: 'var(--ed-text-3)', marginTop: 8, lineHeight: 1.4 }}>
            Arrastra cualquiera para moverlos juntos. Ctrl/Shift+clic para agregar o quitar de la selección.
          </div>
        </Section>
      </div>
    </div>
  )
}

function AlignIcon({ d }: { d: string }) {
  // v* = vertical guide (align horizontally), h* = horizontal guide (align vertically)
  const vert = d.startsWith('v')
  const pos = d[1] // L/C/R or T/C/B
  const guide = vert
    ? { x1: pos === 'L' ? 4 : pos === 'C' ? 12 : 20, y1: 3, x2: pos === 'L' ? 4 : pos === 'C' ? 12 : 20, y2: 21 }
    : { x1: 3, y1: pos === 'T' ? 4 : pos === 'C' ? 12 : 20, x2: 21, y2: pos === 'T' ? 4 : pos === 'C' ? 12 : 20 }
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <line {...guide} stroke="#38D030" />
      {vert ? (
        <>
          <rect x={pos === 'R' ? 12 : 4} y="7" width="8" height="3.5" rx="1" fill="currentColor" stroke="none" />
          <rect x={pos === 'R' ? 8 : 4} y="13.5" width="12" height="3.5" rx="1" fill="currentColor" stroke="none" />
        </>
      ) : (
        <>
          <rect x="7" y={pos === 'B' ? 12 : 4} width="3.5" height="8" rx="1" fill="currentColor" stroke="none" />
          <rect x="13.5" y={pos === 'B' ? 8 : 4} width="3.5" height="12" rx="1" fill="currentColor" stroke="none" />
        </>
      )}
    </svg>
  )
}

// ── empty state ────────────────────────────────────────────────────────────

function EmptyInspector() {
  return (
    <div style={{
      width: 252, flexShrink: 0,
      background: 'var(--ed-panel)', borderLeft: '1px solid var(--ed-border)',
      display: 'flex', flexDirection: 'column',
    }}>
      <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--ed-border)' }}>
        <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.8px', color: '#6C7278', textTransform: 'uppercase' }}>
          Inspector
        </span>
      </div>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: 12, color: '#3A4045', textAlign: 'center', padding: 20, lineHeight: 1.6 }}>
          Selecciona un elemento<br/>para ver sus propiedades
        </span>
      </div>
    </div>
  )
}

// ── shared UI primitives ───────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ padding: '10px 0' }}>
      <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '.8px', color: '#4F5458', textTransform: 'uppercase', marginBottom: 10 }}>
        {title}
      </div>
      {children}
    </div>
  )
}

function Divider() {
  return <div style={{ height: 1, background: 'var(--ed-border)', margin: '0 -14px' }} />
}

function EditableGeoInput({
  label, value, onChange, live, readOnly,
}: {
  label: string; value: number; onChange: (v: number) => void; live?: boolean; readOnly?: boolean
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft]     = useState('')

  if (readOnly || (live && !editing)) {
    return (
      <div>
        <div style={{ fontSize: 10, color: '#4F5458', fontWeight: 700, marginBottom: 3 }}>{label}</div>
        <div style={{
          background: 'var(--ed-panel)', border: '1px solid var(--ed-border)', borderRadius: 6,
          padding: '5px 8px', fontSize: 12, fontWeight: 700,
          color: readOnly ? '#6C7278' : '#38D030', fontFamily: 'monospace',
        }}>
          {value}
        </div>
      </div>
    )
  }

  return (
    <div>
      <div style={{ fontSize: 10, color: '#4F5458', fontWeight: 700, marginBottom: 3 }}>{label}</div>
      <input
        type="number"
        value={editing ? draft : value}
        onFocus={() => { setEditing(true); setDraft(String(value)) }}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => { setEditing(false); const n = parseInt(draft); if (!isNaN(n)) onChange(n) }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') { e.currentTarget.blur() }
          if (e.key === 'Escape') { setEditing(false) }
          e.stopPropagation()
        }}
        style={{
          width: '100%', background: 'var(--ed-input)',
          border: editing ? '1px solid #38D030' : '1px solid var(--ed-border-2)',
          borderRadius: 6, padding: '5px 8px',
          fontSize: 12, fontWeight: 700,
          color: editing ? '#ECEEEF' : '#38D030',
          fontFamily: 'monospace', boxSizing: 'border-box',
          outline: 'none',
        }}
      />
    </div>
  )
}

function NumInput({
  label, value, onChange,
}: {
  label: string; value: number; onChange: (v: number) => void
}) {
  return (
    <div>
      <div style={{ fontSize: 10, color: '#4F5458', fontWeight: 700, marginBottom: 3 }}>{label}</div>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        onKeyDown={(e) => e.stopPropagation()}
        style={{
          width: '100%', background: 'var(--ed-input)', border: '1px solid var(--ed-border-2)',
          borderRadius: 6, padding: '5px 8px', fontSize: 12, color: 'var(--ed-text)',
          fontFamily: 'inherit', boxSizing: 'border-box', outline: 'none',
        }}
      />
    </div>
  )
}

function TextInput({
  label, value, onChange, placeholder,
}: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string
}) {
  return (
    <div>
      <div style={{ fontSize: 10, color: '#4F5458', fontWeight: 700, marginBottom: 3 }}>{label}</div>
      <input
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => e.stopPropagation()}
        style={{
          width: '100%', background: 'var(--ed-input)', border: '1px solid var(--ed-border-2)',
          borderRadius: 6, padding: '5px 8px', fontSize: 12, color: 'var(--ed-text)',
          fontFamily: 'inherit', boxSizing: 'border-box', outline: 'none',
        }}
      />
    </div>
  )
}

function Textarea({
  label, value, onChange,
}: {
  label: string; value: string; onChange: (v: string) => void
}) {
  return (
    <div>
      <div style={{ fontSize: 10, color: '#4F5458', fontWeight: 700, marginBottom: 3 }}>{label}</div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => e.stopPropagation()}
        rows={3}
        style={{
          width: '100%', background: 'var(--ed-input)', border: '1px solid var(--ed-border-2)',
          borderRadius: 6, padding: '5px 8px', fontSize: 12, color: 'var(--ed-text)',
          fontFamily: 'inherit', boxSizing: 'border-box', resize: 'vertical', outline: 'none',
        }}
      />
    </div>
  )
}

function SelectInput({
  label, value, options, onChange,
}: {
  label: string; value: string
  options: { value: string; label: string }[]
  onChange: (v: string) => void
}) {
  return (
    <div>
      <div style={{ fontSize: 10, color: '#4F5458', fontWeight: 700, marginBottom: 3 }}>{label}</div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => e.stopPropagation()}
        style={{
          width: '100%', background: 'var(--ed-input)', border: '1px solid var(--ed-border-2)',
          borderRadius: 6, padding: '5px 8px', fontSize: 12, color: 'var(--ed-text)',
          fontFamily: 'inherit', boxSizing: 'border-box', outline: 'none',
        }}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  )
}

// Normalize any CSS color value to a 6-digit lowercase hex the native
// <input type="color"> can display (#rrggbb). Falls back to black.
function toHexColor(value: string): string {
  const v = (value || '').trim()
  let m = /^#([0-9a-fA-F]{3})$/.exec(v)
  if (m) { const [r, g, b] = m[1].split(''); return `#${r}${r}${g}${g}${b}${b}`.toLowerCase() }
  m = /^#([0-9a-fA-F]{6})$/.exec(v)
  if (m) return `#${m[1]}`.toLowerCase()
  m = /rgba?\(([^)]+)\)/i.exec(v)
  if (m) {
    const [r, g, b] = m[1].split(',').map((s) => parseFloat(s.trim()))
    if ([r, g, b].every((n) => !isNaN(n))) {
      const hx = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0')
      return `#${hx(r)}${hx(g)}${hx(b)}`
    }
  }
  return '#000000'
}

function ColorInput({
  label, value, onChange,
}: {
  label: string; value: string; onChange: (v: string) => void
}) {
  return (
    <div>
      <div style={{ fontSize: 10, color: '#4F5458', fontWeight: 700, marginBottom: 3 }}>{label}</div>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <input
          type="color"
          value={toHexColor(value)}
          onChange={(e) => onChange(e.target.value)}
          title="Elegir color"
          style={{ width: 32, height: 30, border: '1px solid var(--ed-border-2)', borderRadius: 6, background: 'var(--ed-input)', padding: 2, cursor: 'pointer', flexShrink: 0 }}
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => e.stopPropagation()}
          style={{
            flex: 1, background: 'var(--ed-input)', border: '1px solid var(--ed-border-2)',
            borderRadius: 6, padding: '5px 8px', fontSize: 11, color: 'var(--ed-text)',
            fontFamily: 'monospace', boxSizing: 'border-box', outline: 'none',
          }}
        />
      </div>
    </div>
  )
}

function AlignButtons({
  value, onChange,
}: {
  value: 'left' | 'center' | 'right'; onChange: (v: 'left' | 'center' | 'right') => void
}) {
  const opts: { v: 'left' | 'center' | 'right'; label: string }[] = [
    { v: 'left',   label: '≡' },
    { v: 'center', label: '≡' },
    { v: 'right',  label: '≡' },
  ]
  const labels = ['Izq', 'Centro', 'Der']
  return (
    <div>
      <div style={{ fontSize: 10, color: '#4F5458', fontWeight: 700, marginBottom: 3 }}>Alineación</div>
      <div style={{ display: 'flex', gap: 4 }}>
        {opts.map((o, i) => (
          <button
            key={o.v}
            onClick={() => onChange(o.v)}
            style={{
              flex: 1, padding: '5px 0', borderRadius: 6, cursor: 'pointer',
              background: value === o.v ? 'rgba(56,208,48,.15)' : '#1A1A1A',
              color: value === o.v ? '#38D030' : '#6C7278',
              fontSize: 11, fontWeight: 700, fontFamily: 'inherit',
              outline: 'none',
              border: value === o.v ? '1px solid rgba(56,208,48,.3)' : '1px solid var(--ed-border-2)',
            }}
          >
            {labels[i]}
          </button>
        ))}
      </div>
    </div>
  )
}

// Font family picker — custom dropdown that previews each option in its own font.
function FontPicker({ value, onChange }: { value?: string; onChange: (f: string) => void }) {
  const [open, setOpen] = useState(false)
  const current = value || 'Mulish'

  // make sure the currently-selected font is available for its preview
  useEffect(() => { loadFont(current) }, [current])

  return (
    <div style={{ position: 'relative' }}>
      <div style={{ fontSize: 10, color: '#4F5458', fontWeight: 700, marginBottom: 3 }}>Tipografía</div>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          width: '100%', background: 'var(--ed-input)',
          border: open ? '1px solid #38D030' : '1px solid var(--ed-border-2)',
          borderRadius: 6, padding: '7px 9px', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
          color: 'var(--ed-text)', outline: 'none',
        }}
      >
        <span style={{ fontFamily: fontStack(current), fontSize: 15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {current}
        </span>
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#6C7278" strokeWidth="2.5" style={{ flexShrink: 0 }}>
          <path d={open ? 'M6 15l6-6 6 6' : 'M6 9l6 6 6-6'} />
        </svg>
      </button>

      {open && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 299 }} onClick={() => setOpen(false)} />
          <div style={{
            position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 300,
            background: 'var(--ed-border)', border: '1px solid #303030', borderRadius: 10,
            padding: 5, maxHeight: 300, overflowY: 'auto',
            boxShadow: '0 10px 32px rgba(0,0,0,.65)',
          }}>
            {FONTS.map((f) => (
              <FontOption
                key={f.name}
                name={f.name}
                meta={FONT_CATEGORY_LABEL[f.category]}
                active={f.name === current}
                onPick={() => { onChange(f.name); loadFont(f.name); setOpen(false) }}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// One row in the font dropdown — loads its own font only when scrolled into view.
function FontOption({
  name, meta, active, onPick,
}: {
  name: string; meta: string; active: boolean; onPick: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  const [hov, setHov] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting) {
        loadFont(name)
        setVisible(true)
        obs.disconnect()
      }
    }, { threshold: 0.1 })
    obs.observe(el)
    return () => obs.disconnect()
  }, [name])

  return (
    <div
      ref={ref}
      onClick={onPick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8,
        padding: '7px 9px', borderRadius: 7, cursor: 'pointer',
        background: active ? 'rgba(56,208,48,.14)' : hov ? 'rgba(255,255,255,.04)' : 'transparent',
        border: active ? '1px solid rgba(56,208,48,.3)' : '1px solid transparent',
      }}
    >
      <span style={{
        fontFamily: visible ? fontStack(name) : 'Mulish, sans-serif',
        fontSize: 16, color: active ? '#38D030' : '#ECEEEF',
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>
        {name}
      </span>
      <span style={{ fontFamily: 'Mulish, sans-serif', fontSize: 9, fontWeight: 700, color: '#4F5458', flexShrink: 0, textTransform: 'uppercase', letterSpacing: '.4px' }}>
        {meta}
      </span>
    </div>
  )
}

function LayerOrderBtn({
  children, label, onClick,
}: {
  children: React.ReactNode; label: string; onClick: () => void
}) {
  const [hov, setHov] = useState(false)
  return (
    <button
      title={label}
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '6px 8px', borderRadius: 6, cursor: 'pointer',
        background: hov ? 'rgba(56,208,48,.12)' : '#1A1A1A',
        border: hov ? '1px solid rgba(56,208,48,.3)' : '1px solid var(--ed-border-2)',
        color: hov ? '#38D030' : '#9AA0A6',
        fontSize: 10, fontWeight: 700, fontFamily: 'inherit',
        textAlign: 'left', overflow: 'hidden', whiteSpace: 'nowrap',
      }}
    >
      <span style={{ flexShrink: 0, display: 'flex' }}>{children}</span>
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</span>
    </button>
  )
}

function FrontIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="7" y="7" width="13" height="13" rx="2" fill="currentColor" stroke="none" opacity=".9"/>
      <path d="M4 15V5a1 1 0 011-1h10" />
    </svg>
  )
}
function BackIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="4" y="4" width="13" height="13" rx="2" fill="currentColor" stroke="none" opacity=".9"/>
      <path d="M20 9v10a1 1 0 01-1 1H9" />
    </svg>
  )
}
function UpIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 19V5M5 12l7-7 7 7" />
    </svg>
  )
}
function DownIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 5v14M5 12l7 7 7-7" />
    </svg>
  )
}

function HeaderActionBtn({
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
        width: 26, height: 26, borderRadius: 6,
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
