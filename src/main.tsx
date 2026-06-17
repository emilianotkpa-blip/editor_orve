import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'
import App from './App'
import { PublicPage } from './pages/PublicPage'

// ── simple error boundary for development visibility ──────────────────────
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  state = { error: null }
  static getDerivedStateFromError(e: Error) { return { error: e } }
  render() {
    if (this.state.error) {
      const e = this.state.error as Error
      return (
        <div style={{
          padding: 32, fontFamily: 'monospace', background: '#0F0F0F',
          color: '#FF6B6B', minHeight: '100vh',
        }}>
          <h2 style={{ margin: '0 0 16px', color: '#fff' }}>Error de renderizado</h2>
          <pre style={{ whiteSpace: 'pre-wrap', fontSize: 13 }}>
            {e.message}
            {'\n\n'}
            {e.stack}
          </pre>
        </div>
      )
    }
    return this.props.children
  }
}

// ── routing ───────────────────────────────────────────────────────────────
const rootEl = document.getElementById('root')!
const reactRoot = ReactDOM.createRoot(rootEl)

const path = window.location.pathname
const publicMatch = path.match(/^\/u\/([^/?#]+)\/?$/)

if (publicMatch) {
  reactRoot.render(
    <React.StrictMode>
      <ErrorBoundary>
        <PublicPage slug={publicMatch[1]} />
      </ErrorBoundary>
    </React.StrictMode>
  )
} else {
  document.body.style.overflow = 'hidden'
  reactRoot.render(
    <React.StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </React.StrictMode>
  )
}
