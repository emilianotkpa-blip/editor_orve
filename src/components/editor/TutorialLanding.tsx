import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, m } from 'motion/react'
import { useLandingStore } from '../../store/useLandingStore'
import type { LandingElemento } from '../../types/landing'

/**
 * Tutorial de la landing (16-oct-2026), igual que el de Criterios en Contratos: un mouse animado
 * recorre el editor de verdad, ilumina cada parte, "arrastra", "escribe" y "da clic", con un texto
 * que explica el paso.
 *
 * NUNCA guarda: arma una seccion de ejemplo encima de la landing del asesor, el velo tapa los
 * botones (Guardar / Publicar) y los atajos de teclado, y al terminar todo regresa EXACTAMENTE a
 * como estaba (config, seleccion, historial de deshacer, "sin guardar").
 *
 * Cada paso tiene `preparar` (deja la pantalla lista al instante, para ir y volver entre pasos en
 * cualquier orden) y `accion` (lo animado). La seccion de ejemplo usa ids fijos: al rehacerla en
 * cada paso React no la vuelve a montar y no parpadea.
 */

const SEC = 'tutorial-ejemplo'
const st = () => useLandingStore.getState()

// ── Como estaba todo antes del tutorial ────────────────────────────────────
const CLAVES = ['config', 'selectedElementId', 'selectedIds', 'viewport', 'liveGeo', 'isDirty', 'saveStatus',
  'activeTool', 'activeSectionId', 'editingPage', 'previewing', 'past', 'future', 'dropSectionId'] as const
type Estado = ReturnType<typeof st>
type Foto = Pick<Estado, typeof CLAVES[number]>
let foto: Foto | null = null
let pestanaInicial: 'bloques' | 'capas' = 'bloques'

function tomarFoto() {
  const s = st()
  foto = Object.fromEntries(CLAVES.map((k) => [k, s[k]])) as Foto
  pestanaInicial = pestanaActual()
}
function regresarTodo() {
  if (foto) useLandingStore.setState({ ...foto, toast: null })
  foto = null
  pestana(pestanaInicial)
}

// ── Utilidades de pantalla ─────────────────────────────────────────────────
const q = (sel: string) => () => document.querySelector(sel)
const t = (clave: string) => q(`[data-tutorial="${clave}"]`)
const bloque = (id: string) => q(`[data-tutorial-bloque="${id}"]`)
const seccionLienzo = q(`[data-section-id="${SEC}"]`)

function pestanaActual(): 'bloques' | 'capas' {
  return document.querySelector('[data-tutorial-bloque]') ? 'bloques' : 'capas'
}
/** Las pestañas del panel izquierdo viven en el propio panel: se cambian con un clic de verdad. */
function pestana(cual: 'bloques' | 'capas') {
  if (!document.querySelector('[data-tutorial="panel-izq"]')) {
    ;(document.querySelector('button[title="Mostrar estructura y secciones"]') as HTMLElement | null)?.click()
  }
  if (pestanaActual() !== cual) (document.querySelector(`[data-tutorial="tab-${cual}"]`) as HTMLElement | null)?.click()
}

// ── Escenas: el estado de partida de cada paso ─────────────────────────────
/** La landing tal como la dejo el asesor, sin seleccion ni vista previa. */
function base() {
  if (!foto) return
  const config = foto.config.modo === 'html' ? { ...foto.config, modo: 'lienzo' as const } : foto.config
  useLandingStore.setState({
    ...foto, config, selectedElementId: null, selectedIds: [], liveGeo: null,
    editingPage: false, previewing: false, viewport: 'escritorio', activeTool: 'select', toast: null,
  })
}
/** La landing + una seccion de ejemplo al final, con los bloques indicados (x, y = centro). */
function conEjemplo(bloques: [string, number, number][] = [], alto = 560) {
  if (!foto) return   // el tutorial ya termino: nunca tocar la landing de verdad
  base()
  st().addSection()
  const nueva = st().config.secciones[st().config.secciones.length - 1]
  for (const [id, x, y] of bloques) st().addBloque(nueva.id, id, x, y)
  const c = st().config
  // Nombres que se leen bien en «Capas» (ahi se ve el id de cada pieza).
  const cuenta: Record<string, number> = {}
  const nombre = (tipo: string) => {
    cuenta[tipo] = (cuenta[tipo] ?? 0) + 1
    return `ejemplo_${tipo}${cuenta[tipo] > 1 ? '_' + cuenta[tipo] : ''}`
  }
  useLandingStore.setState({
    config: {
      ...c,
      secciones: c.secciones.map((s) => s.id !== nueva.id ? s : {
        ...s, id: SEC, nombre: 'Ejemplo del tutorial',
        altura: { ...s.altura, escritorio: alto },
        elementos: s.elementos.map((e) => ({ ...e, id: nombre(e.tipo) })),
      }),
    },
    activeSectionId: SEC, selectedElementId: null, selectedIds: [], toast: null,
  })
}
function pieza(tipo: string, filtro?: (e: LandingElemento) => boolean) {
  return st().config.secciones.find((s) => s.id === SEC)?.elementos.find((e) => e.tipo === tipo && (!filtro || filtro(e)))
}
const titulo = () => pieza('texto', (e) => e.contenido.tag === 'h1')
const imagen = () => pieza('imagen')
const formulario = () => pieza('formulario')
const boton = () => pieza('boton')
const enLienzo = (fn: () => LandingElemento | undefined) => () => {
  const e = fn()
  return e ? document.querySelector(`[data-element-id="${e.id}"]`) : null
}
const elegir = (fn: () => LandingElemento | undefined) => { const e = fn(); if (e) st().selectElement(e.id) }
const contenido = (fn: () => LandingElemento | undefined, c: Record<string, string>) => {
  const e = fn(); if (e) st().updateElementContent(SEC, e.id, c)
}

