import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import AppShell from '../components/layout/AppShell'
import { appMenuItems } from '../config/appMenu'
import { teamStatusMeta, teams } from '../data/teams'
import './MyTeamPage.css'

type SortOption = 'last-active-desc' | 'created-desc' | 'created-asc'

const cardVariants = {
  hidden: { opacity: 0, y: 14, scale: 0.98 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.35,
      ease: 'easeOut',
    },
  },
  exit: { opacity: 0, y: -10, scale: 0.98, transition: { duration: 0.2 } },
}

function MyTeamPage() {
  const [selectedSport, setSelectedSport] = useState<string>('all')
  const [sortBy, setSortBy] = useState<SortOption>('last-active-desc')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const timer = window.setTimeout(() => setIsLoading(false), 700)
    return () => window.clearTimeout(timer)
  }, [selectedSport, sortBy])

  const sports = useMemo(
    () => ['all', ...Array.from(new Set(teams.map((team) => team.sport)))],
    [],
  )

  const filteredAndSortedTeams = useMemo(() => {
    const filteredTeams =
      selectedSport === 'all' ? teams : teams.filter((team) => team.sport === selectedSport)

    return [...filteredTeams].sort((a, b) => {
      if (sortBy === 'last-active-desc') {
        return new Date(b.lastActiveAt).getTime() - new Date(a.lastActiveAt).getTime()
      }

      if (sortBy === 'created-desc') {
        return new Date(b.createdAtISO).getTime() - new Date(a.createdAtISO).getTime()
      }

      return new Date(a.createdAtISO).getTime() - new Date(b.createdAtISO).getTime()
    })
  }, [selectedSport, sortBy])

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
          <div className="section-head">
            <h2>Các team bạn tham gia</h2>
          </div>

          <div className="team-list-grid">
            {isLoading
              ? Array.from({ length: 4 }).map((_, index) => (
                  <article key={`skeleton-${index}`} className="team-card-skeleton" aria-hidden="true">
                    <div className="skeleton-shimmer" />
                    <div className="skeleton-content">
                      <div className="skeleton-line skeleton-title" />
                      <div className="skeleton-line skeleton-text" />
                      <div className="skeleton-line skeleton-text" />
                      <div className="skeleton-line skeleton-text short" />
                    </div>
                  </article>
                ))
              : null}

            <AnimatePresence>
              {!isLoading
                ? filteredAndSortedTeams.map((team, index) => {
                    const statusMeta = teamStatusMeta[team.status]

                    return (
                      <motion.div
                        key={team.id}
                        layout
                        variants={cardVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        transition={{ delay: index * 0.04 }}
                      >
                        <Link
                          to={`/my-team/${team.id}`}
                          className="team-card-link"
                          aria-label={`Xem chi tiết team ${team.name}`}
                        >
                          <article className="team-card">
                            <img src={team.coverImageUrl} alt={team.name} className="team-cover" loading="lazy" />

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
                                <span className={`team-status-pill ${statusMeta.className}`}>
                                  {statusMeta.label}
                                </span>
                              </div>

                              <ul>
                                <li>Ngày lập: {team.createdAt}</li>
                                <li>Trưởng nhóm: {team.leader}</li>
                                <li>
                                  Thành viên: {team.membersCount}/{team.maxMembers}
                                </li>
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
                                <span className="team-card-hint">Xem chi tiết →</span>
                              </div>
                            </div>
                          </article>
                        </Link>
                      </motion.div>
                    )
                  })
                : null}
            </AnimatePresence>
          </div>

          {!isLoading && filteredAndSortedTeams.length === 0 ? (
            <p className="empty-state">Không tìm thấy team phù hợp với bộ lọc hiện tại.</p>
          ) : null}
        </section>
      </section>
    </AppShell>
  )
}

export default MyTeamPage
