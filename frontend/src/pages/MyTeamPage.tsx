import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import AppShell from '../components/layout/AppShell'
import { appMenuItems } from '../config/appMenu'
import {
  defaultSportCoverImage,
  sportCoverImages,
  teamStatusMeta,
  teams,
  type TeamStatus,
} from '../data/teams'
import './MyTeamPage.css'

type SortOption = 'last-active-desc' | 'created-desc' | 'created-asc'
type LayoutMode = 'grid' | 'compact'
type TeamStatusFilter = TeamStatus | 'all'

function MyTeamPage() {
  const [selectedSport, setSelectedSport] = useState<string>('all')
  const [sortBy, setSortBy] = useState<SortOption>('last-active-desc')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedStatus, setSelectedStatus] = useState<TeamStatusFilter>('all')
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('grid')

  const sports = useMemo(
    () => ['all', ...Array.from(new Set(teams.map((team) => team.sport)))],
    [],
  )

  const statuses = useMemo<TeamStatusFilter[]>(() => ['all', 'recruiting', 'full', 'inactive'], [])

  const filteredAndSortedTeams = useMemo(() => {
    const normalizedSearchTerm = searchTerm.trim().toLowerCase()

    const filteredTeams = teams.filter((team) => {
      const sportMatch = selectedSport === 'all' || team.sport === selectedSport
      const statusMatch = selectedStatus === 'all' || team.status === selectedStatus
      const searchMatch =
        normalizedSearchTerm.length === 0 || team.name.toLowerCase().includes(normalizedSearchTerm)

      return sportMatch && statusMatch && searchMatch
    })

    return [...filteredTeams].sort((a, b) => {
      if (sortBy === 'last-active-desc') {
        return new Date(b.lastActiveAt).getTime() - new Date(a.lastActiveAt).getTime()
      }

      if (sortBy === 'created-desc') {
        return new Date(b.createdAtISO).getTime() - new Date(a.createdAtISO).getTime()
      }

      return new Date(a.createdAtISO).getTime() - new Date(b.createdAtISO).getTime()
    })
  }, [selectedSport, selectedStatus, sortBy, searchTerm])

  const summary = useMemo(() => {
    const totalTeams = filteredAndSortedTeams.length
    const recruitingTeams = filteredAndSortedTeams.filter((team) => team.status === 'recruiting').length
    const totalMembers = filteredAndSortedTeams.reduce((total, team) => total + team.membersCount, 0)
    const averageReputation =
      filteredAndSortedTeams.reduce((total, team) => total + team.reputation, 0) /
      (filteredAndSortedTeams.length || 1)

    return {
      totalTeams,
      recruitingTeams,
      totalMembers,
      averageReputation,
    }
  }, [filteredAndSortedTeams])

  return (
    <AppShell menuItems={appMenuItems}>
      <section className="my-team-page panel">
        <motion.header
          className="my-team-hero"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: 'easeOut' }}
        >
          <div className="my-team-hero-glow my-team-hero-glow-1" aria-hidden="true" />
          <div className="my-team-hero-glow my-team-hero-glow-2" aria-hidden="true" />

          <div className="my-team-hero-content">
            <p className="my-team-eyebrow">Premium Team Space</p>
            <h1>My Team Workspace</h1>
            <p>
              Theo dõi toàn bộ team bạn tham gia với giao diện trực quan, sinh động và tối ưu trải
              nghiệm. Chọn team để vào trang chi tiết thành viên, lịch sử trận và thông báo.
            </p>
          </div>

          <div className="my-team-hero-badges" aria-label="Thông tin nổi bật">
            <span>Live activity tracking</span>
            <span>Smart sorting</span>
            <span>Multi-sport teams</span>
          </div>
        </motion.header>

        <section className="my-team-toolbar" aria-label="Bộ lọc và sắp xếp team">
          <div className="toolbar-group toolbar-group-wide">
            <label htmlFor="team-search">Tìm kiếm team</label>
            <input
              id="team-search"
              type="text"
              placeholder="Nhập tên team..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
          </div>

          <div className="toolbar-group">
            <label htmlFor="sport-filter">Lọc theo môn</label>
            <select
              id="sport-filter"
              value={selectedSport}
              onChange={(event) => setSelectedSport(event.target.value)}
            >
              {sports.map((sport) => (
                <option key={sport} value={sport}>
                  {sport === 'all' ? 'Tất cả môn' : sport}
                </option>
              ))}
            </select>
          </div>

          <div className="toolbar-group">
            <label htmlFor="status-filter">Lọc theo trạng thái</label>
            <select
              id="status-filter"
              value={selectedStatus}
              onChange={(event) => setSelectedStatus(event.target.value as TeamStatusFilter)}
            >
              {statuses.map((status) => (
                <option key={status} value={status}>
                  {status === 'all' ? 'Tất cả trạng thái' : teamStatusMeta[status].label}
                </option>
              ))}
            </select>
          </div>

          <div className="toolbar-group">
            <label htmlFor="team-sort">Sắp xếp theo</label>
            <select
              id="team-sort"
              value={sortBy}
              onChange={(event) => setSortBy(event.target.value as SortOption)}
            >
              <option value="last-active-desc">Hoạt động gần nhất</option>
              <option value="created-desc">Ngày lập mới nhất</option>
              <option value="created-asc">Ngày lập cũ nhất</option>
            </select>
          </div>

          <div className="toolbar-group">
            <label>Layout</label>
            <div className="layout-toggle" role="group" aria-label="Chuyển kiểu hiển thị team">
              <button
                type="button"
                className={layoutMode === 'grid' ? 'layout-btn active' : 'layout-btn'}
                onClick={() => setLayoutMode('grid')}
                title="Hiển thị dạng lưới"
                aria-label="Hiển thị dạng lưới"
              >
                <span className="layout-icon layout-icon-grid" aria-hidden="true">
                  <span />
                  <span />
                  <span />
                  <span />
                </span>
              </button>
              <button
                type="button"
                className={layoutMode === 'compact' ? 'layout-btn active' : 'layout-btn'}
                onClick={() => setLayoutMode('compact')}
                title="Hiển thị dạng danh sách gọn"
                aria-label="Hiển thị dạng danh sách gọn"
              >
                <span className="layout-icon layout-icon-compact" aria-hidden="true">
                  <span />
                  <span />
                  <span />
                </span>
              </button>
            </div>
          </div>
        </section>

        <div className="my-team-summary-grid" aria-label="Tổng quan team">
          <article className="summary-item">
            <p>Tổng số team</p>
            <strong>{summary.totalTeams}</strong>
          </article>
          <article className="summary-item">
            <p>Team đang tuyển</p>
            <strong>{summary.recruitingTeams}</strong>
          </article>
          <article className="summary-item">
            <p>Tổng thành viên</p>
            <strong>{summary.totalMembers}</strong>
          </article>
          <article className="summary-item">
            <p>Uy tín trung bình</p>
            <strong>{summary.averageReputation.toFixed(1)}/5</strong>
          </article>
        </div>

        <section className="team-list-panel" aria-label="Danh sách team đã tham gia">
          <div className="section-head section-head-with-action">
            <h2>Các team bạn tham gia</h2>
            <Link to="/my-team/create" className="create-team-link-btn">
              Tạo team mới
            </Link>
          </div>

          <div className={layoutMode === 'compact' ? 'team-list-grid compact' : 'team-list-grid'}>
            {filteredAndSortedTeams.map((team) => {
              const statusMeta = teamStatusMeta[team.status]
              const coverImageUrl = sportCoverImages[team.sport] ?? defaultSportCoverImage

              return (
                <Link
                  key={team.id}
                  to={`/my-team/${team.id}`}
                  className="team-card-link"
                  aria-label={`Xem chi tiết team ${team.name}`}
                >
                  <article className="team-card">
                    <img src={coverImageUrl} alt={team.sport} className="team-cover" loading="lazy" />

                    <div className="team-card-overlay" aria-hidden="true" />

                    <div className="team-card-content">
                      <div className="team-card-head">
                        <div className="team-brand-row">
                          <img src={team.logoUrl} alt={`${team.name} logo`} className="team-logo" />
                          <div>
                            <h3>{team.name}</h3>
                            <p className="team-sport">{team.sport}</p>
                          </div>
                        </div>
                        <span className={`team-status-pill ${statusMeta.className}`}>{statusMeta.label}</span>
                      </div>

                      <ul>
                        <li>Ngày lập: {team.createdAt}</li>
                        <li>Trưởng nhóm: {team.leader}</li>
                        <li>Thành viên: {team.membersCount}</li>
                        <li>Uy tín: {team.reputation.toFixed(1)}/5</li>
                      </ul>

                      <div className="team-card-footer">
                        <span>
                          Hoạt động gần nhất:{' '}
                          {new Date(team.lastActiveAt).toLocaleDateString('vi-VN', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                          })}
                        </span>
                      </div>
                    </div>
                  </article>
                </Link>
              )
            })}
          </div>

          {filteredAndSortedTeams.length === 0 ? (
            <p className="empty-state">Không tìm thấy team phù hợp với bộ lọc hiện tại.</p>
          ) : null}
        </section>
      </section>
    </AppShell>
  )
}

export default MyTeamPage
