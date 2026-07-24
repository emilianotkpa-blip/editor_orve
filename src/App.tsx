import { useEffect } from 'react'
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
import { PANEL, FADE, fade } from './lib/motion'

// El bundle de animación llega en un chunk aparte; el editor pinta primero.
const cargarMotion = () => import('./lib/motion-features').then((mod) => mod.default)

export default function App() {
  const { email, loadLanding, isLoading, theme, previewing } = useLandingStore()

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

          <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
            <IconRail />
            <LayersPanel />

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
