import { useMemo, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import AppShell from '../components/layout/AppShell'
import { appMenuItems } from '../config/appMenu'
import {
  defaultSportCoverImage,
  memberStatusMeta,
  sportCoverImages,
  teamStatusMeta,
  teams,
} from '../data/teams'
import './TeamDetailPage.css'

type TeamDetailTab = 'members' | 'match-history' | 'announcements'

type TeamMatchHistory = {
  id: string
  title: string
  playedAt: string
  result: string
  score: string
  location: string
}

type TeamAnnouncement = {
  id: string
  title: string
  postedAt: string
  author: string
  content: string
}

const teamMatchHistoryByTeamId: Record<string, TeamMatchHistory[]> = {
  'team-1': [
    {
      id: 'mh-1',
      title: 'Saigon Thunder FC vs Galaxy 7',
      playedAt: '05/04/2026 - 19:30',
      result: 'Thắng',
      score: '4 - 2',
      location: 'FitZone Arena',
    },
    {
      id: 'mh-2',
      title: 'Saigon Thunder FC vs East Side Club',
      playedAt: '29/03/2026 - 20:00',
      result: 'Hòa',
      score: '1 - 1',
      location: 'Riverside Field',
    },
  ],
  'team-2': [
    {
      id: 'mh-3',
      title: 'Riverside Smashers - Ladder Night #12',
      playedAt: '03/04/2026 - 20:00',
      result: 'Thắng',
      score: '3 - 1 set',
      location: 'Riverside Court',
    },
  ],
  'team-3': [
    {
      id: 'mh-4',
      title: 'Sunrise Runners - Long Run 10K',
      playedAt: '15/02/2026 - 05:30',
      result: 'Hoàn thành',
      score: '10km',
      location: 'Bờ kè Thủ Thiêm',
    },
  ],
}

const teamAnnouncementsByTeamId: Record<string, TeamAnnouncement[]> = {
  'team-1': [
    {
      id: 'an-1',
      title: 'Chốt đội hình trận thứ 7 tuần này',
      postedAt: '08/04/2026',
      author: 'Nguyễn Quang Trung',
      content: 'Anh em xác nhận tham gia trước 18:00 thứ 6 để chốt sân và áo bib.',
    },
    {
      id: 'an-2',
      title: 'Cập nhật quy tắc fair-play',
      postedAt: '02/04/2026',
      author: 'Nguyễn Quang Trung',
      content: 'Ưu tiên xoay tua vị trí đều cho thành viên mới trong 2 hiệp đầu.',
    },
  ],
  'team-2': [
    {
      id: 'an-3',
      title: 'Tuyển thêm 2 bạn đánh đôi',
      postedAt: '07/04/2026',
      author: 'Phan Hồng Anh',
      content: 'Cần thêm 2 thành viên trình độ trung bình khá cho khung giờ tối T4/T6.',
    },
  ],
  'team-3': [
    {
      id: 'an-4',
      title: 'Tạm dừng hoạt động tháng này',
      postedAt: '01/04/2026',
      author: 'Bùi Anh Quân',
      content: 'Team tạm dừng 4 tuần để sắp xếp lại lịch, sẽ thông báo lịch mới sớm.',
    },
  ],
}

function TeamDetailPage() {
  const { teamId } = useParams<{ teamId: string }>()
  const [activeTab, setActiveTab] = useState<TeamDetailTab>('members')
  const team = teams.find((item) => item.id === teamId)

  const matchHistory = useMemo(() => {
    if (!teamId) {
      return []
    }

    return teamMatchHistoryByTeamId[teamId] ?? []
  }, [teamId])

  const announcements = useMemo(() => {
    if (!teamId) {
      return []
    }

    return teamAnnouncementsByTeamId[teamId] ?? []
  }, [teamId])

  if (!team) {
    return <Navigate to="/my-team" replace />
  }

  const teamStatus = teamStatusMeta[team.status]
  const teamCoverImage = sportCoverImages[team.sport] ?? defaultSportCoverImage

  return (
    <AppShell menuItems={appMenuItems}>
      <section className="team-detail-page panel">
        <motion.header
          className="team-detail-hero"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: 'easeOut' }}
        >
          <img src={teamCoverImage} alt={team.sport} className="team-detail-hero-cover" />
          <div className="team-detail-hero-overlay" aria-hidden="true" />
          <div className="team-detail-hero-glow team-detail-hero-glow-1" aria-hidden="true" />

          <div className="team-detail-hero-content">
            <p className="team-detail-eyebrow">Chi tiết team</p>
            <div className="team-title-row">
              <img src={team.logoUrl} alt={`${team.name} logo`} className="team-detail-logo" />
              <div>
                <h1>{team.name}</h1>
                <p>{team.description}</p>
              </div>
            </div>

            <div className="team-detail-hero-badges">
              <span>{team.sport}</span>
              <span>Uy tín {team.reputation.toFixed(1)}/5</span>
              <span>{team.membersCount}/{team.maxMembers} thành viên</span>
            </div>
          </div>

          <Link to="/my-team" className="back-to-teams-link">
            ← Quay lại My Team
          </Link>
        </motion.header>

        <div className="team-info-grid" aria-label="Thông tin tổng quan team">
          <article className="team-info-card">
            <p>Môn thể thao</p>
            <strong>{team.sport}</strong>
          </article>
          <article className="team-info-card">
            <p>Ngày lập</p>
            <strong>{team.createdAt}</strong>
          </article>
          <article className="team-info-card">
            <p>Trưởng nhóm</p>
            <strong>{team.leader}</strong>
          </article>
          <article className="team-info-card">
            <p>Hoạt động gần nhất</p>
            <strong>
              {new Date(team.lastActiveAt).toLocaleDateString('vi-VN', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
              })}
            </strong>
          </article>
          <article className="team-info-card">
            <p>Số lượng thành viên</p>
            <strong>
              {team.membersCount}/{team.maxMembers}
            </strong>
          </article>
          <article className="team-info-card">
            <p>Trạng thái</p>
            <strong>
              <span className={`team-status-pill ${teamStatus.className}`}>{teamStatus.label}</span>
            </strong>
          </article>
        </div>

        <section className="team-detail-tab-panel" aria-label="Nội dung chi tiết team">
          <div className="team-detail-tabs" role="tablist" aria-label="Tabs chi tiết team">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'members'}
              className={activeTab === 'members' ? 'team-tab team-tab-active' : 'team-tab'}
              onClick={() => setActiveTab('members')}
            >
              Thành viên
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'match-history'}
              className={activeTab === 'match-history' ? 'team-tab team-tab-active' : 'team-tab'}
              onClick={() => setActiveTab('match-history')}
            >
              Lịch sử trận
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'announcements'}
              className={activeTab === 'announcements' ? 'team-tab team-tab-active' : 'team-tab'}
              onClick={() => setActiveTab('announcements')}
            >
              Thông báo team
            </button>
          </div>

          <AnimatePresence mode="wait">
            {activeTab === 'members' ? (
              <motion.div
                key="members"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="member-table-wrap"
              >
                <table>
                  <thead>
                    <tr>
                      <th>Thành viên</th>
                      <th>Vai trò</th>
                      <th>Ngày tham gia</th>
                      <th>Uy tín</th>
                      <th>Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody>
                    {team.members.map((member) => {
                      const memberStatus = memberStatusMeta[member.status]

                      return (
                        <tr key={member.id}>
                          <td>{member.name}</td>
                          <td>{member.role}</td>
                          <td>{member.joinedAt}</td>
                          <td>{member.reputation.toFixed(1)}/5</td>
                          <td>
                            <span className={`member-status-pill ${memberStatus.className}`}>
                              {memberStatus.label}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </motion.div>
            ) : null}

            {activeTab === 'match-history' ? (
              <motion.div
                key="match-history"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="timeline-list"
                role="tabpanel"
                aria-label="Lịch sử trận đấu"
              >
                {matchHistory.length === 0 ? (
                  <p className="empty-tab-content">Chưa có dữ liệu lịch sử trận cho team này.</p>
                ) : (
                  matchHistory.map((match) => (
                    <article key={match.id} className="timeline-card">
                      <h3>{match.title}</h3>
                      <p>{match.playedAt}</p>
                      <ul>
                        <li>Kết quả: {match.result}</li>
                        <li>Tỉ số/Kết quả: {match.score}</li>
                        <li>Địa điểm: {match.location}</li>
                      </ul>
                    </article>
                  ))
                )}
              </motion.div>
            ) : null}

            {activeTab === 'announcements' ? (
              <motion.div
                key="announcements"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="timeline-list"
                role="tabpanel"
                aria-label="Thông báo team"
              >
                {announcements.length === 0 ? (
                  <p className="empty-tab-content">Hiện chưa có thông báo nào.</p>
                ) : (
                  announcements.map((announcement) => (
                    <article key={announcement.id} className="timeline-card">
                      <h3>{announcement.title}</h3>
                      <p>
                        {announcement.postedAt} • {announcement.author}
                      </p>
                      <p>{announcement.content}</p>
                    </article>
                  ))
                )}
              </motion.div>
            ) : null}
          </AnimatePresence>
        </section>
      </section>
    </AppShell>
  )
}

export default TeamDetailPage
