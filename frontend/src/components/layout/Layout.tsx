import { useEffect, useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { Menu, RefreshCw, Sparkles } from 'lucide-react'
import { Sidebar } from './Sidebar'
import { NAV } from './nav'
import { Button, ErrorState, Skeleton } from '../ui/primitives'
import { useData } from '../../hooks/useData'
import { useToast } from '../../hooks/useToast'
import { cx } from '../../lib/format'
import { API_BASE_URL } from '../../services/api'

function readCollapsed(): boolean {
  try {
    return localStorage.getItem('campulse.sidebar') === '1'
  } catch {
    return false
  }
}

export function Layout() {
  const [collapsed, setCollapsed] = useState(readCollapsed)
  const [mobileOpen, setMobileOpen] = useState(false)
  const { reload, loading, loaded, connectionError } = useData()
  const toast = useToast()
  const { pathname } = useLocation()

  const meta = NAV.find((n) => (n.to === '/' ? pathname === '/' : pathname.startsWith(n.to))) ?? NAV[0]
  const isAssistant = pathname.startsWith('/assistant')

  useEffect(() => {
    document.title = `${meta.title} · Campulse`
    setMobileOpen(false)
  }, [meta.title])

  const toggle = () => {
    setCollapsed((c) => {
      try {
        localStorage.setItem('campulse.sidebar', c ? '0' : '1')
      } catch {
        /* storage unavailable */
      }
      return !c
    })
  }

  const refresh = async () => {
    await reload()
    toast.info('Data refreshed from the backend.')
  }

  const showOffline = loaded && connectionError && !pathname.startsWith('/settings')

  return (
    <div className="min-h-full">
      <Sidebar collapsed={collapsed} onToggle={toggle} mobileOpen={mobileOpen} onCloseMobile={() => setMobileOpen(false)} />

      <div className={cx('flex min-h-screen flex-col transition-all duration-200', collapsed ? 'lg:pl-[76px]' : 'lg:pl-[250px]')}>
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-line bg-paper/85 px-4 py-3 backdrop-blur sm:px-8">
          <button onClick={() => setMobileOpen(true)} aria-label="Open menu" className="rounded-lg border border-line bg-white p-2 text-ink lg:hidden">
            <Menu size={18} />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-2xl font-extrabold leading-tight sm:text-[26px]">{meta.title}</h1>
            <p className="hidden truncate text-[13px] text-muted sm:block">{meta.subtitle}</p>
          </div>
          <Button icon={RefreshCw} onClick={refresh} loading={loading} aria-label="Refresh data" className="hidden sm:inline-flex">
            Refresh
          </Button>
          <Button icon={RefreshCw} onClick={refresh} loading={loading} aria-label="Refresh data" className="sm:hidden" />
          {!isAssistant && (
            <Link
              to="/assistant"
              className="inline-flex items-center gap-2 rounded-lg border border-brand bg-brand px-4 py-2 text-sm font-medium text-side transition hover:bg-brand-deeper"
            >
              <Sparkles size={16} />
              <span className="hidden sm:inline">Ask AI</span>
            </Link>
          )}
        </header>

        <main className={cx('mx-auto w-full flex-1 px-4 py-6 sm:px-8', isAssistant ? 'max-w-[1100px]' : 'max-w-[1280px]')}>
          {!loaded ? (
            <div className="space-y-4">
              <Skeleton className="h-28" />
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-28" />
                ))}
              </div>
              <Skeleton className="h-72" />
            </div>
          ) : showOffline ? (
            <ErrorState
              title="Can't reach the Campulse backend"
              message={`${connectionError} Start it with: py -m uvicorn api:app --port 8000 (expected at ${API_BASE_URL}).`}
              onRetry={() => void reload()}
            />
          ) : (
            <Outlet />
          )}
        </main>
      </div>
    </div>
  )
}
