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
} from '../data/teams'
import './MyTeamPage.css'

type SortOption = 'last-active-desc' | 'created-desc' | 'created-asc'
type LayoutMode = 'grid' | 'compact'
type SportFilterOption = 'all' | `sport:${string}`

function MyTeamPage() {
  const [selectedSportFilter, setSelectedSportFilter] = useState<SportFilterOption>('all')
  const [sortBy, setSortBy] = useState<SortOption>('last-active-desc')
  const [searchTerm, setSearchTerm] = useState('')
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('grid')

  const sports = useMemo(
    () => ['all', ...Array.from(new Set(teams.map((team) => team.sport)))],
    [],
  )

  const sportFilters = useMemo<SportFilterOption[]>(() => {
    const sportOptions = sports
      .filter((sport) => sport !== 'all')
      .map((sport) => `sport:${sport}` as SportFilterOption)

    return ['all', ...sportOptions]
  }, [sports])

  const filteredAndSortedTeams = useMemo(() => {
    const normalizedSearchTerm = searchTerm.trim().toLowerCase()

    const filteredTeams = teams.filter((team) => {
      const filterMatch =
        selectedSportFilter === 'all'
          ? true
          : team.sport === selectedSportFilter.slice('sport:'.length)

      const searchMatch =
        normalizedSearchTerm.length === 0 || team.name.toLowerCase().includes(normalizedSearchTerm)

      return filterMatch && searchMatch
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
  }, [selectedSportFilter, sortBy, searchTerm])

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
          <div className="toolbar-group toolbar-group-search">
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
              value={selectedSportFilter}
              onChange={(event) => setSelectedSportFilter(event.target.value as SportFilterOption)}
            >
              {sportFilters.map((filterOption) => {
                if (filterOption === 'all') {
                  return (
                    <option key="all" value="all">
                      Tất cả môn
                    </option>
                  )
                }

                const sport = filterOption.slice('sport:'.length)

                return (
                  <option key={filterOption} value={filterOption}>
                    {sport}
                  </option>
                )
              })}
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

          <div className="toolbar-group toolbar-group-layout">
            <label>Layout</label>
            <div className="layout-toggle" role="group" aria-label="Chuyển kiểu hiển thị team">
              <button
                type="button"
                className={layoutMode === 'grid' ? 'layout-btn active' : 'layout-btn'}
                onClick={() => setLayoutMode('grid')}
                title="Hiển thị dạng lưới"
                aria-label="Hiển thị dạng lưới"
              >
                <svg viewBox="0 0 20 20" className="layout-btn-icon" aria-hidden="true" fill="currentColor">
                  <rect x="3" y="3" width="5" height="5" rx="1.25" />
                  <rect x="12" y="3" width="5" height="5" rx="1.25" />
                  <rect x="3" y="12" width="5" height="5" rx="1.25" />
                  <rect x="12" y="12" width="5" height="5" rx="1.25" />
                </svg>
              </button>
              <button
                type="button"
                className={layoutMode === 'compact' ? 'layout-btn active' : 'layout-btn'}
                onClick={() => setLayoutMode('compact')}
                title="Hiển thị dạng danh sách gọn"
                aria-label="Hiển thị dạng danh sách gọn"
              >
                <svg viewBox="0 0 20 20" className="layout-btn-icon" aria-hidden="true" fill="none">
                  <rect x="3" y="4" width="14" height="2" rx="1" fill="currentColor" />
                  <rect x="3" y="9" width="14" height="2" rx="1" fill="currentColor" />
                  <rect x="3" y="14" width="14" height="2" rx="1" fill="currentColor" />
                </svg>
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
