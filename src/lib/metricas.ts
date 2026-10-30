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

// Desde el 30-oct-2026: 'visita' = bajó por la página y se quedó 10 s o más; 'clic' = entró y se fue antes;
// 'boton' = tocó un botón que no es WhatsApp ni correo (antes eso se llamaba 'clic').
export type EventoLanding = 'visita' | 'video' | 'clic' | 'boton' | 'material' | 'contacto' | 'lead'

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

/**
 * Visita o clic (ORVE, 30-oct-2026). Una VISITA es alguien que bajó por la página y se quedó 10 s
 * o más con la pestaña a la vista; un CLIC es alguien que entró y se fue antes (menos de 10 s o sin
 * bajar). Así una visita es una persona que de verdad vio la landing.
 *  - La visita se manda en cuanto se cumple, con la persona todavía ahí: no se pierde.
 *  - El clic se manda al irse sin cumplirla (pestaña oculta o cerrada). Si regresa y la cumple,
 *    cuenta también la visita.
 *  - Si la página no tiene para dónde bajar, basta con el tiempo.
 *  - Una de cada una por pestaña y slug: recargar no infla los números.
 * Devuelve la función que quita los escuchas.
 */
export function medirVisita(slug: string | null): () => void {
  if (!slug || typeof window === 'undefined') return () => {}
  const st = almacen()
  const claveVisita = `dvd_visita10_${slug}`
  const claveClic = `dvd_clic10_${slug}`
  const ya = (k: string) => { try { return !!st?.getItem(k) } catch { return false } }
  const anotar = (k: string) => { try { st?.setItem(k, '1') } catch { /* se registra igual */ } }
  if (ya(claveVisita)) return () => {}

  const MS_MINIMO = 10_000
  let visible = 0
  let desde = document.visibilityState === 'visible' ? Date.now() : 0
  let bajo = false
  let clicMandado = ya(claveClic)
  const tiempo = () => visible + (desde ? Date.now() - desde : 0)
  const hayParaBajar = () => document.documentElement.scrollHeight - window.innerHeight > 40

  const revisar = () => {
    if ((bajo || !hayParaBajar()) && tiempo() >= MS_MINIMO) {
      anotar(claveVisita)
      registrar(slug, 'visita')
      quitar()
    }
  }
  const alBajar = () => {
    if ((window.scrollY || document.documentElement.scrollTop) > 40) { bajo = true; revisar() }
  }
  const alIrse = () => {
    if (desde) { visible += Date.now() - desde; desde = 0 }
    if (!clicMandado) { clicMandado = true; anotar(claveClic); registrar(slug, 'clic') }
  }
  const alCambiarVista = () => {
    if (document.visibilityState === 'hidden') alIrse()
    else if (!desde) desde = Date.now()
  }

  const reloj = window.setInterval(revisar, 1000)
  window.addEventListener('scroll', alBajar, { passive: true })
  document.addEventListener('visibilitychange', alCambiarVista)
  window.addEventListener('pagehide', alIrse)
  function quitar() {
    window.clearInterval(reloj)
    window.removeEventListener('scroll', alBajar)
    document.removeEventListener('visibilitychange', alCambiarVista)
    window.removeEventListener('pagehide', alIrse)
  }
  return quitar
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