const HERO: [string, number, number] = ['hero', 450, 290]
const FORM: [string, number, number] = ['formulario', 220, 230]
const WHATS: [string, number, number] = ['whatsapp', 600, 140]
function heroConNombre() {
  conEjemplo([HERO])
  elegir(titulo)
  contenido(titulo, { texto: 'Ana López' })
}

const HTML_EJEMPLO = '<section style="padding:56px 24px;text-align:center;font-family:system-ui,sans-serif;' +
  'background:linear-gradient(135deg,#0E1411,#123d1f);color:#fff">' +
  '<p style="color:#38D030;font-weight:800;letter-spacing:.2em;font-size:12px;margin:0">HECHO EN HTML</p>' +
  '<h2 style="font-size:34px;margin:10px 0">Tu sección, tal cual la diseñaste</h2>' +
  '<p style="color:#9AA0A6;max-width:520px;margin:0 auto">Pega el código y se ve igual en computadora y en celular.</p></section>'

// ── Pasos ──────────────────────────────────────────────────────────────────
type Util = {
  esperar: (ms: number) => Promise<void>
  vigente: () => boolean
  escribir: (fn: (texto: string) => void, texto: string) => Promise<void>
  /** Lleva el mouse a un elemento o punto y espera a que llegue. */
  mover: (a: Element | { x: number; y: number } | null, ms?: number) => Promise<void>
  clic: () => void
  /** Etiqueta que viaja pegada al mouse mientras "arrastra". */
  cargar: (texto: string | null) => void
  /** Cambia el recuadro iluminado a otro elemento a mitad del paso. */
  resaltar: (e: Element | null) => void
}
type Paso = {
  grupo: string
  objetivo: string | (() => Element | null) | null
  texto: string
  preparar?: () => void
  accion?: (u: Util) => Promise<void>
  /** Solo señalar (sin clic): botones que de verdad guardarian o publicarian. */
  soloSenalar?: boolean
  /** Tras la accion se quita el velo para ver el resultado (la vista previa). */
  mostrar?: boolean
  /** La accion es un arrastre desde la paleta: hace sus propios clics. */
  arrastre?: boolean
}

/** Arrastre de un bloque de la paleta a la seccion de ejemplo; se suelta donde cae su centro. */
async function arrastrar(u: Util, nombre: string, centro: [string, number, number], soltar: () => void) {
  u.clic()
  u.cargar(nombre)
  const sec = seccionLienzo()
  sec?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  await u.esperar(500)
  if (!u.vigente() || !sec) return
  u.resaltar(sec)
  const r = sec.getBoundingClientRect()
  const escala = r.width / 900   // el lienzo de escritorio mide 900px
  await u.mover({ x: r.left + centro[1] * escala, y: r.top + centro[2] * escala }, 900)
  if (!u.vigente()) return
  u.cargar(null)
  u.clic()
  soltar()
  await u.esperar(350)
}

/** "Arrastra" una pieza del lienzo: la mueve poco a poco y el mouse la acompaña. */
async function moverPieza(u: Util, fn: () => LandingElemento | undefined, dx: number, dy: number) {
  const e = fn()
  if (!e) return
  const g = e.geometria.escritorio
  // Las agarraderas no siguen un cambio hecho por codigo: se suelta la pieza mientras se mueve
  // y se vuelve a tomar al final, ya en su lugar nuevo.
  st().selectElement(null)
  const N = 14
  for (let k = 1; k <= N && u.vigente(); k++) {
    st().updateElementGeometry(SEC, e.id, { x: Math.round(g.x + (dx * k) / N), y: Math.round(g.y + (dy * k) / N) })
    const dom = document.querySelector(`[data-element-id="${e.id}"]`)
    if (dom) {
      const r = dom.getBoundingClientRect()
      void u.mover({ x: r.left + r.width * 0.35, y: r.top + r.height / 2 }, 70)
    }
    await u.esperar(70)
  }
  await u.esperar(120)
  if (!u.vigente()) return
  st().selectElement(e.id)
  // Moveable se dibuja oculto la primera vez y se muestra en el siguiente render (normalmente lo
  // provoca el propio mouse). Aqui nadie mueve el mouse: se provoca ese render.
  await u.esperar(120)
  if (u.vigente()) st().setLiveGeo(null)
}

