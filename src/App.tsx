import type { ComponentType } from 'react'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { AppLayout } from './components/layout/AppLayout'
import Dashboard from './pages/Dashboard'
import Transactions from './pages/Transactions'

const page = (load: () => Promise<{ default: ComponentType }>) => async () => ({ Component: (await load()).default })

const router = createBrowserRouter([
  {
    element: <AppLayout />,
    hydrateFallbackElement: <div />,
    children: [
      { path: '/', element: <Dashboard /> },
      { path: '/transactions', element: <Transactions /> },
      { path: '/events', lazy: page(() => import('./pages/Events')) },
      { path: '/events/:id', lazy: page(() => import('./pages/EventDetail')) },
      { path: '/dues', lazy: page(() => import('./pages/Dues')) },
      { path: '/shopping', lazy: page(() => import('./pages/Shopping')) },
      { path: '/reminders', lazy: page(() => import('./pages/Reminders')) },
      { path: '/contacts', lazy: page(() => import('./pages/Contacts')) },
      { path: '/reports', lazy: page(() => import('./pages/Reports')) },
      { path: '/settings', lazy: page(() => import('./pages/Settings')) },
      { path: '*', lazy: page(() => import('./pages/NotFound')) },
    ],
  },
])

export default function App() {
  return <RouterProvider router={router} />
}
