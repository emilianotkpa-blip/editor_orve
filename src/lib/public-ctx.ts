import { createContext, useContext } from 'react'

/**
 * Slug de la landing pública en curso. Lo provee PublicPage y lo consume el
 * bloque de formulario para saber a QUÉ asesor pertenece el lead (slug→correo
 * lo resuelve el webhook dvd-lead-guardar). En el editor no hay provider → null,
 * así que el formulario no envía nada (es preview).
 */
export const PublicSlugCtx = createContext<string | null>(null)
export const usePublicSlug = () => useContext(PublicSlugCtx)
