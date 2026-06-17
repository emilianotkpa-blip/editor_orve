import { useEffect } from 'react'
import { useLandingStore } from './store/useLandingStore'
import { TopBar }        from './components/editor/TopBar'
import { IconRail }      from './components/editor/IconRail'
import { LayersPanel }   from './components/editor/LayersPanel'
import { Canvas }        from './components/editor/Canvas'
import { InspectorPanel} from './components/editor/InspectorPanel'
import { StatusBar }     from './components/editor/StatusBar'
import { Toast }         from './components/editor/Toast'
import { PreviewOverlay } from './components/editor/PreviewOverlay'

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

        {isLoading ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ textAlign: 'center', color: 'var(--ed-text-3)' }}>
              <div style={{
                width: 32, height: 32, margin: '0 auto 12px',
                border: '3px solid var(--ed-border)', borderTopColor: '#38D030',
                borderRadius: '50%', animation: 'spin 0.8s linear infinite',
              }} />
              <span style={{ fontSize: 13, fontWeight: 700 }}>Cargando landing…</span>
            </div>
          </div>
        ) : (
          <Canvas />
        )}

        <InspectorPanel />
      </div>

      <StatusBar />
      <Toast />

      {previewing && <PreviewOverlay />}
    </div>
  )
}