const CONOCE = 'Conoce el editor'
const ARMA = 'Arma tu landing'
const CONTACTOS = 'Recibe contactos'
const PUBLICA = 'Publica tu landing'
const HTML = 'Tu propio HTML'

const PASOS: Paso[] = [
  // ── Conoce el editor ──
  {
    grupo: CONOCE, objetivo: 'panel-izq',
    texto: 'A la izquierda están los bloques: secciones ya armadas (portada, sobre mí, testimonios…) que sueltas en tu landing y solo personalizas.',
    preparar: () => { base(); pestana('bloques') }, soloSenalar: true,
  },
  {
    grupo: CONOCE, objetivo: 'herramientas', soloSenalar: true,
    texto: 'En esta barra agregas piezas sueltas: texto, imagen, botón, formulario, video o tu propio código. Eliges una y das clic donde la quieres.',
    preparar: () => { base(); pestana('bloques') },
  },
  {
    grupo: CONOCE, objetivo: q('.orve-frame'), soloSenalar: true,
    texto: 'Al centro está el lienzo: tu landing tal como se verá. Se arma con secciones, franjas que van una debajo de otra.',
    preparar: base,
  },
  {
    grupo: CONOCE, objetivo: 'inspector', soloSenalar: true,
    texto: 'A la derecha cambias lo que tengas seleccionado: textos, colores, tamaños y fotos. Sin nada seleccionado, ves los ajustes de la sección.',
    preparar: base,
  },
  {
    grupo: CONOCE, objetivo: () => document.querySelectorAll('[data-tutorial="vistas"] button')[1] ?? null,
    texto: '«Móvil» te enseña cómo se ve en celular. Revísalo antes de publicar: casi todos tus clientes la abrirán desde su teléfono.',
    preparar: base,
    accion: async (u) => {
      st().setViewport('movil')
      await u.esperar(400)
      u.resaltar(document.querySelector('.orve-frame'))
    },
  },
  {
    grupo: CONOCE, objetivo: 'historial', soloSenalar: true,
    texto: '¿Te equivocaste? Deshaz con esta flecha (o Ctrl+Z) y rehaz con la otra (Ctrl+Shift+Z).',
    preparar: base,
  },
  {
    grupo: CONOCE, objetivo: 'vista-previa', mostrar: true,
    texto: '«Vista previa» te enseña la landing limpia, exactamente como la verá tu cliente.',
    preparar: base,
    accion: async () => st().setPreviewing(true),
  },

  // ── Arma tu landing ──
  {
    grupo: ARMA, objetivo: bloque('hero'), arrastre: true,
    texto: 'Toma una sección lista —por ejemplo «Portada / Hero»— y arrástrala al lienzo.',
    preparar: () => { conEjemplo(); pestana('bloques') },
    accion: (u) => arrastrar(u, 'Portada / Hero', HERO, () => conEjemplo([HERO])),
  },
  {
    grupo: ARMA, objetivo: enLienzo(titulo),
    texto: 'Cae completa. Da clic en cualquier pieza para seleccionarla; por ejemplo, tu nombre.',
    preparar: () => conEjemplo([HERO]),
    accion: async () => elegir(titulo),
  },
  {
    grupo: ARMA, objetivo: 'sec-texto',
    texto: 'Escribe en el panel derecho y el lienzo cambia al instante.',
    preparar: () => { conEjemplo([HERO]); elegir(titulo) },
    accion: (u) => u.escribir((v) => contenido(titulo, { texto: v }), 'Ana López'),
  },
  {
    grupo: ARMA, objetivo: 'sec-tipografia',
    texto: 'Aquí cambias la letra: tipo, tamaño, grosor, color y alineación.',
    preparar: heroConNombre,
    accion: async () => { const e = titulo(); if (e) st().updateElementStyle(SEC, e.id, { color: '#C99A3A' }) },
  },
  {
    grupo: ARMA, objetivo: enLienzo(titulo),
    texto: 'Para moverla, arrástrala en el lienzo. Para hacerla más grande o más chica, jala sus esquinas.',
    preparar: () => { heroConNombre(); const e = titulo(); if (e) st().updateElementStyle(SEC, e.id, { color: '#C99A3A' }) },
    accion: (u) => moverPieza(u, titulo, 40, 18),
  },
  {
    grupo: ARMA, objetivo: enLienzo(imagen),
    texto: 'Las fotos funcionan igual: selecciona la imagen…',
    preparar: heroConNombre,
    accion: async () => elegir(imagen),
  },
  {
    grupo: ARMA, objetivo: 'subir-imagen', soloSenalar: true,
    texto: '…y sube la tuya desde aquí. También sirven las fotos del iPhone.',
    preparar: () => { heroConNombre(); elegir(imagen) },
  },
  {
    grupo: ARMA, objetivo: 'tab-capas',
    texto: 'En «Capas» ves todo lo que hay en cada sección: lo ordenas arrastrando, lo bloqueas para no moverlo sin querer, lo duplicas o lo borras.',
    preparar: () => { heroConNombre(); st().selectElement(null); pestana('bloques') },
    accion: async (u) => {
      pestana('capas')
      await u.esperar(350)
      const fila = document.querySelector(`[data-tutorial-seccion="${SEC}"]`)
      fila?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
      await u.esperar(300)
      u.resaltar(fila)
    },
  },
  {
    grupo: ARMA, objetivo: 'agregar-seccion', soloSenalar: true,
    texto: 'Agrega todas las secciones que necesites. Con las flechas de cada una la subes o la bajas.',
    preparar: () => { heroConNombre(); st().selectElement(null); st().setActiveSection(SEC); pestana('capas') },
  },
  {
    grupo: ARMA, objetivo: 'sec-fondo',
    texto: 'Con la sección elegida, en el panel derecho cambias su fondo (color o foto) y su altura.',
    preparar: () => { heroConNombre(); st().selectElement(null); st().setActiveSection(SEC); pestana('capas') },
    accion: async () => st().setSectionFondo(SEC, { tipo: 'color', valor: '#10301C' }),
  },

  // ── Recibe contactos ──
  {
    grupo: CONTACTOS, objetivo: bloque('formulario'), arrastre: true,
    texto: 'En «Captación» está el «Formulario de contacto». Arrástralo a tu landing.',
    preparar: () => { conEjemplo(); pestana('bloques') },
    accion: (u) => arrastrar(u, 'Formulario de contacto', FORM, () => conEjemplo([FORM])),
  },
  {
    grupo: CONTACTOS, objetivo: enLienzo(formulario),
    texto: 'Selecciónalo para configurarlo.',
    preparar: () => conEjemplo([FORM]),
    accion: async () => elegir(formulario),
  },
  {
    grupo: CONTACTOS, objetivo: 'sec-campos', soloSenalar: true,
    texto: 'Elige qué preguntar —nombre, teléfono, correo, opciones— y qué es obligatorio.',
    preparar: () => { conEjemplo([FORM]); elegir(formulario) },
  },
  {
    grupo: CONTACTOS, objetivo: 'material',
    texto: 'Opcional: pega el enlace de tu brochure o lista de precios. Se desbloquea cuando el cliente deja sus datos (el candado 🔒).',
    preparar: () => { conEjemplo([FORM]); elegir(formulario) },
    accion: (u) => u.escribir((v) => contenido(formulario, { materialUrl: v }), 'https://tu-enlace.com/brochure.pdf'),
  },
  {
    grupo: CONTACTOS, objetivo: enLienzo(formulario), soloSenalar: true,
    texto: 'Cada respuesta se guarda como contacto a tu nombre: tu enlace dice de quién es.',
    preparar: () => { conEjemplo([FORM]); elegir(formulario); contenido(formulario, { materialUrl: 'https://tu-enlace.com/brochure.pdf' }) },
  },
  {
    grupo: CONTACTOS, objetivo: bloque('whatsapp'), arrastre: true,
    texto: '¿Prefieres que te escriban directo? Suelta el «Botón WhatsApp»…',
    preparar: () => { conEjemplo([FORM]); pestana('bloques') },
    accion: (u) => arrastrar(u, 'Botón WhatsApp', WHATS, () => { conEjemplo([FORM, WHATS]); elegir(boton) }),
  },
  {
    grupo: CONTACTOS, objetivo: 'sec-boton', soloSenalar: true,
    texto: '…y en el panel derecho pon tu número y el mensaje con el que te van a escribir.',
    preparar: () => { conEjemplo([FORM, WHATS]); elegir(boton) },
  },

  // ── Publica tu landing ──
  {
    grupo: PUBLICA, objetivo: 'fila-pagina',
    texto: 'En «Capas», «Página» abre los ajustes de toda la landing.',
    preparar: () => { base(); pestana('capas') },
    accion: async () => st().setEditingPage(true),
  },
  {
    grupo: PUBLICA, objetivo: 'sec-tu-enlace', soloSenalar: true,
    texto: 'Elige tu enlace: es lo que compartes con tus clientes (…/u/tu-nombre). Si otro asesor ya lo tiene, te avisa.',
    preparar: () => { base(); pestana('capas'); st().setEditingPage(true) },
  },
  {
    grupo: PUBLICA, objetivo: 'sec-ancho-de-la-landing',
    texto: '«Completa» ocupa toda la pantalla; «Acotada» la muestra centrada, como tarjeta, con un fondo alrededor.',
    preparar: () => { base(); pestana('capas'); st().setEditingPage(true) },
    accion: async (u) => {
      // Con un color alrededor se nota la tarjeta (todo regresa al terminar).
      const pg = st().config.pagina
      st().setPagina((pg?.fondoTipo ?? 'color') === 'color' ? { ancho: 'acotada', fondo: '#123d22' } : { ancho: 'acotada' })
      await u.esperar(600)
      u.resaltar(document.querySelector('[data-tutorial="lienzo"]'))
    },
  },
  {
    grupo: PUBLICA, objetivo: 'vista-previa', mostrar: true,
    texto: 'Antes de publicar, revísala en «Vista previa».',
    preparar: base,
    accion: async () => st().setPreviewing(true),
  },
  {
    grupo: PUBLICA, objetivo: 'guardar', soloSenalar: true,
    texto: 'Guarda seguido: junto al botón te dice si hay cambios sin guardar. (En este tutorial no se guarda nada.)',
    preparar: base,
  },
  {
    grupo: PUBLICA, objetivo: 'publicar', soloSenalar: true,
    texto: '«Publicar» la pone en línea. Después, cada cambio se sube con «Republicar», y el enlace para compartir lo copias del letrero «Publicada» de arriba.',
    preparar: base,
  },

  // ── Tu propio HTML ──
  {
    grupo: HTML, objetivo: 'sec-esta-seccion',
    texto: '¿Tienes una sección hecha en HTML, por ejemplo una que te armó una IA? Elige la sección y cambia «Contenido» a «Mi HTML».',
    preparar: () => { conEjemplo(); pestana('capas') },
    accion: async () => st().setSectionHtml(SEC, { modo: 'html' }),
  },
  {
    grupo: HTML, objetivo: 'campo-html',
    texto: 'Pega el código o usa «Cargar archivo .html». La sección mide lo que mida tu HTML, en computadora y en celular.',
    preparar: () => { conEjemplo(); pestana('capas'); st().setSectionHtml(SEC, { modo: 'html' }) },
    accion: async () => st().setSectionHtml(SEC, { html: HTML_EJEMPLO }),
  },
  {
    grupo: HTML, objetivo: seccionLienzo, soloSenalar: true,
    texto: 'Así queda en tu landing, junto a las secciones que armaste con bloques.',
    preparar: () => { conEjemplo(); pestana('capas'); st().setSectionHtml(SEC, { modo: 'html', html: HTML_EJEMPLO }) },
  },
  {
    grupo: HTML, objetivo: 'sec-como-se-arma', soloSenalar: true,
    texto: '¿La página entera en HTML? En «Página» → «Cómo se arma» → «Pegar mi HTML (página completa)», y eliges si va completa o acotada.',
    preparar: () => { base(); pestana('capas'); st().setEditingPage(true) },
  },
]

