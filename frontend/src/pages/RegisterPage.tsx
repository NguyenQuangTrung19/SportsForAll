import { useState } from 'react'
import { Link } from 'react-router-dom'
import AuthCard from '../components/auth/AuthCard'
import './AuthPages.css'

type MessageType = 'success' | 'error' | ''

function RegisterPage() {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState<MessageType>('')

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!fullName || !email || !password || !confirmPassword) {
      setMessageType('error')
      setMessage('Vui lòng nhập đầy đủ thông tin.')
      return
    }

    if (password.length < 8) {
      setMessageType('error')
      setMessage('Mật khẩu cần ít nhất 8 ký tự.')
      return
    }

    if (password !== confirmPassword) {
      setMessageType('error')
      setMessage('Mật khẩu xác nhận chưa khớp.')
      return
    }

    setMessageType('success')
    setMessage('Đăng ký thành công (demo UI). Sẽ nối API tạo tài khoản ở bước tiếp theo.')
  }

  return (
    <div className="auth-page">
      <AuthCard
        eyebrow="Create account"
        title="Đăng ký tài khoản"
        subtitle="Bắt đầu kết nối cộng đồng thể thao cùng SportsForAll."
        footer={
          <div className="auth-links auth-links-centered">
            <span>Đã có tài khoản?</span>
            <Link to="/login" className="auth-pill-link">
              Đăng nhập
            </Link>
            <Link to="/" className="auth-pill-link auth-pill-link-light">
              Về trang chủ
            </Link>
          </div>
        }
      >
        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <label htmlFor="fullName">Họ và tên</label>
          <input
            id="fullName"
            type="text"
            placeholder="Nguyễn Văn A"
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
          />

          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            placeholder="you@email.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />

          <label htmlFor="password">Mật khẩu</label>
          <div className="auth-password-wrap">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Ít nhất 8 ký tự"
              value={password}
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

          <label htmlFor="confirmPassword">Xác nhận mật khẩu</label>
          <div className="auth-password-wrap">
            <input
              id="confirmPassword"
              type={showConfirmPassword ? 'text' : 'password'}
              placeholder="Nhập lại mật khẩu"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
            />
            <button
              type="button"
              className="auth-toggle-password"
              onClick={() => setShowConfirmPassword((prev) => !prev)}
              aria-label={showConfirmPassword ? 'Ẩn mật khẩu xác nhận' : 'Hiện mật khẩu xác nhận'}
              aria-pressed={showConfirmPassword}
            >
              {showConfirmPassword ? (
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

          <button type="submit" className="auth-submit">
            <span className="auth-submit-inner">
              <span className="auth-btn-label">Tạo tài khoản</span>
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

export default RegisterPage
