import { useState } from 'react'
import { Link } from 'react-router-dom'
import AuthCard from '../components/auth/AuthCard'
import './AuthPages.css'

type MessageType = 'success' | 'error' | ''

function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState<MessageType>('')

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!email) {
      setMessageType('error')
      setMessage('Vui lòng nhập email để nhận liên kết đặt lại mật khẩu.')
      return
    }

    setMessageType('success')
    setMessage('Đã gửi hướng dẫn đặt lại mật khẩu (demo UI). Vui lòng kiểm tra email.')
  }

  return (
    <div className="auth-page">
      <AuthCard
        eyebrow="Recover access"
        title="Quên mật khẩu"
        subtitle="Nhập email đã đăng ký để nhận liên kết đặt lại mật khẩu."
        footer={
          <div className="auth-links auth-links-centered auth-links-stack-mobile">
            <Link to="/login" className="auth-pill-link">
              Quay lại đăng nhập
            </Link>
            <Link to="/register" className="auth-pill-link">
              Tạo tài khoản mới
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
            onChange={(event) => setEmail(event.target.value)}
          />

          <button type="submit" className="auth-submit">
            <span className="auth-submit-inner">
              <span className="auth-btn-label">Gửi liên kết đặt lại</span>
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

export default ForgotPasswordPage
