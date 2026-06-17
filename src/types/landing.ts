export type Viewport = 'escritorio' | 'movil'

export type ElementoTipo = 'imagen' | 'texto' | 'boton' | 'galeria' | 'formulario' | 'bloque' | 'proyectos'

export interface ProyectoCard {
  id: string
  imagen: string       // storage path
  badge: string        // status text, e.g. "EN VENTA"
  badgeColor: string
  nombre: string
  ubicacion: string    // location / short description
}

export interface Sombra {
  activa: boolean
  x: number
  y: number
  blur: number
  spread: number
  color: string
}

export interface Borde {
  ancho: number
  color: string
}

export interface Geometry {
  x: number
  y: number
  w: number
  h: number
  z: number
}

export type CampoTipo = 'texto' | 'email' | 'telefono' | 'select' | 'textarea'

export interface FormCampo {
  id: string
  label: string
  tipo: CampoTipo
  requerido: boolean
  opciones?: string[]   // for tipo 'select'
}

export type AccionTipo = 'url' | 'whatsapp' | 'email' | 'scroll'

export type ContentValue = string | number | boolean | string[] | FormCampo[] | ProyectoCard[]

export interface LandingElemento {
  id: string
  tipo: ElementoTipo
  bloqueado?: boolean   // locked: can't move/resize/edit (still visible)
  contenido: Record<string, ContentValue>
  estilo: {
    radio?: number
    opacidad?: number
    sombra?: Sombra
    borde?: Borde
    ajuste?: 'cover' | 'contain' | 'fill'
    fontSize?: number
    fontWeight?: string
    fontFamily?: string
    color?: string
    bgColor?: string
    textAlign?: 'left' | 'center' | 'right'
  }
  geometria: {
    escritorio: Geometry
    movil: Geometry
  }
}

// Adjustments for image backgrounds so they don't fight with the content.
export interface FondoAjustes {
  opacidad?: number        // image opacity 0..1 (default 1)
  overlayColor?: string    // color overlay on top of the image (default #000000)
  overlayOpacidad?: number // 0..1 (default 0 = no overlay)
  brillo?: number          // brightness %, 100 = normal
  contraste?: number       // contrast %, 100 = normal
}

// fondo.valor = color (tipo 'color') OR storage path (tipo 'imagen', resolved via signed URL)
export interface SeccionFondo {
  tipo: 'color' | 'imagen'
  valor: string
  ajustes?: FondoAjustes   // only used when tipo === 'imagen'
}

// Sections are purely structural: only a background (color or image). No effects.
export interface Seccion {
  id: string
  nombre?: string
  fondo: SeccionFondo
  altura: { escritorio: number; movil: number }
  elementos: LandingElemento[]
}

export interface EstiloPagina {
  ancho: 'completa' | 'acotada'  // full-bleed vs centered max-width
  maxWidth?: number              // px when 'acotada'
  fondoTipo?: 'color' | 'imagen' // page background type (default 'color')
  fondo?: string                 // page background color around the landing when 'acotada'
  fondoImagen?: string           // storage path when fondoTipo === 'imagen'
  fondoAjustes?: FondoAjustes
  // card-like shadow around the landing container (only in 'acotada' mode)
  sombraActiva?: boolean         // default true
  sombraIntensidad?: number      // 0..100, default 60
}

export interface LandingConfig {
  slug: string
  publicada: boolean
  branding?: { logo?: string }
  pagina?: EstiloPagina
  secciones: Seccion[]
}

// ── Element factory ────────────────────────────────────────────────────────

type ElementDefaults = {
  w: number
  h: number
  contenido: Record<string, ContentValue>
  estilo: LandingElemento['estilo']
}

const TIPO_DEFAULTS: Record<ElementoTipo, ElementDefaults> = {
  texto: {
    w: 240, h: 44,
    contenido: { texto: 'Texto nuevo', tag: 'p' },
    estilo: { fontSize: 20, fontWeight: '600', color: '#FFFFFF', textAlign: 'left' },
  },
  imagen: {
    w: 300, h: 240,
    contenido: { src: '', label: 'Imagen', alt: '' },
    estilo: { radio: 12, opacidad: 1, ajuste: 'cover' },
  },
  boton: {
    w: 200, h: 48,
    contenido: { texto: 'Llamar a acción', accion: 'url', href: '', telefono: '', mensaje: '', email: '', seccionId: '' },
    estilo: { fontSize: 14, fontWeight: '700', color: '#063800', bgColor: '#38D030', radio: 8 },
  },
  galeria: {
    w: 580, h: 300,
    contenido: { columnas: 3, gap: 8, imagenes: [] },
    estilo: { radio: 10, opacidad: 1 },
  },
  formulario: {
    w: 360, h: 360,
    contenido: {
      titulo: 'Contáctame',
      boton: 'Enviar',
      campos: [
        { id: 'c_nombre',  label: 'Nombre',  tipo: 'texto',    requerido: true },
        { id: 'c_email',   label: 'Email',   tipo: 'email',    requerido: true },
        { id: 'c_mensaje', label: 'Mensaje', tipo: 'textarea', requerido: false },
      ],
    },
    estilo: { radio: 14, bgColor: 'rgba(20,28,22,0.92)', color: '#FFFFFF', fontSize: 14 },
  },
  bloque: {
    w: 280, h: 180,
    contenido: {},
    estilo: { bgColor: '#26323B', opacidad: 1, radio: 8 },
  },
  proyectos: {
    w: 760, h: 348,
    contenido: {
      cards: [
        { id: 'p1', imagen: '', badge: 'EN VENTA',    badgeColor: '#38D030', nombre: 'Residencial Norte', ubicacion: 'Monterrey, N.L.' },
        { id: 'p2', imagen: '', badge: 'EN PREVENTA', badgeColor: '#C99A3A', nombre: 'Torre Centro',      ubicacion: 'Guadalajara, Jal.' },
        { id: 'p3', imagen: '', badge: 'VENDIDO',     badgeColor: '#7C8388', nombre: 'Villas del Sol',    ubicacion: 'CDMX' },
      ],
      animar: true, direccion: 'izquierda', duracion: 30,
      cardAncho: 240, cardAlto: 280, gap: 16,
    },
    estilo: {
      radio: 14, opacidad: 1,
      sombra: { activa: true, x: 0, y: 10, blur: 24, spread: 0, color: 'rgba(0,0,0,0.35)' },
    },
  },
}

