// Catálogo de bloques pre-armados — «Constructor Drag & Drop», lámina 2.
//
// El editor es de LIENZO LIBRE: no hay stack de secciones que se empujen. Por
// eso un bloque aquí NO es una sección, es un GRUPO DE ELEMENTOS con posición
// relativa entre sí. Al soltarlo se insertan todos de golpe en la sección
// donde cayó, conservando su composición. El asesor luego los mueve como
// quiera, porque siguen siendo elementos normales del lienzo.
//
// Solo se arman bloques con los tipos que el editor ya sabe renderizar
// (texto, imagen, boton, bloque, galeria, proyectos, formulario, logo). Lo que
// el mockup pide y todavía no existe como tipo — video de YouTube, mapa, FAQ
// acordeón, carrusel, agendar cita — no está aquí: necesita elemento nuevo,
// no un preset.
import type { ContentValue, ElementoTipo, LandingElemento } from '../types/landing'
import { MARCA } from '../components/shared/Brand'

export type CategoriaBloque = 'seccion' | 'captacion' | 'contenido' | 'confianza'

export const CATEGORIAS: { id: CategoriaBloque; label: string; nota: string }[] = [
  { id: 'seccion',   label: 'Secciones listas',   nota: 'Se sueltan completas y solo se personalizan.' },
  { id: 'captacion', label: 'Captación',          nota: 'Convierten la visita en contacto.' },
  { id: 'contenido', label: 'Contenido',          nota: 'Dan cuerpo a la página.' },
  { id: 'confianza', label: 'Prueba social',      nota: 'Refuerzan la credibilidad del asesor.' },
]

/** Una pieza del bloque. La geometría es relativa a la esquina del bloque. */
export interface PiezaBloque {
  tipo: ElementoTipo
  x: number; y: number; w: number; h: number
  contenido: Record<string, ContentValue>
  estilo: LandingElemento['estilo']
}

export interface Bloque {
  id: string
  nombre: string
  categoria: CategoriaBloque
  /** Caja total — sirve para acotar el drop y para dibujar la miniatura. */
  w: number
  h: number
  piezas: PiezaBloque[]
}

// ── helpers de composición ─────────────────────────────────────────────────

const FONDO_TARJETA = '#141C17'

function txt(
  x: number, y: number, w: number, h: number,
  texto: string,
  estilo: LandingElemento['estilo'],
  tag: string = 'p',
): PiezaBloque {
  return { tipo: 'texto', x, y, w, h, contenido: { texto, tag }, estilo }
}

function caja(
  x: number, y: number, w: number, h: number,
  bgColor: string, radio = 14,
): PiezaBloque {
  return { tipo: 'bloque', x, y, w, h, contenido: {}, estilo: { bgColor, radio, opacidad: 1 } }
}

// Tarjeta de servicio: fondo + ícono + título + descripción.
function tarjetaServicio(x: number, icono: string, titulo: string, desc: string): PiezaBloque[] {
  return [
    caja(x, 0, 260, 250, FONDO_TARJETA),
    txt(x + 24, 22, 52, 52, icono, { fontSize: 34, textAlign: 'left' }),
    txt(x + 24, 88, 212, 30, titulo, { fontSize: 18, fontWeight: '800', color: MARCA.blanco }, 'h3'),
    txt(x + 24, 124, 212, 96, desc, { fontSize: 13, fontWeight: '500', color: '#9AA0A6' }),
  ]
}

// Columna de métrica: número grande + etiqueta.
function metrica(x: number, valor: string, label: string): PiezaBloque[] {
  return [
    txt(x, 34, 200, 48, valor, { fontSize: 34, fontWeight: '900', color: MARCA.verde, textAlign: 'center' }),
    txt(x, 88, 200, 26, label, { fontSize: 13, fontWeight: '600', color: '#9AA0A6', textAlign: 'center' }),
  ]
}

