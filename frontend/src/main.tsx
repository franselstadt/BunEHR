import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'

// Leaflet CSS for interactive maps
import 'leaflet/dist/leaflet.css'

// ── BunEHR — Ghibli × Claude Code minimal CSS ──────────────────────────
const style = document.createElement('style')
style.textContent = `
  @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400;1,600&family=Nunito:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap');

  *, *::before, *::after { box-sizing: border-box; }

  :root {
    --bun-periwinkle:  #7B93B8;
    --bun-sage:        #8FAE93;
    --bun-terra:       #B8846A;
    --bun-parchment:   #F7F3EC;
    --bun-linen:       #FEFAF4;
    --bun-border:      #DDD5C5;
    --bun-ink:         #3B3228;
    --bun-mist:        #8A7E72;
    font-synthesis: none;
    text-rendering: optimizeLegibility;
    -webkit-font-smoothing: antialiased;
  }

  body {
    margin: 0;
    font-family: 'Nunito', system-ui, -apple-system, sans-serif;
    background: var(--bun-parchment);
    color: var(--bun-ink);
  }
  h1, h2, h3, h4, h5, h6 {
    font-family: 'Cormorant Garamond', 'Georgia', serif;
    font-variant-ligatures: common-ligatures;
  }

  ::-webkit-scrollbar        { width: 5px; height: 5px; }
  ::-webkit-scrollbar-track  { background: transparent; }
  ::-webkit-scrollbar-thumb  { background: var(--bun-border); border-radius: 3px; }
  ::-webkit-scrollbar-thumb:hover { background: var(--bun-mist); }
  :focus-visible { outline: 2px solid var(--bun-periwinkle); outline-offset: 2px; border-radius: 3px; }
  ::selection    { background: #EAF0F8; color: var(--bun-ink); }
  code, kbd      { font-family: 'JetBrains Mono', 'Fira Code', ui-monospace, monospace; }
`
document.head.appendChild(style)

// Fix Leaflet default marker icons broken by Vite asset hashing
import L from 'leaflet'
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
