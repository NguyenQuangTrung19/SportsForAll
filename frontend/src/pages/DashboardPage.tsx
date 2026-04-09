import AppShell from '../components/layout/AppShell'
import { appMenuItems } from '../config/appMenu'
import './DashboardPage.css'

type QuickMetric = {
  id: string
  label: string
  value: string
  trend: string
}

type RecruitingTeam = {
  id: string
  name: string
  sport: string
  level: string
  area: string
  slots: number
  schedule: string
}

type OpenMatch = {
  id: string
  title: string
  sport: string
  level: string
  area: string
  time: string
  needed: string
}

type EmptyField = {
  id: string
  name: string
  district: string
  timeRange: string
  price: string
  sport: string
}

type UpcomingMatch = {
  id: string
  title: string
  time: string
  location: string
  status: string
}

type PersonalStat = {
  id: string
  period: string
  matches: number
  winRate: string
}

const quickMetrics: QuickMetric[] = [
  { id: 'active-users', label: 'Người chơi online', value: '1,248', trend: '+12% so với hôm qua' },
  { id: 'new-matches', label: 'Kèo mới hôm nay', value: '36', trend: '+8 kèo trong 2h gần nhất' },
  { id: 'ready-teams', label: 'Đội đang tuyển', value: '54', trend: '22 đội ưu tiên tuyển ngay' },
  { id: 'open-fields', label: 'Sân trống trong ngày', value: '19', trend: 'Nhiều khung giờ buổi tối' },
]

const recruitingTeams: RecruitingTeam[] = [
  {
    id: 'team-1',
    name: 'Saigon Thunder',
    sport: 'Bóng đá 7',
    level: 'Trung bình - Khá',
    area: 'Quận 7',
    slots: 3,
    schedule: 'T3/T5 - 19:30',
  },
  {
    id: 'team-2',
    name: 'Badminton Flex',
    sport: 'Cầu lông đôi nam nữ',
    level: 'Khá',
    area: 'Thủ Đức',
    slots: 2,
    schedule: 'T4/T6 - 20:00',
  },
  {
    id: 'team-3',
    name: 'Riverside Picklers',
    sport: 'Pickleball',
    level: 'Mới chơi - Trung bình',
    area: 'Bình Thạnh',
    slots: 4,
    schedule: 'T7/CN - 07:00',
  },
]

const openMatches: OpenMatch[] = [
  {
    id: 'match-1',
    title: 'Friendly Cup Warm-up',
    sport: 'Bóng đá 7',
    level: 'Trung bình',
    area: 'Gò Vấp',
    time: 'Thứ 6, 20:00',
    needed: 'Cần 1 đội đối thủ',
  },
  {
    id: 'match-2',
    title: 'Saturday Smash',
    sport: 'Cầu lông đôi',
    level: 'Khá',
    area: 'Quận 10',
    time: 'Thứ 7, 18:30',
    needed: 'Cần 2 cặp đối thủ',
  },
  {
    id: 'match-3',
    title: 'Sunset 3x3 Battle',
    sport: 'Bóng rổ 3x3',
    level: 'Trung bình - Nâng cao',
    area: 'Quận 2',
    time: 'Chủ nhật, 17:00',
    needed: 'Thiếu 1 đội',
  },
]

const emptyFields: EmptyField[] = [
  {
    id: 'field-1',
    name: 'FitZone Arena A',
    district: 'Quận 3',
    timeRange: '16:00 - 18:00',
    price: '450.000đ/2h',
    sport: 'Bóng đá 7',
  },
  {
    id: 'field-2',
    name: 'Riverside Court 2',
    district: 'Quận 4',
    timeRange: '19:00 - 21:00',
    price: '280.000đ/2h',
    sport: 'Cầu lông',
  },
  {
    id: 'field-3',
    name: 'Skyline Pickle Hub',
    district: 'Phú Nhuận',
    timeRange: '20:30 - 22:00',
    price: '320.000đ/1.5h',
    sport: 'Pickleball',
  },
]

const upcomingMatches: UpcomingMatch[] = [
  {
    id: 'upcoming-1',
    title: 'Saigon Thunder vs Galaxy FC',
    time: 'Thứ 5, 19:30',
    location: 'Sân FitZone Arena',
    status: 'Đã xác nhận đội hình',
  },
  {
    id: 'upcoming-2',
    title: 'Badminton Ladder Night',
    time: 'Thứ 7, 18:00',
    location: 'Riverside Court',
    status: 'Còn 1 suất dự bị',
  },
  {
    id: 'upcoming-3',
    title: 'Pickleball Community Challenge',
    time: 'Chủ nhật, 07:30',
    location: 'Skyline Pickle Hub',
    status: 'Đang chờ check-in',
  },
]

