import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.tsx'
import './index.css'

console.log('Main.tsx: Starting React app')

// Add development authentication token for local development
if (import.meta.env.DEV && !localStorage.getItem('auth_token')) {
  console.log('Main.tsx: Adding development auth token')
  localStorage.setItem('auth_token', 'dev-token-for-local-development')
}

const root = ReactDOM.createRoot(document.getElementById('root')!)
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
)

console.log('Main.tsx: React app rendered')