const TOURS: { id: string; titulo: string; nota: string; pasos: Paso[] }[] = [
  { id: 'todo', titulo: 'Recorrido completo', nota: 'Todo lo de abajo, de corrido', pasos: PASOS },
  ...[CONOCE, ARMA, CONTACTOS, PUBLICA, HTML].map((g) => ({
    id: g, titulo: g, nota: '', pasos: PASOS.filter((p) => p.grupo === g),
  })),
]
const NOTAS: Record<string, string> = {
  [CONOCE]: 'Qué hay en cada parte de la pantalla',
  [ARMA]: 'Soltar una sección, cambiar textos, fotos y fondos',
  [CONTACTOS]: 'Formulario con candado y botón de WhatsApp',
  [PUBLICA]: 'Tu enlace, el ancho, guardar y publicar',
  [HTML]: 'Pegar una sección o una página hecha en HTML',
}
const duracion = (n: number) => {
  const min = Math.max(1, Math.round((n * 9) / 60))
  return min === 1 ? 'cerca de 1 minuto' : `unos ${min} minutos`
}

const esperarMs = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))
const enCelular = () => typeof window !== 'undefined' && window.innerWidth < 640
const VISTO = 'orve-tutorial-landing-visto'
type Caja = { top: number; left: number; width: number; height: number }

