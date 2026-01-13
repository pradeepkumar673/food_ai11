import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

// Create root and render
const rootElement = document.getElementById('root')

if (!rootElement) {
  throw new Error('Root element not found')
}

const root = ReactDOM.createRoot(rootElement)

// Initial render
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)

// Development mode logging
if (import.meta.env.DEV) {
  console.log('🚀 Pradeep\'s Food Guide starting...')
  console.log('🎭 Splash screen should show for 5 seconds')
  console.log('🍳 Then main app will load')
}