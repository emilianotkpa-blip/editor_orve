import { compressImage, resolveSrc } from './images'
import { apiUploadImage } from '../api/webhooks'
import type { LandingConfig } from '../types/landing'

/**
 * Imagenes incrustadas en el HTML del asesor (data:image/png;base64,…). Las IAs las meten asi cuando
 * se les pide "todo en un solo archivo": el 19-oct un HTML de 18 KB de codigo pesaba 12 MB por 4 PNG y
 * no se podia guardar. Se suben al mismo almacenamiento que las fotos del editor (comprimidas a WebP)
 * y en el HTML queda su enlace publico.
 */

/** Tope de NocoDB para la configuracion completa de una landing (NC_MAX_TEXT_LENGTH, por defecto 100000). */
export const LIMITE_CONFIG = 100000

const RE_INCRUSTADA = /data:(image\/(?:png|jpe?g|webp));base64,([A-Za-z0-9+/=]+)/g
/** Los iconos chiquitos se quedan dentro: no estorban y ahorran peticiones. */
const MIN_BASE64 = 20 * 1024

type Incrustada = { uri: string; mime: string; base64: string }

function incrustadas(html: string): Incrustada[] {
  const vistas = new Set<string>()
  const lista: Incrustada[] = []
  for (const m of html.matchAll(RE_INCRUSTADA)) {
    if (m[2].length < MIN_BASE64 || vistas.has(m[0])) continue
    vistas.add(m[0])
    lista.push({ uri: m[0], mime: m[1] === 'image/jpg' ? 'image/jpeg' : m[1], base64: m[2] })
  }
  return lista
}

export function contarIncrustadas(html: string): { cuantas: number; bytes: number } {
  const l = incrustadas(html)
  return { cuantas: l.length, bytes: l.reduce((s, x) => s + x.base64.length, 0) }
}

export function kb(n: number): string {
  return n >= 1024 * 1024 ? (n / (1024 * 1024)).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB'
}

/**
 * Sube las imagenes incrustadas y devuelve {uri -> enlace}. No toca el HTML: quien llama aplica los
 * reemplazos sobre el texto MAS RECIENTE (el asesor pudo seguir escribiendo mientras subia).
 */
export async function subirIncrustadas(
  html: string,
  cuenta: { email: string; slug: string },
  avance?: (hechas: number, total: number) => void,
): Promise<{ reemplazos: Map<string, string>; fallidas: number }> {
  const lista = incrustadas(html)
  const reemplazos = new Map<string, string>()
  let fallidas = 0
  for (let i = 0; i < lista.length; i++) {
    avance?.(i, lista.length)
    const x = lista[i]
    try {
      const bin = atob(x.base64)
      const bytes = new Uint8Array(bin.length)
      for (let k = 0; k < bin.length; k++) bytes[k] = bin.charCodeAt(k)
      const ext = x.mime.split('/')[1].replace('jpeg', 'jpg')
      const archivo = new File([bytes], `html-imagen-${i + 1}.${ext}`, { type: x.mime })
      const c = await compressImage(archivo, 1920, 0.85)
      const res = await apiUploadImage({ email: cuenta.email, slug: cuenta.slug, filename: c.filename, mime: c.mime, data: c.base64 })
      if (res.ok && res.path) reemplazos.set(x.uri, resolveSrc(res.path))
      else fallidas++
    } catch {
      fallidas++
    }
  }
  avance?.(lista.length, lista.length)
  return { reemplazos, fallidas }
}

export function aplicarReemplazos(html: string, reemplazos: Map<string, string>): string {
  let s = html
  reemplazos.forEach((url, uri) => { s = s.split(uri).join(url) })
  return s
}

/** Red de seguridad al guardar: sube lo que siga incrustado en cualquier HTML de la landing. */
export async function sacarIncrustadasDeConfig(
  config: LandingConfig,
  cuenta: { email: string; slug: string },
): Promise<{ config: LandingConfig; subidas: number; fallidas: number }> {
  let subidas = 0, fallidas = 0
  const limpiar = async (html: string | undefined) => {
    if (!html || !contarIncrustadas(html).cuantas) return html
    const r = await subirIncrustadas(html, cuenta)
    subidas += r.reemplazos.size
    fallidas += r.fallidas
    return aplicarReemplazos(html, r.reemplazos)
  }
  const html = await limpiar(config.html)
  const secciones = []
  for (const s of config.secciones) {
    const elementos = []
    for (const el of s.elementos) {
      if (el.tipo === 'html' && typeof el.contenido.html === 'string') {
        const h = await limpiar(el.contenido.html as string)
        elementos.push(h === el.contenido.html ? el : { ...el, contenido: { ...el.contenido, html: h as string } })
      } else elementos.push(el)
    }
    const sh = await limpiar(s.html)
    secciones.push(sh === s.html && elementos.every((e, i) => e === s.elementos[i]) ? s : { ...s, html: sh, elementos })
  }
  const cambio = html !== config.html || secciones.some((s, i) => s !== config.secciones[i])
  return { config: cambio ? { ...config, html, secciones } : config, subidas, fallidas }
}

