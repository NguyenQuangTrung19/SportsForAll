import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import brandLogo from './assets/branding/Logo.png'
import './App.css'

type IntroPoint = {
  title: string
  description: string
}

type Faq = {
  question: string
  answer: string
}

type NavItem = {
  id: string
  label: string
}

const introPoints: IntroPoint[] = [
  {
    title: 'Đúng người để chơi vui và tiến bộ',
    description:
      'Bạn có thể tìm đồng đội hoặc đối thủ theo khu vực, môn thể thao, trình độ và khung giờ rảnh để mỗi trận đều cân bằng và chất lượng.',
  },
  {
    title: 'Đúng kèo để vận hành dễ dàng',
    description:
      'SportsForAll giúp bạn bắt đầu ngay, tạo và tham đội bóng của riêng bạn chỉ vài thao tác, đồng thời theo dõi lịch thi đấu minh bạch.',
  },
  {
    title: 'Đúng tinh thần để cộng đồng bền vững',
    description:
      'Hệ thống đánh giá sau trận, lịch sử hoạt động và nguyên tắc fair-play giúp xây dựng một môi trường thể thao văn minh, tôn trọng và an toàn.',
  },
]

const faqs: Faq[] = [
  {
    question: 'SportsForAll dành cho ai?',
    answer:
      'Dành cho người chơi thể thao cá nhân, đội nhóm và cả chủ sân muốn kết nối với cộng đồng năng động.',
  },
  {
    question: 'Mình có thể tìm trận gần khu vực của mình không?',
    answer:
      'Có. Bạn có thể lọc theo quận/huyện, khoảng cách và khung giờ để tìm trận phù hợp nhanh chóng.',
  },
  {
    question: 'Có mất phí khi bắt đầu sử dụng không?',
    answer:
      'Phiên bản khởi đầu tập trung vào trải nghiệm cốt lõi và sẽ có gói miễn phí cho người dùng mới.',
  },
]

const sports = ['Bóng đá', 'Cầu lông', 'Pickleball', 'Bóng rổ', 'Tennis', 'Chạy bộ']

const partners = [
  'Saigon United Club',
  'FitZone Arena',
  'Dynamic Sports Hub',
  'Riverside Court',
  'MatchPoint Community',
]

const navItems: NavItem[] = [
  { id: 'intro', label: 'Giới thiệu' },
  { id: 'social-proof', label: 'Đối tác' },
  { id: 'faq', label: 'FAQ' },
  { id: 'contact', label: 'Liên hệ' },
]

const slideImages = [
  'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?auto=format&fit=crop&w=1400&q=80',
  'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?auto=format&fit=crop&w=1400&q=80',
  'https://images.unsplash.com/photo-1546519638-68e109498ffc?auto=format&fit=crop&w=1400&q=80',
  'https://images.unsplash.com/photo-1682162669968-c351e2f39608?auto=format&fit=crop&w=1400&q=80',
]

const fallbackImage =
  'https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?auto=format&fit=crop&w=1400&q=75'

