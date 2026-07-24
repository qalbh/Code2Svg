import { useEffect, useState, type ReactNode } from 'react'
import { Icon } from './Icon'

export type AppTheme = 'dark' | 'light'

function getInitialTheme(): AppTheme {
  const stored = localStorage.getItem('code2svg-theme')
  if (stored === 'light' || stored === 'dark') return stored
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
}

// Shared theme state + persistence, used by both pages so the toggle behaves
// identically and the choice carries across page navigations via localStorage.
export function useTheme(): [AppTheme, (t: AppTheme) => void] {
  const [theme, setTheme] = useState<AppTheme>(getInitialTheme)
  useEffect(() => {
    document.documentElement.dataset.theme = theme
    localStorage.setItem('code2svg-theme', theme)
  }, [theme])
  return [theme, setTheme]
}

type NavPage = 'svg-to-image' | 'image-to-svg'

interface NavBarProps {
  theme: AppTheme
  setTheme: (t: AppTheme) => void
  active: NavPage
  children?: ReactNode
}

const NAV_LINKS: { page: NavPage; href: string; label: string }[] = [
  { page: 'svg-to-image', href: '/', label: 'SVG → Image' },
  { page: 'image-to-svg', href: '/image-to-svg', label: 'Image → SVG' },
]

export function NavBar({ theme, setTheme, active, children }: NavBarProps) {
  return (
    <header className="topbar">
      <a className="brand" href="/">
        <span className="brand-logo" aria-hidden="true">
          <span className="logo-glow" />
          <span className="logo">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="16 18 22 12 16 6" />
              <polyline points="8 6 2 12 8 18" />
            </svg>
          </span>
        </span>
        <div>
          <h1>Code2Svg</h1>
          <p>SVG toolkit</p>
        </div>
      </a>

      <nav className="topnav" aria-label="Tools">
        {NAV_LINKS.map((link) => (
          <a
            key={link.page}
            href={link.href}
            className={active === link.page ? 'nav-link active' : 'nav-link'}
            aria-current={active === link.page ? 'page' : undefined}
          >
            {link.label}
          </a>
        ))}
      </nav>

      <div className="topbar-actions">
        <div className="pill-track">
          <button
            className={theme === 'dark' ? 'pill-btn active' : 'pill-btn'}
            onClick={() => setTheme('dark')}
          >
            <Icon name="moon" />
            Dark
          </button>
          <button
            className={theme === 'light' ? 'pill-btn active' : 'pill-btn'}
            onClick={() => setTheme('light')}
          >
            <Icon name="sun" />
            Light
          </button>
        </div>
        {children}
      </div>
    </header>
  )
}
