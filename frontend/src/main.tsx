import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import './styles/app.css'
import App from './App'

// Новая версия ставится сразу и страница перезагружается сама — ручной сброс кэша не нужен
const updateSW = registerSW({
  immediate: true,
  onNeedRefresh() { updateSW(true) },
  onRegisteredSW(_url, reg) { if (reg) setInterval(() => reg.update(), 60 * 60 * 1000) },
})

createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>)
