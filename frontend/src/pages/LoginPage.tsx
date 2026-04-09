import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AuthCard from '../components/auth/AuthCard'
import './AuthPages.css'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

type MessageType = 'success' | 'error' | ''

function LoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(true)
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitPulse, setSubmitPulse] = useState(false)
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState<MessageType>('')

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const trimmedEmail = email.trim()

    if (!trimmedEmail || !password) {
      setMessageType('error')
      setMessage('Vui lòng nhập email và mật khẩu.')
      return
    }

    if (!EMAIL_REGEX.test(trimmedEmail)) {
      setMessageType('error')
      setMessage('Email chưa đúng định dạng. Vui lòng kiểm tra lại.')
      return
    }

    if (password.length < 8) {
      setMessageType('error')
      setMessage('Mật khẩu cần ít nhất 8 ký tự.')
      return
    }

    setIsSubmitting(true)
    setSubmitPulse(false)
    await new Promise((resolve) => setTimeout(resolve, 900))

    setMessageType('success')
    setMessage(
      `Đăng nhập thành công (demo UI)${rememberMe ? ' và đã bật ghi nhớ đăng nhập' : ''}. Sẽ nối API ở bước tiếp theo.`,
    )

    setIsSubmitting(false)
    setSubmitPulse(true)
    window.setTimeout(() => setSubmitPulse(false), 320)
    window.setTimeout(() => navigate('/dashboard'), 450)
  }

  return (
    <div className="auth-page">
      <AuthCard
        eyebrow="Welcome back"
        title="Đăng nhập"
        subtitle="Chào mừng quay lại, sẵn sàng cho trận đấu tiếp theo."
        footer={
          <div className="auth-links auth-links-centered">
            <span>Chưa có tài khoản?</span>
            <Link to="/register" className="auth-pill-link">
              Tạo tài khoản
            </Link>
            <Link to="/" className="auth-pill-link auth-pill-link-light">
              Về trang chủ
            </Link>
          </div>
        }
      >
        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            placeholder="you@email.com"
            value={email}
            autoComplete="email"
            onChange={(event) => setEmail(event.target.value)}
          />

          <label htmlFor="password">Mật khẩu</label>
          <div className="auth-password-wrap">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Tối thiểu 8 ký tự"
              value={password}
              autoComplete="current-password"
              onChange={(event) => setPassword(event.target.value)}
            />
            <button
              type="button"
              className="auth-toggle-password"
              onClick={() => setShowPassword((prev) => !prev)}
              aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
              aria-pressed={showPassword}
            >
              {showPassword ? (
                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M3 5l16 16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                  <path d="M9.9 9.9A3 3 0 0 0 14.1 14.1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                  <path
                    d="M10.7 5.2A9.9 9.9 0 0 1 12 5.1c4.7 0 8.4 3.2 9.6 6.9a9.6 9.6 0 0 1-2.9 4.3"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                  <path
                    d="M6.6 8.1A9.7 9.7 0 0 0 2.4 12c1.2 3.7 4.9 6.9 9.6 6.9 1.4 0 2.7-.3 3.8-.8"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path
                    d="M2.4 12c1.2-3.7 4.9-6.9 9.6-6.9s8.4 3.2 9.6 6.9c-1.2 3.7-4.9 6.9-9.6 6.9S3.6 15.7 2.4 12Z"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8" />
                </svg>
              )}
            </button>
          </div>

          <div className="auth-login-meta">
            <label className="auth-checkbox" htmlFor="rememberMe">
              <input
                id="rememberMe"
                type="checkbox"
                checked={rememberMe}
                onChange={(event) => setRememberMe(event.target.checked)}
              />
              <span>Ghi nhớ đăng nhập</span>
            </label>

            <Link to="/forgot-password" className="auth-inline-link">
              Quên mật khẩu?
            </Link>
          </div>

          <button
            type="submit"
            className={`auth-submit ${submitPulse ? 'auth-submit-pop' : ''} ${isSubmitting ? 'auth-submit-loading' : ''}`}
            disabled={isSubmitting}
          >
            <span className="auth-submit-inner">
              <span className="auth-btn-label">{isSubmitting ? 'Đang đăng nhập...' : 'Đăng nhập'}</span>
              {isSubmitting && <span className="auth-spinner" aria-hidden="true" />}
            </span>
          </button>
        </form>

        {message && (
          <p className={`auth-message ${messageType === 'error' ? 'auth-message-error' : 'auth-message-success'}`}>
            {message}
          </p>
        )}
      </AuthCard>
    </div>
  )
}

export default LoginPage