const personalStats: PersonalStat[] = [
  { id: 'week', period: 'Tuần này', matches: 3, winRate: '67%' },
  { id: 'month', period: 'Tháng này', matches: 11, winRate: '64%' },
  { id: 'year', period: 'Năm nay', matches: 92, winRate: '61%' },
]

function DashboardPage() {
  return (
    <AppShell menuItems={appMenuItems}>
      <section id="overview" className="panel section-overview">
        <div className="panel-head">
          <div>
            <p className="panel-eyebrow">Tổng quan hôm nay</p>
            <h1>Bạn muốn bắt đầu với kèo nào?</h1>
          </div>
          <button type="button" className="ghost-action">
            Tìm đối thủ nhanh
          </button>
        </div>

        <div className="metrics-grid" aria-label="Thông tin nhanh">
          {quickMetrics.map((metric) => (
            <article key={metric.id} className="metric-card">
              <p>{metric.label}</p>
              <strong>{metric.value}</strong>
              <span>{metric.trend}</span>
            </article>
          ))}
        </div>
      </section>

      <section id="teams" className="panel">
        <div className="section-head">
          <h2>Đội nhóm đang tuyển người</h2>
          <button type="button">Xem tất cả</button>
        </div>
        <div className="card-grid">
          {recruitingTeams.map((team) => (
            <article key={team.id} className="info-card">
              <div className="info-head">
                <h3>{team.name}</h3>
                <span>{team.slots} suất</span>
              </div>
              <p>{team.sport}</p>
              <ul>
                <li>Trình độ: {team.level}</li>
                <li>Khu vực: {team.area}</li>
                <li>Lịch chơi: {team.schedule}</li>
              </ul>
              <button type="button">Ứng tuyển ngay</button>
            </article>
          ))}
        </div>
      </section>

      <section id="matches" className="panel">
        <div className="section-head">
          <h2>Trận đấu còn thiếu đội (Tìm đối thủ)</h2>
          <button type="button">Đăng kèo đối thủ</button>
        </div>
        <div className="card-grid">
          {openMatches.map((match) => (
            <article key={match.id} className="info-card">
              <div className="info-head">
                <h3>{match.title}</h3>
                <span>{match.needed}</span>
              </div>
              <p>{match.sport}</p>
              <ul>
                <li>Trình độ: {match.level}</li>
                <li>Khu vực: {match.area}</li>
                <li>Thời gian: {match.time}</li>
              </ul>
              <button type="button">Gửi đề nghị giao hữu</button>
            </article>
          ))}
        </div>
      </section>

      <section id="fields" className="panel">
        <div className="section-head">
          <h2>Sân còn trống trong ngày</h2>
          <button type="button">Đặt sân nhanh</button>
        </div>
        <div className="card-grid">
          {emptyFields.map((field) => (
            <article key={field.id} className="info-card">
              <div className="info-head">
                <h3>{field.name}</h3>
                <span>{field.price}</span>
              </div>
              <p>{field.sport}</p>
              <ul>
                <li>Khu vực: {field.district}</li>
                <li>Khung giờ: {field.timeRange}</li>
              </ul>
              <button type="button">Giữ chỗ tạm thời</button>
            </article>
          ))}
        </div>
      </section>

      <section id="profile" className="panel profile-panel">
        <div className="section-head">
          <h2>Góc cá nhân</h2>
        </div>

        <div className="profile-layout">
          <article className="profile-card">
            <h3>Lịch thi đấu sắp tới</h3>
            {upcomingMatches.map((match) => (
              <div key={match.id} className="profile-list-item">
                <strong>{match.title}</strong>
                <p>{match.time}</p>
                <p>{match.location}</p>
                <span>{match.status}</span>
              </div>
            ))}
          </article>

          <article className="profile-card">
            <h3>Thông tin nhanh về bạn</h3>
            <ul className="profile-meta">
              <li>
                <span>Vai trò</span>
                <strong>Đội trưởng - Saigon Thunder</strong>
              </li>
              <li>
                <span>Đội của bạn</span>
                <strong>28 thành viên hoạt động</strong>
              </li>
              <li>
                <span>Uy tín cộng đồng</span>
                <strong>4.8/5 (122 đánh giá)</strong>
              </li>
            </ul>
          </article>

          <article className="profile-card full-width">
            <h3>Thống kê số trận đã tham gia</h3>
            <div className="profile-stats-grid">
              {personalStats.map((stat) => (
                <div key={stat.id} className="profile-stat-item">
                  <p>{stat.period}</p>
                  <strong>{stat.matches} trận</strong>
                  <span>Tỉ lệ thắng {stat.winRate}</span>
                </div>
              ))}
            </div>
          </article>
        </div>
      </section>
    </AppShell>
  )
}

export default DashboardPage
