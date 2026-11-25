import { NavLink } from 'react-router-dom'
import { ChevronsLeft, ChevronsRight, ShieldCheck, X } from 'lucide-react'
import { NAV } from './nav'
import { LogoMark, Wordmark } from '../ui/Logo'
import { useData } from '../../hooks/useData'
import { cx } from '../../lib/format'

interface Props {
  collapsed: boolean
  onToggle: () => void
  mobileOpen: boolean
  onCloseMobile: () => void
}

export function Sidebar({ collapsed, onToggle, mobileOpen, onCloseMobile }: Props) {
  const { pending, connectionError, loaded } = useData()
  const slim = collapsed && !mobileOpen

  return (
    <>
      {mobileOpen && <div className="fixed inset-0 z-30 bg-[#1E130E]/40 lg:hidden" onClick={onCloseMobile} />}
      <aside
        className={cx(
          'fixed inset-y-0 left-0 z-40 flex flex-col border-r border-line bg-side transition-all duration-200',
          slim ? 'lg:w-[76px]' : 'lg:w-[250px]',
          'w-[270px]',
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
        )}
      >
        <div className={cx('flex items-center gap-2.5 px-4 pb-3 pt-5', slim && 'lg:justify-center lg:px-0')}>
          <LogoMark className="h-9 w-9 shrink-0" />
          {!slim && <Wordmark />}
          <button onClick={onCloseMobile} aria-label="Close menu" className="ml-auto rounded-md p-1 text-muted hover:bg-chip lg:hidden">
            <X size={18} />
          </button>
        </div>

        <nav className="mx-3 mt-2 rounded-xl border border-line bg-white p-2 shadow-card" aria-label="Main">
          {NAV.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              onClick={onCloseMobile}
              title={slim ? label : undefined}
              className={({ isActive }) =>
                cx(
                  'group relative mb-0.5 flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-semibold transition last:mb-0',
                  isActive ? 'bg-chip text-brand shadow-[inset_3px_0_0_#D9A514]' : 'text-muted hover:bg-chip hover:text-ink',
                  slim && 'lg:justify-center lg:px-0',
                )
              }
            >
              <Icon size={17} className="shrink-0" />
              {!slim && <span className="flex-1">{label}</span>}
              {label === 'Approvals' && pending.length > 0 && (
                <span
                  className={cx(
                    'grid h-5 min-w-5 place-items-center rounded-full bg-gold px-1.5 text-[11px] font-bold text-brand-dark',
                    slim && 'lg:absolute lg:right-1.5 lg:top-1 lg:h-4 lg:min-w-4 lg:text-[10px]',
                  )}
                >
                  {pending.length}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="mt-auto space-y-3 p-3">
          {!slim && (
            <p className="flex items-start gap-2 px-1 text-xs leading-relaxed text-muted">
              <ShieldCheck size={15} className="mt-0.5 shrink-0 text-brand" />
              The agent only suggests. Nothing changes until a human approves.
            </p>
          )}

          <div className={cx('flex items-center gap-3 rounded-xl border border-line bg-white p-2.5', slim && 'lg:justify-center')}>
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand font-display text-sm font-bold text-side">CC</div>
            {!slim && (
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-semibold">Campus Coordinator</p>
                <p className="flex items-center gap-1.5 truncate text-[11px] text-muted">
                  <span className={cx('h-1.5 w-1.5 rounded-full', !loaded ? 'bg-gold' : connectionError ? 'bg-bad' : 'bg-ok')} />
                  {!loaded ? 'Connecting…' : connectionError ? 'Backend offline' : 'Backend online'}
                </p>
              </div>
            )}
          </div>

          <button
            onClick={onToggle}
            className="hidden w-full items-center justify-center gap-2 rounded-lg py-1.5 text-xs font-medium text-muted transition hover:bg-chip hover:text-ink lg:flex"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronsRight size={16} /> : <><ChevronsLeft size={16} /> Collapse</>}
          </button>
        </div>
      </aside>
    </>
  )
}
