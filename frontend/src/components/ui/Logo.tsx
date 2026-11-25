import { cx } from '../../lib/format'

export function LogoMark({ className = 'h-9 w-9' }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" aria-hidden="true" className={cx('drop-shadow-[0_3px_6px_rgba(94,48,12,.28)]', className)}>
      <rect width="40" height="40" rx="12" fill="#6b3810" />
      <rect x=".6" y=".6" width="38.8" height="38.8" rx="11.4" fill="none" stroke="#d9a514" strokeOpacity="0.4" />
      <path d="M28 13.5A10.5 10.5 0 1 0 28 26.5" fill="none" stroke="#fbf8f1" strokeWidth="3.2" strokeLinecap="round" />
      <path
        d="M13 20.5h4l2.5-6.5 3.5 13 2.8-6.5h4.2"
        fill="none"
        stroke="#e8b923"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function Wordmark({ className = 'text-[22px]' }: { className?: string }) {
  return (
    <span className={cx('font-display font-extrabold leading-none text-ink', className)}>
      Cam<span className="text-gold">pulse</span>
    </span>
  )
}
