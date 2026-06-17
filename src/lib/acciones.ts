import type { LandingElemento } from '../types/landing'

export interface ResolvedAction {
  href?: string
  target?: string
  onClick?: () => void
}

// Translate a button's content into a real link / behaviour for the public page.
export function resolveButtonAction(c: LandingElemento['contenido']): ResolvedAction {
  const tipo = (c.accion as string) || 'url'

  if (tipo === 'whatsapp') {
    const tel = String(c.telefono || '').replace(/[^\d]/g, '')
    const msg = c.mensaje ? `?text=${encodeURIComponent(String(c.mensaje))}` : ''
    return tel ? { href: `https://wa.me/${tel}${msg}`, target: '_blank' } : {}
  }

  if (tipo === 'email') {
    const mail = String(c.email || '').trim()
    return mail ? { href: `mailto:${mail}` } : {}
  }

  if (tipo === 'scroll') {
    const sid = String(c.seccionId || '')
    return {
      onClick: () => {
        const el = sid ? document.getElementById(sid) : null
        el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      },
    }
  }

  // url
  const href = String(c.href || '').trim()
  if (!href) return {}
  return { href, target: href.startsWith('http') ? '_blank' : undefined }
}
