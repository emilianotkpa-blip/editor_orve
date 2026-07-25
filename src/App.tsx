import { useEffect, useState } from 'react'
import { LazyMotion, MotionConfig, AnimatePresence, m } from 'motion/react'
import { useLandingStore } from './store/useLandingStore'
import { TopBar }        from './components/editor/TopBar'
import { IconRail }      from './components/editor/IconRail'
import { LayersPanel }   from './components/editor/LayersPanel'
import { Canvas }        from './components/editor/Canvas'
import { InspectorPanel} from './components/editor/InspectorPanel'
import { StatusBar }     from './components/editor/StatusBar'
import { Toast }         from './components/editor/Toast'
import { PreviewOverlay } from './components/editor/PreviewOverlay'
import { PANEL, POP, FADE, fade } from './lib/motion'

// El bundle de animación llega en un chunk aparte; el editor pinta primero.
const cargarMotion = () => import('./lib/motion-features').then((mod) => mod.default)

export default function App() {
  const { email, loadLanding, isLoading, theme, previewing } = useLandingStore()
  const [panelIzq, setPanelIzq] = useState(true)

  useEffect(() => {
    if (email) loadLanding()
  }, [email])

  // apply editor theme to the document
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  return (
    // reducedMotion="user": si el sistema pide menos movimiento, Motion deja
    // solo las opacidades y desactiva desplazamientos y escalas.
    <LazyMotion features={cargarMotion}>
      <MotionConfig reducedMotion="user" transition={PANEL}>
        <div style={{
          width: '100vw', height: '100vh',
          display: 'flex', flexDirection: 'column',
          fontFamily: 'Mulish, sans-serif',
          background: 'var(--ed-canvas)', color: 'var(--ed-text)', overflow: 'hidden',
        }}>
          <TopBar />

          <div style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative' }}>
            <IconRail />

            {/* Panel de estructura, plegable. Al ocultarlo su ancho anima a 0
                y aparece una pestaña para traerlo de vuelta. */}
            <AnimatePresence initial={false}>
              {panelIzq && (
                <m.div
                  key="panel-izq"
                  initial={{ width: 0, opacity: 0 }}
                  animate={{ width: 220, opacity: 1 }}
                  exit={{ width: 0, opacity: 0 }}
                  transition={PANEL}
                  style={{ overflow: 'hidden', flexShrink: 0, display: 'flex' }}
                >
                  <LayersPanel onColapsar={() => setPanelIzq(false)} />
                </m.div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {!panelIzq && (
                <m.button
                  key="reabrir-izq"
                  onClick={() => setPanelIzq(true)}
                  title="Mostrar estructura y secciones"
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -8 }}
                  whileHover={{ scale: 1.06 }}
                  whileTap={{ scale: 0.94 }}
                  transition={POP}
                  style={{
                    position: 'absolute', left: 10, top: 12, zIndex: 25,
                    width: 30, height: 34, borderRadius: 8, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: 'var(--ed-panel)', border: '1px solid var(--ed-border-2)',
                    color: '#38D030', fontFamily: 'inherit',
                    boxShadow: '0 4px 14px rgba(0,0,0,.4)',
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 6l6 6-6 6" />
                  </svg>
                </m.button>
              )}
            </AnimatePresence>

            <AnimatePresence mode="wait" initial={false}>
              {isLoading ? (
                <m.div
                  key="cargando"
                  variants={fade} initial="initial" animate="animate" exit="exit"
                  transition={FADE}
                  style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  <div style={{ textAlign: 'center', color: 'var(--ed-text-3)' }}>
                    <div style={{
                      width: 32, height: 32, margin: '0 auto 12px',
                      border: '3px solid var(--ed-border)', borderTopColor: '#38D030',
                      borderRadius: '50%', animation: 'spin 0.8s linear infinite',
                    }} />
                    <span style={{ fontSize: 13, fontWeight: 700 }}>Cargando landing…</span>
                  </div>
                </m.div>
              ) : (
                <m.div
                  key="lienzo"
                  variants={fade} initial="initial" animate="animate" exit="exit"
                  transition={FADE}
                  style={{ flex: 1, display: 'flex', minWidth: 0 }}
                >
                  <Canvas />
                </m.div>
              )}
            </AnimatePresence>

            <InspectorPanel />
          </div>

          <StatusBar />
          <Toast />

          <AnimatePresence>
            {previewing && <PreviewOverlay />}
          </AnimatePresence>
        </div>
      </MotionConfig>
    </LazyMotion>
  )
}
