import ReactDom from 'react-dom/client'
import React from 'react'

import { AppRoutes } from './routes'
import { AppProvider } from './contexts/AppContext'
import { Toaster } from './components/ui/sonner'

import './globals.css'

ReactDom.createRoot(document.querySelector('app') as HTMLElement).render(
  <React.StrictMode>
    <AppProvider>
      <AppRoutes />
      <Toaster position="top-right" richColors closeButton />
    </AppProvider>
  </React.StrictMode>
)
