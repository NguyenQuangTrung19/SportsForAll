import riversideSmashersLogo from '../assets/team-logos/riverside-smashers.svg'
import sunriseRunnersLogo from '../assets/team-logos/sunrise-runners.svg'
import thunderFcLogo from '../assets/team-logos/thunder-fc.svg'

export type TeamStatus = 'full' | 'recruiting' | 'inactive'

export type TeamMemberStatus = 'active' | 'reserve' | 'inactive'

export type TeamMember = {
  id: string
  name: string
  role: string
  joinedAt: string
  reputation: number
  status: TeamMemberStatus
}

export type Team = {
  id: string
  name: string
  sport: string
  createdAt: string
  createdAtISO: string
  lastActiveAt: string
  leader: string
  membersCount: number
  maxMembers: number
  reputation: number
  status: TeamStatus
  description: string
  logoUrl: string
  members: TeamMember[]
}

export const sportCoverImages: Record<string, string> = {
  'Bóng đá 7':
    'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?auto=format&fit=crop&w=1400&q=80',
  'Cầu lông':
    'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?auto=format&fit=crop&w=1400&q=80',
  'Chạy bộ cộng đồng':
    'https://images.unsplash.com/photo-1552674605-db6ffd4facb5?auto=format&fit=crop&w=1400&q=80',
}

export const defaultSportCoverImage =
  'https://images.unsplash.com/photo-1546519638-68e109498ffc?auto=format&fit=crop&w=1400&q=80'

export const teams: Team[] = [
  {
    id: 'team-1',
    name: 'Saigon Thunder FC',
    sport: 'Bóng đá 7',
    createdAt: '15/06/2024',
    createdAtISO: '2024-06-15',
    lastActiveAt: '2026-04-07T20:15:00+07:00',
    leader: 'Nguyễn Quang Trung',
    membersCount: 14,
    maxMembers: 14,
    reputation: 4.9,
    status: 'full',
    description: 'Team bóng đá giao hữu cuối tuần, ưu tiên tinh thần fair-play và kỷ luật đúng giờ.',
    logoUrl: thunderFcLogo,
    members: [
      {
        id: 'm-1',
        name: 'Nguyễn Quang Trung',
        role: 'Trưởng nhóm',
        joinedAt: '15/06/2024',
        reputation: 4.9,
        status: 'active',
      },
      {
        id: 'm-2',
        name: 'Lê Văn Hải',
        role: 'Tiền đạo',
        joinedAt: '20/06/2024',
        reputation: 4.7,
        status: 'active',
      },
      {
        id: 'm-3',
        name: 'Trần Minh Khoa',
        role: 'Thủ môn',
        joinedAt: '27/06/2024',
        reputation: 4.8,
        status: 'active',
      },
      {
        id: 'm-4',
        name: 'Phạm Nhật Nam',
        role: 'Hậu vệ',
        joinedAt: '02/07/2024',
        reputation: 4.5,
        status: 'reserve',
      },
    ],
  },
  {
    id: 'team-2',
    name: 'Riverside Smashers',
    sport: 'Cầu lông',
    createdAt: '03/10/2024',
    createdAtISO: '2024-10-03',
    lastActiveAt: '2026-04-06T21:00:00+07:00',
    leader: 'Phan Hồng Anh',
    membersCount: 10,
    maxMembers: 12,
    reputation: 4.6,
    status: 'recruiting',
    description: 'Team cầu lông luyện tập buổi tối, trình độ từ trung bình đến khá.',
    logoUrl: riversideSmashersLogo,
    members: [
      {
        id: 'm-5',
        name: 'Phan Hồng Anh',
        role: 'Trưởng nhóm',
        joinedAt: '03/10/2024',
        reputation: 4.8,
        status: 'active',
      },
      {
        id: 'm-6',
        name: 'Vũ Thùy Linh',
        role: 'Đánh đôi',
        joinedAt: '11/10/2024',
        reputation: 4.6,
        status: 'active',
      },
      {
        id: 'm-7',
        name: 'Đỗ Thành Vinh',
        role: 'Đánh đơn',
        joinedAt: '18/10/2024',
        reputation: 4.4,
        status: 'active',
      },
    ],
  },
  {
    id: 'team-3',
    name: 'Sunrise Runners',
    sport: 'Chạy bộ cộng đồng',
    createdAt: '12/01/2025',
    createdAtISO: '2025-01-12',
    lastActiveAt: '2026-03-18T06:30:00+07:00',
    leader: 'Bùi Anh Quân',
    membersCount: 22,
    maxMembers: 30,
    reputation: 4.2,
    status: 'inactive',
    description: 'Nhóm chạy sáng sớm theo pace, hiện tạm dừng để sắp xếp lại lịch tập.',
    logoUrl: sunriseRunnersLogo,
    members: [
      {
        id: 'm-8',
        name: 'Bùi Anh Quân',
        role: 'Trưởng nhóm',
        joinedAt: '12/01/2025',
        reputation: 4.3,
        status: 'inactive',
      },
      {
        id: 'm-9',
        name: 'Ngô Đức Mạnh',
        role: 'Điều phối lịch chạy',
        joinedAt: '20/01/2025',
        reputation: 4.1,
        status: 'inactive',
      },
    ],
  },
]

export const teamStatusMeta: Record<TeamStatus, { label: string; className: string }> = {
  full: { label: 'Đã đủ', className: 'status-full' },
  recruiting: { label: 'Tuyển thành viên', className: 'status-recruiting' },
  inactive: { label: 'Ngừng hoạt động', className: 'status-inactive' },
}

export const memberStatusMeta: Record<TeamMemberStatus, { label: string; className: string }> = {
  active: { label: 'Đang hoạt động', className: 'member-active' },
  reserve: { label: 'Dự bị', className: 'member-reserve' },
  inactive: { label: 'Tạm nghỉ', className: 'member-inactive' },
}
