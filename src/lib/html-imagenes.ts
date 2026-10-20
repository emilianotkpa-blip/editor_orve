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
