import type { ReactNode } from 'react'
import brandLogo from '../../assets/branding/Logo.png'

type AuthCardProps = {
  eyebrow?: string
  title: string
  subtitle: string
  children: ReactNode
  footer: ReactNode
}

function AuthBrand() {
  return (
    <div className="auth-brand">
      <img src={brandLogo} alt="SportsForAll logo" />
      <span>SportsForAll</span>
    </div>
  )
}

function AuthCard({ eyebrow, title, subtitle, children, footer }: AuthCardProps) {
  return (
    <section className="auth-card">
      <AuthBrand />

      {eyebrow ? <p className="auth-eyebrow">{eyebrow}</p> : null}
      <h1 className="auth-title">{title}</h1>
      <p className="auth-subtitle">{subtitle}</p>

      {children}
      {footer}
    </section>
  )
}

export default AuthCard
