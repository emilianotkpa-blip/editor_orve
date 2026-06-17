import type { FormCampo, CampoTipo, LandingElemento } from '../types/landing'

export const CAMPO_TIPO_LABEL: Record<CampoTipo, string> = {
  texto:    'Texto',
  email:    'Email',
  telefono: 'Teléfono',
  select:   'Opciones (select)',
  textarea: 'Área de texto',
}

export const CAMPO_TIPOS: CampoTipo[] = ['texto', 'email', 'telefono', 'select', 'textarea']

function guessTipo(label: string): CampoTipo {
  const l = label.toLowerCase()
  if (l.includes('email') || l.includes('correo')) return 'email'
  if (l.includes('tel') || l.includes('whats') || l.includes('cel') || l.includes('número')) return 'telefono'
  if (l.includes('mensaje') || l.includes('comentario')) return 'textarea'
  return 'texto'
}

// Normalize a form element's `campos` (new structured array, or legacy
// comma-string) into FormCampo[].
export function getCampos(contenido: LandingElemento['contenido']): FormCampo[] {
  const raw = contenido.campos
  if (Array.isArray(raw)) {
    if (raw.length === 0) return []
    if (typeof raw[0] === 'object') return raw as FormCampo[]
    // legacy array of label strings
    return (raw as string[]).map((label, i) => ({
      id: `c${i}_${Math.random().toString(36).slice(2, 6)}`,
      label: String(label).trim() || `Campo ${i + 1}`,
      tipo: guessTipo(String(label)),
      requerido: false,
    }))
  }
  if (typeof raw === 'string' && raw.trim()) {
    return raw.split(',').map((label, i) => ({
      id: `c${i}_${Math.random().toString(36).slice(2, 6)}`,
      label: label.trim() || `Campo ${i + 1}`,
      tipo: guessTipo(label),
      requerido: false,
    }))
  }
  return []
}

export function newCampo(): FormCampo {
  return {
    id: `c_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`,
    label: 'Nuevo campo',
    tipo: 'texto',
    requerido: false,
  }
}