// ── HTML grande como archivo en el almacenamiento ───────────────────────────
/**
 * El HTML que pasa de UMBRAL_HTML caracteres (pagina completa, seccion o bloque) no viaja dentro de
 * la configuracion: se sube como archivo de texto al mismo almacenamiento de las fotos y la
 * configuracion guarda solo `htmlRef` = "ruta#huella". Asi la configuracion queda chica (NocoDB topa
 * en 100,000 caracteres) y el HTML puede pesar hasta LIMITE_HTML_BYTES.
 * La huella evita volver a subir lo que no cambio. Las rutas son unicas por version, asi que el cache
 * de un año del almacenamiento nunca sirve una version vieja.
 */
export const UMBRAL_HTML = 20000
/** Tope por archivo del bucket 'landings' y del flujo de subida. */
export const LIMITE_HTML_BYTES = 10 * 1024 * 1024

export const bytesUtf8 = (t: string) => new TextEncoder().encode(t).length

async function huella(t: string): Promise<string> {
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(t))
  return Array.from(new Uint8Array(d)).slice(0, 8).map((b) => b.toString(16).padStart(2, '0')).join('')
}

function base64Utf8(t: string): string {
  const bytes = new TextEncoder().encode(t)
  let bin = ''
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(bin)
}

const rutaDe = (ref?: string) => (ref || '').split('#')[0]
const huellaDe = (ref?: string) => (ref || '').split('#')[1] || ''

/**
 * Prepara lo que se manda a guardar. Devuelve `local` (lo que queda en el editor: el HTML completo y su
 * ref al dia) y `enviar` (sin el HTML grande, solo su ref).
 */
export async function separarHtmlGrande(
  config: LandingConfig,
  cuenta: { email: string; slug: string },
): Promise<{ local: LandingConfig; enviar: LandingConfig } | { error: string }> {
  // Una parte: devuelve [ref para el editor, html que viaja, ref que viaja].
  const parte = async (html: string | undefined, ref: string | undefined): Promise<[string | undefined, string | undefined, string | undefined]> => {
    const h = html || ''
    // Sin HTML pero con ref: no se pudo leer al abrir; se conserva tal cual (no se borra nada).
    if (!h && ref) return [ref, undefined, ref]
    if (h.length <= UMBRAL_HTML) return [undefined, html, undefined]
    if (bytesUtf8(h) > LIMITE_HTML_BYTES) throw new Error(`Tu HTML pesa ${kb(bytesUtf8(h))} y el máximo por página o sección es ${kb(LIMITE_HTML_BYTES)}.`)
    const hu = await huella(h)
    if (ref && huellaDe(ref) === hu) return [ref, undefined, ref]
    const res = await apiUploadImage({ email: cuenta.email, slug: cuenta.slug, filename: 'pagina.txt', mime: 'text/plain', data: base64Utf8(h) })
    if (!res.ok || !res.path) throw new Error(res.error || 'No se pudo guardar el HTML en el almacenamiento. Intenta de nuevo.')
    const nuevo = res.path + '#' + hu
    return [nuevo, undefined, nuevo]
  }
  try {
    const [refP, htmlP, refPE] = await parte(config.html, config.htmlRef)
    const local: LandingConfig = { ...config, htmlRef: refP, secciones: [] }
    const enviar: LandingConfig = { ...config, html: htmlP, htmlRef: refPE, secciones: [] }
    for (const s of config.secciones) {
      const [refS, htmlS, refSE] = await parte(s.html, s.htmlRef)
      const elsL = [], elsE = []
      for (const el of s.elementos) {
        if (el.tipo !== 'html') { elsL.push(el); elsE.push(el); continue }
        const [refE, htmlE, refEE] = await parte(el.contenido.html as string | undefined, (el.contenido.htmlRef as string) || undefined)
        elsL.push({ ...el, contenido: { ...el.contenido, htmlRef: refE ?? '' } })
        elsE.push({ ...el, contenido: { ...el.contenido, html: htmlE ?? '', htmlRef: refEE ?? '' } })
      }
      local.secciones.push({ ...s, htmlRef: refS, elementos: elsL })
      enviar.secciones.push({ ...s, html: htmlS, htmlRef: refSE, elementos: elsE })
    }
    return { local, enviar }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'No se pudo guardar el HTML.' }
  }
}

/** Al abrir (editor o pagina publica): trae del almacenamiento el HTML que se guardo como archivo. */
export async function hidratarHtml(config: LandingConfig): Promise<LandingConfig> {
  const traer = async (html: string | undefined, ref: string | undefined) => {
    if ((html && html.length) || !ref) return html
    try {
      const r = await fetch(resolveSrc(rutaDe(ref)))
      return r.ok ? await r.text() : html
    } catch {
      return html
    }
  }
  const tiene = config.htmlRef || config.secciones.some((s) => s.htmlRef || s.elementos.some((e) => e.tipo === 'html' && e.contenido.htmlRef))
  if (!tiene) return config
  const html = await traer(config.html, config.htmlRef)
  const secciones = await Promise.all(config.secciones.map(async (s) => ({
    ...s,
    html: await traer(s.html, s.htmlRef),
    elementos: await Promise.all(s.elementos.map(async (e) => (e.tipo === 'html' && e.contenido.htmlRef
      ? { ...e, contenido: { ...e.contenido, html: (await traer(e.contenido.html as string, e.contenido.htmlRef as string)) ?? '' } }
      : e))),
  })))
  return { ...config, html, secciones }
}
