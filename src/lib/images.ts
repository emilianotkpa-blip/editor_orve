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
