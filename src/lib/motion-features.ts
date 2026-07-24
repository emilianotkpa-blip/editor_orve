// Paquete de features que LazyMotion carga aparte del bundle inicial: el
// editor arranca sin él y llega en cuanto el navegador respira.
//
// domMax y no domAnimation porque hace falta `layout` (reacomodo de capas) y
// `drag`, que es lo que va a montar la Fase 2 (paleta de bloques → lienzo).
export { domMax as default } from 'motion/react'