// Testimonio: fondo + estrellas + cita + autor.
function testimonio(x: number, cita: string, autor: string): PiezaBloque[] {
  return [
    caja(x, 0, 400, 210, FONDO_TARJETA),
    txt(x + 24, 22, 160, 28, '★★★★★', { fontSize: 18, color: MARCA.verde }),
    txt(x + 24, 58, 352, 90, cita, { fontSize: 14, fontWeight: '500', color: '#C9CED0' }),
    txt(x + 24, 156, 352, 28, autor, { fontSize: 13, fontWeight: '800', color: MARCA.verde }),
  ]
}

// ── catálogo ───────────────────────────────────────────────────────────────

export const BLOQUES: Bloque[] = [
  // ── Secciones listas ──
  {
    id: 'hero', nombre: 'Portada / Hero', categoria: 'seccion', w: 780, h: 420,
    piezas: [
      { tipo: 'imagen', x: 420, y: 0, w: 360, h: 420,
        contenido: { src: '', label: 'Tu foto', alt: '' },
        estilo: { radio: 18, opacidad: 1, ajuste: 'cover' } },
      txt(0, 84, 380, 56, 'Tu Nombre', { fontSize: 40, fontWeight: '800', color: MARCA.blanco }, 'h1'),
      txt(0, 148, 380, 28, 'Asesor Inmobiliario · ORVE', { fontSize: 16, fontWeight: '700', color: MARCA.verde }),
      txt(0, 190, 370, 64, 'Te ayudo a comprar, vender o invertir con estrategia y seguridad.',
        { fontSize: 15, fontWeight: '500', color: '#9AA0A6' }),
      { tipo: 'boton', x: 0, y: 276, w: 232, h: 48,
        contenido: { texto: 'Agenda tu asesoría gratis', accion: 'whatsapp', href: '', telefono: '', mensaje: 'Hola, quiero una asesoría.', email: '', seccionId: '' },
        estilo: { fontSize: 14, fontWeight: '700', color: '#063800', bgColor: MARCA.verde, radio: 8 } },
    ],
  },
  {
    id: 'sobre-mi', nombre: 'Sobre mí', categoria: 'seccion', w: 800, h: 320,
    piezas: [
      { tipo: 'imagen', x: 0, y: 0, w: 300, h: 320,
        contenido: { src: '', label: 'Foto', alt: '' },
        estilo: { radio: 16, opacidad: 1, ajuste: 'cover' } },
      txt(340, 24, 460, 42, 'Sobre mí', { fontSize: 28, fontWeight: '800', color: MARCA.blanco }, 'h2'),
      txt(340, 80, 460, 200,
        'Cuenta aquí tu trayectoria: cuántos años llevas en el sector, en qué zonas te especializas y qué te distingue como asesor.',
        { fontSize: 15, fontWeight: '500', color: '#9AA0A6' }),
    ],
  },
  {
    id: 'servicios', nombre: 'Servicios (3 tarjetas)', categoria: 'seccion', w: 820, h: 250,
    piezas: [
      ...tarjetaServicio(0,   '🏡', 'Compra tu hogar',    'Búsqueda, visitas y cierre a tu medida.'),
      ...tarjetaServicio(280, '💼', 'Vende al mejor precio', 'Precio correcto y promoción en portales.'),
      ...tarjetaServicio(560, '📈', 'Invierte',           'Oportunidades con plusvalía y retorno.'),
    ],
  },
  {
    id: 'metricas', nombre: 'Métricas', categoria: 'seccion', w: 820, h: 150,
    piezas: [
      caja(0, 0, 820, 150, '#101A12'),
      ...metrica(10,  '+120', 'Clientes'),
      ...metrica(215, '10',   'Años'),
      ...metrica(410, '98%',  'Satisfacción'),
      ...metrica(610, '24h',  'Respuesta'),
    ],
  },
  {
    id: 'cta', nombre: 'Llamado a la acción', categoria: 'seccion', w: 760, h: 190,
    piezas: [
      caja(0, 0, 760, 190, '#0F2A12', 16),
      txt(40, 44, 460, 40, '¿Listo para dar el paso?', { fontSize: 26, fontWeight: '800', color: MARCA.blanco }, 'h2'),
      txt(40, 92, 460, 52, 'Agenda una llamada sin costo y armamos tu plan.',
        { fontSize: 14, fontWeight: '500', color: '#9AA0A6' }),
      { tipo: 'boton', x: 552, y: 70, w: 176, h: 48,
        contenido: { texto: 'Hablemos', accion: 'whatsapp', href: '', telefono: '', mensaje: '', email: '', seccionId: '' },
        estilo: { fontSize: 14, fontWeight: '700', color: '#063800', bgColor: MARCA.verde, radio: 8 } },
    ],
  },
  {
    id: 'footer', nombre: 'Pie de página', categoria: 'seccion', w: 860, h: 160,
    piezas: [
      caja(0, 0, 860, 160, '#0A0A0A', 0),
      { tipo: 'logo', x: 40, y: 42, w: 200, h: 80,
        contenido: { variante: 'lockup', tinta: 'blanco' }, estilo: { opacidad: 1 } },
      txt(300, 52, 300, 28, 'Grupo ORVE · Inversión Inmobiliaria',
        { fontSize: 14, fontWeight: '700', color: '#9AA0A6' }),
      txt(300, 84, 300, 26, 'Todos los derechos reservados.',
        { fontSize: 12, fontWeight: '500', color: '#636363' }),
    ],
  },

  // ── Captación ──
  {
    id: 'formulario', nombre: 'Formulario de contacto', categoria: 'captacion', w: 360, h: 360,
    piezas: [
      { tipo: 'formulario', x: 0, y: 0, w: 360, h: 360,
        contenido: {
          titulo: 'Contáctame', boton: 'Enviar',
          campos: [
            { id: 'c_nombre',   label: 'Nombre',   tipo: 'texto',    requerido: true },
            { id: 'c_email',    label: 'Email',    tipo: 'email',    requerido: true },
            { id: 'c_telefono', label: 'Teléfono', tipo: 'telefono', requerido: false },
            { id: 'c_mensaje',  label: 'Mensaje',  tipo: 'textarea', requerido: false },
          ],
        },
        estilo: { radio: 14, bgColor: 'rgba(20,28,22,0.92)', color: MARCA.blanco, fontSize: 14 } },
    ],
  },
  {
    id: 'whatsapp', nombre: 'Botón WhatsApp', categoria: 'captacion', w: 240, h: 48,
    piezas: [
      { tipo: 'boton', x: 0, y: 0, w: 240, h: 48,
        contenido: { texto: 'Escríbeme por WhatsApp', accion: 'whatsapp', href: '', telefono: '', mensaje: 'Hola, vi tu página.', email: '', seccionId: '' },
        estilo: { fontSize: 14, fontWeight: '700', color: '#04310F', bgColor: '#25D366', radio: 999 } },
    ],
  },
  {
    id: 'llamar', nombre: 'Botón llamar', categoria: 'captacion', w: 200, h: 48,
    piezas: [
      { tipo: 'boton', x: 0, y: 0, w: 200, h: 48,
        contenido: { texto: 'Llámame', accion: 'url', href: 'tel:', telefono: '', mensaje: '', email: '', seccionId: '' },
        estilo: { fontSize: 14, fontWeight: '700', color: MARCA.blanco, bgColor: MARCA.verdeOscuro, radio: 8 } },
    ],
  },
  {
    id: 'contacto-directo', nombre: 'Contacto directo', categoria: 'captacion', w: 560, h: 130,
    piezas: [
      caja(0, 0, 560, 130, FONDO_TARJETA),
      txt(24, 22, 300, 28, '¿Hablamos hoy?', { fontSize: 18, fontWeight: '800', color: MARCA.blanco }, 'h3'),
      { tipo: 'boton', x: 24, y: 62, w: 180, h: 44,
        contenido: { texto: 'WhatsApp', accion: 'whatsapp', href: '', telefono: '', mensaje: '', email: '', seccionId: '' },
        estilo: { fontSize: 13, fontWeight: '700', color: '#04310F', bgColor: '#25D366', radio: 8 } },
      { tipo: 'boton', x: 216, y: 62, w: 180, h: 44,
        contenido: { texto: 'Enviar correo', accion: 'email', href: '', telefono: '', mensaje: '', email: '', seccionId: '' },
        estilo: { fontSize: 13, fontWeight: '700', color: MARCA.blanco, bgColor: '#282828', radio: 8 } },
    ],
  },

  // ── Contenido ──
  {
    id: 'galeria', nombre: 'Galería de fotos', categoria: 'contenido', w: 580, h: 300,
    piezas: [
      { tipo: 'galeria', x: 0, y: 0, w: 580, h: 300,
        contenido: { columnas: 3, gap: 8, imagenes: [] },
        estilo: { radio: 10, opacidad: 1 } },
    ],
  },
  {
    id: 'proyectos', nombre: 'Propiedades destacadas', categoria: 'contenido', w: 760, h: 348,
    piezas: [
      { tipo: 'proyectos', x: 0, y: 0, w: 760, h: 348,
        contenido: {
          cards: [
            { id: 'p1', imagen: '', badge: 'EN VENTA',    badgeColor: MARCA.verde, nombre: 'Residencial Norte', ubicacion: 'Monterrey, N.L.' },
            { id: 'p2', imagen: '', badge: 'EN PREVENTA', badgeColor: '#C99A3A',   nombre: 'Torre Centro',      ubicacion: 'Guadalajara, Jal.' },
            { id: 'p3', imagen: '', badge: 'VENDIDO',     badgeColor: '#7C8388',   nombre: 'Villas del Sol',    ubicacion: 'CDMX' },
          ],
          animar: true, direccion: 'izquierda', duracion: 30,
          cardAncho: 240, cardAlto: 280, gap: 16,
        },
        estilo: {
          radio: 14, opacidad: 1,
          sombra: { activa: true, x: 0, y: 10, blur: 24, spread: 0, color: 'rgba(0,0,0,0.35)' },
        } },
    ],
  },
  {
    id: 'titulo-seccion', nombre: 'Título de sección', categoria: 'contenido', w: 560, h: 90,
    piezas: [
      txt(0, 0, 560, 44, 'Título de la sección', { fontSize: 30, fontWeight: '800', color: MARCA.blanco }, 'h2'),
      txt(0, 52, 560, 32, 'Una línea que explique de qué va esto.',
        { fontSize: 15, fontWeight: '500', color: '#9AA0A6' }),
    ],
  },
  {
    id: 'separador', nombre: 'Separador', categoria: 'contenido', w: 760, h: 2,
    piezas: [caja(0, 0, 760, 2, '#282828', 2)],
  },

  // ── Prueba social ──
  {
    id: 'testimonios', nombre: 'Testimonios', categoria: 'confianza', w: 820, h: 210,
    piezas: [
      ...testimonio(0, '«Me acompañó en todo el proceso y cerramos en menos de un mes.»', 'María G. · Compradora'),
      ...testimonio(420, '«Vendió mi casa por encima de lo que esperaba. Muy recomendable.»', 'Jorge R. · Vendedor'),
    ],
  },
  {
    id: 'sello-orve', nombre: 'Sello Verificado ORVE', categoria: 'confianza', w: 300, h: 120,
    piezas: [
      caja(0, 0, 300, 120, FONDO_TARJETA, 12),
      { tipo: 'logo', x: 20, y: 22, w: 76, h: 76,
        contenido: { variante: 'sello', tinta: 'color' }, estilo: { opacidad: 1 } },
      txt(112, 34, 170, 26, 'Asesor verificado', { fontSize: 14, fontWeight: '800', color: MARCA.blanco }),
      txt(112, 62, 170, 40, 'Acreditado por Grupo ORVE', { fontSize: 12, fontWeight: '500', color: '#9AA0A6' }),
    ],
  },
  {
    id: 'logos-aliados', nombre: 'Logos aliados', categoria: 'confianza', w: 620, h: 120,
    piezas: [
      { tipo: 'galeria', x: 0, y: 0, w: 620, h: 120,
        contenido: { columnas: 4, gap: 12, imagenes: [] },
        estilo: { radio: 8, opacidad: 1 } },
    ],
  },
]

export function bloquesPorCategoria(cat: CategoriaBloque): Bloque[] {
  return BLOQUES.filter((b) => b.categoria === cat)
}

export function getBloque(id: string): Bloque | undefined {
  return BLOQUES.find((b) => b.id === id)
}