export function createDefaultElement(
  tipo: ElementoTipo,
  x: number,
  y: number,
  maxZ: number
): LandingElemento {
  const d = TIPO_DEFAULTS[tipo]
  const id = `${tipo}_${Date.now().toString(36)}`
  return {
    id,
    tipo,
    contenido: { ...d.contenido },
    estilo: { ...d.estilo },
    geometria: {
      escritorio: { x, y, w: d.w, h: d.h, z: maxZ + 1 },
      movil:      { x: 20, y, w: Math.min(d.w, 340), h: d.h, z: maxZ + 1 },
    },
  }
}

export function createDefaultSection(nombre = 'Nueva sección'): Seccion {
  return {
    id: `sec_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`,
    nombre,
    fondo: { tipo: 'color', valor: '#0E1411' },
    altura: { escritorio: 480, movil: 520 },
    elementos: [],
  }
}

// Deep-copy a section with fresh ids (for duplicate).
export function cloneSection(sec: Seccion): Seccion {
  const rnd = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
  return {
    ...sec,
    id: `sec_${rnd()}`,
    nombre: sec.nombre ? `${sec.nombre} copia` : undefined,
    fondo: { ...sec.fondo, ajustes: sec.fondo.ajustes ? { ...sec.fondo.ajustes } : undefined },
    altura: { ...sec.altura },
    elementos: sec.elementos.map((el) => ({
      ...el,
      id: `${el.tipo}_${rnd()}`,
      contenido: { ...el.contenido },
      estilo: { ...el.estilo },
      geometria: { escritorio: { ...el.geometria.escritorio }, movil: { ...el.geometria.movil } },
    })),
  }
}

// ── Default config ─────────────────────────────────────────────────────────

export const DEFAULT_CONFIG: LandingConfig = {
  slug: '',
  publicada: false,
  secciones: [
    {
      id: 'hero',
      nombre: 'Hero',
      fondo: { tipo: 'color', valor: '#0E1411' },
      altura: { escritorio: 580, movil: 520 },
      elementos: [
        {
          id: 'img_01',
          tipo: 'imagen',
          contenido: { path: '' },
          estilo: { radio: 18, opacidad: 1, ajuste: 'cover' },
          geometria: {
            escritorio: { x: 320, y: 50, w: 460, h: 480, z: 3 },
            movil:      { x: 20,  y: 60, w: 300, h: 320, z: 3 },
          },
        },
        {
          id: 'txt_nombre',
          tipo: 'texto',
          contenido: { texto: 'Tu Nombre', tag: 'h1' },
          estilo: { fontSize: 40, fontWeight: '800', color: '#FFFFFF' },
          geometria: {
            escritorio: { x: 60, y: 120, w: 240, h: 56, z: 2 },
            movil:      { x: 20, y: 390, w: 280, h: 56, z: 2 },
          },
        },
        {
          id: 'txt_puesto',
          tipo: 'texto',
          contenido: { texto: 'Asesor Comercial · ORVE', tag: 'p' },
          estilo: { fontSize: 16, fontWeight: '600', color: '#38D030' },
          geometria: {
            escritorio: { x: 60, y: 184, w: 260, h: 28, z: 2 },
            movil:      { x: 20, y: 456, w: 280, h: 28, z: 2 },
          },
        },
        {
          id: 'txt_tagline',
          tipo: 'texto',
          contenido: { texto: 'Tu tagline aquí', tag: 'p' },
          estilo: { fontSize: 15, fontWeight: '500', color: '#9AA0A6' },
          geometria: {
            escritorio: { x: 60, y: 224, w: 240, h: 26, z: 2 },
            movil:      { x: 20, y: 494, w: 280, h: 26, z: 2 },
          },
        },
      ],
    },
  ],
}
