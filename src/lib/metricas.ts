/**
 * Medición de las landings públicas.
 *
 * Hasta ahora se sabía quién había creado su página, pero no si alguien la veía. Esto
 * manda una línea por interacción al webhook `dvd-landing-evento`, que resuelve el
 * dueño a partir del slug y la guarda en NocoDB (tabla LandingEventos).
 *
 * Reglas que se respetan aquí:
 *  - No se manda NADA del visitante: ni nombre, ni correo, ni IP (esa no la vemos).
 *    La `sesion` es un identificador al azar que vive en la pestaña y sirve para no
 *    contar diez veces a la misma persona; se pierde al cerrarla.
 *  - Nunca bloquea la página: `keepalive` y el error se traga en silencio.
 *  - En el editor no hay slug, así que no se registra nada de las pruebas del asesor.
 */

const BASE = 'https://diamante-de-las-ventas-n8n.l2uxzq.easypanel.host/webhook'
const KEY = 'orve-dvd-2026-xK9m'

export type EventoLanding = 'visita' | 'video' | 'clic' | 'material' | 'contacto' | 'lead'

function almacen(): Storage | null {
  try { return window.sessionStorage } catch { return null }
}

/** Identificador anónimo por pestaña. Cuenta visitantes, no personas. */
function sesion(): string {
  const st = almacen()
  try {
    const ya = st?.getItem('dvd_sesion')
    if (ya) return ya
    const nuevo = Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4)
    st?.setItem('dvd_sesion', nuevo)
    return nuevo
  } catch {
    return 'sin-sesion'
  }
}

function dispositivo(): string {
  if (typeof window === 'undefined') return '—'
  return window.innerWidth < 760 ? 'movil' : 'escritorio'
}

export function registrar(slug: string | null, evento: EventoLanding, detalle = '') {
  if (!slug) return                      // editor / preview: no se mide
  try {
    void fetch(`${BASE}/dvd-landing-evento`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': KEY },
      keepalive: true,
      body: JSON.stringify({
        slug,
        evento,
        detalle: detalle.slice(0, 120),
        sesion: sesion(),
        // de dónde vino: sirve para saber si la comparten por WhatsApp, Instagram…
        referer: (document.referrer || '').slice(0, 200),
        dispositivo: dispositivo(),
      }),
    }).catch(() => {})
  } catch {
    /* medir nunca puede romper la landing */
  }
}

/** Una visita por pestaña y slug: recargar no infla el número. */
export function registrarVisita(slug: string | null) {
  if (!slug) return
  const clave = `dvd_visita_${slug}`
  const st = almacen()
  try {
    if (st?.getItem(clave)) return
    st?.setItem(clave, '1')
  } catch {
    /* sin almacenamiento se registra igual; peor es no medir */
  }
  registrar(slug, 'visita')
}

/** Igual, pero para cosas que solo tiene sentido contar una vez (un video, p. ej.). */
export function registrarUnaVez(slug: string | null, evento: EventoLanding, detalle = '') {
  if (!slug) return
  const clave = `dvd_${evento}_${slug}_${detalle}`
  const st = almacen()
  try {
    if (st?.getItem(clave)) return
    st?.setItem(clave, '1')
  } catch { /* se registra igual */ }
  registrar(slug, evento, detalle)
}
