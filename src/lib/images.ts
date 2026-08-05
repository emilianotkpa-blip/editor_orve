// ── Image upload constraints, compression & URL helpers ─────────────────────

export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const
// originals can be larger because we compress before upload
export const MAX_IMAGE_BYTES = 12 * 1024 * 1024
export const ALLOWED_LABEL = 'JPG, PNG o WEBP · se optimiza al subir'

// Stable, cacheable public base for landing images (public bucket).
// This is a public endpoint, not a secret.
export const STORAGE_PUBLIC_BASE =
  'https://bonos-supabase.be197l.easypanel.host/storage/v1/object/public/landings'

export interface FileValidation {
  ok: boolean
  error?: string
}

export function validateImageFile(file: File): FileValidation {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type as (typeof ALLOWED_IMAGE_TYPES)[number])) {
    return { ok: false, error: 'Formato no válido. Usa JPG, PNG o WEBP.' }
  }
  if (file.size > MAX_IMAGE_BYTES) {
    const mb = (file.size / (1024 * 1024)).toFixed(1)
    return { ok: false, error: `La imagen pesa ${mb} MB. El máximo es 12 MB.` }
  }
  return { ok: true }
}

// ── HEIC/HEIF (fotos de iPhone) ─────────────────────────────────────────────
// Los navegadores (salvo Safari) no decodifican HEIC, así que la foto del
// iPhone se rechazaba. La convertimos a JPEG en el navegador ANTES de validar.
const HEIC_RE = /\.(heic|heif)$/i
export function esHeic(file: File): boolean {
  const t = (file.type || '').toLowerCase()
  return t === 'image/heic' || t === 'image/heif' || HEIC_RE.test(file.name || '')
}

export async function convertirSiHeic(file: File): Promise<File> {
  if (!esHeic(file)) return file
  // Import dinámico: la librería solo se carga cuando de verdad hay un HEIC.
  const heic2any = (await import('heic2any')).default
  const out = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.9 })
  const blob = (Array.isArray(out) ? out[0] : out) as Blob
  const base = (file.name || 'foto').replace(/\.[^.]+$/, '') || 'foto'
  return new File([blob], `${base}.jpg`, { type: 'image/jpeg' })
}

// Read a File/Blob as raw base64 (no data: prefix) for JSON transport.
export function fileToBase64(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      const comma = result.indexOf(',')
      resolve(comma >= 0 ? result.slice(comma + 1) : result)
    }
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

function loadImageEl(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('No se pudo leer la imagen'))
    img.src = dataUrl
  })
}

export interface CompressedImage {
  base64: string
  mime: string
  filename: string
}

// Resize (cap width) + re-encode to WebP so uploads/downloads stay light.
// Falls back to JPEG if the browser can't encode WebP.
export async function compressImage(file: File, maxW = 1600, quality = 0.82): Promise<CompressedImage> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(r.result as string)
    r.onerror = () => reject(r.error)
    r.readAsDataURL(file)
  })
  const img = await loadImageEl(dataUrl)

  let width = img.naturalWidth || img.width
  let height = img.naturalHeight || img.height
  if (width > maxW) {
    height = Math.round((height * maxW) / width)
    width = maxW
  }

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    // canvas unsupported → upload original
    return { base64: await fileToBase64(file), mime: file.type, filename: file.name }
  }
  ctx.drawImage(img, 0, 0, width, height)

  let blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/webp', quality))
  let mime = 'image/webp'
  let ext = 'webp'
  if (!blob) {
    blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/jpeg', quality))
    mime = 'image/jpeg'
    ext = 'jpg'
  }
  if (!blob) return { base64: await fileToBase64(file), mime: file.type, filename: file.name }

  const base = (file.name.replace(/\.[^.]+$/, '') || 'img').replace(/[^a-zA-Z0-9_-]+/g, '-')
  return { base64: await fileToBase64(blob), mime, filename: `${base}.${ext}` }
}

// True when the value is already directly displayable (no resolution needed).
export function isDisplayableUrl(value: string): boolean {
  return /^(https?:|blob:|data:)/.test(value)
}

// Resolve a stored value (storage path) to a STABLE public URL. The optional
// `signed` map is kept for call-site compatibility but no longer needed —
// public URLs are stable and cacheable, so the browser caches them.
export function resolveSrc(value: string | undefined, _signed: Record<string, string> = {}): string {
  if (!value) return ''
  if (isDisplayableUrl(value)) return value
  return `${STORAGE_PUBLIC_BASE}/${value.replace(/^\/+/, '')}`
}
