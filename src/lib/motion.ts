// Vocabulario de movimiento del editor.
//
// Todo lo que se anima sale de aquí, para que el editor se sienta como una
// sola pieza y no como una colección de transiciones sueltas. Si algo necesita
// un tiempo propio, primero conviene preguntarse si no encaja en uno de estos.
//
// Regla de convivencia: react-moveable escribe `style.left/top` a mano en cada
// frame del arrastre, así que los elementos del lienzo NO se animan con Motion
// (se pelearían por el mismo nodo). Motion se queda con el chrome del editor:
// paneles, popovers, listas, indicadores.
import type { Transition, Variants } from 'motion/react'

// Paneles e inspector: rápido y sin rebote perceptible. El contenido tiene que
// quedar legible de inmediato; el movimiento solo explica de dónde vino.
export const PANEL: Transition = { type: 'spring', stiffness: 520, damping: 42, mass: 0.7 }

// Lo que aparece encima del lienzo (toast, popovers, menús): un rebote mínimo,
// el suficiente para que el ojo lo registre sin que se sienta juguetón.
export const POP: Transition = { type: 'spring', stiffness: 460, damping: 30, mass: 0.8 }

// Reacomodo de listas (capas, secciones). Más blando a propósito: se tiene que
// leer como "las cosas se hacen a un lado", no como un salto.
export const LAYOUT: Transition = { type: 'spring', stiffness: 400, damping: 36, mass: 0.9 }

// Fades puros, sin desplazamiento.
export const FADE: Transition = { duration: 0.16, ease: [0.4, 0, 0.2, 1] }

// Pulso continuo de la zona de drop mientras está activa.
export const PULSE: Transition = { duration: 1.2, repeat: Infinity, ease: 'easeInOut' }

// ── Variantes ──────────────────────────────────────────────────────────────

// Cambio de contenido del inspector: entra por la derecha, sale por la
// izquierda. Da la sensación de que el panel sigue a la selección.
export const panelSwap: Variants = {
  initial: { opacity: 0, x: 10 },
  animate: { opacity: 1, x: 0 },
  exit:    { opacity: 0, x: -8 },
}

// Popovers y menús. Quien lo use debe fijar `transformOrigin` hacia su
// disparador, si no el escalado se siente desanclado.
export const popover: Variants = {
  initial: { opacity: 0, y: -6, scale: 0.96 },
  animate: { opacity: 1, y: 0,  scale: 1 },
  exit:    { opacity: 0, y: -4, scale: 0.98 },
}

// El toast se centra con `left: 50%`, así que el -50% viaja dentro de la
// animación: si se dejara en el `transform` del style, Motion lo pisaría al
// construir el suyo y el toast se iría a la derecha.
export const toast: Variants = {
  initial: { opacity: 0, y: 14, scale: 0.96, x: '-50%' },
  animate: { opacity: 1, y: 0,  scale: 1,    x: '-50%' },
  exit:    { opacity: 0, y: 10, scale: 0.98, x: '-50%' },
}

// Misma razón que el toast: barra centrada, pero baja desde arriba.
export const barraFlotante: Variants = {
  initial: { opacity: 0, y: -14, x: '-50%' },
  animate: { opacity: 1, y: 0,   x: '-50%' },
  exit:    { opacity: 0, y: -10, x: '-50%' },
}

export const fade: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit:    { opacity: 0 },
}

// Zona de drop y overlay de colocación.
export const dropHint: Variants = {
  initial: { opacity: 0, scale: 0.97 },
  animate: { opacity: 1, scale: 1 },
  exit:    { opacity: 0, scale: 0.97 },
}

// Filas de lista que entran y salen (capas).
export const fila: Variants = {
  initial: { opacity: 0, x: -8 },
  animate: { opacity: 1, x: 0 },
  exit:    { opacity: 0, x: -12, transition: { duration: 0.12 } },
}

// Botones que se revelan al pasar el mouse por una fila.
export const accionFila: Variants = {
  initial: { opacity: 0, scale: 0.8 },
  animate: { opacity: 1, scale: 1 },
  exit:    { opacity: 0, scale: 0.8 },
}