function App() {
  const [activeSection, setActiveSection] = useState<string>('intro')
  const [failedImages, setFailedImages] = useState<Record<number, boolean>>({})
  const [isDockedNav, setIsDockedNav] = useState(false)
  const [copiedField, setCopiedField] = useState<'email' | 'phone' | null>(null)

  const heroSources = useMemo(
    () =>
      slideImages.map((src, index) => ({
        key: `${src}-${index}`,
        src: failedImages[index] ? fallbackImage : src,
        alt: `Hình ảnh thể thao ${index + 1}`,
      })),
    [failedImages],
  )

  useEffect(() => {
    const revealElements = document.querySelectorAll<HTMLElement>('.reveal')

    const revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('reveal-visible')
            revealObserver.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.18 },
    )

    revealElements.forEach((element) => revealObserver.observe(element))

    return () => revealObserver.disconnect()
  }, [])

  useEffect(() => {
    const sections = navItems
      .map((item) => document.getElementById(item.id))
      .filter((section): section is HTMLElement => section !== null)

    const sectionObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id)
          }
        })
      },
      {
        rootMargin: '-35% 0px -55% 0px',
        threshold: 0.01,
      },
    )

    sections.forEach((section) => sectionObserver.observe(section))

    return () => sectionObserver.disconnect()
  }, [])

  useEffect(() => {
    slideImages.forEach((src) => {
      const img = new Image()
      img.src = src
      if (typeof img.decode === 'function') {
        void img.decode().catch(() => undefined)
      }
    })
  }, [])

  useEffect(() => {
    const handleScroll = () => {
      const shouldDock = window.innerWidth > 1100 && window.scrollY > 220
      setIsDockedNav((prev) => (prev !== shouldDock ? shouldDock : prev))
    }

    handleScroll()
    window.addEventListener('scroll', handleScroll, { passive: true })
    window.addEventListener('resize', handleScroll)

    return () => {
      window.removeEventListener('scroll', handleScroll)
      window.removeEventListener('resize', handleScroll)
    }
  }, [])

  const handleImageError = (index: number) => {
    setFailedImages((prev) => ({ ...prev, [index]: true }))
  }

  const handleCopy = async (value: string, field: 'email' | 'phone') => {
    try {
      await navigator.clipboard.writeText(value)
      setCopiedField(field)
      window.setTimeout(() => setCopiedField(null), 1800)
    } catch {
      setCopiedField(null)
    }
  }

  return (
    <div className="landing">
      <nav className={`topbar ${isDockedNav ? 'topbar-docked' : ''}`}>
        <a className="brand" href="#" aria-label="SportsForAll Home">
          <img src={brandLogo} alt="SportsForAll logo" className="brand-logo" />
          <span className="brand-text">SportsForAll</span>
        </a>

        <div className="topbar-links" aria-label="Điều hướng section landing page">
          {navItems.map((item) => (
            <a
              key={item.id}
              href={`#${item.id}`}
              className={activeSection === item.id ? 'nav-link nav-link-active' : 'nav-link'}
            >
              {item.label}
            </a>
          ))}
        </div>

        <div className="topbar-actions">
          <Link to="/login" className="primary pulse-cta link-button">
            Đăng nhập
          </Link>
        </div>
      </nav>

      <header className="hero">
        <div className="hero-background" aria-hidden="true">
          {heroSources.map((image, index) => (
            <img
              key={image.key}
              className={`hero-bg-slide hero-bg-slide-${index + 1}`}
              src={image.src}
              alt={image.alt}
              loading={index === 0 ? 'eager' : 'lazy'}
              fetchPriority={index === 0 ? 'high' : 'auto'}
              decoding="async"
              onError={() => handleImageError(index)}
            />
          ))}
        </div>

        <div className="hero-layout">
          <div className="hero-content">
            <p className="badge">Nền tảng kết nối cộng đồng thể thao thế hệ mới</p>
            <h1>
              Nâng cấp mỗi trận đấu với
              <br />
              trải nghiệm <span className="highlight">hiện đại & bùng nổ</span>.
            </h1>
            <p className="subtitle">
              SportsForAll giúp bạn kết nối đúng người, lên kèo nhanh và theo dõi toàn bộ hành
              trình thi đấu trong một không gian trực quan, mượt mà và đáng tin cậy.
            </p>

            <div className="hero-trust" aria-label="Điểm nổi bật nhanh">
              <span>Realtime matching</span>
              <span>Fair-play score</span>
              <span>Verified community</span>
            </div>

            <ul className="hero-points" aria-label="Giá trị cốt lõi">
              <li>Tìm đồng đội/đối thủ theo vị trí, trình độ và lịch rảnh chỉ trong vài giây.</li>
              <li>Tạo kèo, quản lý đội hình và xác nhận thành viên bằng luồng thao tác tối giản.</li>
              <li>Đánh giá sau trận minh bạch để giữ cộng đồng tích cực và chất lượng dài hạn.</li>
            </ul>

            <div className="cta-group">
              <Link to="/register" className="primary pulse-cta link-button">
                Tạo tài khoản
              </Link>
              <a href="#intro" className="secondary secondary-link">
                Khám phá nền tảng
              </a>
            </div>

            <div className="hero-stats" aria-label="Thống kê cộng đồng">
              <article>
                <strong>15K+</strong>
                <span>Người chơi hoạt động</span>
              </article>
              <article>
                <strong>3.2K+</strong>
                <span>Trận đấu mỗi tháng</span>
              </article>
              <article>
                <strong>120+</strong>
                <span>Sân liên kết</span>
              </article>
            </div>
          </div>
        </div>

        <div className="sports-ticker" aria-label="Danh sách môn thể thao">
          {sports.map((sport) => (
            <span key={sport}>{sport}</span>
          ))}
        </div>
      </header>

      <main>
        <section className="section" id="intro">
          <h2>Giới thiệu</h2>
          <p className="section-lead">
            SportsForAll có nghĩa là “Thể thao cho tất cả mọi người”. Nền tảng được xây dựng để
            kết nối người chơi, đội nhóm và cộng đồng thể thao theo cách rõ ràng, đáng tin cậy và
            dễ tham gia cho mọi cấp độ.
          </p>

          <div className="intro-content reveal">
            <p>
              Thay vì tìm kèo qua nhiều kênh rời rạc, SportsForAll tập trung toàn bộ nhu cầu vào
              một trải nghiệm thống nhất: từ khám phá đối tượng phù hợp, tham gia hoạt động đúng
              thời gian, đến duy trì chất lượng cộng đồng sau mỗi trận.
            </p>
            <p>
              Giá trị cốt lõi của SportsForAll xoay quanh ba nguyên tắc: đúng người, đúng kèo và
              đúng tinh thần. Đây là nền tảng để mọi buổi chơi không chỉ thuận tiện hơn mà còn công
              bằng và bền vững hơn cho cả cộng đồng.
            </p>
          </div>

          <div className="grid intro-grid">
            {introPoints.map((point) => (
              <article key={point.title} className="intro-card reveal">
                <h3>{point.title}</h3>
                <p>{point.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="section reveal" id="social-proof">
          <h2>Đối tác</h2>
          <p className="section-lead">
            Các câu lạc bộ, sân và cộng đồng thể thao đã bắt đầu kết nối cùng SportsForAll.
          </p>
          <div className="partner-strip">
            {partners.map((partner) => (
              <div key={partner} className="partner-pill">
                {partner}
              </div>
            ))}
          </div>
        </section>

        <section className="section" id="faq">
          <h2>FAQ</h2>
          <div className="faq-list">
            {faqs.map((item) => (
              <details key={item.question} className="reveal">
                <summary>{item.question}</summary>
                <p>{item.answer}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="section" id="contact">
          <h2>Liên hệ</h2>
          <p className="section-lead">
            Kết nối trực tiếp để trao đổi về sản phẩm, hợp tác hoặc đóng góp cho SportsForAll.
          </p>
          <div className="contact-grid">
            <article className="contact-card reveal">
              <div className="contact-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none">
                  <rect x="3.5" y="5.5" width="17" height="13" rx="2.5" stroke="currentColor" strokeWidth="1.8" />
                  <path d="M4.5 7l7.5 6 7.5-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div>
                <p className="contact-label">Email</p>
                <a href="mailto:nqt123456123@gmail.com">nqt123456123@gmail.com</a>
              </div>
              <button
                type="button"
                className="copy-btn"
                onClick={() => handleCopy('nqt123456123@gmail.com', 'email')}
              >
                {copiedField === 'email' ? 'Đã copy' : 'Copy'}
              </button>
            </article>

            <article className="contact-card reveal">
              <div className="contact-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none">
                  <path
                    d="M7.1 4.2c.6-.6 1.5-.8 2.3-.3l2.2 1.3c.9.5 1.2 1.6.8 2.5l-.9 1.8a12.8 12.8 0 0 0 3 3 12.8 12.8 0 0 0 3 1.9l1.8-.9c.9-.4 2-.1 2.5.8l1.3 2.2c.5.8.3 1.7-.3 2.3l-1.3 1.2c-1 .9-2.3 1.2-3.6 1-3.3-.7-6.4-2.4-8.9-4.9-2.5-2.5-4.2-5.6-4.9-8.9-.2-1.3.1-2.6 1-3.6L7.1 4.2Z"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <div>
                <p className="contact-label">Số điện thoại</p>
                <a href="tel:0914652363">0914652363</a>
              </div>
              <button
                type="button"
                className="copy-btn"
                onClick={() => handleCopy('0914652363', 'phone')}
              >
                {copiedField === 'phone' ? 'Đã copy' : 'Copy'}
              </button>
            </article>

            <article className="contact-card reveal">
              <div className="contact-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none">
                  <path
                    d="M14.1 20v-6h2.5l.4-2.9h-2.9V9.4c0-.8.2-1.3 1.4-1.3H17V5.5c-.3 0-1.1-.1-2.1-.1-2.1 0-3.5 1.3-3.5 3.6v2.1H9v2.9h2.4v6h2.7Z"
                    fill="currentColor"
                  />
                </svg>
              </div>
              <div>
                <p className="contact-label">Facebook</p>
                <a
                  href="https://www.facebook.com/nguyen.quang.trung.774877/?locale=vi_VN"
                  target="_blank"
                  rel="noreferrer"
                >
                  facebook.com/nguyen.quang.trung.774877
                </a>
              </div>
            </article>

            <article className="contact-card reveal">
              <div className="contact-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none">
                  <rect x="4" y="4" width="16" height="16" rx="3" stroke="currentColor" strokeWidth="1.8" />
                  <path d="M8.1 10.1V16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                  <circle cx="8.1" cy="8" r="1.1" fill="currentColor" />
                  <path d="M11.8 16v-3.1c0-1.3.8-2.2 2-2.2s1.9.8 1.9 2.2V16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div>
                <p className="contact-label">LinkedIn</p>
                <a
                  href="https://www.linkedin.com/in/nguyen-quang-trung-dev/"
                  target="_blank"
                  rel="noreferrer"
                >
                  linkedin.com/in/nguyen-quang-trung-dev
                </a>
              </div>
            </article>

            <article className="contact-card reveal">
              <div className="contact-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none">
                  <path
                    d="M12 3.7a8.3 8.3 0 0 0-2.6 16.2c.4.1.5-.2.5-.4v-1.8c-2.2.5-2.7-1-2.7-1-.4-.9-.9-1.1-.9-1.1-.7-.5 0-.5 0-.5.8 0 1.2.8 1.2.8.7 1.2 1.8.9 2.2.7.1-.5.3-.9.5-1.1-1.8-.2-3.6-.9-3.6-4 0-.9.3-1.6.8-2.2-.1-.2-.3-1 .1-2.1 0 0 .7-.2 2.3.8.7-.2 1.3-.3 2-.3s1.4.1 2 .3c1.6-1 2.3-.8 2.3-.8.5 1.1.2 1.9.1 2.1.5.6.8 1.3.8 2.2 0 3.1-1.9 3.8-3.7 4 .3.3.5.8.5 1.6v2.4c0 .2.1.5.5.4A8.3 8.3 0 0 0 12 3.7Z"
                    fill="currentColor"
                  />
                </svg>
              </div>
              <div>
                <p className="contact-label">GitHub</p>
                <a
                  href="https://github.com/NguyenQuangTrung19"
                  target="_blank"
                  rel="noreferrer"
                >
                  github.com/NguyenQuangTrung19
                </a>
              </div>
            </article>
          </div>
        </section>
      </main>

      <footer className="footer">
        <p>© {new Date().getFullYear()} SportsForAll. Move together. Grow together.</p>
        <div>
          <Link to="/login">Đăng nhập</Link>
          <a href="#intro">Giới thiệu</a>
          <a href="#faq">FAQ</a>
          <a href="#contact">Liên hệ</a>
        </div>
      </footer>
    </div>
  )
}

export default App