function cajaDe(paso: Paso | undefined): Element | null {
  if (!paso || !paso.objetivo) return null
  return typeof paso.objetivo === 'string' ? t(paso.objetivo)() : paso.objetivo()
}

export function TutorialLanding() {
  const [elegirAbierto, setElegirAbierto] = useState(false)
  const [tour, setTour] = useState<(typeof TOURS)[number] | null>(null)
  const [i, setI] = useState(0)
  const [auto, setAuto] = useState(true)
  const [caja, setCaja] = useState<Caja | null>(null)
  const [velo, setVelo] = useState(true)
  const [cursor, setCursor] = useState<{ x: number; y: number } | null>(null)
  const [vel, setVel] = useState(0.75)
  const [carga, setCarga] = useState<string | null>(null)
  const [clic, setClic] = useState(0)
  const [listo, setListo] = useState(false)
  const [visto, setVisto] = useState(() => { try { return !!localStorage.getItem(VISTO) } catch { return true } })
  const turno = useRef(0)
  const extra = useRef<Element | null>(null)
  const tarjeta = useRef<HTMLDivElement>(null)
  const [arriba, setArriba] = useState(false)
  const pasos = tour?.pasos ?? []
  const paso = pasos[i]

  const medir = useCallback(() => {
    const e = extra.current ?? cajaDe(paso)
    if (!e || !e.isConnected) { setCaja(null); return null }
    const r = e.getBoundingClientRect()
    if (!r.width && !r.height) { setCaja(null); return null }
    // Lo que es mas alto que la pantalla (el lienzo) se recorta a lo visible, sin meterse debajo
    // de la tarjeta de instrucciones si le queda encima.
    const tc = tarjeta.current?.getBoundingClientRect()
    const cruza = tc && r.left < tc.right && r.right > tc.left
    const libreArriba = arriba && tc && cruza ? tc.bottom + 6 : 8
    const libreAbajo = !arriba && tc && cruza ? tc.top - 6 : window.innerHeight - 8
    const top = Math.max(libreArriba, r.top - 6)
    const bottom = Math.min(libreAbajo, r.bottom + 6)
    const left = Math.max(4, r.left - 6)
    const right = Math.min(window.innerWidth - 4, r.right + 6)
    const c = { top, left, width: Math.max(24, right - left), height: Math.max(24, bottom - top) }
    setCaja(c)
    return c
  }, [paso, arriba])

  // El recuadro sigue a su objetivo si la pantalla se mueve (paneles que se abren, scroll, tamaño).
  useEffect(() => {
    if (!tour) return
    const id = window.setInterval(medir, 200)
    window.addEventListener('resize', medir)
    window.addEventListener('scroll', medir, true)
    return () => {
      window.clearInterval(id)
      window.removeEventListener('resize', medir)
      window.removeEventListener('scroll', medir, true)
    }
  }, [tour, medir])

  // Correr el paso actual: preparar al instante, acercar, mover el mouse, hacer la accion.
  useEffect(() => {
    if (!tour || !paso) return
    const yo = ++turno.current
    const vigente = () => turno.current === yo
    const util: Util = {
      esperar: (ms) => esperarMs(ms),
      vigente,
      escribir: async (fn, texto) => {
        for (let k = 1; k <= texto.length && vigente(); k++) {
          fn(texto.slice(0, k))
          await esperarMs(70)
        }
      },
      mover: async (a, ms = 750) => {
        if (!a || !vigente()) return
        let x: number, y: number
        if ('getBoundingClientRect' in a) {
          const r = a.getBoundingClientRect()
          x = r.left + Math.min(r.width - 14, r.width * 0.35 + 12)
          y = r.top + r.height / 2 + 4
        } else { x = a.x; y = a.y }
        setVel(ms / 1000)
        setCursor({ x, y })
        await esperarMs(ms + 40)
      },
      clic: () => setClic((n) => n + 1),
      cargar: (texto) => setCarga(texto),
      resaltar: (e) => { extra.current = e; medir() },
    }
    extra.current = null
    setListo(false)
    setCarga(null)
    setVelo(true)
    ;(async () => {
      paso.preparar?.()
      await esperarMs(160)
      if (!vigente()) return
      const objetivo = cajaDe(paso)
      const enLienzoOPanel = objetivo?.closest('.orve-frame') || objetivo?.closest('[data-tutorial="panel-izq"]')
      objetivo?.scrollIntoView({ block: enLienzoOPanel ? 'center' : 'nearest', inline: 'nearest', behavior: 'smooth' })
      await esperarMs(450)
      if (!vigente()) return
      medir()
      await util.mover(cajaDe(paso))
      if (!vigente()) return
      if (paso.accion && !paso.soloSenalar) {
        // Los arrastres hacen su propio clic (al tomar y al soltar).
        if (!paso.arrastre) util.clic()
        await esperarMs(160)
        // Si en esos 160 ms se salio del tutorial, la landing ya se restauro: la accion no corre.
        if (!vigente() || !foto) return
        await paso.accion(util)
        await esperarMs(250)
        if (!vigente()) return
        if (paso.mostrar) { setVelo(false); extra.current = null; setCaja(null) }
        else medir()
      }
      setListo(true)
    })()
  }, [tour, i, paso, medir])

  // Avance automatico: tiempo para leer segun lo largo del texto.
  useEffect(() => {
    if (!tour || !auto || !listo || !paso) return
    const id = window.setTimeout(() => (i < pasos.length - 1 ? setI(i + 1) : terminar()), 1800 + paso.texto.length * 38)
    return () => window.clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tour, auto, listo, i])

  const empezar = (tr: (typeof TOURS)[number]) => {
    tomarFoto()
    setArriba(enCelular())
    setElegirAbierto(false)
    setCursor({ x: window.innerWidth / 2, y: window.innerHeight * 0.6 })
    setCaja(null)
    setI(0)
    setAuto(true)
    setTour(tr)
  }
  const terminar = useCallback(() => {
    turno.current++
    setTour(null)
    setCaja(null)
    setCursor(null)
    setCarga(null)
    // Todo regresa a como estaba antes del tutorial: nada se guardo.
    window.setTimeout(() => {
      regresarTodo()
      st().showToast('success', 'Tutorial terminado: tu landing quedó tal como estaba.')
    }, 50)
  }, [])

  // Durante el tutorial el teclado es solo del tutorial: los atajos del editor (borrar, deshacer,
  // herramientas) no deben tocar nada.
  useEffect(() => {
    if (!tour) return
    const tecla = (e: KeyboardEvent) => {
      e.stopPropagation()
      if (e.key === 'Escape') { e.preventDefault(); terminar() }
      else if (e.key === 'ArrowRight') { e.preventDefault(); setI((n) => Math.min(pasos.length - 1, n + 1)) }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); setI((n) => Math.max(0, n - 1)) }
      else if (e.ctrlKey || e.metaKey || e.key === 'Delete' || e.key === 'Backspace') e.preventDefault()
    }
    window.addEventListener('keydown', tecla, true)
    return () => window.removeEventListener('keydown', tecla, true)
  }, [tour, pasos.length, terminar])

  const abrirMenu = () => {
    setElegirAbierto(true)
    if (!visto) { setVisto(true); try { localStorage.setItem(VISTO, '1') } catch { /* sin almacenamiento */ } }
  }

  return (
    <>
      <button
        type="button"
        onClick={abrirMenu}
        title="Tutorial: aprende a usar el editor"
        className="ed-boton-tutorial"
        style={{
          position: 'relative', display: 'flex', alignItems: 'center', gap: 7,
          background: 'transparent', border: '1px solid var(--ed-border-2)',
          color: 'var(--ed-text)', fontFamily: 'inherit', fontSize: 13, fontWeight: 700,
          padding: '7px 12px', borderRadius: 8, cursor: 'pointer',
        }}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" /><path d="M10 8l6 4-6 4z" fill="currentColor" />
        </svg>
        <span className="ed-boton-tutorial-txt">Tutorial</span>
        {/* La primera vez, un punto verde invita a abrirlo. */}
        {!visto && (
          <m.span
            animate={{ scale: [1, 1.35, 1], opacity: [1, 0.6, 1] }}
            transition={{ duration: 1.6, repeat: Infinity }}
            style={{ position: 'absolute', top: -3, right: -3, width: 9, height: 9, borderRadius: '50%', background: '#38D030', boxShadow: '0 0 0 2px var(--ed-panel)' }}
          />
        )}
      </button>

      {createPortal(
        <>
          {/* Elegir que tutorial ver */}
          <AnimatePresence>
            {elegirAbierto && (
              <m.div
                key="elegir"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={() => setElegirAbierto(false)}
                style={{
                  position: 'fixed', inset: 0, zIndex: 9600, background: 'rgba(0,0,0,.55)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
                  fontFamily: 'Mulish, sans-serif',
                }}
              >
                <m.div
                  initial={{ opacity: 0, y: 16, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 16, scale: 0.97 }}
                  transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    width: '100%', maxWidth: 440, borderRadius: 14, padding: 20,
                    background: 'var(--ed-panel)', border: '1px solid var(--ed-border-2)',
                    boxShadow: '0 24px 60px rgba(0,0,0,.6)', color: 'var(--ed-text)',
                  }}
                >
                  <div style={{ fontSize: 18, fontWeight: 900, marginBottom: 4 }}>Tutorial de tu landing</div>
                  <p style={{ fontSize: 13, color: 'var(--ed-text-3)', margin: '0 0 14px', lineHeight: 1.5 }}>
                    Un mouse te muestra los pasos sobre este mismo editor. No se guarda nada y al
                    terminar tu landing queda tal como estaba.
                  </p>
                  <div style={{ display: 'grid', gap: 8 }}>
                    {TOURS.map((tr, k) => (
                      <button
                        key={tr.id}
                        type="button"
                        onClick={() => empezar(tr)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left',
                          padding: '10px 14px', borderRadius: 10, cursor: 'pointer', fontFamily: 'inherit',
                          border: '1px solid #38D030', color: 'var(--ed-text)',
                          background: k === 0 ? 'rgba(56,208,48,.14)' : 'transparent',
                        }}
                      >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#38D030" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                          <circle cx="12" cy="12" r="10" /><path d="M10 8l6 4-6 4z" fill="#38D030" />
                        </svg>
                        <span>
                          <span style={{ display: 'block', fontSize: 13, fontWeight: 800 }}>{tr.titulo}</span>
                          <span style={{ display: 'block', fontSize: 11, color: 'var(--ed-text-3)', marginTop: 1 }}>
                            {(tr.nota || NOTAS[tr.id])} · {tr.pasos.length} pasos · {duracion(tr.pasos.length)}
                          </span>
                        </span>
                      </button>
                    ))}
                  </div>
                  <div style={{ marginTop: 12, textAlign: 'right' }}>
                    <button type="button" onClick={() => setElegirAbierto(false)}
                      style={{ background: 'none', border: 0, color: 'var(--ed-text-3)', fontSize: 12, textDecoration: 'underline', cursor: 'pointer', fontFamily: 'inherit' }}>
                      Cerrar
                    </button>
                  </div>
                </m.div>
              </m.div>
            )}
          </AnimatePresence>

          {/* El recorrido: velo con un hueco iluminado, el mouse y el texto del paso. El velo
              tambien atrapa los clics: mientras corre no se puede guardar ni publicar. */}
          <AnimatePresence>
            {tour && (
              <m.div
                key="tutorial"
                data-tutorial-velo=""
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                style={{ position: 'fixed', inset: 0, zIndex: 9500, fontFamily: 'Mulish, sans-serif' }}
              >
                {velo && (caja ? (
                  <m.div
                    animate={{ top: caja.top, left: caja.left, width: caja.width, height: caja.height }}
                    transition={{ type: 'spring', stiffness: 260, damping: 30 }}
                    style={{ position: 'absolute', pointerEvents: 'none', borderRadius: 10, boxShadow: '0 0 0 9999px rgba(0,0,0,.7)', border: '2px solid #38D030' }}
                  />
                ) : (
                  <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'rgba(0,0,0,.7)' }} />
                ))}

                {cursor && (
                  <m.div
                    animate={{ x: cursor.x, y: cursor.y }}
                    transition={{ duration: vel, ease: [0.4, 0, 0.2, 1] }}
                    style={{ position: 'absolute', left: 0, top: 0, pointerEvents: 'none' }}
                  >
                    <m.div key={clic} initial={{ scale: 1 }} animate={{ scale: [1, 0.8, 1] }} transition={{ duration: 0.3 }}>
                      <svg width="30" height="30" viewBox="0 0 24 24" style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,.45))', display: 'block' }}>
                        <path d="M4 2.5l15.5 8.6-6.9 1.7-3.2 6.7z" fill="#fff" stroke="#111" strokeWidth="1.4" strokeLinejoin="round" />
                      </svg>
                    </m.div>
                    {clic > 0 && (
                      <m.span
                        key={'onda' + clic}
                        initial={{ scale: 0.3, opacity: 0.9 }} animate={{ scale: 1.8, opacity: 0 }}
                        transition={{ duration: 0.55, ease: 'easeOut' }}
                        style={{ position: 'absolute', left: -12, top: -12, width: 32, height: 32, borderRadius: '50%', border: '2px solid #38D030' }}
                      />
                    )}
                    {carga && (
                      <div style={{
                        position: 'absolute', left: 22, top: 20, whiteSpace: 'nowrap',
                        padding: '6px 11px', borderRadius: 8, fontSize: 12, fontWeight: 800,
                        background: 'rgba(20,28,23,.95)', border: '1.5px solid #38D030', color: '#ECEEEF',
                        boxShadow: '0 8px 24px rgba(0,0,0,.5)',
                      }}>
                        {carga}
                      </div>
                    )}
                  </m.div>
                )}

                <m.div
                  ref={tarjeta}
                  initial={{ y: arriba ? -30 : 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 340, damping: 30 }}
                  style={{
                    position: 'absolute', left: 12, right: 12, margin: '0 auto', maxWidth: 580,
                    borderRadius: 14, padding: 16, background: 'var(--ed-panel)', border: '1px solid #38D030',
                    boxShadow: '0 20px 50px rgba(0,0,0,.55)', color: 'var(--ed-text)',
                    ...(arriba ? { top: 10 } : { bottom: 18 }),
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 6 }}>
                    <span style={{ fontSize: 11, fontWeight: 900, letterSpacing: '.06em', textTransform: 'uppercase', color: '#38D030' }}>
                      {paso?.grupo} · paso {i + 1} de {pasos.length}
                    </span>
                    <button type="button" onClick={terminar} aria-label="Salir del tutorial"
                      style={{ background: 'none', border: 0, color: 'var(--ed-text-3)', cursor: 'pointer', fontSize: 16, lineHeight: 1, padding: 2 }}>
                      ✕
                    </button>
                  </div>
                  <div style={{ height: 4, borderRadius: 4, background: 'var(--ed-border)', overflow: 'hidden', marginBottom: 10 }}>
                    <m.div animate={{ width: `${((i + 1) / Math.max(1, pasos.length)) * 100}%` }} style={{ height: '100%', background: '#38D030', borderRadius: 4 }} />
                  </div>
                  <AnimatePresence mode="wait">
                    <m.p
                      key={(tour?.id ?? '') + i}
                      initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.18 }}
                      style={{ margin: 0, minHeight: 44, fontSize: 14, lineHeight: 1.55 }}
                    >
                      {paso?.texto}
                    </m.p>
                  </AnimatePresence>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                    <button type="button" onClick={() => setAuto((v) => !v)}
                      style={{ background: 'none', border: 0, color: 'var(--ed-text-3)', cursor: 'pointer', fontSize: 12, fontWeight: 700, fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6 }}>
                      {auto ? '❚❚ Pausar' : '▶ Reproducir'}
                    </button>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <BotonTarjeta disabled={i === 0} onClick={() => setI(i - 1)}>Anterior</BotonTarjeta>
                      {i < pasos.length - 1
                        ? <BotonTarjeta principal onClick={() => setI(i + 1)}>Siguiente</BotonTarjeta>
                        : <BotonTarjeta principal onClick={terminar}>Terminar</BotonTarjeta>}
                    </div>
                  </div>
                </m.div>
              </m.div>
            )}
          </AnimatePresence>
        </>,
        document.body,
      )}
    </>
  )
}

function BotonTarjeta({ children, onClick, principal, disabled }: { children: React.ReactNode; onClick: () => void; principal?: boolean; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 800, fontFamily: 'inherit',
        cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.45 : 1,
        background: principal ? '#38D030' : 'transparent',
        color: principal ? '#063800' : 'var(--ed-text)',
        border: principal ? '1px solid #38D030' : '1px solid var(--ed-border-2)',
      }}
    >
      {children}
    </button>
  )
}
