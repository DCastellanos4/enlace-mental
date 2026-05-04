/**
 * main.jsx — Punto de entrada de la aplicación React
 *
 * Este archivo es el arranque del frontend. createRoot() monta el árbol de
 * componentes React en el div#root del index.html.
 *
 * StrictMode activa comprobaciones adicionales en desarrollo (como detectar
 * efectos secundarios inesperados o el uso de APIs obsoletas) sin afectar
 * al comportamiento en producción.
 */

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
