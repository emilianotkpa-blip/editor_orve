import type { LandingConfig } from '../types/landing'

const BASE = 'https://bonos-n8n-agentes-ia.be197l.easypanel.host/webhook'
const KEY  = 'orve-dvd-2026-xK9m'

const headers = {
  'Content-Type': 'application/json',
  'x-api-key': KEY,
}

export async function apiLoadLanding(email: string): Promise<{ existe: boolean; config?: LandingConfig }> {
  const res = await fetch(`${BASE}/dvd-landing-obtener`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ email }),
  })
  return res.json()
}

export async function apiSaveLanding(email: string, config: LandingConfig): Promise<{ ok: boolean; accion?: string; error?: string }> {
  const res = await fetch(`${BASE}/dvd-landing-guardar`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ email, config }),
  })
  return res.json()
}

// Check whether a slug is free (not taken by a different advisor).
export async function apiCheckSlug(slug: string, email: string): Promise<{ slug: string; disponible: boolean }> {
  try {
    const res = await fetch(`${BASE}/dvd-landing-slug-check`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ slug, email }),
    })
    if (!res.ok) return { slug, disponible: false }
    return res.json()
  } catch {
    return { slug, disponible: false }
  }
}

export interface PublicLandingResponse {
  disponible: boolean
  config?: LandingConfig
  // path → signed URL; keys match contenido.src / contenido.path values
  signedUrls?: Record<string, string>
}

export async function apiPublicLanding(slug: string): Promise<PublicLandingResponse> {
  const res = await fetch(`${BASE}/dvd-landing-publica`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ slug }),
  })
  if (!res.ok) return { disponible: false }
  return res.json()
}

// ── Image storage ───────────────────────────────────────────────────────────

export interface UploadImageResponse {
  ok: boolean
  path?: string        // storage path saved into contenido (e.g. landing/marco-ruiz/169..-foto.jpg)
  signedUrl?: string   // ready-to-display signed URL for the path (optional optimization)
  error?: string
}

export interface UploadImageParams {
  email: string
  slug: string         // used as folder: landing/{slug}/
  filename: string     // original file name (for extension)
  mime: string         // image/jpeg | image/png | image/webp
  data: string         // raw base64, no data: prefix
}

// Uploads an image to Supabase Storage via n8n and returns its storage path.
export async function apiUploadImage(params: UploadImageParams): Promise<UploadImageResponse> {
  try {
    const res = await fetch(`${BASE}/dvd-landing-subir-imagen`, {
      method: 'POST',
      headers,
      body: JSON.stringify(params),
    })
    if (!res.ok) return { ok: false, error: `Error ${res.status} al subir` }
    return res.json()
  } catch {
    return { ok: false, error: 'No se pudo conectar con el almacenamiento' }
  }
}

// Requests signed URLs for a batch of storage paths. Returns { path: url }.
export async function apiSignedUrls(paths: string[]): Promise<Record<string, string>> {
  if (!paths.length) return {}
  try {
    const res = await fetch(`${BASE}/dvd-landing-firmar`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ paths }),
    })
    if (!res.ok) return {}
    const json = await res.json()
    return (json?.signedUrls as Record<string, string>) ?? {}
  } catch {
    return {}
  }
}
