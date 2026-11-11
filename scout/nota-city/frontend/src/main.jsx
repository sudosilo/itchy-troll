// NOTA CITY - src/main.jsx
// Entry point for the React app.
// Mounts the App component into the #root div in index.html

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
