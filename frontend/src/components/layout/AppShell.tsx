import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import brandLogo from '../../assets/branding/Logo.png'
import type { AppMenuItem } from '../../config/appMenu'
import './AppShell.css'

type AppShellProps = {
  menuItems: AppMenuItem[]
  children: React.ReactNode
}

function AppShell({ menuItems, children }: AppShellProps) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    if (typeof window === 'undefined') {
      return false
    }

    return window.localStorage.getItem('app-shell-sidebar-collapsed') === 'true'
  })
  const location = useLocation()

  useEffect(() => {
    window.localStorage.setItem('app-shell-sidebar-collapsed', String(isSidebarCollapsed))
  }, [isSidebarCollapsed])

  return (
    <div className={`app-shell-layout ${isSidebarCollapsed ? 'app-shell-layout-collapsed' : ''}`}>
      <aside className="app-shell-sidebar" aria-label="Menu ứng dụng">
        <div className="app-shell-brand-row">
          <div className="app-shell-brand">
            <div className="app-shell-logo-wrap">
              <img src={brandLogo} alt="SportsForAll logo" className="app-shell-logo" />
              <div className="app-shell-brand-texts">
                <p className="app-shell-eyebrow">SportsForAll</p>
                <h2>Workspace</h2>
              </div>
            </div>
            <span className="app-shell-welcome">Chào mừng trở lại</span>
          </div>
        </div>

        <button
          type="button"
          className="app-shell-toggle app-shell-toggle-edge"
          onClick={() => setIsSidebarCollapsed((prev) => !prev)}
          aria-label={isSidebarCollapsed ? 'Mở rộng menu' : 'Thu nhỏ menu'}
          title={isSidebarCollapsed ? 'Mở rộng menu' : 'Thu nhỏ menu'}
        >
          <span className="app-shell-toggle-glyph" aria-hidden="true">
            {isSidebarCollapsed ? '❯' : '❮'}
          </span>
        </button>

        <nav className="app-shell-menu" aria-label="Điều hướng chính">
          {menuItems.map((item) => {
            const isActive =
              location.pathname === item.path || location.pathname.startsWith(`${item.path}/`)

            return (
              <Link
                key={item.id}
                to={item.path}
                className={isActive ? 'app-shell-link active' : 'app-shell-link'}
                aria-current={isActive ? 'page' : undefined}
                title={isSidebarCollapsed ? item.label : undefined}
              >
                <span className="app-shell-link-icon">{item.icon}</span>
                <span className="app-shell-link-text">{item.label}</span>
              </Link>
            )
          })}
        </nav>

        <div className="app-shell-footer">
          <button type="button" className="app-shell-cta" title="Tạo kèo mới">
            <span className="app-shell-cta-icon">＋</span>
            <span className="app-shell-cta-text">Tạo kèo mới</span>
          </button>
          <Link to="/" className="app-shell-back-link" title="Về trang chủ">
            <span className="app-shell-back-icon">⌂</span>
            <span className="app-shell-back-text">Về trang chủ</span>
          </Link>
        </div>
      </aside>

      <main className="app-shell-main">{children}</main>
    </div>
  )
}

export default AppShell
