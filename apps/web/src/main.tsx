// ---------------------------------------------------------------------------
// Entry point — wraps app in BrowserRouter for React Router navigation
// and TooltipProvider for shadcn Tooltip components.
// ---------------------------------------------------------------------------

import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { TooltipProvider } from '@/components/ui/tooltip'
import App from './App'
import './App.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <TooltipProvider>
        <App />
      </TooltipProvider>
    </BrowserRouter>
  </React.StrictMode>,
)
